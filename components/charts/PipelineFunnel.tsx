"use client";
import { motion } from "framer-motion";
import { PIPELINE_DEALS } from "@/lib/mock-data/pipeline";
import { formatTZS } from "@/lib/utils/currency";
import type { DealStage } from "@/types";

const STAGES: DealStage[] = ["Lead", "Qualified", "Proposal", "Negotiation", "Won"];
const COLORS: Record<DealStage, string> = {
  Lead:        "#94A3B8",
  Qualified:   "#0F7B5E",
  Proposal:    "#14A87E",
  Negotiation: "#F5C842",
  Won:         "#059669",
  Lost:        "#DC2626",
};

export function PipelineFunnel() {
  const stats = STAGES.map((s) => {
    const deals = PIPELINE_DEALS.filter((d) => d.stage === s);
    const value = deals.reduce((sum, d) => sum + d.value, 0);
    return { stage: s, count: deals.length, value };
  });
  const max = Math.max(...stats.map((s) => s.value), 1);

  return (
    <div className="space-y-2">
      {stats.map((s, i) => {
        const width = Math.max(20, (s.value / max) * 100);
        return (
          <motion.div
            key={s.stage}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="flex items-center gap-3"
          >
            <div className="w-24 text-xs font-medium text-ud-text-secondary flex-shrink-0">{s.stage}</div>
            <div className="flex-1 relative h-9 rounded-lg overflow-hidden bg-ud-surface-2">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${width}%` }}
                transition={{ delay: i * 0.08 + 0.15, duration: 0.7, ease: "easeOut" }}
                className="h-full flex items-center justify-between px-3 text-xs"
                style={{ background: COLORS[s.stage] }}
              >
                <span className="text-white font-medium">{s.count} deals</span>
                <span className="text-white font-mono tabular-nums">{formatTZS(s.value, true)}</span>
              </motion.div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
