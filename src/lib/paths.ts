import { resolve, sep } from "node:path";

// Portable builds keep user data beside the application, outside Next's
// standalone server directory. Development keeps the existing cwd behavior.
export const projectRoot = resolve(
  /* turbopackIgnore: true */ process.env.MOTE_STORAGE_ROOT || process.cwd(),
);
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
