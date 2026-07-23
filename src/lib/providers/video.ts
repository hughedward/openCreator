import type { MediaRef, ModelConfig, ProviderConfig, VideoOptions } from "../types";
import { attachmentDataUrl } from "../media-store";
import { apiUrl, upstream } from "./common";

export function videoPrompt(prompt: string, options: VideoOptions) {
  return `${prompt} --ratio ${options.ratio} --resolution ${options.resolution} --duration ${options.duration}` +
    ` --audio ${options.audio} --watermark ${options.watermark} --camerafixed ${options.cameraFixed}`;
}

export function buildVideoContent(prompt: string, images: string[], options: VideoOptions) {
  if (options.referenceMode === "first_last" && images.length !== 2) {
    throw new Error("首尾帧模式需要两张参考图");
  }
  if (options.referenceMode === "first" && images.length < 1) {
    throw new Error("首帧模式需要一张参考图");
  }
  const usedImages = options.referenceMode === "first_last" ? images.slice(0, 2) : images.slice(0, 1);
  return [
    { type: "text", text: videoPrompt(prompt, options) },
    ...usedImages.map((url, index) => ({
      type: "image_url",
      image_url: { url },
      role: index === 0 ? "first_frame" : "last_frame",
    })),
  ];
}

export async function createVideoTask(
  provider: ProviderConfig, model: ModelConfig, prompt: string,
  attachments: MediaRef[], options: VideoOptions,
) {
  const images = await Promise.all(attachments.map(attachmentDataUrl));
  const content = buildVideoContent(prompt, images, options);
  const data = await upstream(apiUrl(provider.baseUrl, "contents/generations/tasks"), provider, {
    method: "POST", body: JSON.stringify({ model: model.modelId, content }),
  });
  return data.id as string;
}

export async function getVideoTask(provider: ProviderConfig, taskId: string) {
  return upstream(apiUrl(provider.baseUrl, `contents/generations/tasks/${taskId}`), provider);
}
