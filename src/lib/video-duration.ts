export function videoDurationPresets(maxDuration: number) {
  const values = [4, 5, 6, 7, 8, 9, 10, 15, 20, 30, maxDuration]
    .filter((value) => value <= maxDuration);
  return [...new Set(values)].sort((a, b) => a - b);
}

export function validateVideoDuration(duration: number, maxDuration: number) {
  if (!Number.isInteger(duration)) throw new Error("视频时长必须为整数秒");
  if (duration < 4) throw new Error("视频时长至少为 4 秒");
  if (duration > maxDuration) throw new Error(`当前模型最长支持 ${maxDuration} 秒`);
}
