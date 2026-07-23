import type { ModelType } from "./types";

const copy: Record<ModelType, readonly string[]> = {
  image: [
    "正在铺开画布…",
    "调整光线与构图…",
    "让色彩慢慢抵达…",
    "细节正在浮现…",
    "快要完成了…",
  ],
  video: [
    "正在组织镜头…",
    "让画面开始流动…",
    "调整节奏与光影…",
    "正在衔接每一帧…",
    "快要完成了…",
  ],
  chat: ["正在组织回答…"],
};

export function generationPhrases(type: ModelType) {
  return [...copy[type]];
}
