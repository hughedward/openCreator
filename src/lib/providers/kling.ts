import type { ImageOptions, ProviderConfig, VideoOptions } from "../types";
import type { ProviderTaskResult, TaskKind } from "./tasks";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type KlingBody = Record<string, unknown>;

function rawBase64(value: string) {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  return match ? match[1] : value;
}

function klingUrl(provider: ProviderConfig, path: string) {
  return `${provider.baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

async function klingRequest(
  provider: ProviderConfig,
  path: string,
  init: RequestInit,
  fetcher: Fetcher = fetch,
) {
  const response = await fetcher(klingUrl(provider, path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
      ...init.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 0) {
    const requestId = data.request_id ? `（Request ID: ${data.request_id}）` : "";
    throw new Error((data.message || `可灵接口返回 ${response.status}`) + requestId);
  }
  return data;
}

export function buildKlingImageRequest(
  modelId: string,
  prompt: string,
  images: string[],
  options: ImageOptions,
): KlingBody {
  const omni = /omni/i.test(modelId);
  if (!omni && images.length > 1) {
    throw new Error("该可灵图片模型只支持一张参考图；多参考图请使用 Omni 模型");
  }
  if (!omni && options.resolution === "4K") {
    throw new Error("该可灵图片接口不支持 4K；请使用 Omni 模型或选择 2K");
  }
  const common = {
    model_name: modelId,
    prompt,
    resolution: options.resolution.toLowerCase(),
    n: options.count,
    ...(options.ratio !== "adaptive" ? { aspect_ratio: options.ratio } : {}),
    watermark_info: { enabled: false },
  };
  if (omni) {
    return {
      ...common,
      ...(options.ratio === "adaptive" ? { aspect_ratio: "auto" } : {}),
      ...(images.length
        ? { image_list: images.map((image) => ({ image: rawBase64(image) })) }
        : {}),
      result_type: "single",
    };
  }
  return {
    ...common,
    ...(images[0] ? { image: rawBase64(images[0]) } : {}),
  };
}

export function buildKlingVideoRequest(
  prompt: string,
  images: string[],
  options: VideoOptions,
): KlingBody {
  if (options.duration < 3 || options.duration > 15) {
    throw new Error("Kling 3.0 Turbo 视频时长必须在 3–15 秒之间");
  }
  if (!["720p", "1080p"].includes(options.resolution)) {
    throw new Error("Kling 3.0 Turbo 仅支持 720P 或 1080P");
  }
  if (["first_last", "references"].includes(options.referenceMode)) {
    throw new Error("Kling 3.0 Turbo 当前仅支持文生视频或单张首帧");
  }
  if (options.referenceMode === "first" && !images[0]) {
    throw new Error("首帧模式需要一张参考图");
  }
  const settings = {
    resolution: options.resolution,
    duration: options.duration,
    ...(options.referenceMode === "text" && options.ratio !== "adaptive"
      ? { aspect_ratio: options.ratio }
      : {}),
  };
  const shared = {
    settings,
    options: { watermark_info: { enabled: options.watermark } },
  };
  if (options.referenceMode === "text") return { prompt, ...shared };
  return {
    contents: [
      { type: "prompt", text: prompt },
      { type: "first_frame", url: rawBase64(images[0]) },
    ],
    ...shared,
  };
}

export async function submitKlingImageTask(
  provider: ProviderConfig,
  modelId: string,
  payload: KlingBody,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  const path = /omni/i.test(modelId) ? "v1/images/omni-image" : "v1/images/generations";
  const data = await klingRequest(provider, path, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  }, fetcher);
  const taskId = data.data?.task_id;
  if (!taskId) throw new Error("可灵没有返回图片任务 ID");
  return String(taskId);
}

export async function submitKlingVideoTask(
  provider: ProviderConfig,
  modelId: string,
  mode: VideoOptions["referenceMode"],
  payload: KlingBody,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  const operation = mode === "text" ? "text-to-video" : "image-to-video";
  const data = await klingRequest(provider, `${operation}/${modelId}`, {
    method: "POST",
    body: JSON.stringify(payload),
    signal,
  }, fetcher);
  const taskId = data.data?.id;
  if (!taskId) throw new Error("可灵没有返回视频任务 ID");
  return String(taskId);
}

export async function queryKlingTask(
  provider: ProviderConfig,
  modelId: string,
  taskId: string,
  kind: TaskKind,
  fetcher: Fetcher = fetch,
): Promise<ProviderTaskResult> {
  const path = kind === "video"
    ? `tasks?task_ids=${encodeURIComponent(taskId)}`
    : `${/omni/i.test(modelId) ? "v1/images/omni-image" : "v1/images/generations"}/${encodeURIComponent(taskId)}`;
  const data = await klingRequest(provider, path, { method: "GET" }, fetcher);
  const task = kind === "video" ? data.data?.[0] : data.data;
  if (!task) return { status: "failed", urls: [], error: "可灵没有返回任务信息" };
  const status = String(task.status || task.task_status || "").toLowerCase();
  if (["submitted", "processing"].includes(status)) {
    return { status: "processing", urls: [] };
  }
  if (!["succeed", "succeeded", "success"].includes(status)) {
    return {
      status: "failed",
      urls: [],
      error: task.message || task.task_status_msg || "可灵生成失败",
    };
  }
  const urls = kind === "video"
    ? (task.outputs || []).filter((item: { type?: string }) => item.type === "video")
      .map((item: { url?: string }) => item.url).filter(Boolean)
    : (task.task_result?.images || []).map((item: { url?: string }) => item.url).filter(Boolean);
  return urls.length
    ? { status: "succeeded", urls: urls.map(String) }
    : { status: "failed", urls: [], error: "可灵任务完成但没有返回媒体地址" };
}
