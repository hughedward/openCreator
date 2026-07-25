type ImageFile = { name: string; type: string; size: number };

const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const maxBytes = 15 * 1024 * 1024;

/**
 * 按本条消息的图片上限(limit)和已用张数(currentCount)筛选可接受的图片。
 * - limit === 0 表示当前模式/模型不接受参考图,溢出时提示"当前模式不支持参考图";
 * - limit >  0 时溢出提示真实的上限,不再写死"2 张"。
 */
export function pickImageFiles<T extends ImageFile>(
  files: readonly T[],
  limit: number,
  currentCount = 0,
) {
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

  const remaining = Math.max(0, limit - currentCount);
  const accepted = withinSize.slice(0, remaining);
  const hasOverflow = withinSize.length > accepted.length;
  const hasOversized = withinSize.length < supported.length;
  const overflowError = limit === 0
    ? "当前模式不支持参考图"
    : `每条消息最多添加 ${limit} 张图片`;
  return {
    accepted,
    ...(hasOverflow
      ? { error: overflowError }
      : hasOversized ? { error: "部分图片超过 15MB，已忽略" } : {}),
  };
}
