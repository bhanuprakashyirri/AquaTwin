"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  MicOff,
  Volume2,
  X,
  Sparkles,
  Droplets,
  CloudRain,
  Activity,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";

interface VoiceMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  time: string;
}

const PRESET_QUERIES = [
  { label: "Irrigate Zone B?", icon: Droplets },
  { label: "Rain forecast 24h?", icon: CloudRain },
  { label: "Water savings estimate?", icon: Activity },
  { label: "Optimize 1,500 L budget", icon: Sparkles },
];

const PRESET_ANSWERS: Record<string, string> = {
  "Irrigate Zone B?":
    "Zone B is at 21.8% moisture with 22% crop stress risk. The Twin recommends waiting 6 hours — 12.3 mm of rainfall is approaching with 70% confidence. Irrigating now would waste ≈453 Litres.",
  "Rain forecast 24h?":
    "Local Field Forecast: 12.3 mm expected in the next 24h. Peak probability window is 07:00–09:00 (+70%). Confidence score: 0.78. Advise defer irrigation.",
  "Water savings estimate?":
    "Simulation complete: Deferring by 6 hours saves 453 Litres (30% of planned schedule) while keeping all zones above critical threshold. ROI: ₹680 saved.",
  "Optimize 1,500 L budget":
    "CP-SAT Optimizer: Under 1,500 L — Zone B gets 900 L (highest stress priority), Zone D gets 600 L. Zones A & C deferred safely. Efficiency score: 94%.",
};

