import type { ModelType } from "./types";

const capabilityPhrase: Record<ModelType, string> = {
  chat: "把问题放在这里，我们一起想清楚。",
  image: "描述一个画面，让想象有了形状。",
  video: "告诉我镜头如何开始，又如何向前。",
};

const generalPhrases = [
  "从一句话开始，让灵感有形。",
  "把脑海里的画面，慢慢说出来。",
  "写下一个瞬间，剩下的交给想象。",
  "一张图、一段话，都可以成为开场。",
  "让故事动起来，让画面被看见。",
  "灵感不必完整，先留下第一笔。",
  "此刻想到的，也许正值得被创造。",
];

export function emptyStatePhrases(type: ModelType) {
  return [...new Set([capabilityPhrase[type], ...generalPhrases])];
}
