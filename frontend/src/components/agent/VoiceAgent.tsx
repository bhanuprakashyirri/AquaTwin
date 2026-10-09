"use client";

/**
 * Aqua — floating autonomous voice agent.
 *
 * A floating icon (bottom-right) that opens a chat panel with a
 * browser-based voice session (Web Speech API — no phone number,
 * no API key). The agent reads all site data and controls the
 * site: navigation, map layers, zone selection, simulations,
 * water-budget optimization, sidebar and data refresh.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Bot, Mic, MicOff, PhoneOff, SendHorizonal, X } from "lucide-react";
import { runAgent, type SiteAction } from "@/agent/engine";
import { AquaVoiceSession, type VoiceState } from "@/agent/voice";
import { AGENT_EVENTS, dispatchAgentEvent, dispatchSidebarToggle } from "@/agent/site-bus";

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
  "Hi, I'm Aqua — your autonomous field agent. I can read every sensor, run simulations, optimize water, and control this dashboard. " +
  "Tap the mic and speak, or type below. No phone call needed — everything happens right here in your browser.";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const sessionRef = useRef<AquaVoiceSession | null>(null);
  const voiceActiveRef = useRef(false);
  const typingRef = useRef(false);
  const idRef = useRef(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;

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
            await sleep(650); // let the target page mount + subscribe
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
        const res = await runAgent(text, { currentPath: pathnameRef.current });
        await applyActions(res.actions);
        appendMsg("agent", res.text);
        const summary = actionSummary(res.actions);
        if (summary) appendMsg("system", summary);
        if (voiceActiveRef.current) sessionRef.current?.speak(res.text);
      } catch {
        appendMsg("agent", "Something went wrong while processing that. Try again.");
      } finally {
        typingRef.current = false;
        setTyping(false);
        if (voiceActiveRef.current) sessionRef.current?.resume();
      }
    },
    [appendMsg, applyActions],
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
      onStateChange: (s) => setVoiceState(s),
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    send(input);
  };

  return (
    <>
      {/* Floating launcher */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", damping: 18, stiffness: 260, delay: 0.4 }}
        onClick={() => setOpen((v) => !v)}
        aria-label="Open Aqua voice agent"
        className="fixed bottom-5 right-5 z-[9999] flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-pop transition-colors hover:bg-brand-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        {voiceState === "listening" && (
          <span className="absolute inset-0 animate-ping rounded-full bg-brand/40" />
        )}
        {voiceState === "listening" || voiceState === "speaking" ? (
          <Mic size={22} />
        ) : (
          <Bot size={24} />
        )}
        {voiceState !== "idle" && (
          <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-60" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full border-2 border-white bg-success" />
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: "spring", damping: 26, stiffness: 320 }}
            className="fixed bottom-24 right-5 z-[9999] flex h-[540px] max-h-[calc(100vh-120px)] w-[380px] max-w-[calc(100vw-40px)] flex-col overflow-hidden rounded-xl2 border border-line bg-surface shadow-pop"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-brand-dark px-4 py-3 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15">
                  <Bot size={18} />
                </div>
                <div>
                  <div className="text-sm font-semibold">Aqua</div>
                  <div className="flex items-center gap-1.5 text-micro text-white/70">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        voiceState !== "idle" ? "bg-success" : "bg-white/40"
                      }`}
                    />
                    {voiceState === "listening"
                      ? "Listening…"
                      : voiceState === "speaking"
                        ? "Speaking…"
                        : voiceState === "thinking"
                          ? "Thinking…"
                          : "Voice agent · browser-only"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={toggleVoice}
                  aria-label={voiceActiveRef.current ? "Stop voice" : "Start voice"}
                  className="rounded-full p-2 transition-colors hover:bg-white/15"
                >
                  {voiceActiveRef.current ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close agent"
                  className="rounded-full p-2 transition-colors hover:bg-white/15"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-page p-4">
              {messages.map((m) =>
                m.role === "system" ? (
                  <div key={m.id} className="flex justify-center">
                    <span className="rounded-full border border-line bg-surface px-2.5 py-1 text-micro text-ink-muted">
                      {m.text}
                    </span>
                  </div>
                ) : (
                  <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[85%] px-3.5 py-2.5 text-[13px] leading-relaxed ${
                        m.role === "user"
                          ? "rounded-xl2 rounded-br-sm bg-brand text-white"
                          : "rounded-xl2 rounded-bl-sm border border-line bg-surface text-ink shadow-card"
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
                        className="h-1.5 w-1.5 rounded-full bg-ink-faint"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quick chips */}
            <div className="flex gap-1.5 overflow-x-auto border-t border-line bg-surface px-3 py-2">
              {QUICK_CHIPS.map((chip) => (
                <button
                  key={chip}
                  onClick={() => send(chip)}
                  className="shrink-0 rounded-full border border-line bg-subtle px-2.5 py-1 text-micro text-ink-soft transition-colors hover:border-brand hover:bg-brand-light hover:text-brand-dark"
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
                placeholder="Ask Aqua anything…"
                className="h-10 flex-1 rounded-full border border-line bg-white px-4 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-brand"
              />
              <button
                type="submit"
                aria-label="Send message"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-white transition-colors hover:bg-brand-dark"
              >
                <SendHorizonal size={16} />
              </button>
            </form>

            {/* Voice overlay */}
            <AnimatePresence>
              {voiceOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-10 flex flex-col items-center justify-between bg-[#12241E]/95 p-6 text-white backdrop-blur"
                >
                  <div className="pt-2 text-center">
                    <div className="text-base font-semibold">Aqua Voice</div>
                    <div className="mt-1 text-micro text-white/60">
                      {voiceState === "listening"
                        ? "Listening — speak now"
                        : voiceState === "thinking"
                          ? "Processing…"
                          : voiceState === "speaking"
                            ? "Speaking…"
                            : "Connecting…"}
                    </div>
                  </div>

                  {/* Pulse orb */}
                  <div className="relative flex h-40 w-40 items-center justify-center">
                    {[0, 0.65, 1.3].map((delay) => (
                      <motion.span
                        key={delay}
                        className="absolute inset-0 rounded-full bg-brand/40"
                        animate={{ scale: [1, 2.1], opacity: [0.7, 0] }}
                        transition={{ duration: 2, delay, repeat: Infinity, ease: "easeOut" }}
                      />
                    ))}
                    <motion.span
                      className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-brand-mid to-brand-dark shadow-[0_0_40px_rgba(47,107,88,0.6)]"
                      animate={{ scale: [1, 1.07, 1] }}
                      transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Mic size={26} className="text-white" />
                    </motion.span>
                  </div>

                  {/* Live transcript */}
                  <div className="min-h-[72px] max-w-full text-center">
                    <p className="text-[13px] italic leading-relaxed text-white/80">
                      {interim || 'Say something — e.g. "show zone B", "run the simulation"'}
                    </p>
                  </div>

                  {voiceError && (
                    <p className="max-w-full text-center text-micro text-[#F0B9B9]">{voiceError}</p>
                  )}

                  <div className="flex flex-col items-center gap-2">
                    <button
                      onClick={toggleVoice}
                      aria-label="End voice session"
                      className="flex items-center gap-2 rounded-full bg-danger px-6 py-2.5 text-sm font-semibold text-white shadow-[0_4px_12px_rgba(200,76,76,0.4)] transition-transform hover:scale-105"
                    >
                      <PhoneOff size={15} /> End voice
                    </button>
                    <span className="text-micro text-white/40">Browser voice · no phone number needed</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unsupported-browser notice */}
      <AnimatePresence>
        {unsupported && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed bottom-24 right-5 z-[10000] w-[380px] max-w-[calc(100vw-40px)] rounded-xl2 border border-[#E3CBA4] bg-[#FAF3E6] p-4 text-tiny text-[#8A5E0F] shadow-pop"
          >
            Voice isn&apos;t supported in this browser. Use Chrome or Edge for the full voice
            experience — text chat works everywhere.
            <button onClick={() => setUnsupported(false)} className="ml-2 font-semibold underline">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
