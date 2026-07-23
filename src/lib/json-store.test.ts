import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, writeJsonAtomic } from "./json-store";

describe("JSON store", () => {
  it("returns fallback when a file does not exist", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ai-shell-"));
    expect(await readJson(join(dir, "missing.json"), { ready: true })).toEqual({ ready: true });
  });

  it("writes formatted JSON atomically", async () => {
    const dir = await mkdtemp(join(tmpdir(), "ai-shell-"));
    const path = join(dir, "nested", "value.json");
    await writeJsonAtomic(path, { name: "Seedream" });
    expect(JSON.parse(await readFile(path, "utf8"))).toEqual({ name: "Seedream" });
    expect(await readFile(path, "utf8")).toContain('\n  "name"');
  });
});
