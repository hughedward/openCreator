import { getConfig } from "@/lib/config-store";
import { failure, ok } from "@/lib/http";
import { healthUrl } from "@/lib/providers/common";
import { providerConfigSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = (await getConfig()).providers.find((item) => item.id === body.provider?.id);
    if (body.provider?.apiKey === "••••••••") body.provider.apiKey = saved?.apiKey || "";
    const provider = providerConfigSchema.parse(body.provider);
    const model = provider.models.find((item) => item.id === body.modelId);
    if (!model) throw new Error("找不到要测试的模型");

    const response = await fetch(healthUrl(provider.baseUrl), {
      headers: { Authorization: `Bearer ${provider.apiKey}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (response.status === 401 || response.status === 403) throw new Error("API Key 无效或没有访问权限");
    if (response.status >= 500) throw new Error(`供应商服务暂不可用（${response.status}）`);

    return ok({
      connected: true,
      message: `${model.name} 连接正常；未发起付费生成`,
    });
  } catch (error) { return failure(error); }
}