export function VoiceAgentWidget() {
  const { user } = useAuth();
  const userName = user?.user_metadata?.name || user?.email?.split("@")[0] || "there";
  const [isOpen, setIsOpen] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: "1",
      sender: "ai",
      text: `Namaste, ${userName}. I'm your AquaTwin Voice AI. Ask me anything about your field's moisture, water budget, or irrigation schedule.`,
      time: "Just now",
    },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isListening, isSpeaking]);

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);
    setIsSpeaking(false);
    setTimeout(() => {
      handleUserQuery("Irrigate Zone B?");
      setIsListening(false);
    }, 2400);
  };

  const handleUserQuery = (queryText: string) => {
    const userMsg: VoiceMessage = {
      id: String(Date.now()),
      sender: "user",
      text: queryText,
      time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsListening(false);
    setIsSpeaking(true);

    setTimeout(() => {
      const answer =
        PRESET_ANSWERS[queryText] ||
        "Based on root-zone moisture at 24.6% and upcoming precipitation, the digital twin suggests waiting 6 hours to conserve water and reduce stress risk below 12%.";

      const aiMsg: VoiceMessage = {
        id: String(Date.now() + 1),
        sender: "ai",
        text: answer,
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, aiMsg]);
      setTimeout(() => setIsSpeaking(false), 3200);
    }, 900);
  };

  return (
    <>
      {/* Floating FAB — pill with pulsing dot */}
      <motion.button
        onClick={() => setIsOpen((prev) => !prev)}
        whileHover={{ scale: 1.05, y: -3 }}
        whileTap={{ scale: 0.97 }}
        className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-full shadow-[0_8px_24px_rgba(28,81,67,0.35)] transition-all duration-300",
          "px-5 py-3.5 text-sm font-semibold text-white",
          isOpen
            ? "bg-[#163A31] ring-2 ring-brand/40 ring-offset-1"
            : "bg-gradient-to-r from-[#28745F] to-[#1C5143]"
        )}
        aria-label="Open AquaTwin Voice Assistant"
      >
        {/* Pulsing live dot */}
        <span className="relative flex h-3 w-3">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300 opacity-70" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-200" />
        </span>

        <Mic size={16} className={cn("transition-transform duration-300", isOpen && "rotate-12")} />

        <span className="tracking-tight">Voice AI</span>

        {isOpen ? (
          <ChevronUp size={14} className="opacity-70" />
        ) : (
          <span className="rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
            Ask field
          </span>
        )}
      </motion.button>

      {/* Widget Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.93 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-[5.5rem] right-6 z-50 flex w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-3xl border border-[#D5E4DF] bg-white shadow-[0_24px_56px_rgba(28,81,67,0.18),0_4px_16px_rgba(28,81,67,0.1)]"
            style={{ height: 520 }}
          >
            {/* Header gradient */}
            <div className="relative overflow-hidden bg-gradient-to-br from-[#1C5143] via-[#28745F] to-[#2D8A6F] px-5 py-4">
              {/* Decorative orb */}
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-white/8 blur-2xl pointer-events-none" />

              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 backdrop-blur-sm border border-white/20 shadow-inner">
                    <Mic size={18} className="text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold tracking-tight text-white">AquaTwin Voice AI</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-100">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-300 animate-pulse" />
                        Live
                      </span>
                    </div>
                    <p className="text-[11px] text-emerald-200/80">Field twin voice intelligence</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20 hover:text-white transition-colors"
                  aria-label="Close voice assistant"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Waveform bars decoration */}
              <div className="mt-3 flex items-center justify-center gap-1 opacity-30">
                {[4, 8, 12, 7, 16, 10, 14, 6, 11, 8, 15, 5].map((h, i) => (
                  <div key={i} className="w-0.5 rounded-full bg-white" style={{ height: h }} />
                ))}
              </div>
            </div>

            {/* Conversation Log */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4 bg-[#FAFBF9]">
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "flex max-w-[85%] flex-col rounded-2xl px-3.5 py-2.5 text-[12px] leading-relaxed shadow-sm",
                    m.sender === "user"
                      ? "ml-auto rounded-br-md bg-gradient-to-br from-brand to-[#1C5143] text-white"
                      : "mr-auto rounded-bl-md border border-[#DDE9E4] bg-white text-ink"
                  )}
                >
                  {m.sender === "ai" && (
                    <span className="mb-1 text-[10px] font-bold uppercase tracking-wide text-brand">
                      AquaTwin AI
                    </span>
                  )}
                  <p>{m.text}</p>
                  <span
                    className={cn(
                      "mt-1 text-[9px]",
                      m.sender === "user" ? "text-emerald-100/60 text-right" : "text-ink-faint"
                    )}
                  >
                    {m.time}
                  </span>
                </motion.div>
              ))}

              {/* Thinking state */}
              <AnimatePresence>
                {(isListening || isSpeaking) && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="mr-auto flex items-center gap-2.5 rounded-2xl rounded-bl-md border border-[#BFDCCB] bg-[#EDF6F1] px-4 py-2.5 text-[12px] text-brand-dark"
                  >
                    {isListening ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-brand animate-ping" />
                        <span className="font-medium">Listening…</span>
                      </>
                    ) : (
                      <>
                        <Volume2 size={14} className="animate-pulse text-brand" />
                        <span className="font-medium">Thinking…</span>
                      </>
                    )}
                    <div className="ml-auto flex items-end gap-0.5">
                      {[10, 20, 14, 24, 12].map((h, i) => (
                        <motion.span
                          key={i}
                          animate={{ height: [6, h, 6] }}
                          transition={{ duration: 0.5 + i * 0.08, repeat: Infinity }}
                          className="w-1 rounded-full bg-brand"
                          style={{ height: 6, display: "block" }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Quick query chips */}
            <div className="border-t border-[#E5EDEA] bg-white px-4 py-3">
              <div className="mb-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                Quick questions
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_QUERIES.map(({ label, icon: Icon }) => (
                  <button
                    key={label}
                    onClick={() => handleUserQuery(label)}
                    className="flex items-center gap-1.5 rounded-full border border-[#D5E4DF] bg-[#F7FAF8] px-3 py-1.5 text-[11px] font-medium text-ink-soft transition-all duration-150 hover:border-brand/50 hover:bg-brand-light/60 hover:text-brand-dark hover:-translate-y-0.5 active:scale-95"
                  >
                    <Icon size={11} className="text-brand/70" />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice bar footer */}
            <div className="flex items-center gap-2.5 border-t border-[#E5EDEA] bg-white px-4 py-3">
              <button
                onClick={toggleListening}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-full py-2.5 px-4 text-[13px] font-semibold transition-all duration-200 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                  isListening
                    ? "bg-[#C45A55] text-white animate-pulse"
                    : "bg-gradient-to-r from-brand to-[#1C5143] text-white hover:shadow-[0_4px_12px_rgba(28,81,67,0.35)] hover:-translate-y-0.5"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff size={15} />
                    <span>Stop</span>
                  </>
                ) : (
                  <>
                    <Mic size={15} />
                    <span>Tap to Speak</span>
                  </>
                )}
              </button>

              <button
                onClick={() => handleUserQuery("Irrigate Zone B?")}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[#D5E4DF] bg-[#F7FAF8] text-ink-soft hover:border-brand/40 hover:bg-brand-light hover:text-brand transition-colors"
                title="Quick field analysis"
              >
                <Sparkles size={15} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
