import { describe, expect, it } from "vitest";
import { pickImageFiles } from "./image-files";

const file = (name: string, type: string, size = 100) => ({ name, type, size });

describe("pickImageFiles", () => {
  it("accepts JPG, PNG, and WebP files", () => {
    const result = pickImageFiles([
      file("one.jpg", "image/jpeg"),
      file("two.png", "image/png"),
      file("three.webp", "image/webp"),
    ], 3);
    expect(result.accepted).toHaveLength(3);
    expect(result.error).toBeUndefined();
  });

  it("ignores non-images so ordinary clipboard text remains unaffected", () => {
    const result = pickImageFiles([file("note.txt", "text/plain")], 2);
    expect(result).toEqual({ accepted: [] });
  });

  it("respects the per-message image limit", () => {
    const result = pickImageFiles([
      file("one.png", "image/png"),
      file("two.png", "image/png"),
    ], 1);
    expect(result.accepted).toHaveLength(1);
    expect(result.error).toContain("最多");
  });

  it("rejects oversized images before upload", () => {
    const result = pickImageFiles([file("large.png", "image/png", 16 * 1024 * 1024)], 2);
    expect(result.accepted).toHaveLength(0);
    expect(result.error).toContain("15MB");
  });

  it("tells when the mode does not accept reference images at all (limit 0)", () => {
    // 回归:文生视频模式粘贴图,不应再报写死的"最多 2 张"。
    const result = pickImageFiles([file("ref.png", "image/png")], 0);
    expect(result.accepted).toHaveLength(0);
    expect(result.error).toBe("当前模式不支持参考图");
  });

  it("reports the real limit when the composer is already at capacity", () => {
    const result = pickImageFiles([file("extra.png", "image/png")], 2, 2);
    expect(result.accepted).toHaveLength(0);
    expect(result.error).toBe("每条消息最多添加 2 张图片");
  });
});
