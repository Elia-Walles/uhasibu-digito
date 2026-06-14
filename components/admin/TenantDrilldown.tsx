"use client";
import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { Tabs } from "@/components/ui/Tabs";
import { AdminTable } from "@/components/admin/AdminTable";
import { formatTZS } from "@/lib/utils/currency";
import type { Result } from "@/lib/server/result";
import type { DrilldownTable } from "@/lib/server/actions/admin/types";
import {
  getTenantInvoices, getTenantLedger, getTenantPayroll, getTenantInventory, getTenantBanking,
  getTenantPOS, getTenantCustomers, getTenantSuppliers, getTenantTax, getTenantFixedAssets,
} from "@/lib/server/actions/admin/drilldown";

type Loader = (input: unknown) => Promise<Result<DrilldownTable>>;

const MODULES: { value: string; label: string; load: Loader }[] = [
  { value: "invoices", label: "Invoices", load: getTenantInvoices },
  { value: "ledger", label: "Ledger", load: getTenantLedger },
  { value: "payroll", label: "Payroll", load: getTenantPayroll },
  { value: "inventory", label: "Inventory", load: getTenantInventory },
  { value: "banking", label: "Banking", load: getTenantBanking },
  { value: "pos", label: "POS", load: getTenantPOS },
  { value: "customers", label: "Customers", load: getTenantCustomers },
  { value: "suppliers", label: "Suppliers", load: getTenantSuppliers },
  { value: "tax", label: "Tax", load: getTenantTax },
  { value: "fixedAssets", label: "Fixed assets", load: getTenantFixedAssets },
];

export function TenantDrilldown({ tenantId }: { tenantId: string }) {
  const [active, setActive] = useState("invoices");
  const [table, setTable] = useState<DrilldownTable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const mod = MODULES.find((m) => m.value === active);
    if (!mod) return;
    setLoading(true);
    setTable(null);
    void mod.load({ tenantId }).then((res) => {
      if (cancelled) return;
      setTable(res.ok ? res.data : { columns: [], rows: [] });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [active, tenantId]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-3 text-xs text-ud-gold-dark">
        <Eye className="w-3.5 h-3.5" />
        Read-only support view admin cannot edit tenant records.
      </div>
      <Tabs value={active} onValueChange={setActive} tabs={MODULES.map((m) => ({ value: m.value, label: m.label }))} />
      <div className="mt-4">
        {loading ? (
          <div className="py-14 text-center text-sm text-ud-text-muted">Loading…</div>
        ) : (
          <AdminTable<Record<string, string | number>>
            data={table?.rows ?? []}
            rowKey={(_, i) => String(i)}
            emptyLabel="No records in this module."
            caption={`Tenant ${active}`}
            columns={(table?.columns ?? []).map((c) => ({
              key: c.key,
              label: c.label,
              ...(c.align ? { align: c.align } : {}),
              ...(c.align === "right"
                ? { render: (r: Record<string, string | number>) => formatTZS(Number(r[c.key]) || 0, true) }
                : {}),
            }))}
          />
        )}
      </div>
    </div>
  );
}
