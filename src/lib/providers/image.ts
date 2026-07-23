import type { MediaRef, ModelConfig, ProviderConfig } from "../types";
import { attachmentDataUrl, downloadMedia } from "../media-store";
import { apiUrl, upstream } from "./common";

export async function generateImage(
  provider: ProviderConfig, model: ModelConfig, prompt: string, attachments: MediaRef[],
) {
  const image = await Promise.all(attachments.map(attachmentDataUrl));
  const data = await upstream(apiUrl(provider.baseUrl, "images/generations"), provider, {
    method: "POST",
    body: JSON.stringify({
      model: model.modelId, prompt, ...(image.length ? { image } : {}),
      sequential_image_generation: "disabled",
      response_format: "url", size: "2K", stream: false, watermark: false,
    }),
  });
  return Promise.all((data.data || []).map((item: { url: string }) => downloadMedia(item.url, "image")));
}
