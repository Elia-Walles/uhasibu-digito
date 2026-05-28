"use client";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface HealthGaugeProps {
  score: number; // 0-100
  size?: number;
  strokeWidth?: number;
  variant?: "light" | "dark";
}

export function HealthGauge({ score, size = 160, strokeWidth = 12, variant = "light" }: HealthGaugeProps) {
  const [displayScore, setDisplayScore] = useState(0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "#0F7B5E" :
    score >= 60 ? "#F5C842" :
    score >= 40 ? "#D97706" : "#DC2626";

  const bgStroke = variant === "dark" ? "rgba(255,255,255,0.08)" : "#E5F0EC";

  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const duration = 1200;
    function step(ts: number) {
      if (start === null) start = ts;
      const progress = Math.min(1, (ts - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={bgStroke} strokeWidth={strokeWidth} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div
          className="font-display font-extrabold tabular-nums"
          style={{ color: variant === "dark" ? "#fff" : "#0A2318", fontSize: size * 0.28 }}
        >
          {displayScore}
        </div>
        <div
          className="text-xs uppercase tracking-[0.1em] font-medium"
          style={{ color: variant === "dark" ? "rgba(255,255,255,0.5)" : "#6B7280" }}
        >
          / 100
        </div>
      </div>
    </div>
  );
}
