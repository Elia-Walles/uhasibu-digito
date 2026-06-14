"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { formatTZS } from "@/lib/utils/currency";
import { cn } from "@/lib/utils/cn";

// Adapted from the 21st.dev "pricing-cards" component to the Uhasibu Digito design system:
// the light premium theme (ud-* tokens, matching the landing page), TZS pricing, and
// DB-managed plans passed in as props. Highlighted plans render as an obsidian card to
// match the app's existing PricingCard language.

export interface PricingFeature {
  text: string;
}

export interface PricingPlanCard {
  id: string;
  name: string;
  description: string;
  /** Annual price in TZS. Monthly is derived as price / 12. */
  priceTzs: number;
  features: PricingFeature[];
  highlighted?: boolean;
  button: { text: string; url: string };
}

interface PricingCardsProps {
  heading?: string;
  description?: string;
  plans?: PricingPlanCard[];
}

/** Light-themed Radix switch matching the ud-* tokens. */
function ToggleSwitch(props: React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>) {
  return (
    <SwitchPrimitives.Root
      {...props}
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ud-primary focus-visible:ring-offset-2",
        "data-[state=checked]:bg-ud-primary data-[state=unchecked]:bg-ud-border",
      )}
    >
      <SwitchPrimitives.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitives.Root>
  );
}

export function PricingCards({
  heading = "Plans & Pricing",
  description = "Choose the plan that matches your business and scale with ease.",
  plans = [],
}: PricingCardsProps) {
  const [isYearly, setIsYearly] = useState(true);

  return (
    <section className="relative min-h-screen overflow-hidden bg-ud-surface-3 text-ud-text-primary py-24 md:py-28">
      <style>{`
        .pc-line{position:absolute;background:var(--color-ud-border)}
        .pc-h{left:0;right:0;height:1px;transform:scaleX(0);transform-origin:50% 50%;animation:pcX .6s ease forwards}
        .pc-v{top:0;bottom:0;width:1px;transform:scaleY(0);transform-origin:50% 0%;animation:pcY .7s ease forwards}
        .pc-h:nth-child(1){top:18%;animation-delay:.08s}
        .pc-h:nth-child(2){top:50%;animation-delay:.16s}
        .pc-h:nth-child(3){top:82%;animation-delay:.24s}
        .pc-v:nth-child(4){left:18%;animation-delay:.20s}
        .pc-v:nth-child(5){left:50%;animation-delay:.28s}
        .pc-v:nth-child(6){left:82%;animation-delay:.36s}
        @keyframes pcX{to{transform:scaleX(1)}}
        @keyframes pcY{to{transform:scaleY(1)}}
        .pc-card{opacity:0;transform:translateY(12px);animation:pcUp .6s ease .25s forwards}
        @keyframes pcUp{to{opacity:1;transform:translateY(0)}}
        @media (prefers-reduced-motion: reduce){
          .pc-line,.pc-card{animation:none;transform:none;opacity:1}
        }
      `}</style>

      {/* Brand gradient blobs (same as the landing hero) */}
      <div className="pointer-events-none absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />

      {/* Subtle accent grid */}
      <div aria-hidden className="absolute inset-0 pointer-events-none opacity-70">
        <div className="pc-line pc-h" />
        <div className="pc-line pc-h" />
        <div className="pc-line pc-h" />
        <div className="pc-line pc-v" />
        <div className="pc-line pc-v" />
        <div className="pc-line pc-v" />
      </div>

      {/* Content */}
      <div className="relative mx-auto w-full max-w-6xl px-4 sm:px-8">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-center gap-5 text-center">
          <h2 className="font-display text-pretty text-4xl font-extrabold lg:text-6xl">{heading}</h2>
          <p className="text-ud-text-muted lg:text-xl max-w-2xl text-balance">{description}</p>

          <div className="flex items-center gap-3 text-sm font-medium">
            <span className={cn(!isYearly ? "text-ud-text-primary" : "text-ud-text-muted")}>Monthly</span>
            <ToggleSwitch checked={isYearly} onCheckedChange={() => setIsYearly(!isYearly)} aria-label="Toggle yearly pricing" />
            <span className={cn(isYearly ? "text-ud-text-primary" : "text-ud-text-muted")}>Yearly</span>
          </div>

          <div className="mt-4 grid w-full gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
            {plans.map((plan, i) => {
              const monthly = Math.round(plan.priceTzs / 12);
              const dark = plan.highlighted;
              return (
                <div
                  key={plan.id}
                  style={{ animationDelay: `${0.25 + i * 0.08}s` }}
                  className={cn(
                    "pc-card relative flex h-full flex-col justify-between rounded-3xl border p-5 text-left",
                    dark
                      ? "bg-ud-obsidian border-ud-obsidian text-white shadow-[0_24px_60px_-20px_rgba(15,123,94,0.45)] md:-translate-y-2"
                      : "bg-ud-surface border-ud-border shadow-card",
                  )}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 rounded-full bg-ud-primary px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-white">
                      <Sparkles className="w-3 h-3" /> Most popular
                    </div>
                  )}

                  <div>
                    <div className={cn("text-xs font-semibold uppercase tracking-[0.08em]", dark ? "text-ud-primary-glow" : "text-ud-primary")}>
                      {plan.name}
                    </div>
                    <div className="mt-3 flex items-baseline gap-1 flex-wrap">
                      <span className="font-display text-2xl font-extrabold tabular-nums break-all">
                        {formatTZS(isYearly ? plan.priceTzs : monthly)}
                      </span>
                      <span className={cn("text-xs", dark ? "text-white/55" : "text-ud-text-muted")}>{isYearly ? "/year" : "/mo"}</span>
                    </div>
                    <p className={cn("mt-1.5 text-[13px] leading-snug", dark ? "text-white/65" : "text-ud-text-secondary")}>{plan.description}</p>
                    <p className={cn("mt-1 text-[11px]", dark ? "text-white/45" : "text-ud-text-faint")}>
                      {isYearly ? "Billed annually" : `Billed ${formatTZS(plan.priceTzs)} annually`}
                    </p>

                    <div className={cn("my-4 h-px", dark ? "bg-white/10" : "bg-ud-border")} />

                    <ul className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-[13px] leading-snug">
                          <span className={cn("mt-0.5 flex-shrink-0 w-4 h-4 rounded-full flex items-center justify-center", dark ? "bg-ud-primary-glow/20 text-ud-primary-glow" : "bg-ud-primary-50 text-ud-primary")}>
                            <Check className="w-3 h-3" />
                          </span>
                          <span className={cn("min-w-0 break-words", dark ? "text-white/80" : "text-ud-text-secondary")}>{feature.text}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5">
                    <Link
                      href={plan.button.url}
                      className={cn(
                        "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                        dark
                          ? "bg-ud-gold text-ud-obsidian hover:bg-amber-400 shadow-gold-glow"
                          : "bg-ud-primary text-white hover:bg-ud-primary-hover shadow-sm",
                      )}
                    >
                      {plan.button.text}
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
