"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Eye, EyeOff, Plus, Save, Trash2, X } from "lucide-react";
import type { AppConfig, ModelConfig, ProviderConfig } from "@/lib/types";
import { createClientId } from "@/lib/client-id";

const id = () => createClientId();
const emptyModel = (): ModelConfig => ({ id: id(), name: "", modelId: "", type: "chat" });
const emptyProvider = (): ProviderConfig => ({
  id: id(), name: "", baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
  apiKey: "", models: [emptyModel()],
});

export function SettingsForm() {
  const [config, setConfig] = useState<AppConfig>({ providers: [] });
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/config").then((response) => response.json()).then(setConfig)
      .catch(() => setError("无法读取配置"));
  }, []);

  const updateProvider = (index: number, patch: Partial<ProviderConfig>) => {
    setConfig((current) => ({
      providers: current.providers.map((provider, i) => i === index ? { ...provider, ...patch } : provider),
    }));
  };
  const updateModel = (providerIndex: number, modelIndex: number, patch: Partial<ModelConfig>) => {
    const provider = config.providers[providerIndex];
    updateProvider(providerIndex, {
      models: provider.models.map((model, i) => i === modelIndex ? { ...model, ...patch } : model),
    });
  };
  const save = async () => {
    setError(""); setStatus("");
    const response = await fetch("/api/config", {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config),
    });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "保存失败");
    setConfig(data); setStatus("已保存");
    window.setTimeout(() => setStatus(""), 2000);
  };

  return (
    <main className="settings-page">
      <header className="settings-top">
        <Link href="/" className="back-link"><ArrowLeft size={17} /> 返回对话</Link>
        <div className="settings-actions">
          {status && <span className="save-status"><Check size={14} />{status}</span>}
          <button className="primary-button" onClick={save}><Save size={15} /> 保存配置</button>
        </div>
      </header>

      <div className="settings-content">
        <div className="settings-title">
          <span className="eyebrow">LOCAL CONFIGURATION</span>
          <h1>模型设置</h1>
          <p>密钥只保存在这台电脑的 <code>data/config.json</code> 中，不会发送到浏览器存储。</p>
        </div>
        {error && <div className="settings-error">{error}<button onClick={() => setError("")}><X size={14} /></button></div>}

        <section className="providers">
          {config.providers.map((provider, providerIndex) => (
            <article className="provider" key={provider.id}>
              <div className="provider-number">{String(providerIndex + 1).padStart(2, "0")}</div>
              <div className="provider-fields">
                <div className="section-head">
                  <h2>{provider.name || "未命名供应商"}</h2>
                  <button className="danger-link" onClick={() => setConfig({
                    providers: config.providers.filter((_, i) => i !== providerIndex),
                  })}><Trash2 size={14} /> 删除</button>
                </div>
                <div className="form-grid">
                  <label><span>供应商名称</span><input value={provider.name}
                    placeholder="火山方舟" onChange={(e) => updateProvider(providerIndex, { name: e.target.value })} /></label>
                  <label className="wide"><span>Base URL</span><input value={provider.baseUrl}
                    placeholder="https://ark.cn-beijing.volces.com/api/v3"
                    onChange={(e) => updateProvider(providerIndex, { baseUrl: e.target.value })} /></label>
                  <label className="wide"><span>API Key</span><div className="secret-input">
                    <input type={visible[provider.id] ? "text" : "password"} value={provider.apiKey}
                      placeholder="输入 API Key"
                      onChange={(e) => updateProvider(providerIndex, { apiKey: e.target.value })} />
                    <button onClick={() => setVisible({ ...visible, [provider.id]: !visible[provider.id] })}>
                      {visible[provider.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div></label>
                </div>

                <div className="models-head"><h3>模型</h3><span>{provider.models.length} 个</span></div>
                <div className="model-table">
                  <div className="model-row header"><span>显示名称</span><span>Model ID</span><span>类型</span><span /></div>
                  {provider.models.map((model, modelIndex) => (
                    <div className="model-row" key={model.id}>
                      <input value={model.name} placeholder="Seedream 4.5"
                        onChange={(e) => updateModel(providerIndex, modelIndex, { name: e.target.value })} />
                      <input value={model.modelId} placeholder="doubao-seedream-4-5-251128"
                        onChange={(e) => updateModel(providerIndex, modelIndex, { modelId: e.target.value })} />
                      <select value={model.type}
                        onChange={(e) => updateModel(providerIndex, modelIndex, { type: e.target.value as ModelConfig["type"] })}>
                        <option value="chat">对话</option><option value="image">图像</option><option value="video">视频</option>
                      </select>
                      <button aria-label="删除模型" onClick={() => updateProvider(providerIndex, {
                        models: provider.models.filter((_, i) => i !== modelIndex),
                      })}><Trash2 size={15} /></button>
                    </div>
                  ))}
                </div>
                <button className="add-model" onClick={() => updateProvider(providerIndex, {
                  models: [...provider.models, emptyModel()],
                })}><Plus size={15} /> 添加模型</button>
              </div>
            </article>
          ))}
          <button className="add-provider" onClick={() => setConfig({ providers: [...config.providers, emptyProvider()] })}>
            <Plus size={18} /><span>添加供应商</span><small>同一个 URL 和 Key 下可以配置多个模型</small>
          </button>
        </section>
      </div>
    </main>
  );
}
