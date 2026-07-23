import { resolve, sep } from "node:path";

export const projectRoot = process.cwd();
export const dataDir = resolve(projectRoot, "data");
export const conversationsDir = resolve(dataDir, "conversations");
export const outDir = resolve(projectRoot, "out");

export function inside(base: string, ...parts: string[]) {
  const target = resolve(base, ...parts);
  if (target !== base && !target.startsWith(`${base}${sep}`)) {
    throw new Error("非法文件路径");
  }
  return target;
}
