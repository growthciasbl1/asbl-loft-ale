'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Text-to-speech via the browser SpeechSynthesis API. Works across Chrome,
 * Edge, Safari, Firefox. Handles HTML-stripped plain text so we can feed
 * the bot's HTML response directly.
 */

function stripHtml(html: string): string {
  if (!html) return '';
  const el = document.createElement('div');
  el.innerHTML = html;
  return (el.textContent || el.innerText || '').trim();
}

export interface SpeechSynthesisState {
  supported: boolean;
  speaking: boolean;
  speak: (textOrHtml: string) => void;
  stop: () => void;
}

export function useSpeechSynthesis(opts: { lang?: string } = {}): SpeechSynthesisState {
  const { lang = 'en-IN' } = opts;
  const [supported, setSupported] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    setSupported(typeof window !== 'undefined' && 'speechSynthesis' in window);
  }, []);

  const speak = useCallback(
    (textOrHtml: string) => {
      if (!supported) return;
      const synth = window.speechSynthesis;
      synth.cancel(); // replace any in-flight utterance
      const plain = stripHtml(textOrHtml);
      if (!plain) return;
      const u = new SpeechSynthesisUtterance(plain);
      u.lang = lang;
      u.rate = 1;
      u.pitch = 1;
      u.onend = () => setSpeaking(false);
      u.onerror = () => setSpeaking(false);
      utterRef.current = u;
      synth.speak(u);
      setSpeaking(true);
    },
    [supported, lang],
  );

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    setSpeaking(false);
  }, [supported]);

  useEffect(() => {
    return () => {
      if (supported) window.speechSynthesis.cancel();
    };
  }, [supported]);

  return { supported, speaking, speak, stop };
}
