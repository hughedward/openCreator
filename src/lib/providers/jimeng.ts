import type { ImageOptions, ProviderConfig, VideoOptions } from "../types";
import type { ProviderTaskResult, TaskKind } from "./tasks";
import { signVolcengineRequest } from "./volc-sign";

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;
type JimengBody = Record<string, unknown> & { req_key: string };

const IMAGE_DIMENSIONS: Record<
  Exclude<ImageOptions["ratio"], "adaptive" | "custom">,
  [number, number]
> = {
  "1:1": [2048, 2048],
  "3:4": [1536, 2048],
  "4:3": [2048, 1536],
  "16:9": [2048, 1152],
  "9:16": [1152, 2048],
  "2:3": [1360, 2048],
  "3:2": [2048, 1360],
  "21:9": [2048, 880],
};

function base64Payload(value: string) {
  const match = value.match(/^data:[^;]+;base64,(.+)$/);
  if (!match) throw new Error("即梦视觉参考图必须是本地 Base64 图片");
  return match[1];
}

export function buildJimengImageRequest(
  modelId: string,
  prompt: string,
  images: string[],
  options: ImageOptions,
): JimengBody {
  const multiple = options.count > 1;
  const body: JimengBody = {
    req_key: modelId,
    prompt: multiple ? `${prompt}\n请生成一组共 ${options.count} 张图片，保持主题与风格一致。` : prompt,
    ...(images.length ? { binary_data_base64: images.map(base64Payload) } : {}),
  };
  if (options.ratio === "adaptive") {
    body.size = (options.resolution === "4K" ? 4096 : 2048) ** 2;
  } else {
    const dimensions = options.ratio === "custom"
      ? [options.width, options.height]
      : IMAGE_DIMENSIONS[options.ratio];
    const scale = options.ratio !== "custom" && options.resolution === "4K" ? 2 : 1;
    body.width = Number(dimensions[0]) * scale;
    body.height = Number(dimensions[1]) * scale;
  }
  body.force_single = !multiple;
  return body;
}

export function buildJimengVideoRequest(
  modelId: string,
  prompt: string,
  images: string[],
  options: VideoOptions,
): JimengBody {
  if (![5, 10].includes(options.duration)) {
    throw new Error("当前即梦视频模型仅支持 5 秒或 10 秒");
  }
  if (options.referenceMode === "references") {
    throw new Error("当前即梦视频接口不支持多参考图模式");
  }
  if (options.referenceMode === "first" && images.length < 1) {
    throw new Error("首帧模式需要一张参考图");
  }
  if (options.referenceMode === "first_last" && images.length !== 2) {
    throw new Error("首尾帧模式需要两张参考图");
  }
  if (options.referenceMode === "first_last" && !/first[_-]?tail/i.test(modelId)) {
    throw new Error("该即梦模型不是首尾帧视频模型，请检查 Model ID（req_key）");
  }
  const usedImages = options.referenceMode === "text" ? [] :
    images.slice(0, options.referenceMode === "first_last" ? 2 : 1);
  return {
    req_key: modelId,
    prompt,
    frames: options.duration * 24 + 1,
    ...(options.referenceMode === "text" && options.ratio !== "adaptive"
      ? { aspect_ratio: options.ratio }
      : {}),
    ...(usedImages.length ? { binary_data_base64: usedImages.map(base64Payload) } : {}),
  };
}

function jimengUrl(provider: ProviderConfig, action: string) {
  const url = new URL(provider.baseUrl || "https://visual.volcengineapi.com");
  url.pathname = "/";
  url.search = "";
  url.searchParams.set("Action", action);
  url.searchParams.set("Version", "2022-08-31");
  return url;
}

async function jimengRequest(
  provider: ProviderConfig,
  action: string,
  payload: JimengBody,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  if (!provider.accessKeyId || !provider.secretAccessKey) {
    throw new Error("即梦视觉需要配置 Access Key ID 和 Secret Access Key");
  }
  const url = jimengUrl(provider, action);
  const body = JSON.stringify(payload);
  const headers = signVolcengineRequest({
    accessKeyId: provider.accessKeyId,
    secretAccessKey: provider.secretAccessKey,
    method: "POST",
    url,
    body,
    region: "cn-north-1",
    service: "cv",
  });
  const response = await fetcher(url.toString(), { method: "POST", headers, body, signal });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.code !== 10000) {
    throw new Error(data.message || `即梦视觉接口返回 ${response.status}`);
  }
  return data;
}

export async function submitJimengTask(
  provider: ProviderConfig,
  payload: JimengBody,
  signal?: AbortSignal,
  fetcher: Fetcher = fetch,
) {
  const data = await jimengRequest(
    provider,
    "CVSync2AsyncSubmitTask",
    payload,
    signal,
    fetcher,
  );
  const taskId = data.data?.task_id;
  if (!taskId) throw new Error("即梦视觉没有返回任务 ID");
  return String(taskId);
}

export async function queryJimengTask(
  provider: ProviderConfig,
  modelId: string,
  taskId: string,
  kind: TaskKind,
  fetcher: Fetcher = fetch,
): Promise<ProviderTaskResult> {
  const data = await jimengRequest(provider, "CVSync2AsyncGetResult", {
    req_key: modelId,
    task_id: taskId,
    req_json: JSON.stringify({ return_url: true }),
  }, undefined, fetcher);
  const task = data.data || {};
  const status = String(task.status || "").toLowerCase();
  if (["in_queue", "generating", "queued", "processing"].includes(status)) {
    return { status: "processing", urls: [] };
  }
  if (status !== "done") {
    return { status: "failed", urls: [], error: data.message || `即梦任务状态：${status || "未知"}` };
  }
  const urls = kind === "image"
    ? (Array.isArray(task.image_urls) ? task.image_urls.map(String) : [])
    : [task.video_url].filter(Boolean).map(String);
  return urls.length
    ? { status: "succeeded", urls }
    : { status: "failed", urls: [], error: "即梦任务完成但没有返回媒体地址" };
}
