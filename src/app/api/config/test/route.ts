import { getConfig } from "@/lib/config-store";
import { failure, ok } from "@/lib/http";
import { providerConfigSchema } from "@/lib/schemas";
import { testProviderModel } from "@/lib/provider-test";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const saved = (await getConfig()).providers.find((item) => item.id === body.provider?.id);
    if (body.provider?.apiKey === "••••••••") body.provider.apiKey = saved?.apiKey || "";
    const provider = providerConfigSchema.parse(body.provider);
    const model = provider.models.find((item) => item.id === body.modelId);
    if (!model) throw new Error("找不到要测试的模型");

    return ok({
      connected: true,
      message: await testProviderModel(provider, model),
    });
  } catch (error) { return failure(error); }
}
