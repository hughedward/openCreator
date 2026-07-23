import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { failure } from "@/lib/http";
import { inside, outDir } from "@/lib/paths";

const contentTypes: Record<string, string> = {
  ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
  ".webp": "image/webp", ".mp4": "video/mp4",
};

export async function GET(_: Request, context: { params: Promise<{ path: string[] }> }) {
  try {
    const path = inside(outDir, ...(await context.params).path);
    return new Response(await readFile(path), {
      headers: {
        "Content-Type": contentTypes[extname(path).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "private, max-age=31536000, immutable",
      },
    });
  } catch (error) { return failure(error, 404); }
}
