import { describe, expect, it } from "vitest";
import { signVolcengineRequest } from "./volc-sign";

describe("Volcengine Signature V4", () => {
  it("signs a Visual API request with a stable canonical request", () => {
    const body = JSON.stringify({ req_key: "jimeng_seedream46_cvtob", prompt: "雨夜" });
    const result = signVolcengineRequest({
      accessKeyId: "AKLT-example",
      secretAccessKey: "secret",
      method: "POST",
      url: new URL(
        "https://visual.volcengineapi.com/?Version=2022-08-31&Action=CVSync2AsyncSubmitTask",
      ),
      body,
      now: new Date("2026-07-24T12:00:00.000Z"),
      region: "cn-north-1",
      service: "cv",
    });

    expect(result["X-Date"]).toBe("20260724T120000Z");
    expect(result["X-Content-Sha256"]).toBe(
      "954bc3b29824477afa26aab92f60b757aa57767994ccf818df94876d22eec4d9",
    );
    expect(result.Authorization).toBe(
      "HMAC-SHA256 Credential=AKLT-example/20260724/cn-north-1/cv/request, " +
      "SignedHeaders=content-type;host;x-content-sha256;x-date, " +
      "Signature=86c3f9d8b98b55de994645949c1183b48176624d542ea6655843508fed0b7ac6",
    );
  });
});
