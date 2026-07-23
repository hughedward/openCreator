import { resolve } from "node:path";
import type { AppConfig } from "./types";
import { appConfigSchema } from "./schemas";
import { dataDir } from "./paths";
import { readJson, writeJsonAtomic } from "./json-store";

const configPath = resolve(dataDir, "config.json");
const emptyConfig: AppConfig = { providers: [] };

export async function getConfig() {
  return appConfigSchema.parse(await readJson(configPath, emptyConfig));
}

export async function saveConfig(value: unknown) {
  const config = appConfigSchema.parse(value);
  await writeJsonAtomic(configPath, config);
  return config;
}

export function publicConfig(config: AppConfig) {
  return {
    providers: config.providers.map((provider) => ({
      ...provider,
      apiKey: provider.apiKey ? "••••••••" : "",
      hasApiKey: Boolean(provider.apiKey),
    })),
  };
}
