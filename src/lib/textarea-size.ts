export function textareaSize(scrollHeight: number, minHeight: number, maxHeight: number) {
  const height = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
  return { height, scrolls: scrollHeight > maxHeight };
}
