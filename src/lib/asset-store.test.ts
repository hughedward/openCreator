import { describe, expect, it } from "vitest";
import { enrichAssets, type Asset } from "./asset-store";
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
});
