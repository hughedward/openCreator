import { z } from "zod";

export const modelConfigSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  modelId: z.string().min(1),
  type: z.enum(["chat", "image", "video"]),
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
  attachments: z.array(mediaRefSchema).optional(),
  media: z.array(mediaRefSchema).optional(),
});

export const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  providerId: z.string().optional(),
  modelId: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  messages: z.array(messageSchema),
});

export const videoOptionsSchema = z.object({
  ratio: z.string(),
  resolution: z.string(),
  duration: z.number().int().min(2).max(12),
  audio: z.boolean(),
  watermark: z.boolean(),
  cameraFixed: z.boolean(),
});

export const generateRequestSchema = z.object({
  conversationId: z.string(),
  providerId: z.string(),
  modelId: z.string(),
  prompt: z.string(),
  attachments: z.array(mediaRefSchema).default([]),
  videoOptions: videoOptionsSchema.optional(),
});
