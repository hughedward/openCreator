"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUp, BookOpen, ChevronDown, ImagePlus, Images, Menu,
  PanelLeftClose, Plus, Settings, X,
} from "lucide-react";
import type { AppConfig, Conversation, ImageOptions, MediaRef, Message, ModelConfig, VideoOptions } from "@/lib/types";
import { createClientId } from "@/lib/client-id";
import { GenerationStatus } from "@/components/generation-status";
import { ImageControls, VideoControls } from "@/components/generation-controls";
import { HistoryMenu } from "@/components/history-menu";
import { textareaSize } from "@/lib/textarea-size";
import { pickImageFiles } from "@/lib/image-files";
import { referenceConstraint, validateReferenceCount } from "@/lib/reference-images";

type PublicConfig = AppConfig & { providers: Array<AppConfig["providers"][number] & { hasApiKey?: boolean }> };
type ModelChoice = { providerId: string; providerName: string; model: ModelConfig };

const videoDefaults: VideoOptions = {
  referenceMode: "text", ratio: "adaptive", resolution: "720p", duration: 5,
  count: 1, audio: true, watermark: false, cameraFixed: false,
};
const imageDefaults: ImageOptions = { ratio: "adaptive", resolution: "2K", count: 1 };

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function freshConversation(choice?: ModelChoice): Conversation {
  const now = new Date().toISOString();
  return {
    id: createClientId(), title: "新对话",
    providerId: choice?.providerId, modelId: choice?.model.id,
    createdAt: now, updatedAt: now,
    imageOptions: imageDefaults, videoOptions: videoDefaults, messages: [],
  };
}

