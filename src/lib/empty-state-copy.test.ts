import { describe, expect, it } from "vitest";
import { emptyStatePhrases } from "./empty-state-copy";

describe("empty state phrases", () => {
  it("starts with a capability-aware phrase", () => {
    expect(emptyStatePhrases("chat")[0]).toContain("问题");
    expect(emptyStatePhrases("image")[0]).toContain("画面");
    expect(emptyStatePhrases("video")[0]).toContain("镜头");
  });

  it("includes calm general creative prompts without duplicates", () => {
    const phrases = emptyStatePhrases("image");
    expect(phrases).toContain("从一句话开始，让灵感有形。");
    expect(new Set(phrases).size).toBe(phrases.length);
  });
});
