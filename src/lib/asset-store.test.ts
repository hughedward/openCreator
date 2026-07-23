import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  enrichAssets, moveAssetToTrash, permanentlyDeleteAsset, restoreAsset, type Asset,
} from "./asset-store";
import type { Conversation } from "./types";

describe("asset store", () => {
  it("enriches generated media with conversation sources", () => {
    const conversations: Conversation[] = [{
      id: "conversation-1", title: "雨夜列车",
      createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:01:00.000Z",
      messages: [{
        id: "message-1", role: "assistant", content: "", status: "complete",
        createdAt: "2026-07-23T00:01:00.000Z",
        media: [{ kind: "image", path: "images/one.jpg", name: "one.jpg" }],
      }],
    }];

    const rawAssets: Asset[] = [
      {
        id: "images/one.jpg", kind: "image", path: "images/one.jpg", name: "one.jpg",
        mimeType: "image/jpeg", size: 5, modifiedAt: "2026-07-23T00:00:00.000Z",
      },
      {
        id: "videos/two.mp4", kind: "video", path: "videos/two.mp4", name: "two.mp4",
        mimeType: "video/mp4", size: 5, modifiedAt: "2026-07-23T00:02:00.000Z",
      },
    ];
    const assets = enrichAssets(rawAssets, conversations);

    expect(assets).toHaveLength(2);
    expect(assets.find((asset) => asset.path === "images/one.jpg")).toMatchObject({
      kind: "image", conversationId: "conversation-1", conversationTitle: "雨夜列车",
    });
    expect(assets.find((asset) => asset.path === "videos/two.mp4")?.conversationId).toBeUndefined();
  });

  it("sorts assets by source creation time when available", () => {
    const assets = enrichAssets([
      {
        id: "images/old.jpg", kind: "image", path: "images/old.jpg", name: "old.jpg",
        mimeType: "image/jpeg", size: 1, modifiedAt: "2026-07-23T00:00:00.000Z",
      },
      {
        id: "images/new.jpg", kind: "image", path: "images/new.jpg", name: "new.jpg",
        mimeType: "image/jpeg", size: 1, modifiedAt: "2026-07-23T00:01:00.000Z",
      },
    ], []);
    expect(assets.map((asset) => asset.name)).toEqual(["new.jpg", "old.jpg"]);
  });

  it("moves an active asset to trash and restores it", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mote-assets-"));
    await mkdir(path.join(root, "images"), { recursive: true });
    await writeFile(path.join(root, "images", "one.jpg"), "image");

    const trashedPath = await moveAssetToTrash("images/one.jpg", root);
    expect(trashedPath).toBe(".trash/images/one.jpg");
    expect(await readFile(path.join(root, trashedPath), "utf8")).toBe("image");

    const restoredPath = await restoreAsset(trashedPath, root);
    expect(restoredPath).toBe("images/one.jpg");
    expect(await readFile(path.join(root, restoredPath), "utf8")).toBe("image");
  });

  it("permanently deletes only a recognized asset path", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mote-assets-"));
    await mkdir(path.join(root, ".trash", "videos"), { recursive: true });
    await writeFile(path.join(root, ".trash", "videos", "one.mp4"), "video");

    await permanentlyDeleteAsset(".trash/videos/one.mp4", root);
    await expect(readFile(path.join(root, ".trash", "videos", "one.mp4")))
      .rejects.toMatchObject({ code: "ENOENT" });
    await expect(permanentlyDeleteAsset("../data/config.json", root))
      .rejects.toThrow("非法资产路径");
  });

  it("does not overwrite an existing asset while restoring", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "mote-assets-"));
    await mkdir(path.join(root, "images"), { recursive: true });
    await mkdir(path.join(root, ".trash", "images"), { recursive: true });
    await writeFile(path.join(root, "images", "same.jpg"), "active");
    await writeFile(path.join(root, ".trash", "images", "same.jpg"), "trash");

    await expect(restoreAsset(".trash/images/same.jpg", root))
      .rejects.toThrow("同名资产已存在");
    expect(await readFile(path.join(root, "images", "same.jpg"), "utf8")).toBe("active");
  });

  it("keeps source conversation metadata for a trashed asset", () => {
    const asset: Asset = {
      id: ".trash/images/one.jpg", kind: "image", path: ".trash/images/one.jpg",
      originalPath: "images/one.jpg", trashed: true, name: "one.jpg",
      mimeType: "image/jpeg", size: 1, modifiedAt: "2026-07-23T00:00:00.000Z",
    };
    const conversation: Conversation = {
      id: "conversation-1", title: "来源",
      createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
      messages: [{
        id: "message-1", role: "assistant", content: "", status: "complete",
        createdAt: "2026-07-23T00:00:00.000Z",
        media: [{ kind: "image", path: "images/one.jpg", name: "one.jpg" }],
      }],
    };

    expect(enrichAssets([asset], [conversation])[0]).toMatchObject({
      conversationId: "conversation-1",
      conversationTitle: "来源",
    });
  });
});
