import { getConfig, publicConfig, saveConfig } from "@/lib/config-store";
import { failure, ok } from "@/lib/http";

export async function GET() {
  try { return ok(publicConfig(await getConfig())); }
  catch (error) { return failure(error, 500); }
}

export async function PUT(request: Request) {
  try {
    const incoming = await request.json();
    const current = await getConfig();
    for (const provider of incoming.providers || []) {
      if (provider.apiKey === "••••••••") {
        provider.apiKey = current.providers.find((item) => item.id === provider.id)?.apiKey || "";
      }
    }
    return ok(publicConfig(await saveConfig(incoming)));
  } catch (error) { return failure(error); }
}
