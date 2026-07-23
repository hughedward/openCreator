import { describe, expect, it } from "vitest";
import { apiUrl, healthUrl } from "./common";
import { toChatMessages } from "./chat";
import { buildImageRequest, imageSize } from "./image";
import { buildVideoContent, videoPrompt } from "./video";

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

  it("uses the provider origin ping endpoint for a non-billable connection test", () => {
    expect(healthUrl("https://ark.cn-beijing.volces.com/api/v3"))
      .toBe("https://ark.cn-beijing.volces.com/ping");
  });

  it("converts local image attachments to multimodal chat content", () => {
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
    }]);
    expect(messages[0].content).toEqual([
      { type: "text", text: "这是什么？" },
      { type: "image_url", image_url: { url: "data:image/png;base64,AAAA" } },
    ]);
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
});
