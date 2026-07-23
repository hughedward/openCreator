import { describe, expect, it } from "vitest";
import { appConfigSchema, conversationSchema, generateRequestSchema } from "./schemas";

describe("appConfigSchema", () => {
  it("accepts a provider with several capability-specific models", () => {
    const result = appConfigSchema.parse({
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

    expect(result.providers[0].models[0].maxReferenceImages).toBe(2);
    expect(result.providers[0].models[0].maxVideoDuration).toBe(10);
    expect(result.providers[0].apiType).toBe("ark");
  });

  it("infers OpenAI compatibility for an existing DeepSeek provider", () => {
    const result = appConfigSchema.parse({
      providers: [{
        id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com",
        apiKey: "secret", models: [{
          id: "chat", name: "DeepSeek", modelId: "deepseek-v4-pro", type: "chat",
        }],
      }],
    });
    expect(result.providers[0].apiType).toBe("openai");
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

  it("persists image and video generation options per conversation", () => {
    const result = conversationSchema.safeParse({
      id: "conversation-2",
      title: "参数测试",
      createdAt: "2026-07-23T00:00:00.000Z",
      updatedAt: "2026-07-23T00:01:00.000Z",
      messages: [],
      imageOptions: {
        ratio: "3:2", resolution: "4K", count: 4,
      },
      videoOptions: {
        referenceMode: "first_last", ratio: "adaptive", resolution: "720p",
        duration: 5, count: 4, audio: true, watermark: false, cameraFixed: false,
      },
    });

    expect(result.success).toBe(true);
  });
});

describe("generateRequestSchema", () => {
  it("rejects generation counts outside the safe 1–4 range", () => {
    const result = generateRequestSchema.safeParse({
      conversationId: "conversation-1",
      providerId: "ark",
      modelId: "image",
      prompt: "测试",
      attachments: [],
      imageOptions: { ratio: "1:1", resolution: "2K", count: 5 },
    });

    expect(result.success).toBe(false);
  });

  it("accepts text and multi-reference video modes", () => {
    for (const referenceMode of ["text", "references"] as const) {
      const result = generateRequestSchema.safeParse({
        conversationId: "conversation-1", providerId: "ark", modelId: "video",
        prompt: "测试", attachments: [],
        videoOptions: {
          referenceMode, ratio: "adaptive", resolution: "720p",
          duration: 5, count: 1, audio: true, watermark: false, cameraFixed: false,
        },
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects reference image limits above eight", () => {
    const result = appConfigSchema.safeParse({
      providers: [{
        id: "ark", name: "Ark", baseUrl: "https://example.com", apiKey: "secret",
        models: [{
          id: "video", name: "Video", modelId: "video", type: "video", maxReferenceImages: 9,
        }],
      }],
    });
    expect(result.success).toBe(false);
  });

  it("accepts a future video duration within the configured schema ceiling", () => {
    const result = generateRequestSchema.safeParse({
      conversationId: "conversation-1", providerId: "ark", modelId: "video",
      prompt: "测试", attachments: [],
      videoOptions: {
        referenceMode: "text", ratio: "16:9", resolution: "720p",
        duration: 30, count: 1, audio: true, watermark: false, cameraFixed: false,
      },
    });
    expect(result.success).toBe(true);
  });
});
