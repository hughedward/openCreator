import { afterEach, describe, expect, it, vi } from "vitest";
import { apiUrl, healthUrl } from "./common";
import { chat, toChatMessages } from "./chat";
import { buildImageRequest, generateImage, imageSize } from "./image";
import { buildVideoContent, cancelVideoTask, videoPrompt } from "./video";

afterEach(() => vi.unstubAllGlobals());

describe("provider helpers", () => {
  it("joins base URLs without duplicating the API version", () => {
    expect(apiUrl("https://ark.example/api/v3/", "images/generations"))
      .toBe("https://ark.example/api/v3/images/generations");
    expect(apiUrl("https://ark.example", "chat/completions"))
      .toBe("https://ark.example/api/v3/chat/completions");
  });

  it("preserves an OpenAI-compatible v1 base URL", () => {
    expect(apiUrl("http://localhost:11434/v1", "chat/completions"))
      .toBe("http://localhost:11434/v1/chat/completions");
  });

  it("uses an OpenAI-compatible provider root without adding Ark paths", () => {
    expect(apiUrl("https://api.deepseek.com", "chat/completions", "openai"))
      .toBe("https://api.deepseek.com/chat/completions");
    expect(apiUrl("https://api.deepseek.com/chat/completions", "models", "openai"))
      .toBe("https://api.deepseek.com/models");
  });

  it("uses the provider origin ping endpoint for a non-billable connection test", () => {
    expect(healthUrl("https://ark.cn-beijing.volces.com/api/v3"))
      .toBe("https://ark.cn-beijing.volces.com/ping");
  });

  it("embeds image attachments for a vision-capable chat model", () => {
    const messages = toChatMessages([{
      id: "m1",
      role: "user",
      content: "这是什么？",
      createdAt: "2026-07-23T00:00:00.000Z",
      status: "complete",
      attachments: [{
        kind: "image",
        name: "frame.png",
        path: "uploads/frame.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,AAAA",
      }],
    }], {
      id: "chat", name: "Chat", modelId: "chat", type: "chat",
      maxReferenceImages: 2, maxVideoDuration: 10, supportsImageInput: true,
    });
    expect(messages[0].content).toEqual([
      { type: "text", text: "这是什么？" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
    ]);
  });

  it("drops historical image attachments for a text-only chat model", () => {
    // 回归:曾在图像/视频模型下上传的参考图,不应被串进纯文本对话(DeepSeek 等)的请求。
    const messages = toChatMessages([{
      id: "m1",
      role: "user",
      content: "以这张图里的小人为主角",
      createdAt: "2026-07-23T00:00:00.000Z",
      status: "complete",
      attachments: [{
        kind: "image",
        name: "ref.png",
        path: "uploads/ref.png",
        mimeType: "image/png",
        dataUrl: "data:image/png;base64,BBCC",
      }],
    }, {
      id: "m2",
      role: "user",
      content: "nihao",
      createdAt: "2026-07-23T00:00:01.000Z",
      status: "complete",
    }], {
      id: "deepseek", name: "DeepSeek", modelId: "deepseek-v4-pro", type: "chat",
      maxReferenceImages: 2, maxVideoDuration: 10, supportsImageInput: false,
    });
    // 两条用户消息都退化为纯文本,历史参考图不再以 image_url 发出。
    expect(messages.every((message) => typeof message.content === "string")).toBe(true);
    expect(messages[0].content).toBe("以这张图里的小人为主角");
    expect(messages[1].content).toBe("nihao");
  });

  it("encodes selected video controls into the provider prompt", () => {
    expect(videoPrompt("一只奔跑的猫", {
      ratio: "16:9", resolution: "1080p", duration: 5,
      count: 1, referenceMode: "first", audio: true, watermark: false, cameraFixed: false,
    })).toContain("--duration 5");
  });

  it("maps image ratios and resolution to a concrete size", () => {
    expect(imageSize({ ratio: "16:9", resolution: "2K", count: 1 })).toBe("2048x1152");
    expect(imageSize({
      ratio: "custom", width: 1600, height: 900, resolution: "4K", count: 1,
    })).toBe("1600x900");
    expect(imageSize({ ratio: "adaptive", resolution: "4K", count: 1 })).toBe("4K");
  });

  it("enables group image generation for counts above one", () => {
    const body = buildImageRequest("model", "四季风景", [], {
      ratio: "1:1", resolution: "2K", count: 4,
    });
    expect(body.prompt).toContain("共 4 张");
    expect(body.sequential_image_generation).toBe("auto");
    expect(body.sequential_image_generation_options).toEqual({ max_images: 4 });
  });

  it("marks first and last frame references for video", () => {
    const content = buildVideoContent("镜头缓慢推进", ["first", "last"], {
      referenceMode: "first_last", ratio: "adaptive", resolution: "720p",
      duration: 5, count: 1, audio: true, watermark: false, cameraFixed: false,
    });
    expect(content.slice(1)).toEqual([
      { type: "image_url", image_url: { url: "first" }, role: "first_frame" },
      { type: "image_url", image_url: { url: "last" }, role: "last_frame" },
    ]);
  });

  it("requires two references in first-last-frame mode", () => {
    expect(() => buildVideoContent("测试", ["first"], {
      referenceMode: "first_last", ratio: "16:9", resolution: "720p",
      duration: 5, count: 1, audio: true, watermark: false, cameraFixed: false,
    })).toThrow("首尾帧模式需要两张参考图");
  });

  it("builds text-to-video content without images", () => {
    const content = buildVideoContent("雨夜街道", [], {
      referenceMode: "text", ratio: "16:9", resolution: "720p",
      duration: 5, count: 1, audio: true, watermark: false, cameraFixed: false,
    });
    expect(content).toHaveLength(1);
    expect(content[0]).toMatchObject({ type: "text" });
  });

  it("marks several multi-reference images as reference images", () => {
    const content = buildVideoContent("角色保持一致", ["a", "b", "c"], {
      referenceMode: "references", ratio: "adaptive", resolution: "720p",
      duration: 5, count: 1, audio: true, watermark: false, cameraFixed: false,
    });
    expect(content.slice(1).map((item) => "role" in item ? item.role : undefined)).toEqual([
      "reference_image", "reference_image", "reference_image",
    ]);
  });

  it("cancels a queued Ark video task with the provider delete endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);

    await cancelVideoTask({
      id: "ark",
      name: "Ark",
      baseUrl: "https://ark.cn-beijing.volces.com",
      apiKey: "secret",
      apiType: "ark",
      models: [],
    }, "cgt-123");

    expect(fetchMock).toHaveBeenCalledWith(
      "https://ark.cn-beijing.volces.com/api/v3/contents/generations/tasks/cgt-123",
      expect.objectContaining({ method: "DELETE" }),
    );
  });

  it("passes an abort signal to chat and image provider requests", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({
        choices: [{ message: { content: "ok" } }],
      }), { status: 200, headers: { "Content-Type": "application/json" } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ data: [] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }));
    vi.stubGlobal("fetch", fetchMock);
    const controller = new AbortController();
    const provider = {
      id: "ark", name: "Ark", baseUrl: "https://ark.example", apiKey: "secret",
      apiType: "ark" as const, models: [],
    };

    await chat(provider, {
      id: "chat", name: "Chat", modelId: "chat", type: "chat",
      maxReferenceImages: 2, maxVideoDuration: 10, supportsImageInput: false,
    }, [], controller.signal);
    await generateImage(provider, {
      id: "image", name: "Image", modelId: "image", type: "image",
      maxReferenceImages: 2, maxVideoDuration: 10, supportsImageInput: true,
    }, "test", [], { ratio: "1:1", resolution: "2K", count: 1 }, controller.signal);

    expect(fetchMock.mock.calls[0][1]).toEqual(expect.objectContaining({ signal: controller.signal }));
    expect(fetchMock.mock.calls[1][1]).toEqual(expect.objectContaining({ signal: controller.signal }));
  });
});
