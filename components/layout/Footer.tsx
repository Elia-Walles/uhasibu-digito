"use client";
import Link from "next/link";
import Image from "next/image";

export function Footer() {
  const year = 2026;
  return (
    <footer className="mt-12 border-t border-ud-border bg-white/70 backdrop-blur-sm">
      <div className="max-w-[1600px] mx-auto px-4 md:px-6 lg:px-8 py-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/images/uhasibu-digito-circle.png"
            alt="Uhasibu Digito"
            width={28}
            height={28}
            className="w-7 h-7 rounded-lg flex-shrink-0"
          />
          <div className="min-w-0">
            <div className="text-sm font-display font-bold text-ud-text-primary">
              Uhasibu Digito<sup className="text-[10px] text-ud-text-muted ml-0.5">™</sup>
            </div>
            <div className="text-xs text-ud-text-muted">© {year} · Akaunti yako, nguvu yako · Made in Tanzania</div>
          </div>
        </div>
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ud-text-muted">
          <Link href="/legal/terms-of-service" className="hover:text-ud-primary transition-colors">
            Terms of Service
          </Link>
          <Link href="/legal/terms-of-service#privacy" className="hover:text-ud-primary transition-colors">
            Privacy
          </Link>
          <Link href="/legal/terms-of-service#nbaa" className="hover:text-ud-primary transition-colors">
            NBAA compliance
          </Link>
          <span aria-hidden className="text-ud-border">·</span>
          <span>Powered by AfyaLead</span>
        </nav>
      </div>
    </footer>
  );
}
