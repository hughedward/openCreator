import { describe, expect, it, vi } from "vitest";
import { testProviderModel } from "./provider-test";
import type { ModelConfig, ProviderConfig } from "./types";

const model: ModelConfig = {
  id: "chat", name: "DeepSeek", modelId: "deepseek-v4-pro", type: "chat",
  maxReferenceImages: 2, maxVideoDuration: 10, supportsImageInput: false,
};
const provider: ProviderConfig = {
  id: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com",
  apiKey: "secret", apiType: "openai", models: [model],
};

describe("provider connection test", () => {
  it("rejects a 404 instead of reporting a false success", async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response("", { status: 404 }));
    await expect(testProviderModel(provider, model, fetcher))
      .rejects.toThrow("404");
  });

  it("checks that an OpenAI-compatible model is actually listed", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      data: [{ id: "another-model" }],
    }));
    await expect(testProviderModel(provider, model, fetcher))
      .rejects.toThrow("没有找到模型 deepseek-v4-pro");
  });

  it("accepts a listed OpenAI-compatible model without generating content", async () => {
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      data: [{ id: "deepseek-v4-pro" }],
    }));
    await expect(testProviderModel(provider, model, fetcher))
      .resolves.toContain("模型可用");
    expect(fetcher).toHaveBeenCalledWith(
      "https://api.deepseek.com/models",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("checks Kling credentials through the task query without generating", async () => {
    const kling: ProviderConfig = {
      ...provider,
      id: "kling",
      name: "可灵",
      baseUrl: "https://api-singapore.klingai.com",
      apiType: "kling",
      models: [model],
    };
    const fetcher = vi.fn().mockResolvedValue(Response.json({ code: 0, data: [] }));

    await expect(testProviderModel(kling, model, fetcher)).resolves.toContain("未发起付费生成");
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("/tasks?task_ids=mote-connection-test"),
      expect.objectContaining({
        headers: { Authorization: "Bearer secret" },
      }),
    );
  });

  it("signs a Jimeng task query without generating", async () => {
    const jimeng: ProviderConfig = {
      ...provider,
      id: "jimeng",
      name: "即梦视觉",
      baseUrl: "https://visual.volcengineapi.com",
      apiKey: "",
      accessKeyId: "AKLT-example",
      secretAccessKey: "secret",
      apiType: "jimeng",
      models: [model],
    };
    const fetcher = vi.fn().mockResolvedValue(Response.json({
      code: 50412,
      message: "task not found",
    }));

    await expect(testProviderModel(jimeng, model, fetcher)).resolves.toContain("凭证可用");
    expect(fetcher).toHaveBeenCalledWith(
      expect.stringContaining("Action=CVSync2AsyncGetResult"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: expect.stringContaining("Credential=AKLT-example/"),
        }),
      }),
    );
  });
});
