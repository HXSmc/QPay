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
import { isSameOrigin } from "@/app/lib/auth";
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
      if (!body.path || !body.mime) {
        return NextResponse.json({ error: "bad body" }, { status: 400 });
      }
      if (!isValidMenuStoragePath(body.path, scope.ownerId, body.mime)) {
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
      // Persist the new menu BEFORE deleting the old file, so a failure can
      // never leave the admin with no menu at all.
      await setMenu(scope.ownerId, meta, branchId);
      await removeFile(previous);
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
    if (typeof body.size === "number" && body.size > MENU_MAX_BYTES) {
      return NextResponse.json(
        { error: `file too large (max ${MENU_MAX_BYTES / (1024 * 1024)}MB)` },
        { status: 413 },
      );
    }
    const id = crypto.randomUUID();
    const storagePath = menuStoragePath(scope.ownerId, id, ext);
    const uploadUrl = await signMenuUpload(storagePath);
    return NextResponse.json({
      path: storagePath,
      publicUrl: menuPublicUrl(storagePath),
      uploadUrl,
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
  // Persist the new menu BEFORE deleting the old file, so a failure can never
  // leave the admin with no menu at all.
  await setMenu(scope.ownerId, meta, branchId);
  await removeFile(previous);
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
