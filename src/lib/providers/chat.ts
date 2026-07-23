import type { Message, ModelConfig, ProviderConfig } from "../types";
import { attachmentDataUrl } from "../media-store";
import { apiUrl, upstream } from "./common";

export function toChatMessages(messages: Message[]) {
  return messages.filter((message) => message.status === "complete").map((message) => {
    if (message.role !== "user" || !message.attachments?.length) {
      return { role: message.role, content: message.content };
    }
    return {
      role: message.role,
      content: [
        { type: "text", text: message.content },
        ...message.attachments.map((attachment) => ({
          type: "image_url",
          image_url: { url: attachment.dataUrl || `/api/media/${attachment.path}` },
        })),
      ],
    };
  });
}

export async function chat(
  provider: ProviderConfig, model: ModelConfig, messages: Message[], signal?: AbortSignal,
) {
  const hydrated = await Promise.all(messages.map(async (message) => ({
    ...message,
    attachments: await Promise.all((message.attachments || []).map(async (attachment) => ({
      ...attachment, dataUrl: await attachmentDataUrl(attachment),
    }))),
  })));
  const data = await upstream(apiUrl(provider.baseUrl, "chat/completions", provider.apiType), provider, {
    method: "POST",
    signal,
    body: JSON.stringify({ model: model.modelId, messages: toChatMessages(hydrated) }),
  });
  return data.choices?.[0]?.message?.content || "";
}
