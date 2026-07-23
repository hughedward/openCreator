"use client";

import { useEffect, useMemo, useState } from "react";
import type { ModelType } from "@/lib/types";
import { emptyStatePhrases } from "@/lib/empty-state-copy";

export function EmptyStatePrompt({ type }: { type: ModelType }) {
  const phrases = useMemo(() => emptyStatePhrases(type), [type]);
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [characterIndex, setCharacterIndex] = useState(0);
  const [fading, setFading] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReducedMotion(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    if (reducedMotion) return;
    const phrase = phrases[phraseIndex];
    const delay = fading ? 260 : characterIndex < phrase.length ? 64 : 2500;
    const timer = window.setTimeout(() => {
      if (fading) {
        setPhraseIndex((index) => (index + 1) % phrases.length);
        setCharacterIndex(0);
        setFading(false);
      } else if (characterIndex < phrase.length) {
        setCharacterIndex((index) => index + 1);
      } else {
        setFading(true);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [characterIndex, fading, phraseIndex, phrases, reducedMotion]);

  const text = reducedMotion ? phrases[0] : phrases[phraseIndex].slice(0, characterIndex);
  return <p className={`empty-state-prompt ${fading ? "fading" : ""}`}>
    <span>{text}</span>
    {!reducedMotion && !fading && <span className="type-cursor" aria-hidden="true" />}
  </p>;
}
