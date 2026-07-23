"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, SlidersHorizontal } from "lucide-react";
import type { ImageOptions, VideoOptions } from "@/lib/types";
import { videoDurationPresets } from "@/lib/video-duration";

const imageRatios: Array<[ImageOptions["ratio"], string]> = [
  ["adaptive", "智能"], ["1:1", "1:1"], ["3:4", "3:4"], ["4:3", "4:3"],
  ["16:9", "16:9"], ["9:16", "9:16"], ["2:3", "2:3"], ["3:2", "3:2"], ["21:9", "21:9"],
];
const videoRatios: Array<[VideoOptions["ratio"], string]> = [
  ["21:9", "21:9"], ["16:9", "16:9"], ["4:3", "4:3"], ["1:1", "1:1"],
  ["3:4", "3:4"], ["9:16", "9:16"], ["adaptive", "智能"],
];

function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const pointer = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) close();
    };
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("mousedown", pointer);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("mousedown", pointer);
      document.removeEventListener("keydown", key);
    };
  }, [open, close]);
  return ref;
}

function Segmented<T extends string | number | boolean>({
  values, value, onChange, format = String,
}: {
  values: readonly T[];
  value: T;
  onChange: (value: T) => void;
  format?: (value: T) => string;
}) {
  return <div className="parameter-segments">
    {values.map((item) => <button type="button" key={String(item)}
      className={item === value ? "selected" : ""} onClick={() => onChange(item)}>
      {format(item)}
    </button>)}
  </div>;
}

export function ImageControls({
  value, onChange,
}: {
  value: ImageOptions;
  onChange: (value: ImageOptions) => void;
}) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  const ref = useDismiss(open, close);
  const ratioLabel = value.ratio === "adaptive" ? "智能比例" :
    value.ratio === "custom" ? `${value.width || "--"}×${value.height || "--"}` : value.ratio;
  return <div className="parameter-control" ref={ref}>
    <button type="button" className={`parameter-trigger ${open ? "active" : ""}`}
      aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <SlidersHorizontal size={14} />
      <span>{ratioLabel}</span><i /> <span>{value.resolution}</span><i /> <span>{value.count}张</span>
    </button>
    {open && <div className="parameter-popover image-parameter-popover">
      <section>
        <h3>图片比例</h3>
        <div className="ratio-grid image-ratios">
          {imageRatios.map(([ratio, label]) => <button type="button" key={ratio}
            className={value.ratio === ratio ? "selected" : ""}
            onClick={() => onChange({ ...value, ratio })}>
            <span className={`ratio-shape ratio-${ratio.replace(":", "-")}`} />
            <b>{label}</b>
          </button>)}
        </div>
      </section>
      <section>
        <h3>图片尺寸</h3>
        <div className="custom-size">
          <label>W<input inputMode="numeric" placeholder="--" value={value.width || ""}
            onChange={(event) => {
              const width = Number(event.target.value) || undefined;
              onChange({ ...value, ratio: width && value.height ? "custom" : "adaptive", width });
            }} /></label>
          <span>×</span>
          <label>H<input inputMode="numeric" placeholder="--" value={value.height || ""}
            onChange={(event) => {
              const height = Number(event.target.value) || undefined;
              onChange({ ...value, ratio: height && value.width ? "custom" : "adaptive", height });
            }} /></label>
        </div>
      </section>
      <section><h3>选择分辨率</h3>
        <Segmented values={["2K", "4K"] as const} value={value.resolution}
          onChange={(resolution) => onChange({ ...value, resolution })} />
      </section>
      <section><h3>生成数量</h3>
        <Segmented values={[1, 2, 3, 4] as const} value={value.count}
          onChange={(count) => onChange({ ...value, count })} />
      </section>
    </div>}
  </div>;
}

