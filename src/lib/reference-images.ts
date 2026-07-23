import type { VideoOptions } from "./types";

export function referenceConstraint(
  mode: VideoOptions["referenceMode"],
  modelLimit: number,
) {
  if (mode === "text") return { min: 0, max: 0 };
  if (mode === "first") return { min: 1, max: 1 };
  if (mode === "first_last") return { min: 2, max: 2 };
  return { min: 1, max: Math.max(1, modelLimit) };
}

export function validateReferenceCount(
  mode: VideoOptions["referenceMode"],
  count: number,
  modelLimit: number,
) {
  const constraint = referenceConstraint(mode, modelLimit);
  if (count >= constraint.min && count <= constraint.max) return;
  if (mode === "text") throw new Error("文生视频不需要参考图，请先移除已上传图片");
  if (mode === "first") throw new Error("首帧模式需要上传一张参考图");
  if (mode === "first_last") throw new Error("首尾帧模式需要上传两张参考图");
  if (count < constraint.min) throw new Error("多图参考模式至少需要一张参考图");
  throw new Error(`当前模型最多支持 ${constraint.max} 张参考图`);
}

export function validateMaximumReferenceCount(count: number, modelLimit: number) {
  if (count <= modelLimit) return;
  throw new Error(`当前模型最多支持 ${modelLimit} 张参考图`);
}
