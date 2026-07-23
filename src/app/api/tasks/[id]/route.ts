import { getConfig } from "@/lib/config-store";
import { getConversation, saveConversation } from "@/lib/conversation-store";
import { failure, ok } from "@/lib/http";
import { downloadMedia } from "@/lib/media-store";
import { resolveModel } from "@/lib/providers/common";
import { cancelVideoTask, getVideoTask } from "@/lib/providers/video";
import { stopMessageText, unfinishedTaskIds } from "@/lib/generation-stop";

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
    const message = conversation.messages.find((item) =>
      item.taskId === taskId || item.taskIds?.includes(taskId));
    if (!message) throw new Error("生成消息不存在");

    if (["succeeded", "success", "completed"].includes(status)) {
      const url = task.content?.video_url || task.output?.video_url || task.video_url;
      if (!url) throw new Error("任务完成但没有返回视频地址");
      message.media = [...(message.media || []), await downloadMedia(url, "video")];
      message.completedTaskIds = [...new Set([...(message.completedTaskIds || []), taskId])];
      conversation.updatedAt = new Date().toISOString();
    } else if (["failed", "cancelled", "canceled"].includes(status)) {
      message.failedTaskIds = [...new Set([...(message.failedTaskIds || []), taskId])];
      message.error = task.error?.message || "部分视频生成失败";
    }
    const terminalCount = (message.completedTaskIds?.length || 0) + (message.failedTaskIds?.length || 0);
    const totalCount = message.taskIds?.length || 1;
    if (terminalCount >= totalCount) {
      message.status = message.completedTaskIds?.length ? "complete" : "failed";
    }
    await saveConversation(conversation);
    return ok({ status, conversation });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const taskId = (await context.params).id;
    const query = new URL(request.url).searchParams;
    const conversation = await getConversation(query.get("conversationId") || "");
    if (!conversation) throw new Error("会话不存在");
    const message = conversation.messages.find((item) =>
      ["processing", "stopped"].includes(item.status) && unfinishedTaskIds(item).includes(taskId));
    if (!message) throw new Error("待停止的视频任务不存在");
    const { provider } = resolveModel(
      await getConfig(), conversation.providerId || "", conversation.modelId || "",
    );

    let cancelError = "";
    try {
      await cancelVideoTask(provider, taskId);
      message.failedTaskIds = [...new Set([...(message.failedTaskIds || []), taskId])];
    } catch (cause) {
      cancelError = (cause as Error).message;
    }
    message.status = "stopped";
    message.error = stopMessageText(message.error, cancelError);
    conversation.updatedAt = new Date().toISOString();
    await saveConversation(conversation);
    return ok({ conversation, cancelled: !cancelError, error: cancelError || undefined });
  } catch (error) { return failure(error); }
}
