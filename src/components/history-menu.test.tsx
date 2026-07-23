// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HistoryMenu } from "./history-menu";

afterEach(cleanup);

describe("HistoryMenu", () => {
  it("opens from the more button and requires confirmation before deletion", () => {
    const onDelete = vi.fn();
    render(<HistoryMenu title="雨夜列车" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "雨夜列车的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "删除对话" }));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "确认删除雨夜列车" }));
    expect(onDelete).toHaveBeenCalledOnce();
  });

  it("can cancel a pending deletion", () => {
    const onDelete = vi.fn();
    render(<HistoryMenu title="雨夜列车" onDelete={onDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "雨夜列车的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "删除对话" }));
    fireEvent.click(screen.getByRole("button", { name: "取消删除" }));

    expect(onDelete).not.toHaveBeenCalled();
    expect(screen.queryByText("确定删除？")).toBeNull();
  });

  it("renames a conversation from the menu", () => {
    const onRename = vi.fn();
    render(<HistoryMenu title="雨夜列车" onDelete={vi.fn()} onRename={onRename} />);

    fireEvent.click(screen.getByRole("button", { name: "雨夜列车的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "重命名" }));
    fireEvent.change(screen.getByRole("textbox", { name: "新的对话名称" }), {
      target: { value: "清晨列车" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存名称" }));

    expect(onRename).toHaveBeenCalledWith("清晨列车");
  });

  it("raises the whole menu while its popover is open", () => {
    const { container } = render(<HistoryMenu title="雨夜列车" onDelete={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "雨夜列车的更多操作" }));
    expect(container.querySelector(".history-menu")?.classList.contains("is-open")).toBe(true);
  });
});
