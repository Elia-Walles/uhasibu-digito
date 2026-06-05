"use client";
import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, X } from "lucide-react";
import { useSession } from "next-auth/react";
import type { StampOpinion, StampData } from "@/types";
import { useReducedMotion } from "@/lib/hooks/useMediaQuery";
import { useCompany } from "@/lib/hooks/useCompany";
import { cn } from "@/lib/utils/cn";
import { Button } from "./Button";

interface DigitalStampProps {
  documentName: string;
  onApply?: (stamp: StampData) => void;
  applied?: StampData | null;
}

const OPINION_COLORS: Record<StampOpinion, { ink: string; ring: string; bg: string }> = {
  Unqualified: { ink: "#065F46", ring: "#065F46", bg: "rgba(6,95,70,0.10)" },
  Qualified:   { ink: "#92400E", ring: "#92400E", bg: "rgba(146,64,14,0.10)" },
  Adverse:     { ink: "#991B1B", ring: "#991B1B", bg: "rgba(153,27,27,0.10)" },
  Disclaimer:  { ink: "#991B1B", ring: "#991B1B", bg: "rgba(153,27,27,0.10)" },
};

function generateHash(seed: string): string {
  // Simple deterministic visual hash (NOT cryptographic)
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h.toString(16).padStart(8, "0").toUpperCase();
}

