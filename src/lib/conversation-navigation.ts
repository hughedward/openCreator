import type { Message } from "./types";

export interface NavigationNode {
  id: string;
  preview: string;
}

export function navigationNodes(messages: Message[]): NavigationNode[] {
  return messages.filter((message) => message.role === "user").map((message) => {
    const text = message.content.replace(/\s+/g, " ").trim();
    const fallback = message.attachments?.length ? "图片消息" : "空消息";
    const preview = text || fallback;
    return {
      id: message.id,
      preview: preview.length > 72 ? `${preview.slice(0, 72)}…` : preview,
    };
  });
}

export function navigationWindow(
  nodes: NavigationNode[],
  activeIndex: number,
  maximum = 7,
) {
  if (nodes.length <= maximum) return nodes;
  const start = Math.min(
    Math.max(0, activeIndex - Math.floor(maximum / 2)),
    nodes.length - maximum,
  );
  return nodes.slice(start, start + maximum);
}
