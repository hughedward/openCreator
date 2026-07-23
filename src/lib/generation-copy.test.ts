import { describe, expect, it } from "vitest";
import { generationPhrases } from "./generation-copy";

describe("generationPhrases", () => {
  it("returns quiet image-specific progress copy", () => {
    const phrases = generationPhrases("image");
    expect(phrases.length).toBeGreaterThanOrEqual(4);
    expect(phrases.join("")).toContain("画布");
    expect(phrases.join("")).not.toContain("镜头");
  });

  it("returns motion-specific progress copy for video", () => {
    const phrases = generationPhrases("video");
    expect(phrases.length).toBeGreaterThanOrEqual(4);
    expect(phrases.join("")).toContain("镜头");
    expect(phrases.join("")).toContain("画面");
  });

  it("has a stable fallback for other model types", () => {
    expect(generationPhrases("chat")).toEqual(["正在组织回答…"]);
  });
});
