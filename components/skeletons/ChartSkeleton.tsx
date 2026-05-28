"use client";
import { motion } from "framer-motion";

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div
      className="bg-white rounded-2xl border border-ud-border p-5 overflow-hidden"
      style={{ height }}
    >
      <div className="skeleton h-4 w-1/3 mb-4" />
      <div className="flex items-end gap-2 h-full">
        {[0.55, 0.7, 0.45, 0.85, 0.6, 0.92, 0.5, 0.78, 0.62].map((h, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: i * 0.05, duration: 0.6, ease: "easeOut" }}
            style={{ height: `${h * 60}%`, transformOrigin: "bottom" }}
            className="skeleton flex-1 rounded-t"
          />
        ))}
      </div>
    </div>
  );
}
