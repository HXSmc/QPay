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
import type { MenuMeta } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB upload cap

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
  const num = new URL(req.url).searchParams.get("num");
  if (num) {
    return NextResponse.json(await getMenuForTable(num));
  }
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await getMenu(user.id));
}

export async function POST(req: Request) {
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
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
  const user = await authedUser(req);
  if (!user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const previous = await getMenu(user.id);
  await clearMenu(user.id);
  await removeFile(previous);
  return NextResponse.json({ ok: true });
}
