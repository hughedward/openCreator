import { describe, expect, it } from "vitest";
import { appConfigSchema, conversationSchema } from "./schemas";

describe("appConfigSchema", () => {
  it("accepts a provider with several capability-specific models", () => {
    const result = appConfigSchema.safeParse({
      providers: [{
        id: "ark",
        name: "火山方舟",
        baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
        apiKey: "secret",
        models: [
          { id: "chat", name: "聊天", modelId: "doubao-chat", type: "chat" },
          { id: "image", name: "Seedream", modelId: "doubao-seedream-4-5-251128", type: "image" },
        ],
      }],
    });

    expect(result.success).toBe(true);
  });

  it("rejects duplicate model identifiers in one provider", () => {
    const result = appConfigSchema.safeParse({
      providers: [{
        id: "ark",
        name: "Ark",
        baseUrl: "https://example.com",
        apiKey: "secret",
        models: [
          { id: "same", name: "One", modelId: "one", type: "chat" },
          { id: "same", name: "Two", modelId: "two", type: "image" },
        ],
      }],
    });

    expect(result.success).toBe(false);
  });
});

describe("conversationSchema", () => {
  it("keeps generation metadata and local media references", () => {
    const result = conversationSchema.safeParse({
      id: "conversation-1",
      title: "雨夜列车",
      providerId: "ark",
      modelId: "video",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:01:00.000Z",
      messages: [{
        id: "message-1",
        role: "assistant",
        content: "",
        createdAt: "2026-07-23T00:01:00.000Z",
        status: "processing",
        taskId: "task-1",
        media: [{ kind: "video", path: "videos/result.mp4", name: "result.mp4" }],
      }],
    });

    expect(result.success).toBe(true);
  });
});
