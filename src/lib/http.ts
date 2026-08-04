import { ZodError } from "zod";

export function ok(data: unknown, init?: ResponseInit) {
  return Response.json(data, init);
}

export function failure(error: unknown, status = 400) {
  const message = error instanceof ZodError
    ? [...new Set(error.issues.map((issue) => issue.message).filter(Boolean))].join("；") || "数据格式不正确"
    : error instanceof Error ? error.message : "发生未知错误";
  return Response.json({ error: message }, { status });
}