export function DigitalStamp({ documentName, onApply, applied }: DigitalStampProps) {
  const { data: session } = useSession();
  const { company } = useCompany();
  const [open, setOpen] = useState(false);
  const [opinion, setOpinion] = useState<StampOpinion>("Unqualified");
  const [pin, setPin] = useState<string[]>(Array(6).fill(""));
  const [applying, setApplying] = useState(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    if (open) inputs.current[0]?.focus();
  }, [open]);

  function handlePin(i: number, v: string) {
    const clean = v.replace(/\D/g, "").slice(0, 1);
    const next = [...pin];
    next[i] = clean;
    setPin(next);
    if (clean && i < 5) inputs.current[i + 1]?.focus();
  }

  const pinComplete = pin.every((d) => d.length === 1);

  async function apply() {
    if (!pinComplete) return;
    setApplying(true);
    await new Promise((r) => setTimeout(r, reducedMotion ? 200 : 1100));
    const signer = session?.user?.name ?? "Authorised signatory";
    const stamp: StampData = {
      auditorName: signer,
      auditorFirm: company?.name ?? "",
      nbaaNumber: company?.nbaaNumber ?? "",
      opinion,
      signedDate: new Date().toISOString().split("T")[0]!,
      documentHash: generateHash(documentName + opinion + Date.now()),
      appliedAt: new Date().toISOString(),
      appliedBy: session?.user?.role ? `${signer} (${session.user.role})` : signer,
    };
    onApply?.(stamp);
    setApplying(false);
    setOpen(false);
  }

  if (applied) {
    return <StampSeal data={applied} />;
  }

  return (
    <>
      <Button
        variant="gold"
        size="md"
        icon={<ShieldCheck className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        Apply Digital Stamp
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-ud-obsidian/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => !applying && setOpen(false)}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stamp-title"
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 26 }}
              className="bg-white rounded-2xl shadow-elevated max-w-md w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => !applying && setOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-ud-surface-2 text-ud-text-muted"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl gradient-gold flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-ud-obsidian" />
                </div>
                <div>
                  <h2 id="stamp-title" className="font-display font-bold text-lg leading-tight">
                    NBAA Digital Stamp
                  </h2>
                  <p className="text-xs text-ud-text-muted">Tanzania — Auditor Certification</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-1.5">Document</div>
                <div className="px-3 py-2 rounded-xl bg-ud-surface-2 text-sm font-medium">{documentName}</div>
              </div>

              <div className="mb-4">
                <div className="text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-2">Audit opinion</div>
                <div className="grid grid-cols-2 gap-2">
                  {(["Unqualified", "Qualified", "Adverse", "Disclaimer"] as StampOpinion[]).map((o) => (
                    <button
                      key={o}
                      onClick={() => setOpinion(o)}
                      className={cn(
                        "px-3 py-2 rounded-xl border text-sm font-medium transition-all",
                        opinion === o
                          ? "border-ud-primary bg-ud-primary-50 text-ud-primary"
                          : "border-ud-border bg-white text-ud-text-secondary hover:border-ud-text-muted"
                      )}
                    >
                      {o}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-5">
                <div className="text-xs font-medium tracking-[0.04em] text-ud-text-secondary mb-2">
                  Auditor PIN (6-digit)
                </div>
                <div className="flex gap-2 justify-between">
                  {pin.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => {
                        inputs.current[i] = el;
                      }}
                      type="text"
                      inputMode="numeric"
                      value={digit}
                      onChange={(e) => handlePin(i, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Backspace" && !digit && i > 0) {
                          inputs.current[i - 1]?.focus();
                        }
                      }}
                      className="w-11 h-12 text-center text-lg font-display font-bold rounded-xl border border-ud-border focus:border-ud-primary focus:outline-none focus:ring-2 focus:ring-ud-primary/15 transition-all"
                      maxLength={1}
                      aria-label={`PIN digit ${i + 1}`}
                    />
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-ud-text-muted">Enter your 6-digit signing PIN to apply the stamp.</p>
              </div>

              <Button
                variant="gold"
                size="lg"
                fullWidth
                loading={applying}
                disabled={!pinComplete}
                onClick={apply}
              >
                {applying ? "Applying stamp…" : "Apply stamp"}
              </Button>

              <AnimatePresence>
                {applying && !reducedMotion && (
                  <>
                    <motion.div
                      initial={{ scale: 4, rotate: -20, opacity: 0 }}
                      animate={{ scale: 1, rotate: -3, opacity: 0.9 }}
                      transition={{ type: "spring", stiffness: 140, damping: 16 }}
                      className="absolute inset-0 flex items-center justify-center pointer-events-none"
                    >
                      <SealCircle opinion={opinion} small />
                    </motion.div>
                    {[0, 90, 180, 270].map((angle, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: 0, y: 0, opacity: 0.6, scale: 0 }}
                        animate={{
                          x: Math.cos((angle * Math.PI) / 180) * 60,
                          y: Math.sin((angle * Math.PI) / 180) * 60,
                          opacity: 0,
                          scale: 1.4,
                        }}
                        transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
                        className="absolute top-1/2 left-1/2 w-2 h-2 rounded-full pointer-events-none"
                        style={{ background: OPINION_COLORS[opinion].ink }}
                      />
                    ))}
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function SealCircle({ opinion, small = false }: { opinion: StampOpinion; small?: boolean }) {
  const c = OPINION_COLORS[opinion];
  const size = small ? 180 : 220;
  return (
    <svg width={size} height={size} viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="100" fill="none" stroke={c.ink} strokeWidth="3" />
      <circle cx="110" cy="110" r="90"  fill="none" stroke={c.ink} strokeWidth="1.5" opacity="0.55" />
      <circle cx="110" cy="110" r="55"  fill={c.bg} stroke={c.ink} strokeWidth="2" />
      <path id="circlepath" d="M 110, 110 m -78, 0 a 78,78 0 1,1 156,0 a 78,78 0 1,1 -156,0" fill="none" />
      <text fill={c.ink} fontSize="11" fontWeight="700" letterSpacing="3" fontFamily="Plus Jakarta Sans, sans-serif">
        <textPath href="#circlepath" startOffset="0%">
          • CERTIFIED BY NBAA • REPUBLIC OF TANZANIA •
        </textPath>
      </text>
      <text x="110" y="100" textAnchor="middle" fill={c.ink} fontSize="14" fontWeight="800" fontFamily="Plus Jakarta Sans, sans-serif">
        AUDITED
      </text>
      <text x="110" y="118" textAnchor="middle" fill={c.ink} fontSize="9.5" fontWeight="600" fontFamily="Plus Jakarta Sans, sans-serif" letterSpacing="1.5">
        {opinion.toUpperCase()}
      </text>
      <text x="110" y="135" textAnchor="middle" fill={c.ink} fontSize="7" fontFamily="DM Sans, sans-serif" letterSpacing="1">
        NBAA-2018-F-4421
      </text>
    </svg>
  );
}

function StampSeal({ data }: { data: StampData }) {
  const c = OPINION_COLORS[data.opinion];
  return (
    <div className="relative inline-flex items-center gap-4 p-5 rounded-2xl bg-white border border-ud-border shadow-card">
      <SealCircle opinion={data.opinion} small />
      <div className="space-y-1">
        <div className="text-xs font-medium tracking-[0.06em] uppercase text-ud-text-muted">Auditor Certification</div>
        <div className="font-display font-bold text-base">{data.auditorName}</div>
        <div className="text-sm text-ud-text-secondary">{data.auditorFirm}</div>
        <div className="text-xs text-ud-text-muted">NBAA: {data.nbaaNumber}</div>
        <div className="text-xs text-ud-text-muted">Hash: <span className="font-mono">{data.documentHash}</span></div>
        <div className="text-xs text-ud-text-muted">Signed: {data.signedDate}</div>
        <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium" style={{ background: c.bg, color: c.ink }}>
          <ShieldCheck className="w-3 h-3" />
          {data.opinion} opinion
        </div>
      </div>
      <div
        className="absolute top-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-[0.1em] uppercase rotate-[-6deg]"
        style={{ background: c.bg, color: c.ink, border: `1.5px solid ${c.ink}` }}
      >
        Stamped • {data.opinion}
      </div>
    </div>
  );
}
