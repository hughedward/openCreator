import { describe, expect, it } from "vitest";
import { textareaSize } from "./textarea-size";

describe("textareaSize", () => {
  it("keeps short content at the minimum height", () => {
    expect(textareaSize(20, 42, 156)).toEqual({ height: 42, scrolls: false });
  });

  it("follows content height below the cap", () => {
    expect(textareaSize(98, 42, 156)).toEqual({ height: 98, scrolls: false });
  });

  it("caps long content and enables internal scrolling", () => {
    expect(textareaSize(240, 42, 156)).toEqual({ height: 156, scrolls: true });
  });
});
