import { describe, expect, it } from "vitest";
import { cancelProviderTask, decodeTaskRef, encodeTaskRef } from "./tasks";

describe("provider task references", () => {
  it("round-trips protocol, media type, model and upstream id", () => {
    const encoded = encodeTaskRef({
      protocol: "jimeng",
      kind: "image",
      modelId: "jimeng_seedream46_cvtob",
      upstreamId: "7491596536074305586",
    });

    expect(encoded).toMatch(/^mote\./);
    expect(decodeTaskRef(encoded)).toEqual({
      protocol: "jimeng",
      kind: "image",
      modelId: "jimeng_seedream46_cvtob",
      upstreamId: "7491596536074305586",
    });
  });

  it("keeps legacy Ark task IDs readable", () => {
    expect(decodeTaskRef("cgt-123")).toEqual({
      protocol: "legacy",
      kind: "video",
      modelId: "",
      upstreamId: "cgt-123",
    });
  });

  it("stops local polling without claiming remote cancellation for Kling", async () => {
    const taskId = encodeTaskRef({
      protocol: "kling",
      kind: "video",
      modelId: "kling-3.0-turbo",
      upstreamId: "video-1",
    });
    await expect(cancelProviderTask({
      id: "kling", name: "可灵", baseUrl: "https://api-singapore.klingai.com",
      apiKey: "secret", apiType: "kling", models: [],
    }, taskId)).resolves.toEqual({
      cancelled: false,
      error: "该供应商暂不支持取消已提交任务；已停止本机等待，远端任务可能仍会继续",
    });
  });
});
