"use client";

/**
 * Aqua — floating autonomous voice agent powered by Google Gemini.
 *
 * A floating launcher (bottom-right) that opens a conversational field panel.
 * - Powered by Google Gemini Flash for deep reasoning over soil sensors, weather forecasts,
 *   irrigation simulations, and site controls.
 * - Speech-to-text (STT) via Web Speech API.
 * - Text-to-speech (TTS) via Web Speech Synthesis with natural voices and barge-in.
 * - Picks up GEMINI_API_KEY from environment variables (NEXT_PUBLIC_GEMINI_API_KEY / backend)
 *   or allows instant in-browser configuration.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  Check,
  KeyRound,
  Mic,
  MicOff,
  PhoneOff,
  SendHorizonal,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import {
  runAgent,
  getGeminiApiKey,
  setGeminiApiKey,
  type SiteAction,
} from "@/agent/engine";
import {
  AquaVoiceSession,
  speakAloud,
  type VoiceState,
} from "@/agent/voice";
import {
  AGENT_EVENTS,
  dispatchAgentEvent,
  dispatchSidebarToggle,
} from "@/agent/site-bus";

interface Msg {
  id: number;
  role: "user" | "agent" | "system";
  text: string;
}

const QUICK_CHIPS = [
  "Field status",
  "Show Zone B",
  "When is rain expected?",
  "Run the simulation",
  "Optimize water",
  "Switch to stress layer",
  "What can you do?",
];

const GREETING =
  "Hi, I'm Aqua — your autonomous field agent powered by Gemini AI. I can inspect soil sensors, project rainfall, run what-if simulations, optimize water allocations, and speak with you aloud. " +
  "Tap the mic to talk, or type below.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_BASE ||
  "http://localhost:8000";

export function VoiceAgent() {
  const router = useRouter();
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    { id: 0, role: "agent", text: GREETING },
  ]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [interim, setInterim] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  // Audio / Speech controls
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Gemini API key state
  const [hasGeminiKey, setHasGeminiKey] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [keySavedToast, setKeySavedToast] = useState(false);

  const sessionRef = useRef<AquaVoiceSession | null>(null);
  const voiceActiveRef = useRef(false);
  const typingRef = useRef(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

  // Check Gemini API key on mount
  useEffect(() => {
    const key = getGeminiApiKey();
    if (key) {
      setHasGeminiKey(true);
      setGeminiKeyInput(key);
    } else {
      // Check backend status
      fetch(`${API_BASE}/api/agent/status`)
        .then((r) => r.json())
        .then((d) => {
          if (d.configured) setHasGeminiKey(true);
        })
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, typing]);

  const appendMsg = useCallback((role: Msg["role"], text: string) => {
    setMessages((m) => [...m, { id: idRef.current++, role, text }]);
  }, []);

  const applyActions = useCallback(
    async (actions: SiteAction[]) => {
      for (const a of actions) {
        switch (a.type) {
          case "navigate":
            router.push(a.path);
            await sleep(650);
            break;
          case "layer":
            dispatchAgentEvent(AGENT_EVENTS.layer, { layer: a.layer });
            break;
          case "zone":
            dispatchAgentEvent(AGENT_EVENTS.zone, { zoneId: a.zoneId });
            break;
          case "simulate":
            dispatchAgentEvent(AGENT_EVENTS.simulate, {});
            break;
          case "optimize":
            dispatchAgentEvent(AGENT_EVENTS.optimize, { amount: a.amount });
            break;
          case "sidebar":
            dispatchSidebarToggle();
            break;
          case "refresh":
            dispatchAgentEvent(AGENT_EVENTS.refresh, {});
            break;
        }
      }
    },
    [router],
  );

  const actionSummary = (actions: SiteAction[]): string | null => {
    const a = actions[actions.length - 1];
    if (!a) return null;
    switch (a.type) {
      case "navigate":
        return `Navigated to ${a.path}`;
      case "layer":
        return `Map layer → ${a.layer}`;
      case "zone":
        return `Selected Zone ${a.zoneId.replace("zone-", "").toUpperCase()}`;
      case "simulate":
        return "Simulation started";
      case "optimize":
        return `Water budget optimized · ${a.amount.toLocaleString()} L`;
      case "sidebar":
        return "Sidebar toggled";
      case "refresh":
        return "Data refreshed";
    }
  };

  const processText = useCallback(
    async (text: string) => {
      typingRef.current = true;
      setTyping(true);
      try {
        const res = await runAgent(text, {
          currentPath: pathnameRef.current,
          history: messages
            .filter((m) => m.role === "user" || m.role === "agent")
            .map((m) => ({ role: m.role as "user" | "agent", text: m.text })),
        });
        await applyActions(res.actions);
        appendMsg("agent", res.text);
        const summary = actionSummary(res.actions);
        if (summary) appendMsg("system", summary);

        // Voice agent talks aloud
        if (autoSpeak || voiceActiveRef.current) {
          setIsSpeaking(true);
          speakAloud(
            res.text,
            () => {
              setIsSpeaking(true);
              setVoiceState("speaking");
            },
            () => {
              setIsSpeaking(false);
              setVoiceState(voiceActiveRef.current ? "listening" : "idle");
              if (voiceActiveRef.current) sessionRef.current?.resume();
            },
          );
        }
      } catch {
        appendMsg("agent", "I ran into an issue connecting with Gemini. Try again.");
      } finally {
        typingRef.current = false;
        setTyping(false);
      }
    },
    [appendMsg, applyActions, autoSpeak, messages],
  );

  const send = useCallback(
    (raw: string) => {
      const text = raw.trim();
      if (!text || typingRef.current) return;
      setInput("");
      appendMsg("user", text);
      void processText(text);
    },
    [appendMsg, processText],
  );

  const toggleVoice = useCallback(() => {
    if (voiceActiveRef.current) {
      sessionRef.current?.stop();
      sessionRef.current = null;
      voiceActiveRef.current = false;
      setVoiceState("idle");
      setVoiceOpen(false);
      setInterim("");
      setIsSpeaking(false);
      return;
    }
    if (!AquaVoiceSession.supported) {
      setUnsupported(true);
      return;
    }
    setVoiceError(null);
    const session = new AquaVoiceSession();
    sessionRef.current = session;
    const started = session.start({
      onStateChange: (s) => {
        setVoiceState(s);
        setIsSpeaking(s === "speaking");
      },
      onInterimTranscript: (t) => setInterim(t),
      onFinalTranscript: (t) => {
        setInterim("");
        appendMsg("user", t);
        void processText(t);
      },
      onError: (msg) => setVoiceError(msg),
    });
    if (!started) {
      setVoiceError("Could not start voice. Check microphone permission.");
      return;
    }
    voiceActiveRef.current = true;
    setVoiceOpen(true);
  }, [appendMsg, processText]);

  const handleSaveGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = geminiKeyInput.trim();
    if (trimmed) {
      setGeminiApiKey(trimmed);
      setHasGeminiKey(true);
      setKeySavedToast(true);
      setTimeout(() => {
        setKeySavedToast(false);
        setShowKeyModal(false);
      }, 1200);
    } else {
      setGeminiApiKey(null);
      setHasGeminiKey(false);
      setShowKeyModal(false);
    }
  };

  const handleStopSpeaking = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setVoiceState(voiceActiveRef.current ? "listening" : "idle");
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating launcher */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Aqua voice assistant"
        title="Aqua Field Assistant (Gemini AI)"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[999] flex h-12 w-12 items-center justify-center rounded-full bg-[#163A31] text-white shadow-raised border border-white/20 transition-all duration-200 hover:bg-[#28745F] hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {isSpeaking && (
          <span className="absolute inset-0 animate-ping rounded-full bg-emerald-400/50" />
        )}
        {voiceState === "listening" ? (
          <Mic size={20} className="text-emerald-300 animate-pulse" />
        ) : isSpeaking ? (
          <Volume2 size={20} className="text-emerald-300 animate-bounce" />
        ) : (
          <Bot size={20} />
        )}
        {hasGeminiKey && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-[8px] text-white ring-2 ring-[#163A31]">
            ✦
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-24 right-5 z-[9999] flex h-[580px] max-h-[calc(100vh-120px)] w-[400px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-xl2 border border-line bg-page shadow-float"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-[#163A31] via-[#1D493D] to-[#28745F] px-4 py-3 text-white shadow-sm z-10">
              <div className="flex items-center gap-2.5">
                <div className="relative flex h-9 w-9 items-center justify-center rounded-full bg-white/15 shadow-inner">
                  <Bot size={18} />
                  {isSpeaking && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-sm font-bold tracking-wide">
                    <span>Aqua</span>
                    <span className="rounded bg-white/20 px-1.5 py-0.2 text-[10px] font-semibold tracking-wider text-emerald-200">
                      GEMINI
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 text-micro text-white/80">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        isSpeaking
                          ? "bg-emerald-300 animate-pulse"
                          : voiceState === "listening"
                            ? "bg-emerald-400 animate-ping"
                            : voiceState === "thinking"
                              ? "bg-amber-300 animate-pulse"
                              : "bg-white/50"
                      }`}
                    />
                    {isSpeaking
                      ? "Talking aloud…"
                      : voiceState === "listening"
                        ? "Listening…"
                        : voiceState === "thinking"
                          ? "Gemini reasoning…"
                          : hasGeminiKey
                            ? "Gemini 2.5 Flash connected"
                            : "Ready · Add Gemini Key"}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1">
                {/* Gemini API Key button */}
                <button
                  type="button"
                  onClick={() => setShowKeyModal((v) => !v)}
                  title={hasGeminiKey ? "Gemini Key Configured" : "Add Gemini API Key"}
                  className={`rounded-full p-1.5 text-xs transition-colors ${
                    hasGeminiKey
                      ? "bg-emerald-500/30 text-emerald-200 hover:bg-emerald-500/40"
                      : "bg-amber-500/30 text-amber-200 hover:bg-amber-500/40"
                  }`}
                >
                  <KeyRound size={14} />
                </button>

                {/* Speech audio toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (isSpeaking) handleStopSpeaking();
                    setAutoSpeak((s) => !s);
                  }}
                  title={autoSpeak ? "Audio responses: ON (Click to mute)" : "Audio responses: MUTED (Click to unmute)"}
                  className={`rounded-full p-1.5 transition-colors ${
                    autoSpeak ? "text-emerald-200 hover:bg-white/15" : "text-white/40 hover:bg-white/15"
                  }`}
                >
                  {autoSpeak ? <Volume2 size={15} /> : <VolumeX size={15} />}
                </button>

                {/* Microphone toggle */}
                <button
                  type="button"
                  onClick={toggleVoice}
                  title={voiceActiveRef.current ? "Stop voice microphone" : "Speak to Aqua"}
                  className={`rounded-full p-1.5 transition-colors ${
                    voiceActiveRef.current ? "bg-red-500/40 text-red-200" : "hover:bg-white/15"
                  }`}
                >
                  {voiceActiveRef.current ? <MicOff size={15} /> : <Mic size={15} />}
                </button>

                {/* Close panel */}
                <button
                  type="button"
                  onClick={() => {
                    handleStopSpeaking();
                    setOpen(false);
                  }}
                  title="Close agent"
                  className="rounded-full p-1.5 transition-colors hover:bg-white/15"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Gemini Key Config Drawer */}
            <AnimatePresence>
              {showKeyModal && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden border-b border-line bg-surface px-4 py-3 shadow-inner"
                >
                  <form onSubmit={handleSaveGeminiKey} className="space-y-2">
                    <div className="flex items-center justify-between text-tiny font-bold text-ink">
                      <span className="flex items-center gap-1.5">
                        <Sparkles size={13} className="text-brand" />
                        Google Gemini API Key
                      </span>
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-brand hover:underline"
                      >
                        Get free key →
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        value={geminiKeyInput}
                        onChange={(e) => setGeminiKeyInput(e.target.value)}
                        placeholder="Paste AIzaSy... key"
                        className="h-8 flex-1 rounded-md border border-line bg-subtle px-2.5 text-xs text-ink outline-none focus:border-brand focus:bg-white"
                      />
                      <button
                        type="submit"
                        className="rounded-md bg-brand px-3 text-xs font-semibold text-white shadow-sm hover:bg-brand-dark"
                      >
                        {keySavedToast ? <Check size={14} /> : "Save"}
                      </button>
                    </div>
                    <p className="text-[11px] text-ink-muted">
                      Key persists in your browser and syncs with the AquaTwin backend agent.
                    </p>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Speaking active banner with stop button */}
            {isSpeaking && (
              <div className="flex items-center justify-between border-b border-emerald-200 bg-emerald-50 px-4 py-1.5 text-xs text-emerald-800">
                <span className="flex items-center gap-1.5">
                  <span className="flex gap-0.5">
                    <span className="inline-block h-2 w-0.5 animate-pulse bg-emerald-600" />
                    <span className="inline-block h-3 w-0.5 animate-pulse bg-emerald-600 delay-75" />
                    <span className="inline-block h-2 w-0.5 animate-pulse bg-emerald-600 delay-150" />
                  </span>
                  Aqua is talking aloud…
                </span>
                <button
                  type="button"
                  onClick={handleStopSpeaking}
                  className="rounded px-2 py-0.5 text-[11px] font-semibold text-emerald-900 underline hover:bg-emerald-100"
                >
                  Stop voice
                </button>
              </div>
            )}

            {/* Messages body */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-page p-4">
              {messages.map((m) =>
                m.role === "system" ? (
                  <div key={m.id} className="flex justify-center">
                    <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-micro text-ink-muted">
                      {m.text}
                    </span>
                  </div>
                ) : (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 text-[13.5px] leading-relaxed font-medium shadow-card ${
                        m.role === "user"
                          ? "rounded-xl2 rounded-br-sm bg-gradient-to-br from-brand to-brand-mid text-white shadow-sm"
                          : "rounded-xl2 rounded-bl-sm border border-line-faint bg-surface text-ink"
                      }`}
                    >
                      {m.text}
                    </div>
                  </div>
                ),
              )}
              {typing && (
                <div className="flex justify-start">
                  <div className="flex items-center gap-1 rounded-xl2 rounded-bl-sm border border-line bg-surface px-3.5 py-3 shadow-card">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="h-1.5 w-1.5 rounded-full bg-brand"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                    <span className="ml-1 text-[11px] text-ink-muted font-medium">
                      Gemini reasoning…
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Quick action chips */}
            <div className="flex gap-2 overflow-x-auto border-t border-line bg-surface px-3 py-2.5 scrollbar-hide">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => send(chip)}
                  className="shrink-0 rounded-full border border-line bg-surface px-3 py-1 text-xs font-semibold text-ink-soft shadow-sm transition-all hover:border-brand hover:bg-brand-light hover:text-brand-dark"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input footer */}
            <form className="flex items-center gap-2 border-t border-line bg-surface p-3" onSubmit={onSubmit}>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Aqua anything about your field…"
                className="h-10 flex-1 rounded-full border border-line bg-subtle px-4 text-xs font-medium text-ink outline-none transition-all placeholder:text-ink-faint focus:border-brand focus:bg-white"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white shadow-sm transition-all hover:scale-105 hover:bg-brand-dark"
              >
                <SendHorizonal size={15} />
              </button>
            </form>

            {/* Full voice overlay */}
            <AnimatePresence>
              {voiceOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 flex flex-col items-center justify-between bg-[#12241E]/95 p-6 text-white backdrop-blur"
                >
                  <div className="pt-2 text-center">
                    <div className="text-base font-semibold">Aqua Voice Mode</div>
                    <div className="mt-1 text-micro text-white/70">
                      {voiceState === "listening"
                        ? "Listening — speak clearly"
                        : voiceState === "thinking"
                          ? "Gemini reasoning…"
                          : voiceState === "speaking"
                            ? "Speaking aloud…"
                            : "Connecting voice…"}
                    </div>
                  </div>

                  {/* Pulse orb */}
                  <div className="relative flex h-36 w-36 items-center justify-center">
                    {[0, 0.65, 1.3].map((delay) => (
                      <motion.span
                        key={delay}
                        className="absolute inset-0 rounded-full bg-emerald-500/40"
                        animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                        transition={{ duration: 2, delay, repeat: Infinity, ease: "easeOut" }}
                      />
                    ))}
                    <motion.span
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-600 to-[#163A31] shadow-[0_0_40px_rgba(47,107,88,0.6)]"
                      animate={{ scale: [1, 1.08, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Mic size={26} className="text-white" />
                    </motion.span>
                  </div>

                  {/* Live transcript */}
                  <div className="min-h-[64px] max-w-full text-center">
                    <p className="text-[13px] italic leading-relaxed text-white/90">
                      {interim || 'Say "Show Zone B", "What is the rain forecast?", or "Run simulation"'}
                    </p>
                  </div>

                  {voiceError && (
                    <p className="max-w-full text-center text-micro text-rose-300">{voiceError}</p>
                  )}

                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={toggleVoice}
                      aria-label="End voice session"
                      className="flex items-center gap-2 rounded-full bg-red-600 px-6 py-2 text-xs font-semibold text-white shadow-md transition-transform hover:scale-105"
                    >
                      <PhoneOff size={14} /> End voice
                    </button>
                    <span className="text-[11px] text-white/50">Gemini voice session · speaks answers aloud</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsupported browser alert */}
      <AnimatePresence>
        {unsupported && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 right-5 z-[10000] w-[380px] max-w-[calc(100vw-40px)] rounded-xl2 border border-amber-300 bg-amber-50 p-4 text-tiny text-amber-900 shadow-pop"
          >
            Voice synthesis or speech recognition is not supported in this browser. Use Chrome, Edge, or Safari for voice — text chat works everywhere.
            <button
              type="button"
              onClick={() => setUnsupported(false)}
              className="ml-2 font-semibold underline"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
