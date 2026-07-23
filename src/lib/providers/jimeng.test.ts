import { describe, expect, it, vi } from "vitest";
import type { ProviderConfig } from "../types";
import {
  buildJimengImageRequest,
  buildJimengVideoRequest,
  queryJimengTask,
  submitJimengTask,
} from "./jimeng";

const provider: ProviderConfig = {
  id: "jimeng",
  name: "即梦视觉",
  baseUrl: "https://visual.volcengineapi.com",
  apiKey: "",
  accessKeyId: "AKLT-example",
  secretAccessKey: "secret",
  apiType: "jimeng",
  models: [],
};

describe("Jimeng Visual provider", () => {
  it("maps image options and requests an exact group size through the prompt", () => {
    expect(buildJimengImageRequest(
      "jimeng_seedream46_cvtob",
      "四季风景",
      ["data:image/png;base64,QUJD"],
      { ratio: "16:9", resolution: "2K", count: 4 },
    )).toEqual({
      req_key: "jimeng_seedream46_cvtob",
      prompt: "四季风景\n请生成一组共 4 张图片，保持主题与风格一致。",
      binary_data_base64: ["QUJD"],
      width: 2048,
      height: 1152,
      force_single: false,
    });
  });

  it("forces a single adaptive image", () => {
    expect(buildJimengImageRequest(
      "jimeng_seedream46_cvtob",
      "一只猫",
      [],
      { ratio: "adaptive", resolution: "4K", count: 1 },
    )).toMatchObject({ size: 4096 * 4096, force_single: true });
  });

  it("maps text and first-frame video requests", () => {
    expect(buildJimengVideoRequest(
      "jimeng_ti2v_v30_pro", "海边日落", [], {
        referenceMode: "text", ratio: "16:9", resolution: "720p",
        duration: 10, count: 1, audio: false, watermark: false, cameraFixed: false,
      },
    )).toEqual({
      req_key: "jimeng_ti2v_v30_pro",
      prompt: "海边日落",
      frames: 241,
      aspect_ratio: "16:9",
    });

    expect(buildJimengVideoRequest(
      "jimeng_ti2v_v30_pro", "镜头推进", ["data:image/png;base64,QUJD"], {
        referenceMode: "first", ratio: "adaptive", resolution: "720p",
        duration: 5, count: 1, audio: false, watermark: false, cameraFixed: false,
      },
    )).toMatchObject({ frames: 121, binary_data_base64: ["QUJD"] });
  });

  it("rejects unsupported Jimeng video durations before submission", () => {
    expect(() => buildJimengVideoRequest(
      "jimeng_ti2v_v30_pro", "测试", [], {
        referenceMode: "text", ratio: "16:9", resolution: "720p",
        duration: 8, count: 1, audio: false, watermark: false, cameraFixed: false,
      },
    )).toThrow("仅支持 5 秒或 10 秒");
  });

  it("submits a signed task and returns its upstream id", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      code: 10000,
      message: "Success",
      data: { task_id: "task-1" },
    }));

    await expect(submitJimengTask(
      provider,
      { req_key: "jimeng_seedream46_cvtob", prompt: "雨夜" },
      undefined,
      fetcher,
    )).resolves.toBe("task-1");
    expect(fetcher).toHaveBeenCalledWith(
      "https://visual.volcengineapi.com/?Action=CVSync2AsyncSubmitTask&Version=2022-08-31",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: expect.stringContaining("Credential=AKLT-example/") }),
      }),
    );
  });

  it("normalizes a completed image task", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      code: 10000,
      message: "Success",
      data: { status: "done", image_urls: ["https://example.com/result.png"] },
    }));

    await expect(queryJimengTask(
      provider,
      "jimeng_seedream46_cvtob",
      "task-1",
      "image",
      fetcher,
    )).resolves.toEqual({
      status: "succeeded",
      urls: ["https://example.com/result.png"],
    });
  });
});
