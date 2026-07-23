"use client";

import { useEffect, useMemo, useState, type RefObject } from "react";
import type { Message } from "@/lib/types";
import { navigationNodes, navigationWindow } from "@/lib/conversation-navigation";

export function ConversationNavigator({
  messages,
  scrollRootRef,
}: {
  messages: Message[];
  scrollRootRef: RefObject<HTMLDivElement | null>;
}) {
  const nodes = useMemo(() => navigationNodes(messages), [messages]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const visible = navigationWindow(nodes, activeIndex);

  useEffect(() => {
    const root = scrollRootRef.current;
    if (!root || nodes.length < 5) return;
    const update = () => {
      const rootRect = root.getBoundingClientRect();
      const readingLine = rootRect.top + rootRect.height * .32;
      let nextIndex = 0;
      nodes.forEach((node, index) => {
        const element = document.getElementById(`message-${node.id}`);
        if (element && element.getBoundingClientRect().top <= readingLine) nextIndex = index;
      });
      setActiveIndex(nextIndex);
    };
    update();
    root.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      root.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [nodes, scrollRootRef]);

  if (nodes.length < 5) return null;

  const jump = (id: string) => {
    document.getElementById(`message-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return <nav className={`conversation-navigator ${expanded ? "expanded" : ""}`}
    aria-label="对话快速导航"
    onMouseEnter={() => setExpanded(true)}
    onMouseLeave={() => setExpanded(false)}
    onFocus={() => setExpanded(true)}
    onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setExpanded(false);
    }}>
    {expanded && <div className="conversation-map-card">
      {visible.map((node) => {
        const index = nodes.findIndex((item) => item.id === node.id);
        return <button type="button" key={node.id}
          className={index === activeIndex ? "active" : ""}
          onClick={() => jump(node.id)} title={node.preview}>
          {node.preview}
        </button>;
      })}
    </div>}
    <div className="conversation-map-rail">
      {visible.map((node) => {
        const index = nodes.findIndex((item) => item.id === node.id);
        return <button type="button" key={node.id}
          className={index === activeIndex ? "active" : ""}
          onClick={() => jump(node.id)}
          aria-label={`跳转到：${node.preview}`} />;
      })}
    </div>
  </nav>;
}
