import type { Message } from "./types";

export function unfinishedTaskIds(message: Message) {
  const taskIds = message.taskIds?.length ? message.taskIds :
    message.taskId ? [message.taskId] : [];
  const terminal = new Set([
    ...(message.completedTaskIds || []),
    ...(message.failedTaskIds || []),
  ]);
  return taskIds.filter((taskId) => !terminal.has(taskId));
}

export function stopMessageText(previous: string | undefined, cancelError: string) {
  return cancelError || previous === "已停止等待，云端任务可能仍在生成"
    ? "已停止等待，云端任务可能仍在生成"
    : "已停止生成";
}
