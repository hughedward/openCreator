import type { ModelConfig, ProviderConfig } from "./types";
import { apiUrl, healthUrl } from "./providers/common";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export async function testProviderModel(
  provider: ProviderConfig,
  model: ModelConfig,
  fetcher: Fetcher = fetch,
) {
  const url = provider.apiType === "openai"
    ? apiUrl(provider.baseUrl, "models", "openai")
    : healthUrl(provider.baseUrl);
  const response = await fetcher(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${provider.apiKey}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("API Key 无效或没有访问权限");
    }
    throw new Error(`供应商接口返回 ${response.status}`);
  }
  if (provider.apiType === "openai") {
    const data = await response.json().catch(() => ({})) as {
      data?: Array<{ id?: string }>;
    };
    const ids = data.data?.map((item) => item.id) || [];
    if (!ids.includes(model.modelId)) {
      throw new Error(`供应商模型列表中没有找到模型 ${model.modelId}`);
    }
    return `${model.name} 连接正常，API Key 与模型可用；未发起付费生成`;
  }
  return `${model.name} 连接正常；未发起付费生成`;
}
