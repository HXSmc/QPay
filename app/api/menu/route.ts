import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { clearMenu, getMenu, setMenu, UPLOAD_DIR } from "@/app/lib/store";
import type { MenuMeta } from "@/app/lib/types";

export const dynamic = "force-dynamic";

const EXT: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};

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

export async function GET() {
  return NextResponse.json(await getMenu());
}

export async function POST(req: Request) {
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

  await removeFile(await getMenu());
  const filename = `menu-${Date.now()}.${ext}`;
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
  await setMenu(meta);
  return NextResponse.json(meta);
}

export async function DELETE() {
  await removeFile(await getMenu());
  await clearMenu();
  return NextResponse.json({ ok: true });
}
