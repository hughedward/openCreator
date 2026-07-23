import { getConfig } from "@/lib/config-store";
import { getConversation, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";
import { chat } from "@/lib/providers/chat";
import { resolveModel } from "@/lib/providers/common";
import { generateImage } from "@/lib/providers/image";
import { createVideoTask } from "@/lib/providers/video";
import { generateRequestSchema } from "@/lib/schemas";
import type { ImageOptions, Message, VideoOptions } from "@/lib/types";
import { validateReferenceCount } from "@/lib/reference-images";

const defaultVideo: VideoOptions = {
  referenceMode: "text", ratio: "adaptive", resolution: "720p", duration: 5,
  count: 1, audio: true, watermark: false, cameraFixed: false,
};
const defaultImage: ImageOptions = { ratio: "adaptive", resolution: "2K", count: 1 };

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
    if (input.imageOptions) conversation.imageOptions = input.imageOptions;
    if (input.videoOptions) conversation.videoOptions = input.videoOptions;

    if (model.type === "chat") {
      assistant.content = await chat(provider, model, conversation.messages);
      assistant.status = "complete";
    } else if (model.type === "image") {
      assistant.media = await generateImage(
        provider, model, input.prompt, input.attachments, input.imageOptions || defaultImage,
      );
      assistant.status = "complete";
    } else {
      const options = input.videoOptions || defaultVideo;
      validateReferenceCount(options.referenceMode, input.attachments.length, model.maxReferenceImages);
      assistant.taskIds = [];
      for (let index = 0; index < options.count; index++) {
        assistant.taskIds.push(await createVideoTask(
          provider, model, input.prompt, input.attachments, options,
        ));
      }
      assistant.taskId = assistant.taskIds[0];
      assistant.completedTaskIds = [];
      assistant.failedTaskIds = [];
    }
    conversation.messages.push(assistant);
    conversation.updatedAt = new Date().toISOString();
    await saveConversation(conversation);
    return ok({ conversation, assistant });
  } catch (error) { return failure(error); }
}
