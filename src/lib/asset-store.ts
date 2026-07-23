import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import type { Conversation } from "./types";

export interface Asset {
  id: string;
  kind: "image" | "video";
  path: string;
  name: string;
  mimeType: string;
  size: number;
  modifiedAt: string;
  createdAt?: string;
  conversationId?: string;
  conversationTitle?: string;
}

export function enrichAssets(assets: Asset[], conversations: Conversation[]) {
  const sources = new Map<string, Pick<Asset, "createdAt" | "conversationId" | "conversationTitle">>();
  for (const conversation of conversations) {
    for (const message of conversation.messages) {
      for (const media of message.media || []) {
        sources.set(media.path, {
          createdAt: message.createdAt,
          conversationId: conversation.id,
          conversationTitle: conversation.title,
        });
      }
    }
  }

  return assets.map((asset) => ({ ...asset, ...sources.get(asset.path) }))
    .sort((a, b) => (b.createdAt || b.modifiedAt).localeCompare(a.createdAt || a.modifiedAt));
}

export async function indexAssets(conversations: Conversation[]): Promise<Asset[]> {
  const assets: Asset[] = [];
  const imageEntries = await readdir(
    path.join(/* turbopackIgnore: true */ process.cwd(), "out", "images"),
    { withFileTypes: true },
  ).catch(() => []);
  for (const entry of imageEntries) {
    if (!entry.isFile()) continue;
    const relativePath = `images/${entry.name}`;
    const details = await stat(path.join(
      /* turbopackIgnore: true */ process.cwd(), "out", "images", entry.name,
    ));
    const extension = entry.name.split(".").pop()?.toLowerCase();
    assets.push({
      id: relativePath, kind: "image", path: relativePath, name: path.basename(entry.name),
      mimeType: extension === "png" ? "image/png" : extension === "webp" ? "image/webp" : "image/jpeg",
      size: details.size, modifiedAt: details.mtime.toISOString(),
    });
  }
  const videoEntries = await readdir(
    path.join(/* turbopackIgnore: true */ process.cwd(), "out", "videos"),
    { withFileTypes: true },
  ).catch(() => []);
  for (const entry of videoEntries) {
    if (!entry.isFile()) continue;
    const relativePath = `videos/${entry.name}`;
    const details = await stat(path.join(
      /* turbopackIgnore: true */ process.cwd(), "out", "videos", entry.name,
    ));
    assets.push({
      id: relativePath, kind: "video", path: relativePath, name: path.basename(entry.name),
      mimeType: "video/mp4", size: details.size, modifiedAt: details.mtime.toISOString(),
    });
  }
  return enrichAssets(assets, conversations);
}
