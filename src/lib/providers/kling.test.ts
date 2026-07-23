import { describe, expect, it, vi } from "vitest";
import type { ProviderConfig } from "../types";
import {
  buildKlingImageRequest,
  buildKlingVideoRequest,
  queryKlingTask,
  submitKlingImageTask,
  submitKlingVideoTask,
} from "./kling";

const provider: ProviderConfig = {
  id: "kling",
  name: "可灵",
  baseUrl: "https://api-singapore.klingai.com",
  apiKey: "secret",
  apiType: "kling",
  models: [],
};

describe("Kling API 2.0 provider", () => {
  it("builds an Omni image request with several local references", () => {
    expect(buildKlingImageRequest(
      "kling-v3-omni",
      "统一角色风格",
      ["data:image/png;base64,QUJD", "data:image/jpeg;base64,REVG"],
      { ratio: "3:2", resolution: "4K", count: 4 },
    )).toEqual({
      model_name: "kling-v3-omni",
      prompt: "统一角色风格",
      image_list: [{ image: "QUJD" }, { image: "REVG" }],
      resolution: "4k",
      n: 4,
      result_type: "single",
      aspect_ratio: "3:2",
      watermark_info: { enabled: false },
    });
  });

  it("omits unsupported auto ratio for the standard image endpoint", () => {
    expect(buildKlingImageRequest(
      "kling-v3",
      "电影海报",
      [],
      { ratio: "adaptive", resolution: "2K", count: 1 },
    )).not.toHaveProperty("aspect_ratio");
  });

  it("uses text-to-video settings as native fields", () => {
    expect(buildKlingVideoRequest("电影感城市", [], {
      referenceMode: "text", ratio: "9:16", resolution: "1080p",
      duration: 12, count: 1, audio: true, watermark: false, cameraFixed: false,
    })).toEqual({
      prompt: "电影感城市",
      settings: { resolution: "1080p", duration: 12, aspect_ratio: "9:16" },
      options: { watermark_info: { enabled: false } },
    });
  });

  it("uses one Base64 first frame for image-to-video", () => {
    expect(buildKlingVideoRequest("轻轻眨眼", ["data:image/png;base64,QUJD"], {
      referenceMode: "first", ratio: "adaptive", resolution: "720p",
      duration: 5, count: 1, audio: false, watermark: true, cameraFixed: false,
    })).toEqual({
      contents: [
        { type: "prompt", text: "轻轻眨眼" },
        { type: "first_frame", url: "QUJD" },
      ],
      settings: { resolution: "720p", duration: 5 },
      options: { watermark_info: { enabled: true } },
    });
  });

  it("submits image and video tasks to their documented endpoints", async () => {
    const fetcher = vi.fn()
      .mockResolvedValueOnce(Response.json({ code: 0, data: { task_id: "image-1" } }))
      .mockResolvedValueOnce(Response.json({ code: 0, data: { id: "video-1" } }));

    await expect(submitKlingImageTask(
      provider,
      "kling-v3-omni",
      { model_name: "kling-v3-omni", prompt: "test" },
      undefined,
      fetcher,
    )).resolves.toBe("image-1");
    await expect(submitKlingVideoTask(
      provider,
      "kling-3.0-turbo",
      "text",
      { prompt: "test" },
      undefined,
      fetcher,
    )).resolves.toBe("video-1");

    expect(fetcher.mock.calls[0][0]).toBe(
      "https://api-singapore.klingai.com/v1/images/omni-image",
    );
    expect(fetcher.mock.calls[1][0]).toBe(
      "https://api-singapore.klingai.com/text-to-video/kling-3.0-turbo",
    );
  });

  it("normalizes successful video outputs", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      code: 0,
      data: [{
        id: "video-1",
        status: "succeeded",
        outputs: [{ type: "video", url: "https://example.com/video.mp4" }],
      }],
    }));

    await expect(queryKlingTask(
      provider,
      "kling-3.0-turbo",
      "video-1",
      "video",
      fetcher,
    )).resolves.toEqual({
      status: "succeeded",
      urls: ["https://example.com/video.mp4"],
    });
  });
});
