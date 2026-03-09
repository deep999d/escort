"use client";

import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";

export function VoiceInput({
  onTranscript,
  disabled,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const [listening, setListening] = useState(false);
  const [mounted, setMounted] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const startListening = () => {
    if (typeof window === "undefined" || !("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      return;
    }
    const SpeechRecognitionAPI = (window as unknown as { SpeechRecognition?: new () => SpeechRecognition }).SpeechRecognition
      || (window as unknown as { webkitSpeechRecognition?: new () => SpeechRecognition }).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    const r = new SpeechRecognitionAPI();
    r.continuous = false;
    r.interimResults = false;
    r.lang = "en-US";
    r.onresult = (e: SpeechRecognitionEvent) => {
      const transcript = Array.from(e.results)
        .map((x) => x[0].transcript)
        .join(" ");
      onTranscript(transcript);
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setListening(false);
  };

  const supported = mounted && typeof window !== "undefined" && (!!(window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition || !!(window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition);

  if (!supported || disabled) return null;

  return (
    <button
      type="button"
      onClick={listening ? stopListening : startListening}
      className={`p-2 rounded-lg transition-colors ${
        listening
          ? "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400"
          : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      }`}
      title={listening ? "Stop" : "Voice input"}
    >
      {listening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
    </button>
  );
}
