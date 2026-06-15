"use client";
import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { ShoppingCart, BookOpen, Wallet, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/lib/hooks/useT";

const FEATURES = [
  { icon: ShoppingCart, title: "Point of Sale", desc: "Sell, track stock and print EFD receipts across every branch." },
  { icon: BookOpen, title: "Finance & Accounting", desc: "General ledger, financial statements and reports, always reconciled." },
  { icon: Wallet, title: "Payroll & Tax", desc: "PAYE, NSSF, SDL, WCF and VAT returns, computed the Tanzanian way." },
  { icon: Sparkles, title: "AI Assistant", desc: "Ask questions in plain language and get insight from your books." },
];

export function Landing() {
  const reduce = useReducedMotion();
  const t = useT();
  const rise = reduce
    ? {}
    : { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, margin: "-10% 0px" }, transition: { duration: 0.45 } };

  return (
    <div className="min-h-screen bg-ud-surface-3">
      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <span className="font-display font-bold">Uhasibu Digito</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher />
          <Link href="/pricing">
            <Button variant="ghost" size="sm">{t("Pricing")}</Button>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm">{t("Sign in")}</Button>
          </Link>
          <Link href="/register">
            <Button variant="primary" size="sm">{t("Get started")}</Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-ud-primary opacity-10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-ud-gold opacity-10 blur-3xl" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-12 text-center">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 16 }}
            animate={reduce ? {} : { opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-ud-primary-50 text-ud-primary text-xs font-semibold uppercase tracking-[0.08em]">
              <ShieldCheck className="w-3.5 h-3.5" /> {t("Akaunti yako, nguvu yako")}
            </div>
            <h1 className="mt-5 font-display font-extrabold text-4xl sm:text-6xl leading-[1.05] text-balance">
              {t("Tanzania's intelligent financial platform")}
            </h1>
            <p className="mt-5 max-w-2xl mx-auto text-ud-text-secondary text-base sm:text-lg text-balance">
              {t("Twenty modules, one platform from Point of Sale to general ledger, payroll, TRA compliance and a smart AI assistant.")}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/register">
                <Button variant="primary" size="lg" icon={<ArrowRight className="w-4 h-4" />}>{t("Start free")}</Button>
              </Link>
              <Link href="/pricing">
                <Button variant="outline" size="lg">{t("View pricing")}</Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 sm:px-8 py-12">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                {...rise}
                transition={{ ...(reduce ? {} : { duration: 0.45, delay: i * 0.06 }) }}
                className="rounded-2xl bg-ud-surface border border-ud-border shadow-card p-5"
              >
                <div className="w-10 h-10 rounded-xl bg-ud-primary-50 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-ud-primary" />
                </div>
                <h3 className="mt-3 font-display font-bold">{t(f.title)}</h3>
                <p className="mt-1 text-sm text-ud-text-muted">{t(f.desc)}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-ud-border bg-ud-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ud-text-muted">
          <div className="flex items-center gap-2.5">
            <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={24} height={24} className="w-6 h-6 rounded-md" />
            <span>© {new Date().getFullYear()} Uhasibu Digito™ · {t("Made in Tanzania")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
