import { getConfig } from "@/lib/config-store";
import { failure, ok } from "@/lib/http";

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) throw new Error("不允许跨站读取密钥");
    const { providerId } = await request.json();
    if (typeof providerId !== "string") throw new Error("供应商 ID 不正确");
    const provider = (await getConfig()).providers.find((item) => item.id === providerId);
    if (!provider) throw new Error("找不到供应商");
    return ok({ apiKey: provider.apiKey }, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
        "Pragma": "no-cache",
      },
    });
  } catch (error) {
    return failure(error);
  }
}