export function AppShell() {
  const [config, setConfig] = useState<PublicConfig>({ providers: [] });
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>();
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<MediaRef[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [draggingImages, setDraggingImages] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragDepthRef = useRef(0);

  const choices = useMemo<ModelChoice[]>(() => config.providers.flatMap((provider) =>
    provider.models.map((model) => ({
      providerId: provider.id, providerName: provider.name, model,
    }))), [config]);
  const active = conversations.find((item) => item.id === activeId);
  const selected = choices.find((item) =>
    item.providerId === active?.providerId && item.model.id === active?.modelId) || choices[0];
  const videoConstraint = selected?.model.type === "video"
    ? referenceConstraint(active?.videoOptions?.referenceMode || videoDefaults.referenceMode,
      selected.model.maxReferenceImages)
    : null;
  const attachmentLimit = videoConstraint?.max ?? selected?.model.maxReferenceImages ?? 2;

  const load = useCallback(async () => {
    const [nextConfig, nextConversations] = await Promise.all([
      request<PublicConfig>("/api/config"),
      request<Conversation[]>("/api/conversations"),
    ]);
    setConfig(nextConfig);
    setConversations(nextConversations);
    if (nextConversations.length) {
      const requested = typeof window === "undefined" ? null :
        new URLSearchParams(window.location.search).get("conversation");
      setActiveId((id) =>
        requested && nextConversations.some((item) => item.id === requested)
          ? requested : id || nextConversations[0].id);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => load().catch((cause) => setError(cause.message)), 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    if (!window.matchMedia("(max-width: 700px)").matches) return;
    const timer = window.setTimeout(() => setSidebarOpen(false), 0);
    return () => clearTimeout(timer);
  }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [active?.messages.length]);
  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    const styles = window.getComputedStyle(textarea);
    const maxHeight = Number.parseFloat(styles.maxHeight) || 156;
    const minHeight = Number.parseFloat(styles.minHeight) || 42;
    const size = textareaSize(textarea.scrollHeight, minHeight, maxHeight);
    textarea.style.height = `${size.height}px`;
    textarea.style.overflowY = size.scrolls ? "auto" : "hidden";
  }, [draft]);

  const persist = async (conversation: Conversation) => {
    const saved = await request<Conversation>(`/api/conversations/${conversation.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversation),
    }).catch(async () => request<Conversation>("/api/conversations", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(conversation),
    }));
    setConversations((items) => [saved, ...items.filter((item) => item.id !== saved.id)]);
    return saved;
  };

  const create = async () => {
    const conversation = freshConversation(choices[0]);
    await persist(conversation);
    setActiveId(conversation.id);
    setDraft("");
    setAttachments([]);
    setSidebarOpen(false);
  };

  const remove = async (id: string) => {
    await request(`/api/conversations/${id}`, { method: "DELETE" });
    const rest = conversations.filter((item) => item.id !== id);
    setConversations(rest);
    if (activeId === id) setActiveId(rest[0]?.id);
  };

  const rename = async (conversation: Conversation, title: string) => {
    await persist({ ...conversation, title, updatedAt: new Date().toISOString() });
  };

  const chooseModel = async (value: string) => {
    const [providerId, modelId] = value.split("::");
    const choice = choices.find((item) => item.providerId === providerId && item.model.id === modelId);
    if (!choice) return;
    if (!active) {
      const conversation = freshConversation(choice);
      await persist(conversation);
      setActiveId(conversation.id);
      return;
    }
    await persist({ ...active, providerId, modelId, updatedAt: new Date().toISOString() });
  };

  const changeGenerationOptions = (options: { imageOptions?: ImageOptions; videoOptions?: VideoOptions }) => {
    if (!active) {
      const conversation = { ...freshConversation(selected), ...options };
      setConversations((items) => [conversation, ...items]);
      setActiveId(conversation.id);
      void persist(conversation).catch((cause) => setError(cause.message));
      return;
    }
    const updated = { ...active, ...options, updatedAt: new Date().toISOString() };
    setConversations((items) => items.map((item) => item.id === updated.id ? updated : item));
    void request<Conversation>(`/api/conversations/${updated.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch((cause) => setError(cause.message));
  };

  const upload = async (files: readonly File[]) => {
    const selection = pickImageFiles(files, attachmentLimit - attachments.length);
    if (selection.error) setError(selection.error);
    else setError("");
    if (!selection.accepted.length) return;
    const form = new FormData();
    selection.accepted.forEach((file) => form.append("files", file));
    try {
      const uploaded = await request<MediaRef[]>("/api/uploads", {
        method: "POST", body: form,
      });
      setAttachments((items) => [...items, ...uploaded].slice(0, attachmentLimit));
    } catch (cause) { setError((cause as Error).message); }
  };

  const pastedImages = (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = [...event.clipboardData.items]
      .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
      .map((item) => item.getAsFile())
      .filter((file): file is File => Boolean(file));
    if (!files.length) return;
    event.preventDefault();
    void upload(files);
  };

  const send = async () => {
    if (busy || !selected || (!draft.trim() && !attachments.length)) return;
    const currentVideoOptions = active?.videoOptions || videoDefaults;
    if (selected.model.type === "video") {
      try {
        validateReferenceCount(
          currentVideoOptions.referenceMode, attachments.length, selected.model.maxReferenceImages,
        );
      } catch (cause) {
        setError((cause as Error).message);
        return;
      }
    }
    setBusy(true);
    setError("");
    let pendingMessageId: string | undefined;
    try {
      let conversation = active || freshConversation(selected);
      const now = new Date().toISOString();
      const user: Message = {
        id: createClientId(), role: "user", content: draft.trim(),
        attachments, createdAt: now, status: "complete",
      };
      conversation = {
        ...conversation,
        title: conversation.messages.length ? conversation.title :
          (draft.trim() || "图片生成").slice(0, 28),
        providerId: selected.providerId, modelId: selected.model.id,
        updatedAt: now, messages: [...conversation.messages, user],
      };
      await persist(conversation);
      setActiveId(conversation.id);
      const prompt = draft.trim();
      const usedAttachments = attachments;
      setDraft("");
      setAttachments([]);
      if (selected.model.type !== "chat") {
        pendingMessageId = `pending-${createClientId()}`;
        const pendingMessage: Message = {
          id: pendingMessageId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          status: "processing",
        };
        const optimistic = {
          ...conversation,
          messages: [...conversation.messages, pendingMessage],
        };
        setConversations((items) => [
          optimistic,
          ...items.filter((item) => item.id !== optimistic.id),
        ]);
      }
      const result = await request<{ conversation: Conversation }>("/api/generate", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversation.id, providerId: selected.providerId,
          modelId: selected.model.id, prompt, attachments: usedAttachments,
          imageOptions: conversation.imageOptions || imageDefaults,
          videoOptions: conversation.videoOptions || videoDefaults,
        }),
      });
      setConversations((items) => [result.conversation, ...items.filter((item) => item.id !== result.conversation.id)]);
    } catch (cause) {
      const message = (cause as Error).message;
      setError(message);
      if (pendingMessageId) {
        setConversations((items) => items.map((conversation) => ({
          ...conversation,
          messages: conversation.messages.map((item) =>
            item.id === pendingMessageId ? { ...item, status: "failed", error: message } : item),
        })));
      }
    }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const pending = active?.messages.find((message) =>
      message.status === "processing" && (message.taskIds?.length || message.taskId));
    if (!pending || !active) return;
    const taskId = pending.taskIds?.find((id) =>
      !pending.completedTaskIds?.includes(id) && !pending.failedTaskIds?.includes(id)) || pending.taskId;
    if (!taskId) return;
    const timer = window.setTimeout(async () => {
      try {
        const result = await request<{ conversation: Conversation }>(
          `/api/tasks/${taskId}?conversationId=${active.id}`,
        );
        setConversations((items) => [result.conversation, ...items.filter((item) => item.id !== active.id)]);
      } catch (cause) { setError((cause as Error).message); }
    }, 5000);
    return () => clearTimeout(timer);
  }, [active]);

  return (
    <main className="app-frame">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar-head">
          <button className="wordmark" onClick={create} aria-label="新建对话"><span>M</span> Mote</button>
          <button className="icon-button desktop-only" onClick={() => setSidebarOpen(false)} aria-label="收起侧栏">
            <PanelLeftClose size={17} />
          </button>
        </div>
        <button className="new-chat" onClick={create}><Plus size={16} /> 新对话</button>
        <Link className="asset-link" href="/assets"><Images size={16} /> 资产</Link>
        <div className="history-label">最近</div>
        <nav className="history">
          {conversations.map((conversation) => (
            <div key={conversation.id}
              className={`history-row ${conversation.id === activeId ? "active" : ""}`}>
              <button className="history-title"
                onClick={() => { setActiveId(conversation.id); setSidebarOpen(false); }}>
                {conversation.title}
              </button>
              <HistoryMenu title={conversation.title}
                onRename={(title) => void rename(conversation, title)}
                onDelete={() => void remove(conversation.id)} />
            </div>
          ))}
        </nav>
        <div className="sidebar-utilities">
          <Link className="settings-link" href="/docs"><BookOpen size={16} /> 文档</Link>
          <Link className="settings-link" href="/settings"><Settings size={16} /> 设置</Link>
        </div>
      </aside>

      {sidebarOpen && <button className="sidebar-scrim" onClick={() => setSidebarOpen(false)} aria-label="关闭侧栏" />}

      <section className="workspace">
        <header className="topbar">
          {!sidebarOpen && <button className="icon-button" onClick={() => setSidebarOpen(true)} aria-label="打开侧栏">
            <Menu size={18} />
          </button>}
          <div className="model-select-wrap">
            <select value={selected ? `${selected.providerId}::${selected.model.id}` : ""}
              onChange={(event) => chooseModel(event.target.value)} aria-label="选择模型">
              {!choices.length && <option value="">尚未配置模型</option>}
              {choices.map((choice) => (
                <option key={`${choice.providerId}:${choice.model.id}`}
                  value={`${choice.providerId}::${choice.model.id}`}>
                  {choice.model.name} · {choice.providerName}
                </option>
              ))}
            </select>
            <ChevronDown size={14} />
          </div>
          <span className={`capability ${selected?.model.type || ""}`}>
            {selected?.model.type === "video" ? "视频" : selected?.model.type === "image" ? "图像" : "对话"}
          </span>
        </header>

        <div className="conversation">
          {!active?.messages.length ? (
            <div className="empty-state">
              <div className="empty-mark">M</div>
              <h1>今天，想创造什么？</h1>
              <p>{choices.length ? "输入一段话，或加入图片作为参考。" : "先添加一个供应商和模型，然后开始。"}</p>
              {!choices.length && <Link className="text-link" href="/settings">前往设置 <span>↗</span></Link>}
            </div>
          ) : (
            <div className="message-list">
              {active.messages.map((message) => (
                <MessageView key={message.id} message={message}
                  processingType={message.taskId || message.taskIds?.length ? "video" : selected?.model.type} />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        <div className={`composer-region ${draggingImages ? "drag-active" : ""}`}
          onDragEnter={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            dragDepthRef.current += 1;
            setDraggingImages(true);
          }}
          onDragOver={(event) => {
            if (!event.dataTransfer.types.includes("Files")) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "copy";
          }}
          onDragLeave={(event) => {
            event.preventDefault();
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1);
            if (dragDepthRef.current === 0) setDraggingImages(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            dragDepthRef.current = 0;
            setDraggingImages(false);
            void upload([...event.dataTransfer.files]);
          }}>
          {draggingImages && (
            <div className="drop-overlay" role="status">
              <ImagePlus size={20} />
              <strong>松手添加图片</strong>
              <span>JPG、PNG 或 WebP，最多 {attachmentLimit} 张</span>
            </div>
          )}
          {attachments.length > 0 && (
            <div className="attachment-strip">
              {attachments.map((item, index) => (
                <div className="attachment-chip" key={item.path}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/media/${item.path}`} alt={item.name} />
                  <button onClick={() => setAttachments((items) => items.filter((_, i) => i !== index))}><X size={13} /></button>
                </div>
              ))}
            </div>
          )}
          {error && <div className="inline-error">{error}<button onClick={() => setError("")}><X size={13} /></button></div>}
          <div className="composer">
            <textarea ref={textareaRef} value={draft} onChange={(event) => setDraft(event.target.value)}
              onPaste={pastedImages}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); }
              }}
              placeholder={selected?.model.type === "video" ? "描述运动、镜头和氛围…" :
                selected?.model.type === "image" ? "描述你想看到的画面…" : "输入消息…"}
              rows={1} />
            <div className="composer-tools">
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" multiple hidden
                onChange={(event) => {
                  void upload(event.target.files ? [...event.target.files] : []);
                  event.target.value = "";
                }} />
              <button className="icon-button" onClick={() => fileRef.current?.click()}
                disabled={attachmentLimit === 0}
                title={attachmentLimit === 0 ? "文生视频模式不需要参考图" : undefined}
                aria-label="添加图片">
                <ImagePlus size={18} />
              </button>
              {selected?.model.type === "image" && <ImageControls
                value={active?.imageOptions || imageDefaults}
                onChange={(imageOptions) => changeGenerationOptions({ imageOptions })} />}
              {selected?.model.type === "video" && <VideoControls
                value={active?.videoOptions || videoDefaults}
                maxReferenceImages={selected.model.maxReferenceImages}
                maxVideoDuration={selected.model.maxVideoDuration}
                onChange={(videoOptions) => changeGenerationOptions({ videoOptions })} />}
              <span className="composer-spacer">{selected?.model.type === "video" && attachments.length > 0
                ? (active?.videoOptions || videoDefaults).referenceMode === "references"
                  ? `${attachments.length} 张参考图`
                  : attachments.length === 2 ? "首帧 · 尾帧" : "首帧"
                : attachments.length ? `${attachments.length} 张参考图` : ""}</span>
              <button className="send-button" onClick={send}
                disabled={busy || !selected || (!draft.trim() && !attachments.length)} aria-label="发送">
                {busy ? <span className="spinner" /> : <ArrowUp size={17} strokeWidth={2.4} />}
              </button>
            </div>
          </div>
          <p className="composer-note">结果保存在本机 · Enter 发送，Shift + Enter 换行</p>
        </div>
      </section>
    </main>
  );
}

function MessageView({
  message,
  processingType = "chat",
}: {
  message: Message;
  processingType?: ModelConfig["type"];
}) {
  return (
    <article className={`message ${message.role}`}>
      <div className="message-meta">{message.role === "user" ? "你" : "Mote"}</div>
      <div className="message-body">
        {message.attachments?.length ? <div className="media-grid">
          {message.attachments.map((media) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={media.path} src={`/api/media/${media.path}`} alt={media.name} />
          ))}
        </div> : null}
        {message.content && <p>{message.content}</p>}
        {message.status === "processing" && (
          processingType === "image" || processingType === "video"
            ? <GenerationStatus type={processingType} />
            : <div className="processing"><span className="pulse-dot" /><span>正在思考</span></div>
        )}
        {message.status === "failed" && <div className="message-error">{message.error || "生成失败"}</div>}
        {message.media?.map((media) => media.kind === "video" ? (
          <video key={media.path} controls src={`/api/media/${media.path}`} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img className="generated-image" key={media.path} src={`/api/media/${media.path}`} alt={media.name} />
        ))}
      </div>
    </article>
  );
}
