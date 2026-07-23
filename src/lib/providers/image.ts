import type { ImageOptions, MediaRef, ModelConfig, ProviderConfig } from "../types";
import { attachmentDataUrl, downloadMedia } from "../media-store";
import { apiUrl, upstream } from "./common";

const IMAGE_SIZES: Record<Exclude<ImageOptions["ratio"], "adaptive" | "custom">, [number, number]> = {
  "1:1": [2048, 2048],
  "3:4": [1536, 2048],
  "4:3": [2048, 1536],
  "16:9": [2048, 1152],
  "9:16": [1152, 2048],
  "2:3": [1360, 2048],
  "3:2": [2048, 1360],
  "21:9": [2048, 880],
};

export function imageSize(options: ImageOptions) {
  if (options.ratio === "custom") return `${options.width}x${options.height}`;
  if (options.ratio === "adaptive") return options.resolution;
  const [baseWidth, baseHeight] = IMAGE_SIZES[options.ratio];
  const scale = options.resolution === "4K" ? 2 : 1;
  return `${baseWidth * scale}x${baseHeight * scale}`;
}

export function buildImageRequest(
  model: string, prompt: string, image: string[], options: ImageOptions,
) {
  const multiple = options.count > 1;
  return {
    model,
    prompt: multiple ? `${prompt}\n请生成一组共 ${options.count} 张图片，保持主题与风格一致。` : prompt,
    ...(image.length ? { image } : {}),
    sequential_image_generation: multiple ? "auto" : "disabled",
    ...(multiple ? { sequential_image_generation_options: { max_images: options.count } } : {}),
    response_format: "url",
    size: imageSize(options),
    stream: false,
    watermark: false,
  };
}

export async function generateImage(
  provider: ProviderConfig, model: ModelConfig, prompt: string, attachments: MediaRef[],
  options: ImageOptions,
) {
  const image = await Promise.all(attachments.map(attachmentDataUrl));
  const data = await upstream(apiUrl(provider.baseUrl, "images/generations"), provider, {
    method: "POST",
    body: JSON.stringify(buildImageRequest(model.modelId, prompt, image, options)),
  });
  return Promise.all((data.data || []).map((item: { url: string }) => downloadMedia(item.url, "image")));
}
