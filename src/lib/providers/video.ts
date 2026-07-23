import type { MediaRef, ModelConfig, ProviderConfig, VideoOptions } from "../types";
import { attachmentDataUrl } from "../media-store";
import { apiUrl, upstream } from "./common";

export function videoPrompt(prompt: string, options: VideoOptions) {
  return `${prompt} --ratio ${options.ratio} --resolution ${options.resolution} --duration ${options.duration}` +
    ` --audio ${options.audio} --watermark ${options.watermark} --camerafixed ${options.cameraFixed}`;
}

export async function createVideoTask(
  provider: ProviderConfig, model: ModelConfig, prompt: string,
  attachments: MediaRef[], options: VideoOptions,
) {
  const content: unknown[] = [{ type: "text", text: videoPrompt(prompt, options) }];
  for (let index = 0; index < attachments.length; index++) {
    content.push({
      type: "image_url",
      image_url: { url: await attachmentDataUrl(attachments[index]) },
      role: index === 0 ? "first_frame" : "last_frame",
    });
  }
  const data = await upstream(apiUrl(provider.baseUrl, "contents/generations/tasks"), provider, {
    method: "POST", body: JSON.stringify({ model: model.modelId, content }),
  });
  return data.id as string;
}

export async function getVideoTask(provider: ProviderConfig, taskId: string) {
  return upstream(apiUrl(provider.baseUrl, `contents/generations/tasks/${taskId}`), provider);
}
