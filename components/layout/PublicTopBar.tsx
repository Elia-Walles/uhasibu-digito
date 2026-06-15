"use client";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { useT } from "@/lib/hooks/useT";

/** Shared public header (landing, pricing) with brand, language switcher, and auth CTAs. */
export function PublicTopBar() {
  const t = useT();
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
      <Link href="/" className="flex items-center gap-2.5">
        <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
        <span className="font-display font-bold">Uhasibu Digito</span>
      </Link>
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
  );
}
