import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  authedUser,
  clearMenu,
  getMenu,
  getMenuForTable,
  setMenu,
  UPLOAD_DIR,
} from "@/app/lib/store";
import { isSameOrigin } from "@/app/lib/auth";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { MenuMeta } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const ALLOWED_TYPES = Object.keys(EXT);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB upload cap (client-direct upload)

const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

async function removeFile(meta: MenuMeta | null) {
  if (!meta) return;
  if (useBlob) {
    const { del } = await import("@vercel/blob");
    await del(meta.url).catch(() => {});
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
  return NextResponse.json(await getMenu(user.id));
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "bad origin" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") || "";

  // Client-direct upload (prod): the browser uploads straight to Vercel Blob,
  // bypassing the 4.5MB serverless request-body limit that blocked larger menu
  // PDFs/photos. This route only (a) mints a scoped upload token after auth, and
  // (b) persists the menu metadata when the upload finishes.
  if (useBlob && contentType.includes("application/json")) {
    const body = (await req.json().catch(() => null)) as HandleUploadBody | null;
    if (!body) return NextResponse.json({ error: "bad body" }, { status: 400 });
    try {
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          // Auth is enforced HERE — only a signed-in admin can get a token.
          const user = await authedUser(req);
          if (!user) throw new Error("unauthorized");
          const originalName =
            (() => {
              try {
                return (JSON.parse(clientPayload || "{}") as { originalName?: string })
                  .originalName;
              } catch {
                return undefined;
              }
            })() || "menu";
          return {
            allowedContentTypes: ALLOWED_TYPES,
            maximumSizeInBytes: MAX_BYTES,
            addRandomSuffix: true,
            tokenPayload: JSON.stringify({ userId: user.id, originalName }),
          };
        },
        onUploadCompleted: async ({ blob, tokenPayload }) => {
          // Fired server-to-server by Vercel Blob after the upload lands.
          const { userId, originalName } = JSON.parse(tokenPayload || "{}") as {
            userId: string;
            originalName: string;
          };
          const previous = await getMenu(userId);
          await setMenu(userId, {
            filename: blob.pathname,
            url: blob.url,
            mime: blob.contentType || "application/octet-stream",
            originalName: originalName || "menu",
            uploadedAt: new Date().toISOString(),
          });
          await removeFile(previous);
        },
      });
      return NextResponse.json(result);
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "upload failed" },
        { status: 400 },
      );
    }
  }

  // Multipart fallback (local dev / no Blob token): small files via the server.
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // On Vercel the filesystem is read-only, so without a Blob store there is no
  // place to persist an upload — fail with a clear message instead of a 500.
  if (!useBlob && process.env.VERCEL) {
    return NextResponse.json(
      {
        error:
          "menu storage is not configured — add a Vercel Blob store (BLOB_READ_WRITE_TOKEN) to enable uploads",
      },
      { status: 503 },
    );
  }
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "no file" }, { status: 400 });
  }
  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "unsupported type (image or pdf only)" },
      { status: 415 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "file too large (max 8MB)" }, { status: 413 });
  }

  const previous = await getMenu(user.id);
  const filename = `menu-${user.id}-${Date.now()}.${ext}`;
  const bytes = Buffer.from(await file.arrayBuffer());

  let url: string;
  if (useBlob) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`menu/${filename}`, bytes, {
      access: "public",
      contentType: file.type,
    });
    url = blob.url;
  } else {
    await fs.mkdir(UPLOAD_DIR, { recursive: true });
    await fs.writeFile(path.join(UPLOAD_DIR, filename), bytes);
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
  await setMenu(user.id, meta);
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
  const previous = await getMenu(user.id);
  await clearMenu(user.id);
  await removeFile(previous);
  return NextResponse.json({ ok: true });
}
