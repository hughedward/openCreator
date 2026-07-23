import { z } from "zod";

export const modelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modelId: z.string().min(1),
  type: z.enum(["chat", "image", "video"]),
  maxReferenceImages: z.number().int().min(0).max(8).default(2),
});

export const providerConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  baseUrl: z.url(),
  apiKey: z.string().min(1),
  models: z.array(modelConfigSchema).superRefine((models, ctx) => {
    const ids = new Set<string>();
    models.forEach((model, index) => {
      if (ids.has(model.id)) ctx.addIssue({
        code: "custom", message: "模型 ID 不能重复", path: [index, "id"],
      });
      ids.add(model.id);
    });
  }),
});

export const appConfigSchema = z.object({
  providers: z.array(providerConfigSchema),
});

export const mediaRefSchema = z.object({
  kind: z.enum(["image", "video"]),
  path: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  dataUrl: z.string().optional(),
});

export const messageSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["user", "assistant", "system"]),
  content: z.string(),
  createdAt: z.string(),
  status: z.enum(["complete", "processing", "failed"]),
  error: z.string().optional(),
  taskId: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
  completedTaskIds: z.array(z.string()).optional(),
  failedTaskIds: z.array(z.string()).optional(),
  attachments: z.array(mediaRefSchema).optional(),
  media: z.array(mediaRefSchema).optional(),
});

export const imageOptionsSchema = z.object({
  ratio: z.enum(["adaptive", "1:1", "3:4", "4:3", "16:9", "9:16", "2:3", "3:2", "21:9", "custom"]),
  resolution: z.enum(["2K", "4K"]),
  count: z.number().int().min(1).max(4),
  width: z.number().int().min(512).max(4096).optional(),
  height: z.number().int().min(512).max(4096).optional(),
}).superRefine((options, ctx) => {
  if (options.ratio === "custom" && (!options.width || !options.height)) {
    ctx.addIssue({ code: "custom", message: "自定义尺寸需要填写宽和高" });
  }
});

export const videoOptionsSchema = z.object({
  referenceMode: z.enum(["text", "first", "first_last", "references"]),
  ratio: z.enum(["adaptive", "21:9", "16:9", "4:3", "1:1", "3:4", "9:16"]),
  resolution: z.enum(["480p", "720p", "1080p", "4k"]),
  duration: z.number().int().min(4).max(10),
  count: z.number().int().min(1).max(4),
  audio: z.boolean(),
  watermark: z.boolean(),
  cameraFixed: z.boolean(),
});

export const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  imageOptions: imageOptionsSchema.optional(),
  videoOptions: videoOptionsSchema.optional(),
  messages: z.array(messageSchema),
});

export const generateRequestSchema = z.object({
  conversationId: z.string(),
  providerId: z.string(),
  modelId: z.string(),
  prompt: z.string(),
  attachments: z.array(mediaRefSchema).default([]),
  imageOptions: imageOptionsSchema.optional(),
  videoOptions: videoOptionsSchema.optional(),
});