export function VideoControls({
  value, maxReferenceImages, maxVideoDuration, onChange,
}: {
  value: VideoOptions;
  maxReferenceImages: number;
  maxVideoDuration: number;
  onChange: (value: VideoOptions) => void;
}) {
  const [modeOpen, setModeOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const durationPresets = videoDurationPresets(maxVideoDuration);
  const [customDuration, setCustomDuration] = useState(
    () => !durationPresets.includes(value.duration));
  const close = () => { setModeOpen(false); setOptionsOpen(false); };
  const ref = useDismiss(modeOpen || optionsOpen, close);
  const ratioLabel = value.ratio === "adaptive" ? "智能比例" : value.ratio;
  const modeLabel = value.referenceMode === "text" ? "文生视频" :
    value.referenceMode === "first" ? "首帧" :
      value.referenceMode === "first_last" ? "首尾帧" : "多图参考";
  return <div className="video-parameter-group" ref={ref}>
    <div className="parameter-control">
      <button type="button" className={`parameter-trigger mode-trigger ${modeOpen ? "active" : ""}`}
        aria-expanded={modeOpen} onClick={() => { setModeOpen((open) => !open); setOptionsOpen(false); }}>
        {modeLabel} <ChevronDown size={13} />
      </button>
      {modeOpen && <div className="mode-popover">
        <small>选择模式</small>
        {([
          ["text", "文生视频", "仅使用文字描述生成视频"],
          ["first", "首帧", "使用一张图片作为视频起始画面"],
          ["first_last", "首尾帧", "使用两张图片固定开头和结尾"],
          ...(maxReferenceImages > 2 ? [[
            "references", "多图参考", `使用 1–${maxReferenceImages} 张图片控制内容与风格`,
          ] as const] : []),
        ] as const).map(([mode, title, note]) => <button type="button" key={mode}
          className={value.referenceMode === mode ? "selected" : ""}
          onClick={() => { onChange({ ...value, referenceMode: mode }); setModeOpen(false); }}>
          <span><b>{title}</b><small>{note}</small></span>
          {value.referenceMode === mode && <Check size={15} />}
        </button>)}
      </div>}
    </div>
    <div className="parameter-control">
      <button type="button" className={`parameter-trigger ${optionsOpen ? "active" : ""}`}
        aria-expanded={optionsOpen} onClick={() => { setOptionsOpen((open) => !open); setModeOpen(false); }}>
        <SlidersHorizontal size={14} />
        <span>{ratioLabel}</span><i /><span>{value.resolution.toUpperCase()}</span><i />
        <span>{value.duration}秒</span><i /><span>{value.count}条</span><i />
        <span>{value.audio ? "有声" : "无声"}</span>
      </button>
      {optionsOpen && <div className="parameter-popover video-parameter-popover">
        <section><h3>视频比例</h3>
          <div className="ratio-grid video-ratios">
            {videoRatios.map(([ratio, label]) => <button type="button" key={ratio}
              className={value.ratio === ratio ? "selected" : ""}
              onClick={() => onChange({ ...value, ratio })}>
              <span className={`ratio-shape ratio-${ratio.replace(":", "-")}`} /><b>{label}</b>
            </button>)}
          </div>
        </section>
        <section><h3>分辨率</h3>
          <Segmented values={["480p", "720p", "1080p", "4k"] as const} value={value.resolution}
            format={(resolution) => resolution.toUpperCase()}
            onChange={(resolution) => onChange({ ...value, resolution })} />
        </section>
        <section><h3>视频时长</h3>
          <div className="duration-picker">
          <Segmented values={durationPresets} value={value.duration}
            format={(duration) => `${duration}s`}
            onChange={(duration) => {
              setCustomDuration(false);
              onChange({ ...value, duration });
            }} />
          <button type="button" className={customDuration ? "selected" : ""}
            onClick={() => setCustomDuration(true)}>自定义</button>
          </div>
          {customDuration && <label className="custom-duration">
            <span>自定义秒数</span>
            <input type="number" min={4} max={maxVideoDuration} step={1}
              value={value.duration}
              onChange={(event) => {
                const duration = Math.min(maxVideoDuration, Math.max(4, Number(event.target.value) || 4));
                onChange({ ...value, duration });
              }} />
            <small>4–{maxVideoDuration} 秒</small>
          </label>}
        </section>
        <section><h3>选择生成数量</h3>
          <Segmented values={[1, 2, 3, 4] as const} value={value.count}
            onChange={(count) => onChange({ ...value, count })} />
        </section>
        <section><h3>输出声音</h3>
          <Segmented values={[true, false] as const} value={value.audio}
            format={(audio) => audio ? "开" : "关"}
            onChange={(audio) => onChange({ ...value, audio })} />
        </section>
      </div>}
    </div>
  </div>;
}
