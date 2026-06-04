"use client";
import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Plus, Globe, Loader2, ClipboardCheck } from "lucide-react";
import { HealthGauge } from "@/components/charts/HealthGauge";
import type { AIMessage } from "@/types";
import { cn } from "@/lib/utils/cn";

const AI_SUGGESTIONS_EN = [
  "How is my business performing this year?",
  "What taxes are due soon and how much?",
  "Explain how PAYE is calculated in Tanzania.",
  "How can I improve my cash flow?",
];
const AI_SUGGESTIONS_SW = [
  "Biashara yangu inafanyaje mwaka huu?",
  "Ni kodi gani zinazokaribia kulipwa na kiasi gani?",
  "Eleza jinsi PAYE inavyokokotolewa Tanzania.",
  "Naweza kuboresha vipi mtiririko wa fedha?",
];
const AI_AUDIT_SUGGESTIONS = [
  "What evidence do I need for an expense audit?",
  "Walk me through the purchases audit cycle.",
  "What's required for a fiscalised sales invoice?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<AIMessage[]>([
    {
      id: "m_init",
      role: "assistant",
      content: "Habari! 👋 I'm your Uhasibu Digito AI assistant. I can answer questions about your financials, taxes, and payroll. What would you like to know?",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [input, setInput] = useState("");
  const [language, setLanguage] = useState<"en" | "sw">("en");
  const [typing, setTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);
  const sessionId = useId();

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  function nextId() {
    msgCounter.current += 1;
    return `m_${sessionId}_${msgCounter.current}`;
  }

  async function send(prompt?: string) {
    const content = (prompt ?? input).trim();
    if (!content) return;
    const userMsg: AIMessage = {
      id: nextId(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    // History sent to Gemini must start with a user turn — drop the initial greeting.
    const history = [...messages, userMsg]
      .filter((m) => m.id !== "m_init")
      .map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, language }),
      });
      const data = (await res.json()) as { reply?: string; error?: string };
      const reply = res.ok ? data.reply ?? "" : data.error ?? "Sorry, I couldn't respond right now.";
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: reply, timestamp: new Date().toISOString() },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: "Network error — please try again.", timestamp: new Date().toISOString() },
      ]);
    } finally {
      setTyping(false);
    }
  }

  const suggestions = language === "sw" ? AI_SUGGESTIONS_SW : AI_SUGGESTIONS_EN;

  return (
    <div className="-mx-4 md:-mx-6 lg:-mx-8 -my-6 min-h-[calc(100vh-4rem)] bg-ud-ai-bg dark-scrollbar grid lg:grid-cols-[280px_1fr_320px] xl:grid-cols-[300px_1fr_360px] text-white">
      {/* Conversation history */}
      <aside className="hidden lg:flex flex-col border-r border-white/5 p-4">
        <button className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl gradient-teal text-white text-sm font-medium hover:opacity-90 transition-opacity shadow-gold-glow">
          <Plus className="w-4 h-4" />
          New conversation
        </button>
        <div className="mt-5 text-[10px] tracking-[0.16em] text-white/40 font-semibold mb-2 px-1">RECENT</div>
        <div className="flex-1 flex items-center justify-center text-center px-4">
          <p className="text-xs text-white/35">Your conversations stay on this screen for the session.</p>
        </div>
      </aside>

      {/* Chat panel */}
      <main className="flex flex-col min-h-0">
        <div className="flex items-center justify-between px-4 md:px-6 py-3.5 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-teal flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-display font-bold text-sm">Uhasibu AI</div>
              <div className="text-xs text-white/45">Powered by financial intelligence</div>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-white/5 rounded-full p-1">
            <button
              onClick={() => setLanguage("en")}
              className={cn("text-xs font-medium px-3 py-1 rounded-full transition-colors", language === "en" ? "bg-ud-primary text-white" : "text-white/55")}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage("sw")}
              className={cn("text-xs font-medium px-3 py-1 rounded-full transition-colors", language === "sw" ? "bg-ud-primary text-white" : "text-white/55")}
            >
              <Globe className="w-3 h-3 inline mr-1" />SW
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto dark-scrollbar px-4 md:px-8 py-6">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn("flex gap-3", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[78%] px-4 py-3 rounded-2xl text-sm leading-relaxed",
                    m.role === "user" ? "bg-ud-primary text-white" : "glass-light text-white"
                  )}
                  dangerouslySetInnerHTML={{ __html: m.content.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>") }}
                />
              </motion.div>
            ))}

            <AnimatePresence>
              {typing && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex gap-3"
                >
                  <div className="w-8 h-8 rounded-xl gradient-teal flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                  <div className="px-4 py-3 rounded-2xl glass-light">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          animate={{ y: [0, -4, 0] }}
                          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                          className="w-1.5 h-1.5 rounded-full bg-ud-primary-glow"
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {messages.length === 1 && !typing && (
              <div className="pt-4">
                <div className="text-xs text-white/45 mb-3">Try one of these:</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left px-3.5 py-2.5 rounded-xl glass-light text-sm hover:bg-white/10 transition-colors text-white/85"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="mt-5 text-xs text-white/45 mb-2 inline-flex items-center gap-1.5">
                  <ClipboardCheck className="w-3 h-3 text-ud-gold" />
                  Audit assist — checkpoint prompts
                </div>
                <div className="flex flex-wrap gap-2">
                  {AI_AUDIT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-left px-3 py-1.5 rounded-full bg-ud-gold/15 border border-ud-gold/25 text-xs text-white/90 hover:bg-ud-gold/25 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-4 md:px-8 py-4 border-t border-white/5">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={(e) => { e.preventDefault(); send(); }} className="flex gap-2 items-end">
              <div className="flex-1 relative">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  rows={1}
                  placeholder={language === "sw" ? "Andika swali lako…" : "Ask anything about your finances…"}
                  className="w-full px-4 py-3 rounded-2xl glass-light text-white text-sm placeholder:text-white/35 resize-none focus:outline-none focus:ring-2 focus:ring-ud-primary"
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || typing}
                className="w-12 h-12 rounded-2xl gradient-teal flex items-center justify-center hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity shadow-gold-glow"
                aria-label="Send"
              >
                {typing ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Send className="w-5 h-5 text-white" />}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Financial health rail */}
      <aside className="hidden xl:flex flex-col border-l border-white/5 p-5">
        <div className="text-[10px] tracking-[0.16em] text-white/40 font-semibold mb-3">FINANCIAL HEALTH</div>
        <div className="flex justify-center mb-5">
          <HealthGauge score={74} size={170} variant="dark" />
        </div>
        <div className="text-center text-sm text-white/70 mb-5">Strong financial position</div>

        <div className="space-y-3 text-xs">
          {[
            { label: "Liquidity Ratio",      value: "3.86x", trend: "up"   },
            { label: "Gross Margin",         value: "50.6%", trend: "flat" },
            { label: "Operating Margin",     value: "14.7%", trend: "up"   },
            { label: "Net Margin",           value: "9.5%",  trend: "up"   },
            { label: "DSO",                  value: "38d",   trend: "down" },
            { label: "Inventory Turnover",   value: "3.3x",  trend: "up"   },
          ].map((m) => (
            <div key={m.label} className="flex items-center justify-between p-2.5 rounded-xl glass-light">
              <span className="text-white/65">{m.label}</span>
              <span className="font-mono tabular-nums font-medium text-white">{m.value}</span>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
