import { describe, expect, it } from "vitest";
import { stopMessageText, unfinishedTaskIds } from "./generation-stop";

describe("unfinishedTaskIds", () => {
  it("returns only video tasks that have not reached a terminal state", () => {
    expect(unfinishedTaskIds({
      id: "message-1",
      role: "assistant",
      content: "",
      createdAt: "2026-07-23T00:00:00.000Z",
      status: "processing",
      taskIds: ["task-1", "task-2", "task-3"],
      completedTaskIds: ["task-1"],
      failedTaskIds: ["task-2"],
    })).toEqual(["task-3"]);
  });

  it("supports the legacy single task id", () => {
    expect(unfinishedTaskIds({
      id: "message-1",
      role: "assistant",
      content: "",
      createdAt: "2026-07-23T00:00:00.000Z",
      status: "processing",
      taskId: "task-1",
    })).toEqual(["task-1"]);
  });
});

describe("stopMessageText", () => {
  it("keeps the cloud-running warning when a later task cancels successfully", () => {
    expect(stopMessageText("已停止等待，云端任务可能仍在生成", ""))
      .toBe("已停止等待，云端任务可能仍在生成");
  });
});
