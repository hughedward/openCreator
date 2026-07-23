// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AssetMenu } from "./asset-menu";

afterEach(cleanup);

describe("AssetMenu", () => {
  it("moves an active asset to trash from the more menu", () => {
    const onTrash = vi.fn();
    render(<AssetMenu name="one.jpg" trashed={false}
      onTrash={onTrash} onRestore={vi.fn()} onPermanentDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "one.jpg 的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "移入回收站" }));

    expect(onTrash).toHaveBeenCalledOnce();
  });

  it("restores a trashed asset", () => {
    const onRestore = vi.fn();
    render(<AssetMenu name="one.jpg" trashed
      onTrash={vi.fn()} onRestore={onRestore} onPermanentDelete={vi.fn()} />);

    fireEvent.click(screen.getByRole("button", { name: "one.jpg 的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "恢复" }));

    expect(onRestore).toHaveBeenCalledOnce();
  });

  it("requires confirmation before permanent deletion", () => {
    const onPermanentDelete = vi.fn();
    render(<AssetMenu name="one.jpg" trashed={false}
      onTrash={vi.fn()} onRestore={vi.fn()} onPermanentDelete={onPermanentDelete} />);

    fireEvent.click(screen.getByRole("button", { name: "one.jpg 的更多操作" }));
    fireEvent.click(screen.getByRole("button", { name: "永久删除" }));
    expect(onPermanentDelete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "确认永久删除 one.jpg" }));

    expect(onPermanentDelete).toHaveBeenCalledOnce();
  });
});
