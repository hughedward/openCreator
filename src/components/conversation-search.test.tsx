// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Conversation } from "@/lib/types";
import { ConversationSearch } from "./conversation-search";

afterEach(cleanup);

const conversations: Conversation[] = [
  {
    id: "new", title: "清晨咖啡",
    createdAt: "2026-07-23T00:00:00.000Z", updatedAt: "2026-07-23T00:00:00.000Z",
    messages: [],
  },
  {
    id: "old", title: "雨夜列车",
    createdAt: "2026-07-22T00:00:00.000Z", updatedAt: "2026-07-22T00:00:00.000Z",
    messages: [{
      id: "m1", role: "user", content: "镜头缓慢推进",
      createdAt: "2026-07-22T00:00:00.000Z", status: "complete",
    }],
  },
];

describe("ConversationSearch", () => {
  it("shows recent chats and opens a clicked result", () => {
    const onSelect = vi.fn();
    render(<ConversationSearch conversations={conversations}
      onSelect={onSelect} onClose={vi.fn()} />);

    expect(screen.getByText("最近对话")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /清晨咖啡/ }));
    expect(onSelect).toHaveBeenCalledWith("new");
  });

  it("searches message content", () => {
    render(<ConversationSearch conversations={conversations}
      onSelect={vi.fn()} onClose={vi.fn()} />);

    fireEvent.change(screen.getByRole("searchbox", { name: "搜索对话" }), {
      target: { value: "缓慢推进" },
    });

    expect(screen.getByText("雨夜列车")).toBeTruthy();
    expect(screen.queryByText("清晨咖啡")).toBeNull();
  });

  it("uses arrow keys and Enter to open the selected result", () => {
    const onSelect = vi.fn();
    render(<ConversationSearch conversations={conversations}
      onSelect={onSelect} onClose={vi.fn()} />);
    const input = screen.getByRole("searchbox", { name: "搜索对话" });

    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onSelect).toHaveBeenCalledWith("old");
  });

  it("closes with Escape", () => {
    const onClose = vi.fn();
    render(<ConversationSearch conversations={conversations}
      onSelect={vi.fn()} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("searchbox", { name: "搜索对话" }), { key: "Escape" });
    expect(onClose).toHaveBeenCalledOnce();
  });
});
