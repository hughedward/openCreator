import { failure, ok } from "@/lib/http";
import { saveUpload } from "@/lib/media-store";

const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const files = form.getAll("files");
    if (!files.length || files.some((file) => !(file instanceof File))) throw new Error("请选择图片");
    for (const item of files as File[]) {
      if (!allowed.has(item.type)) throw new Error("仅支持 JPG、PNG 和 WebP 图片");
      if (item.size > 15 * 1024 * 1024) throw new Error("单张图片不能超过 15MB");
    }
    return ok(await Promise.all((files as File[]).map(saveUpload)));
  } catch (error) { return failure(error); }
}
