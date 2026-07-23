import { mkdir, readdir, rm } from "node:fs/promises";
import { conversationsDir, inside } from "./paths";
import { readJson, writeJsonAtomic } from "./json-store";
import { conversationSchema } from "./schemas";
import type { Conversation } from "./types";

const filePath = (id: string) => inside(conversationsDir, `${id}.json`);

export async function listConversations() {
  await mkdir(conversationsDir, { recursive: true });
  const files = (await readdir(conversationsDir)).filter((file) => file.endsWith(".json"));
  const conversations = await Promise.all(files.map((file) =>
    readJson<Conversation | null>(inside(conversationsDir, file), null)));
  return conversations.filter((item): item is Conversation => Boolean(item))
    .map((item) => conversationSchema.parse(item))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getConversation(id: string) {
  const value = await readJson<Conversation | null>(filePath(id), null);
  return value ? conversationSchema.parse(value) : null;
}

export async function saveConversation(value: unknown) {
  const conversation = conversationSchema.parse(value);
  await writeJsonAtomic(filePath(conversation.id), conversation);
  return conversation;
}

export async function deleteConversation(id: string) {
  await rm(filePath(id), { force: true });
}
