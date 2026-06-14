"use client";
import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import { ArrowLeft, CreditCard, Receipt } from "lucide-react";
import { getTenant } from "@/lib/server/actions/admin/tenants";
import { getTenantSubscription, upsertSubscription } from "@/lib/server/actions/admin/subscriptions";
import { setTenantTier } from "@/lib/server/actions/admin/tenants";
import { AdminPageTitle, AdminPanel, StatusPill } from "@/components/admin/primitives";
import { TenantDrilldown } from "@/components/admin/TenantDrilldown";
import { RecordPaymentModal } from "@/components/admin/RecordPaymentModal";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { formatTZS } from "@/lib/utils/currency";
import type { Tier } from "@/lib/auth/tiers";
import type { AdminTenantDetail, AdminSubscriptionRow } from "@/lib/server/actions/admin/types";

const PLAN_OPTIONS = [
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "standard", label: "Standard" },
  { value: "premium", label: "Premium" },
];
type PlanKey = "starter" | "business" | "standard" | "premium";

export default function TenantDetailPage() {
  const params = useParams<{ tenantId: string }>();
  const tenantId = params.tenantId;

  const [detail, setDetail] = useState<AdminTenantDetail | null>(null);
  const [sub, setSub] = useState<AdminSubscriptionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [payOpen, setPayOpen] = useState(false);

  const [planKey, setPlanKey] = useState<PlanKey>("business");
  const [amount, setAmount] = useState("");
  const [savingSub, setSavingSub] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [d, s] = await Promise.all([getTenant({ tenantId }), getTenantSubscription({ tenantId })]);
    if (d.ok) setDetail(d.data);
    if (s.ok) setSub(s.data);
    setLoading(false);
  }, [tenantId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot fetch
    void load();
  }, [load]);

  const changeTier = async (tier: Tier) => {
    const res = await setTenantTier({ tenantId, tier });
    if (res.ok) {
      toast.success("Tier updated");
      void load();
    } else toast.error(res.error);
  };

  const saveSubscription = async () => {
    setSavingSub(true);
    const res = await upsertSubscription({ tenantId, planKey, amountTzs: Number(amount) });
    setSavingSub(false);
    if (res.ok) {
      toast.success("Subscription activated");
      setAmount("");
      void load();
    } else toast.error(res.error);
  };

  if (loading || !detail) {
    return (
      <div>
        <AdminPageTitle title="Tenant" subtitle="Loading…" />
        <div className="h-40 rounded-2xl bg-ud-surface border border-ud-border animate-pulse" />
      </div>
    );
  }

  return (
    <div>
      <Link href="/admin/tenants" className="inline-flex items-center gap-1.5 text-sm text-ud-text-muted hover:text-ud-text-primary mb-3">
        <ArrowLeft className="w-4 h-4" /> Tenants
      </Link>
      <AdminPageTitle
        title={detail.name}
        subtitle={`${detail.slug} · joined ${detail.createdAt.slice(0, 10)}`}
        actions={
          <Button icon={<Receipt className="w-4 h-4" />} onClick={() => setPayOpen(true)}>
            Record payment
          </Button>
        }
      />

      <div className="grid lg:grid-cols-3 gap-4">
        <AdminPanel title="Profile">
          <dl className="space-y-2 text-sm">
            {[
              ["Company", detail.companyName ?? ""],
              ["TIN", detail.tin ?? ""],
              ["Email", detail.email ?? ""],
              ["Phone", detail.phone ?? ""],
              ["Region", detail.region ?? ""],
              ["Users", String(detail.userCount)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="text-ud-text-muted">{k}</dt>
                <dd className="text-ud-text-secondary text-right">{v}</dd>
              </div>
            ))}
          </dl>
        </AdminPanel>

        <AdminPanel title="Subscription">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-ud-text-muted">Current tier</span>
              <StatusPill value={detail.tier} />
            </div>
            <div className="flex justify-between">
              <span className="text-ud-text-muted">Status</span>
              {sub ? <StatusPill value={sub.status} /> : <span className="text-ud-text-faint">No active plan</span>}
            </div>
            <div className="flex justify-between">
              <span className="text-ud-text-muted">MRR</span>
              <span className="font-mono">{formatTZS(detail.mrrTzs, true)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ud-text-muted">Total paid</span>
              <span className="font-mono">{formatTZS(detail.totalPaidTzs, true)}</span>
            </div>
            <div className="pt-2 border-t border-ud-border">
              <label className="block text-[11px] uppercase tracking-[0.08em] text-ud-text-muted mb-1.5">Quick tier change</label>
              <Select
                value={detail.tier}
                onValueChange={(v) => changeTier(v as Tier)}
                options={[{ value: "free", label: "Free" }, ...PLAN_OPTIONS.map((p) => ({ value: p.value, label: p.label }))]}
              />
            </div>
          </div>
        </AdminPanel>

        <AdminPanel title="Activate plan">
          <div className="space-y-3">
            <Select label="Plan" value={planKey} onValueChange={(v) => setPlanKey(v as PlanKey)} options={PLAN_OPTIONS} />
            <Input label="Amount (TZS / year)" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="450000" />
            <Button
              fullWidth
              icon={<CreditCard className="w-4 h-4" />}
              onClick={saveSubscription}
              loading={savingSub}
              disabled={!(Number(amount) > 0)}
            >
              Activate subscription
            </Button>
            <p className="text-xs text-ud-text-muted">Sets the tenant tier and starts a new active subscription.</p>
          </div>
        </AdminPanel>
      </div>

      <AdminPanel title="Business data" className="mt-6">
        <TenantDrilldown tenantId={tenantId} />
      </AdminPanel>

      <RecordPaymentModal open={payOpen} onOpenChange={setPayOpen} tenantId={tenantId} onDone={load} />
    </div>
  );
}
