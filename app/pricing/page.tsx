import type { Metadata } from "next";
import { getPublicPlans } from "@/lib/server/actions/public-plans";
import { PricingCards, type PricingPlanCard } from "@/components/ui/pricing-cards";
import { PublicTopBar } from "@/components/layout/PublicTopBar";

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
      <PublicTopBar />

      <PricingCards
        heading="Plans & Pricing"
        description="Start with Point of Sale and grow into full accounting, tax and payroll. Billed yearly in TZS, upgrade any time."
        plans={cards}
      />
    </div>
  );
}
