import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  authedUser,
  clearMenu,
  getMenu,
  getMenuForTable,
  listBranches,
  scopeFor,
  setMenu,
  UPLOAD_DIR,
} from "@/app/lib/store";
import type { Scope } from "@/app/lib/store";
import { isSameOrigin, signMenuPath, verifyMenuPathSig } from "@/app/lib/auth";
import { rateLimit } from "@/app/lib/ratelimit";
import {
  deleteMenuObject,
  isValidMenuStoragePath,
  menuExtForMime,
  menuPublicUrl,
  menuStoragePath,
  MENU_MAX_BYTES,
  putMenuObject,
  signMenuUpload,
  useSupabase,
} from "@/app/lib/supabase";
import type { MenuMeta } from "@/app/lib/types";

export const dynamic = "force-dynamic";

// Resolve which branch's menu this request targets: a branch-admin is pinned to
// its own branch; a manager may pass ?branch=<id> (validated), else the chain
// (null-branch) menu.
async function targetBranch(scope: Scope, req: Request): Promise<string | null> {
  if (scope.role === "admin") return scope.branchId;
  const requested = new URL(req.url).searchParams.get("branch");
  if (requested) {
    const branches = await listBranches(scope.ownerId);
    if (branches.some((b) => b.id === requested)) return requested;
  }
  return null;
}

// Delete a previous menu file. For Supabase storage the object path is stored
// in meta.filename (makes deletes cheap — no URL parsing); for the local-disk
// dev fallback meta.filename is the bare disk name.
async function removeFile(meta: MenuMeta | null) {
  if (!meta) return;
  if (useSupabase) {
    await deleteMenuObject(meta.filename).catch(() => {});
  } else {
    await fs
      .rm(path.join(UPLOAD_DIR, meta.filename), { force: true })
      .catch(() => {});
  }
}

// Persist a menu (bucket object already landed — PUT or client-direct upload)
// and reconcile storage so no object is left unreferenced. Shared by both
// write paths (JSON confirm + multipart fallback) since both PUT-then-setMenu.
//   - setMenu throws → the just-uploaded object is orphaned; compensating
//     delete it and rethrow (bug-hunt finding #3).
//   - setMenu succeeds → re-read the menu row and delete whichever object it
//     does NOT point at. Normally that's `previous` (the replaced file); if a
//     concurrent confirm/upload won the race, it's our own object instead —
//     which also cleans up half of finding #2 (a DELETE landing between our
//     write and this re-read leaves the row null, so we delete our own object
//     rather than resurrect it).
//   ponytail: best-effort re-read, not CAS — two writers can still interleave
//   around the re-read itself and orphan one object (see bugs.md 2026-08-03).
//   A real fix needs a generation/version column on `menus` (store-sb.ts +
//   migration) or a sign→confirm token (app/lib/api.ts), both out of scope.
async function persistMenu(
  ownerId: string,
  meta: MenuMeta,
  branchId: string | null,
  previous: MenuMeta | null,
) {
  try {
    await setMenu(ownerId, meta, branchId);
  } catch (err) {
    await removeFile(meta);
    throw err;
  }
  // The menu is already persisted at this point — a transient read failure
  // here must never fail the request (that would look like a failed confirm
  // to the client, which retries and re-uploads, orphaning THIS object: the
  // exact leak this reconcile step exists to close). Worst case on a read
  // failure: one unreferenced object left behind, never data loss.
  try {
    const current = await getMenu(ownerId, branchId);
    await removeFile(current?.filename === meta.filename ? previous : meta);
  } catch {
    // leave both objects
  }
}

