"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModelType } from "@/lib/types";
import { generationPhrases } from "@/lib/generation-copy";

export function GenerationStatus({ type }: { type: ModelType }) {
  const phrases = useMemo(() => generationPhrases(type), [type]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = phrases[phraseIndex];
    const delay = characterIndex < phrase.length ? 72 : 2200;
    const timer = window.setTimeout(() => {
      if (characterIndex < phrase.length) {
        setCharacterIndex((index) => index + 1);
      } else {
        setPhraseIndex((index) => (index + 1) % phrases.length);
        setCharacterIndex(0);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [characterIndex, phraseIndex, phrases, reducedMotion]);

  const text = reducedMotion ? phrases[0] : phrases[phraseIndex].slice(0, characterIndex);

  return (
    <div className="generation-status" role="status" aria-live="polite">
      <span className="generation-orbit" aria-hidden="true"><i /></span>
      <span className="generation-copy">
        {text}
        {!reducedMotion && <span className="type-cursor" aria-hidden="true" />}
      </span>
      <small>{type === "video" ? "视频生成通常需要一些时间" : "灵感正在落到像素里"}</small>
    </div>
  );
}
