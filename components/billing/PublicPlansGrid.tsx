"use client";
import { useRouter } from "next/navigation";
import { PricingCard } from "@/components/billing/PricingCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tag } from "lucide-react";
import type { Plan } from "@/lib/auth/tiers";

/** Public, read-only plan grid for the landing and /pricing pages. CTA routes to signup. */
export function PublicPlansGrid({ plans }: { plans: Plan[] }) {
  const router = useRouter();

  if (plans.length === 0) {
    return (
      <EmptyState
        icon={Tag}
        title="Plans coming soon"
        description="Pricing is being finalised. Please check back shortly."
      />
    );
  }

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 items-start">
      {plans.map((plan) => (
        <PricingCard
          key={plan.id}
          plan={plan}
          isCurrent={false}
          loading={false}
          onSelect={() => router.push(`/register?plan=${plan.id}`)}
        />
      ))}
    </div>
  );
}