// GET ?num=<table> → public: the menu for that table's owner (customer view).
// GET (no num) → admin: the caller's own menu.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const num = url.searchParams.get("num");
  if (num) {
    // Customer path: token-gated like the table read (no enumeration by num).
    const token = url.searchParams.get("t") ?? "";
    return NextResponse.json(await getMenuForTable(num, token));
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  const branchId = await targetBranch(scope, req);
  return NextResponse.json(await getMenu(scope.ownerId, branchId));
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  // Throttle the upload/token-mint write per owner (the other abuse-prone writes
  // are all limited). Trial admins are auto-provisioned, so this caps Blob
  // egress/cost amplification from a cheaply-obtained session.
  const limiter = await authedUser(req);
  if (!limiter) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!(await rateLimit("menu", limiter.id))) {
    return NextResponse.json({ error: "rate limited" }, { status: 429 });
  }

  const contentType = req.headers.get("content-type") || "";

  // JSON body → Supabase Storage client-direct upload protocol (prod). The
  // browser uploads straight to Supabase via a server-minted signed upload URL,
  // bypassing the 4.5MB serverless request-body limit. This route only
  // (a) mints a signed URL after auth, and (b) persists metadata on confirm.
  if (contentType.includes("application/json")) {
    if (!useSupabase) {
      // No Supabase configured (local dev) — signal the client to use the
      // multipart disk fallback instead of bouncing through a 400.
      return NextResponse.json(
        { error: "storage not configured" },
        { status: 503 },
      );
    }
    const body = (await req.json().catch(() => null)) as {
      action?: "sign" | "confirm";
      mime?: string;
      size?: number;
      path?: string;
      sig?: string;
      originalName?: string;
    } | null;
    if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });

    // Auth is enforced HERE for both actions — only a signed-in admin can mint
    // a signed URL or persist a menu.
    const user = await authedUser(req);
    if (!user) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    const scope = scopeFor(user);
    const branchId = await targetBranch(scope, req);

    if (body.action === "confirm") {
      // Upload landed in Supabase; persist the storage path (→ meta.filename,
      // cheap later delete) and derive the public URL from it server-side,
      // replacing the old menu. `body.path` MUST be revalidated against the
      // AUTHED owner's prefix here — it is untrusted client input and, unless
      // checked, lets any authed owner point deletes/URLs at another tenant's
      // objects (see isValidMenuStoragePath doc comment).
      if (!body.path || !body.mime || !body.sig) {
        return NextResponse.json({ error: "bad body" }, { status: 400 });
      }
      if (!isValidMenuStoragePath(body.path, scope.ownerId, body.mime)) {
        return NextResponse.json({ error: "bad body" }, { status: 400 });
      }
      // Bind the persisted path to one the server actually minted in a prior
      // `sign`: isValidMenuStoragePath can't tell two branches apart (a branch-
      // admin's ownerId is the shared parent prefix), so without this a branch-
      // admin could confirm ANOTHER branch's public object path and delete it.
      // Only the server can produce a valid sig (it holds SESSION_SECRET).
      if (!(await verifyMenuPathSig(body.path, body.sig))) {
        return NextResponse.json({ error: "bad body" }, { status: 400 });
      }
      const previous = await getMenu(scope.ownerId, branchId);
      const meta: MenuMeta = {
        filename: body.path,
        url: menuPublicUrl(body.path),
        mime: body.mime,
        originalName: body.originalName || "menu",
        uploadedAt: new Date().toISOString(),
      };
      // Persist the new menu, then reconcile storage (see persistMenu doc).
      await persistMenu(scope.ownerId, meta, branchId, previous);
      return NextResponse.json(meta);
    }

    // Default action: mint a signed upload URL for the authed owner.
    const mime = body.mime ?? "";
    const ext = menuExtForMime(mime);
    if (!ext) {
      return NextResponse.json(
        { error: "unsupported type (image or pdf only)" },
        { status: 415 },
      );
    }
    // ponytail: the bucket's 20 MB cap (migration 0014) is the real authority on
    // the client-direct path — the server never proxies the bytes. This app-level
    // pre-check only keeps it from being theatre, so it MUST be mandatory: reject
    // a missing/non-positive size (omitting the field used to skip the check), not
    // just one over the cap.
    if (
      typeof body.size !== "number" ||
      !Number.isFinite(body.size) ||
      body.size <= 0
    ) {
      return NextResponse.json({ error: "bad body" }, { status: 400 });
    }
    if (body.size > MENU_MAX_BYTES) {
      return NextResponse.json(
        { error: `file too large (max ${MENU_MAX_BYTES / (1024 * 1024)}MB)` },
        { status: 413 },
      );
    }
    const id = crypto.randomUUID();
    const storagePath = menuStoragePath(scope.ownerId, id, ext);
    const uploadUrl = await signMenuUpload(storagePath);
    // Mint a signature over the storage path so the later `confirm` can prove
    // the server generated this path (see the verify check in the confirm branch).
    const sig = await signMenuPath(storagePath);
    return NextResponse.json({
      path: storagePath,
      publicUrl: menuPublicUrl(storagePath),
      uploadUrl,
      sig,
    });
  }

  // Multipart fallback: small files via the server (local-dev disk, or the
  // client's fallback path when the signed-URL flow is unavailable). On
  // Supabase this does a server-side put to the same path scheme.
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // On Vercel the filesystem is read-only, so without Supabase there is no
  // place to persist an upload — fail with a clear message instead of a 500.
  if (!useSupabase && process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "menu storage is not configured — set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY to enable uploads",
      },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  const ext = menuExtForMime(file.type);
  if (!ext) {
    return NextResponse.json(
      { error: "unsupported type (image or pdf only)" },
      { status: 415 },
    );
  }
  if (file.size > MENU_MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (max ${MENU_MAX_BYTES / (1024 * 1024)}MB)` },
      { status: 413 },
    );
  }

  const scope = scopeFor(user);
  const branchId = await targetBranch(scope, req);
  const previous = await getMenu(scope.ownerId, branchId);
  const bytes = await file.arrayBuffer();

  let url: string;
  let filename: string;
  if (useSupabase) {
    const id = crypto.randomUUID();
    const storagePath = menuStoragePath(scope.ownerId, id, ext);
    await putMenuObject(storagePath, bytes, file.type);
    url = menuPublicUrl(storagePath);
    filename = storagePath; // store the path → cheap later delete
  } else {
    filename = `menu-${scope.ownerId}-${Date.now()}.${ext}`;
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), Buffer.from(bytes));
    url = `/uploads/${filename}`;
  }

  const meta: MenuMeta = {
    filename,
    url,
    mime: file.type,
    originalName: file.name,
    uploadedAt: new Date().toISOString(),
  };
  // Persist the new menu, then reconcile storage (see persistMenu doc).
  await persistMenu(scope.ownerId, meta, branchId, previous);
  return NextResponse.json(meta);
}

export async function DELETE(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const scope = scopeFor(user);
  const branchId = await targetBranch(scope, req);
  const previous = await getMenu(scope.ownerId, branchId);
  await clearMenu(scope.ownerId, branchId);
  await removeFile(previous);
  return NextResponse.json({ ok: true });
}
