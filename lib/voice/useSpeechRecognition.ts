'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Thin wrapper around the browser SpeechRecognition API. Works on Chrome /
 * Edge / Safari (with webkit prefix). Returns null capability on unsupported
 * browsers so callers can hide the mic button.
 */

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string; isFinal?: boolean }>>;
}

interface SpeechRecognitionLike {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

type Ctor = new () => SpeechRecognitionLike;

function getSpeechCtor(): Ctor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: Ctor;
    webkitSpeechRecognition?: Ctor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export interface SpeechRecognitionState {
  supported: boolean;
  listening: boolean;
  transcript: string;
  start: () => void;
  stop: () => void;
  reset: () => void;
  error: string | null;
}

export function useSpeechRecognition(
  opts: { lang?: string; onFinal?: (text: string) => void } = {},
): SpeechRecognitionState {
  const { lang = 'en-IN', onFinal } = opts;
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const onFinalRef = useRef(onFinal);
  onFinalRef.current = onFinal;

  useEffect(() => {
    const Ctor = getSpeechCtor();
    setSupported(!!Ctor);
  }, []);

  const start = useCallback(() => {
    const Ctor = getSpeechCtor();
    if (!Ctor) {
      setError('Voice recognition not supported in this browser.');
      return;
    }
    const rec = new Ctor();
    rec.lang = lang;
    rec.interimResults = true;
    rec.continuous = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const alt = e.results[i][0];
        if (alt?.isFinal) final += alt.transcript;
        else interim += alt.transcript;
      }
      const combined = (final + interim).trim();
      setTranscript(combined);
      if (final.trim() && onFinalRef.current) {
        onFinalRef.current(final.trim());
      }
    };
    rec.onerror = (ev) => {
      const err = ev as Event & { error?: string };
      setError(err.error ?? 'voice_error');
      setListening(false);
    };
    rec.onend = () => {
      setListening(false);
    };
    try {
      rec.start();
      recRef.current = rec;
      setError(null);
      setListening(true);
      setTranscript('');
    } catch (e) {
      setError(String(e));
    }
  }, [lang]);

  const stop = useCallback(() => {
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    setTranscript('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      recRef.current?.abort();
    };
  }, []);

  return { supported, listening, transcript, start, stop, reset, error };
}
