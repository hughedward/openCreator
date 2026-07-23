import { describe, expect, it, vi } from "vitest";
import { testProviderModel } from "./provider-test";
import type { ModelConfig, ProviderConfig } from "./types";

const model: ModelConfig = {
  id: "chat", name: "DeepSeek", modelId: "deepseek-v4-pro", type: "chat",
  maxReferenceImages: 2, maxVideoDuration: 10,
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
});
