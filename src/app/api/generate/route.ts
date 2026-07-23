import { getConfig } from "@/lib/config-store";
import { getConversation, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";
import { chat } from "@/lib/providers/chat";
import { resolveModel } from "@/lib/providers/common";
import { generateImage } from "@/lib/providers/image";
import { createVideoTask } from "@/lib/providers/video";
import { generateRequestSchema } from "@/lib/schemas";
import type { Message, VideoOptions } from "@/lib/types";

const defaultVideo: VideoOptions = {
  ratio: "16:9", resolution: "720p", duration: 5,
  audio: true, watermark: false, cameraFixed: false,
};

export async function POST(request: Request) {
  try {
    const input = generateRequestSchema.parse(await request.json());
    const conversation = await getConversation(input.conversationId);
    if (!conversation) throw new Error("会话不存在");
    const { provider, model } = resolveModel(await getConfig(), input.providerId, input.modelId);
    const assistant: Message = {
      id: crypto.randomUUID(), role: "assistant", content: "",
      createdAt: new Date().toISOString(), status: "processing",
    };
    conversation.providerId = input.providerId;
    conversation.modelId = input.modelId;

    if (model.type === "chat") {
      assistant.content = await chat(provider, model, conversation.messages);
      assistant.status = "complete";
    } else if (model.type === "image") {
      assistant.media = await generateImage(provider, model, input.prompt, input.attachments);
      assistant.status = "complete";
    } else {
      assistant.taskId = await createVideoTask(
        provider, model, input.prompt, input.attachments, input.videoOptions || defaultVideo,
      );
    }
    conversation.messages.push(assistant);
    conversation.updatedAt = new Date().toISOString();
    await saveConversation(conversation);
    return ok({ conversation, assistant });
  } catch (error) { return failure(error); }
}
