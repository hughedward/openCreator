"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Image as ImageIcon, Images, Video } from "lucide-react";
import type { Asset } from "@/lib/asset-store";

type Filter = "all" | Asset["kind"];

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function AssetLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState("");
  useEffect(() => {
    fetch("/api/assets").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "无法读取资产");
      setAssets(data);
    }).catch((cause) => setError(cause.message));
  }, []);
  const visible = useMemo(() =>
    filter === "all" ? assets : assets.filter((asset) => asset.kind === filter),
  [assets, filter]);

  return <main className="utility-page">
    <header className="utility-topbar">
      <Link href="/" className="back-link"><ArrowLeft size={17} /> 返回对话</Link>
      <span>Mote Assets</span>
    </header>
    <div className="asset-content">
      <div className="asset-heading">
        <span className="eyebrow">LOCAL LIBRARY</span>
        <h1>资产</h1>
        <p>所有生成结果都保存在本机项目的 <code>out</code> 目录中。</p>
      </div>
      <div className="asset-toolbar" aria-label="资产筛选">
        {([
          ["all", "全部", Images],
          ["image", "图片", ImageIcon],
          ["video", "视频", Video],
        ] as const).map(([value, label, Icon]) =>
          <button key={value} className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}>
            <Icon size={14} /> {label}
            <span>{value === "all" ? assets.length : assets.filter((asset) => asset.kind === value).length}</span>
          </button>)}
      </div>
      {error && <div className="settings-error">{error}</div>}
      {!error && visible.length === 0 ? <div className="asset-empty">
        <Images size={24} />
        <h2>还没有生成资产</h2>
        <p>完成一次图片或视频生成后，结果会自动出现在这里。</p>
        <Link href="/">开始创作</Link>
      </div> : <div className="asset-grid">
        {visible.map((asset) => <article className="asset-card" key={asset.id}>
          <div className="asset-preview">
            {asset.kind === "video"
              ? <video controls preload="metadata" src={`/api/media/${asset.path}`} />
              // eslint-disable-next-line @next/next/no-img-element
              : <img loading="lazy" src={`/api/media/${asset.path}`} alt={asset.name} />}
          </div>
          <div className="asset-details">
            <div>
              <strong>{asset.kind === "image" ? "图片" : "视频"}</strong>
              <span>{formatSize(asset.size)} · {new Date(asset.createdAt || asset.modifiedAt).toLocaleString("zh-CN")}</span>
            </div>
            <a className="asset-download" href={`/api/media/${asset.path}`} download={asset.name}
              aria-label={`下载 ${asset.name}`}><Download size={15} /></a>
          </div>
          {asset.conversationId
            ? <Link className="asset-source" href={`/?conversation=${asset.conversationId}`}>
              来自对话 · {asset.conversationTitle}
            </Link>
            : <span className="asset-source muted">来源对话已删除</span>}
        </article>)}
      </div>}
    </div>
  </main>;
}
