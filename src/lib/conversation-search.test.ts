import { describe, expect, it } from "vitest";
import type { Conversation } from "./types";
import { searchConversations } from "./conversation-search";

function conversation(
  id: string, title: string, updatedAt: string, messages: string[] = [],
): Conversation {
  return {
    id, title, createdAt: updatedAt, updatedAt,
    messages: messages.map((content, index) => ({
      id: `${id}-${index}`, role: index % 2 ? "assistant" : "user",
      content, createdAt: updatedAt, status: "complete",
    })),
  };
}

describe("searchConversations", () => {
  const conversations = [
    conversation("old", "雨夜列车", "2026-07-20T00:00:00.000Z", ["镜头缓慢推进"]),
    conversation("new", "清晨咖啡", "2026-07-23T00:00:00.000Z", ["阳光穿过窗户"]),
    conversation("body", "创意草稿", "2026-07-22T00:00:00.000Z", ["列车驶入雨夜"]),
  ];

  it("shows recent conversations when the query is empty", () => {
    expect(searchConversations(conversations, "").map((item) => item.conversation.id))
      .toEqual(["new", "body", "old"]);
  });

  it("ranks title matches before message matches", () => {
    expect(searchConversations(conversations, "雨夜").map((item) => item.conversation.id))
      .toEqual(["old", "body"]);
  });

  it("matches without case sensitivity and returns a nearby message snippet", () => {
    const result = searchConversations([
      conversation("one", "Ideas", "2026-07-23T00:00:00.000Z", [
        "A long opening before the Seedance camera movement and final scene.",
      ]),
    ], "seedance")[0];

    expect(result.snippet.toLowerCase()).toContain("seedance");
  });
});
