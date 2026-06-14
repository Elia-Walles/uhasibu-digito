import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { getPublicPlans } from "@/lib/server/actions/public-plans";
import { PricingCards, type PricingPlanCard } from "@/components/ui/pricing-cards";

export const metadata: Metadata = {
  title: "Pricing · Uhasibu Digito",
  description: "Simple, transparent pricing for Tanzania's intelligent financial platform. Billed yearly in TZS, upgrade any time.",
};

// Always read live, admin-managed plans (never statically cached).
export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const plans = await getPublicPlans();

  const cards: PricingPlanCard[] = plans.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.tagline,
    priceTzs: p.priceTzs,
    features: p.features.map((text) => ({ text })),
    highlighted: p.highlighted,
    button: { text: "Get started", url: `/register?plan=${p.id}` },
  }));

  return (
    <div className="relative bg-ud-surface-3">
      {/* Header: matches the landing page nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between px-5 sm:px-8 h-16 border-b border-ud-border bg-ud-surface/80 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2.5">
          <Image src="/images/uhasibu-digito-circle.png" alt="Uhasibu Digito" width={32} height={32} className="w-8 h-8 rounded-lg" priority />
          <span className="font-display font-bold">Uhasibu Digito</span>
        </Link>
        <div className="flex items-center gap-2 text-sm">
          <Link href="/login" className="rounded-lg px-3 py-1.5 text-ud-text-secondary hover:text-ud-text-primary transition-colors">Sign in</Link>
          <Link href="/register" className="rounded-lg bg-ud-primary px-3 py-1.5 font-medium text-white hover:bg-ud-primary-hover transition-colors">Get started</Link>
        </div>
      </header>

      <PricingCards
        heading="Plans & Pricing"
        description="Start with Point of Sale and grow into full accounting, tax and payroll. Billed yearly in TZS, upgrade any time."
        plans={cards}
      />
    </div>
  );
}
