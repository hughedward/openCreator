import type { Message, ModelConfig, ProviderConfig } from "../types";
import { attachmentDataUrl } from "../media-store";
import { apiUrl, upstream } from "./common";

export function toChatMessages(messages: Message[], model: ModelConfig) {
  return messages.filter((message) => message.status === "complete").map((message) => {
    // 仅当当前对话模型支持图片输入时,才把用户附件转成 image_url。
    // 否则历史里残留的参考图(如曾在图像/视频模型下上传)不会被串进纯文本对话请求。
    if (message.role !== "user" || !model.supportsImageInput || !message.attachments?.length) {
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
    body: JSON.stringify({ model: model.modelId, messages: toChatMessages(hydrated, model) }),
  });
  return data.choices?.[0]?.message?.content || "";
}
