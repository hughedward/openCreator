import { describe, expect, it } from "vitest";
import { createClientId } from "./client-id";

describe("createClientId", () => {
  it("uses randomUUID when the browser provides it", () => {
    const source = {
      randomUUID: () => "native-uuid",
      getRandomValues: <T extends ArrayBufferView>(value: T) => value,
    };
    expect(createClientId(source)).toBe("native-uuid");
  });

  it("creates an ID when randomUUID is unavailable on insecure local HTTP", () => {
    let seed = 0;
    const source = {
      getRandomValues: <T extends ArrayBufferView>(value: T) => {
        const bytes = new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        bytes.forEach((_, index) => { bytes[index] = (seed + index + 17) % 256; });
        seed += 29;
        return value;
      },
    };

    const first = createClientId(source);
    const second = createClientId(source);
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).not.toBe(first);
  });
});
