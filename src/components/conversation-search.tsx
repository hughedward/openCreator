"use client";

import { useMemo, useState } from "react";
import { MessageCircle, Search, X } from "lucide-react";
import type { Conversation } from "@/lib/types";
import { searchConversations } from "@/lib/conversation-search";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

export function ConversationSearch({
  conversations,
  onSelect,
  onClose,
}: {
  conversations: Conversation[];
  onSelect: (conversationId: string) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const results = useMemo(
    () => searchConversations(conversations, query),
    [conversations, query],
  );
  const select = (index: number) => {
    const result = results[index];
    if (result) onSelect(result.conversation.id);
  };

  return <div className="search-overlay" role="presentation"
    onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
    <section className="search-dialog" role="dialog" aria-modal="true"
      aria-label="搜索对话"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          onClose();
        } else if (event.key === "ArrowDown") {
          event.preventDefault();
          setSelectedIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1)));
        } else if (event.key === "ArrowUp") {
          event.preventDefault();
          setSelectedIndex((index) => Math.max(0, index - 1));
        } else if (event.key === "Enter") {
          event.preventDefault();
          select(selectedIndex);
        }
      }}>
      <div className="search-input-row">
        <Search size={19} />
        <input type="search" aria-label="搜索对话" autoFocus
          placeholder="搜索对话…"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setSelectedIndex(0);
          }} />
        <button type="button" onClick={onClose} aria-label="关闭搜索"><X size={19} /></button>
      </div>
      <div className="search-results">
        <div className="search-section-label">{query.trim() ? "搜索结果" : "最近对话"}</div>
        {results.length ? results.map((result, index) => (
          <button type="button" className={`search-result ${index === selectedIndex ? "selected" : ""}`}
            key={result.conversation.id}
            onMouseEnter={() => setSelectedIndex(index)}
            onClick={() => select(index)}
            aria-label={`${result.conversation.title}${result.snippet ? `，${result.snippet}` : ""}`}>
            <MessageCircle size={17} />
            <span className="search-result-copy">
              <strong>{result.conversation.title}</strong>
              {result.snippet && <small>{result.snippet}</small>}
            </span>
            <time dateTime={result.conversation.updatedAt}>
              {formatUpdatedAt(result.conversation.updatedAt)}
            </time>
          </button>
        )) : <div className="search-empty">
          <Search size={20} />
          <strong>没有找到相关对话</strong>
          <span>换一个关键词试试</span>
        </div>}
      </div>
      <footer className="search-hints">
        <span><kbd>↑</kbd><kbd>↓</kbd> 选择</span>
        <span><kbd>↵</kbd> 打开</span>
        <span><kbd>Esc</kbd> 关闭</span>
      </footer>
    </section>
  </div>;
}
