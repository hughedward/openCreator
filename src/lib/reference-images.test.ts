import { describe, expect, it } from "vitest";
import { referenceConstraint, validateReferenceCount } from "./reference-images";

describe("reference image constraints", () => {
  it("allows text-to-video without images", () => {
    expect(referenceConstraint("text", 2)).toEqual({ min: 0, max: 0 });
    expect(() => validateReferenceCount("text", 0, 2)).not.toThrow();
  });

  it("requires one first frame and two first-last frames", () => {
    expect(referenceConstraint("first", 8)).toEqual({ min: 1, max: 1 });
    expect(referenceConstraint("first_last", 8)).toEqual({ min: 2, max: 2 });
  });

  it("uses the configured model limit for multi-reference mode", () => {
    expect(referenceConstraint("references", 8)).toEqual({ min: 1, max: 8 });
    expect(() => validateReferenceCount("references", 9, 8)).toThrow("最多支持 8 张参考图");
  });
});
