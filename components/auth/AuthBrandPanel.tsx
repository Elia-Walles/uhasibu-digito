"use client";
import Image from "next/image";
import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { HeroBackground } from "@/components/landing/HeroBackground";
import { useT } from "@/lib/hooks/useT";

export interface AuthFeature {
  icon: LucideIcon;
  label: string;
}

interface AuthBrandPanelProps {
  headline: string;
  subcopy: string;
  features?: AuthFeature[];
  trust?: string[];
}

const DEFAULT_TRUST = ["TRA-compliant", "TZS-native", "Bank-grade security"];

/**
 * The obsidian brand showcase shown on the left of every auth page (login, register,
 * forgot/reset password). Keeps a single source of truth for the auth visual language:
 * ambient blobs, grid texture, logo, animated headline, optional feature pills, trust strip.
 */
export function AuthBrandPanel({ headline, subcopy, features, trust = DEFAULT_TRUST }: AuthBrandPanelProps) {
  const t = useT();
  return (
    <div className="relative hidden lg:flex flex-col justify-between p-12 gradient-obsidian text-white overflow-hidden">
      <HeroBackground variant="obsidian" />

      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex items-center gap-3"
      >
        <Image
          src="/images/uhasibu-digito-circle.png"
          alt="Uhasibu Digito"
          width={44}
          height={44}
          priority
          className="w-11 h-11 rounded-xl shadow-gold-glow"
        />
        <div>
          <div className="font-display font-bold text-base leading-tight">Uhasibu Digito</div>
          <div className="text-[11px] text-white/55 tracking-[0.18em] uppercase">{t("Akaunti yako, nguvu yako")}</div>
        </div>
      </motion.div>

      <div className="relative z-10 max-w-lg">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="font-display text-4xl xl:text-5xl font-extrabold leading-[1.06] text-balance"
        >
          {headline}
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.12 }}
          className="mt-4 text-white/65 leading-relaxed"
        >
          {subcopy}
        </motion.p>

        {features && features.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-3">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.label}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 + i * 0.08 }}
                  className="flex items-center gap-2.5 px-3.5 py-3 rounded-xl border border-white/10 bg-white/5 backdrop-blur"
                >
                  <Icon className="w-4 h-4 text-ud-primary-glow flex-shrink-0" />
                  <span className="text-sm font-medium">{f.label}</span>
                </motion.div>
              );
            })}
          </div>
        )}

        {trust.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-sm text-white/70"
          >
            {trust.map((item) => (
              <span key={item} className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-ud-primary-glow" /> {t(item)}
              </span>
            ))}
          </motion.div>
        )}
      </div>

      <div className="relative z-10 text-xs text-white/40">
        © {new Date().getFullYear()} Uhasibu Digito&trade;. {t("All rights reserved")} · {t("Made in Tanzania")}
      </div>
    </div>
  );
}
