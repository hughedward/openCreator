import { getConfig } from "@/lib/config-store";
import { getConversation, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";
import { downloadMedia } from "@/lib/media-store";
import { resolveModel } from "@/lib/providers/common";
import { getVideoTask } from "@/lib/providers/video";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const taskId = (await context.params).id;
    const query = new URL(request.url).searchParams;
    const conversation = await getConversation(query.get("conversationId") || "");
    if (!conversation) throw new Error("会话不存在");
    const { provider } = resolveModel(
      await getConfig(), conversation.providerId || "", conversation.modelId || "",
    );
    const task = await getVideoTask(provider, taskId);
    const status = String(task.status || "").toLowerCase();
    const message = conversation.messages.find((item) => item.taskId === taskId);
    if (!message) throw new Error("生成消息不存在");

    if (["succeeded", "success", "completed"].includes(status)) {
      const url = task.content?.video_url || task.output?.video_url || task.video_url;
      if (!url) throw new Error("任务完成但没有返回视频地址");
      message.media = [await downloadMedia(url, "video")];
      message.status = "complete";
      conversation.updatedAt = new Date().toISOString();
      await saveConversation(conversation);
    } else if (["failed", "cancelled", "canceled"].includes(status)) {
      message.status = "failed";
      message.error = task.error?.message || "视频生成失败";
      await saveConversation(conversation);
    }
    return ok({ status, conversation });
  } catch (error) { return failure(error); }
}
