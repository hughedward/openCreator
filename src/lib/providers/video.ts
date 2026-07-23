import type { MediaRef, ModelConfig, ProviderConfig, VideoOptions } from "../types";
import { attachmentDataUrl } from "../media-store";
import { apiUrl, upstream } from "./common";
import { buildJimengVideoRequest, submitJimengTask } from "./jimeng";
import { buildKlingVideoRequest, submitKlingVideoTask } from "./kling";
import { encodeTaskRef } from "./tasks";

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
  const usedImages = options.referenceMode === "text" ? [] :
    options.referenceMode === "first_last" ? images.slice(0, 2) :
      options.referenceMode === "references" ? images : images.slice(0, 1);
  return [
    { type: "text", text: videoPrompt(prompt, options) },
    ...usedImages.map((url, index) => ({
      type: "image_url",
      image_url: { url },
      role: options.referenceMode === "references" ? "reference_image" :
        index === 0 ? "first_frame" : "last_frame",
    })),
  ];
}

export async function createVideoTask(
  provider: ProviderConfig, model: ModelConfig, prompt: string,
  attachments: MediaRef[], options: VideoOptions, signal?: AbortSignal,
) {
  const images = await Promise.all(attachments.map(attachmentDataUrl));
  if (provider.apiType === "jimeng") {
    const upstreamId = await submitJimengTask(
      provider,
      buildJimengVideoRequest(model.modelId, prompt, images, options),
      signal,
    );
    return encodeTaskRef({
      protocol: "jimeng", kind: "video", modelId: model.modelId, upstreamId,
    });
  }
  if (provider.apiType === "kling") {
    const upstreamId = await submitKlingVideoTask(
      provider,
      model.modelId,
      options.referenceMode,
      buildKlingVideoRequest(prompt, images, options),
      signal,
    );
    return encodeTaskRef({
      protocol: "kling", kind: "video", modelId: model.modelId, upstreamId,
    });
  }
  const content = buildVideoContent(prompt, images, options);
  const data = await upstream(apiUrl(provider.baseUrl, "contents/generations/tasks", provider.apiType), provider, {
    method: "POST", signal, body: JSON.stringify({ model: model.modelId, content }),
  });
  return data.id as string;
}

export async function getVideoTask(provider: ProviderConfig, taskId: string) {
  return upstream(apiUrl(
    provider.baseUrl, `contents/generations/tasks/${taskId}`, provider.apiType,
  ), provider);
}

export async function cancelVideoTask(provider: ProviderConfig, taskId: string) {
  return upstream(apiUrl(
    provider.baseUrl, `contents/generations/tasks/${taskId}`, provider.apiType,
  ), provider, { method: "DELETE" });
}
