import { describe, expect, it } from "vitest";
import { videoDurationPresets, validateVideoDuration } from "./video-duration";

describe("video duration", () => {
  it("keeps compact presets for a ten-second model", () => {
    expect(videoDurationPresets(10)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("adds useful milestones for longer models", () => {
    expect(videoDurationPresets(30)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 30]);
  });

  it("rejects values outside the selected model range", () => {
    expect(() => validateVideoDuration(31, 30)).toThrow("最长支持 30 秒");
    expect(() => validateVideoDuration(3, 30)).not.toThrow();
    expect(() => validateVideoDuration(2, 30)).toThrow("至少为 3 秒");
  });
});
