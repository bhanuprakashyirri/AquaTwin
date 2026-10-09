/**
 * Browser voice session — speech-to-text via SpeechRecognition and
 * text-to-speech via SpeechSynthesis. No phone number, no API key,
 * no telephony: everything happens inside the browser.
 *
 * Supports barge-in (the user can talk while Aqua is speaking),
 * interim transcripts, and auto-restart after silence.
 */

export type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export interface VoiceSessionCallbacks {
  onStateChange?: (state: VoiceState) => void;
  onInterimTranscript?: (text: string) => void;
  onFinalTranscript?: (text: string) => void;
  onError?: (message: string) => void;
}

export class AquaVoiceSession {
  static get supported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }

  private recognition: SpeechRecognition | null = null;
  private callbacks: VoiceSessionCallbacks = {};
  private active = false;
  private processing = false;

  start(callbacks: VoiceSessionCallbacks): boolean {
    if (!AquaVoiceSession.supported || this.active) return false;
    this.callbacks = callbacks;

    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition!;
    const rec = new Ctor();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this.active = true;
      this.emitState("listening");
    };

    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          const text = r[0].transcript.trim();
          if (text) {
            this.processing = true;
            this.emitState("thinking");
            this.callbacks.onFinalTranscript?.(text);
          }
        } else {
          interim += r[0].transcript;
        }
      }
      if (interim) this.callbacks.onInterimTranscript?.(interim);
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        this.active = false;
        this.callbacks.onError?.(
          "Microphone access denied. Allow mic permission in the browser, or use text chat.",
        );
      } else if (e.error === "no-speech") {
        // transient — onend will auto-restart while active
      } else if (e.error !== "aborted") {
        this.callbacks.onError?.(`Voice error: ${e.error}`);
      }
    };

    rec.onend = () => {
      if (this.active && !this.processing) {
        try {
          rec.start();
        } catch {
          /* already running */
        }
      }
      // while processing, the widget calls resume() when the agent finishes
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      return false;
    }
    return true;
  }

  /** Called by the widget after the agent finishes processing a turn. */
  resume(): void {
    this.processing = false;
    if (this.active && this.recognition) {
      try {
        this.recognition.start();
      } catch {
        /* already running */
      }
    }
    if (this.active) this.emitState("listening");
  }

  speak(text: string): void {
    if (typeof speechSynthesis === "undefined" || !text.trim()) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.02;
    utterance.pitch = 1;
    const voice = pickVoice();
    if (voice) utterance.voice = voice;
    utterance.onstart = () => this.emitState("speaking");
    utterance.onend = () => {
      if (this.active) this.emitState("listening");
    };
    speechSynthesis.speak(utterance);
  }

  stopSpeaking(): void {
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (this.active) this.emitState("listening");
  }

  stop(): void {
    this.active = false;
    this.processing = false;
    this.stopSpeaking();
    try {
      this.recognition?.stop();
    } catch {
      /* not started */
    }
    this.recognition = null;
    this.emitState("idle");
  }

  private emitState(state: VoiceState): void {
    this.callbacks.onStateChange?.(state);
  }
}

function pickVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === "undefined") return null;
  const voices = speechSynthesis.getVoices();
  if (!voices.length) return null;
  return (
    voices.find((v) => /en[-_]US/i.test(v.lang) && /google|natural|aria|samantha|jenny/i.test(v.name)) ??
    voices.find((v) => /en[-_]US/i.test(v.lang)) ??
    voices.find((v) => /^en/i.test(v.lang)) ??
    null
  );
}
