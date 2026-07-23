import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, extname } from "node:path";
import { inside, outDir } from "./paths";
import type { MediaRef } from "./types";

const safeName = (name: string) =>
  basename(name).replace(/[^\p{L}\p{N}._-]+/gu, "-").slice(-100) || "file";

export async function saveUpload(file: File): Promise<MediaRef> {
  const extension = extname(file.name) || ".bin";
  const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${safeName(file.name || `upload${extension}`)}`;
  const relative = `uploads/${name}`;
  const target = inside(outDir, relative);
  await mkdir(inside(outDir, "uploads"), { recursive: true });
  await writeFile(target, Buffer.from(await file.arrayBuffer()));
  return { kind: "image", path: relative, name: file.name, mimeType: file.type };
}

export async function attachmentDataUrl(media: MediaRef) {
  if (media.dataUrl) return media.dataUrl;
  const bytes = await readFile(inside(outDir, media.path));
  return `data:${media.mimeType || "image/png"};base64,${bytes.toString("base64")}`;
}

export async function downloadMedia(url: string, kind: "image" | "video"): Promise<MediaRef> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("无法下载生成结果");
  const contentType = response.headers.get("content-type") || (kind === "image" ? "image/jpeg" : "video/mp4");
  const ext = contentType.includes("png") ? ".png" : contentType.includes("webp") ? ".webp" :
    contentType.includes("video") ? ".mp4" : ".jpg";
  const name = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const relative = `${kind}s/${name}`;
  await mkdir(inside(outDir, `${kind}s`), { recursive: true });
  await writeFile(inside(outDir, relative), Buffer.from(await response.arrayBuffer()));
  return { kind, path: relative, name, mimeType: contentType };
}
