type ImageFile = { name: string; type: string; size: number };

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 15 * 1024 * 1024;

export function pickImageFiles<T extends ImageFile>(files: readonly T[], availableSlots: number) {
  const imageFiles = files.filter((file) => file.type.startsWith("image/"));
  if (!imageFiles.length) return { accepted: [] as T[] };

  const supported = imageFiles.filter((file) => supportedTypes.has(file.type));
  if (!supported.length) {
    return { accepted: [] as T[], error: "仅支持 JPG、PNG 和 WebP 图片" };
  }

  const withinSize = supported.filter((file) => file.size <= maxBytes);
  if (!withinSize.length) {
    return { accepted: [] as T[], error: "单张图片不能超过 15MB" };
  }

  const accepted = withinSize.slice(0, Math.max(0, availableSlots));
  const hasOverflow = withinSize.length > accepted.length;
  const hasOversized = withinSize.length < supported.length;
  return {
    accepted,
    ...(hasOverflow
      ? { error: "每条消息最多添加 2 张图片" }
      : hasOversized ? { error: "部分图片超过 15MB，已忽略" } : {}),
  };
}
