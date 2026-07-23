export type ModelType = "chat" | "image" | "video";

export interface ModelConfig {
  id: string;
  name: string;
  modelId: string;
  type: ModelType;
}

export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  models: ModelConfig[];
}

export interface AppConfig {
  providers: ProviderConfig[];
}

export interface MediaRef {
  kind: "image" | "video";
  path: string;
  name: string;
  mimeType?: string;
  dataUrl?: string;
}

export interface Message {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string;
  status: "complete" | "processing" | "failed";
  error?: string;
  taskId?: string;
  attachments?: MediaRef[];
  media?: MediaRef[];
}

export interface Conversation {
  id: string;
  title: string;
  providerId?: string;
  modelId?: string;
  createdAt: string;
  updatedAt: string;
  messages: Message[];
}

export interface VideoOptions {
  ratio: string;
  resolution: string;
  duration: number;
  audio: boolean;
  watermark: boolean;
  cameraFixed: boolean;
}
