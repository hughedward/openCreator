import { describe, expect, it } from "vitest";
import { publicConfig } from "./config-store";
import type { AppConfig } from "./types";

describe("publicConfig", () => {
  it("masks both Jimeng credentials", () => {
    const config: AppConfig = {
      providers: [{
        id: "jimeng",
        name: "即梦视觉",
        baseUrl: "https://visual.volcengineapi.com",
        apiType: "jimeng",
        apiKey: "",
        accessKeyId: "AKLT-example",
        secretAccessKey: "secret",
        models: [],
      }],
    };

    expect(publicConfig(config).providers[0]).toMatchObject({
      accessKeyId: "••••••••",
      secretAccessKey: "••••••••",
      hasAccessKeyId: true,
      hasSecretAccessKey: true,
    });
  });
});
