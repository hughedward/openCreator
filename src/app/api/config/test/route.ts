import { getConfig } from "@/lib/config-store";
import { failure, ok } from "@/lib/http";
import { apiUrl, upstream } from "@/lib/providers/common";

export async function POST(request: Request) {
  try {
    const { providerId } = await request.json();
    const provider = (await getConfig()).providers.find((item) => item.id === providerId);
    if (!provider) throw new Error("请先保存供应商");
    await upstream(apiUrl(provider.baseUrl, "models"), provider);
    return ok({ connected: true });
  } catch (error) { return failure(error); }
}
