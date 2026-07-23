import { describe, expect, it } from "vitest";
import { apiUrl, healthUrl } from "./common";
import { toChatMessages } from "./chat";
import { videoPrompt } from "./video";

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
      audio: true, watermark: false, cameraFixed: false,
    })).toContain("--duration 5");
  });
});
