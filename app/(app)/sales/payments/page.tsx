"use client";
import { useState } from "react";
import { Plus, CreditCard, Smartphone, Banknote } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
import { useLoadingSimulation } from "@/lib/hooks/useLoadingSimulation";
import { useDataStore } from "@/lib/store/dataStore";
import { formatDate } from "@/lib/utils/dates";
import toast from "react-hot-toast";

interface Payment {
  id: string;
  date: string;
  invoiceNumber: string;
  customer: string;
  amount: number;
  method: "M-Pesa" | "Tigo Pesa" | "Airtel" | "Bank Transfer" | "Cash" | "Cheque";
  reference: string;
}

const METHOD_ICON = { "M-Pesa": Smartphone, "Tigo Pesa": Smartphone, "Airtel": Smartphone, "Bank Transfer": CreditCard, "Cash": Banknote, "Cheque": CreditCard };

export default function PaymentsPage() {
  const loading = useLoadingSimulation(800);
  const { invoices } = useDataStore();
  const [open, setOpen] = useState(false);

  const payments: Payment[] = invoices
    .filter((i) => i.status === "Paid")
    .slice(0, 30)
    .map((i, idx) => ({
      id: `pay_${i.id}`,
      date: i.paidAt ?? i.issueDate,
      invoiceNumber: i.number,
      customer: i.customerName,
      amount: i.total,
      method: (["M-Pesa", "Bank Transfer", "Cash", "Tigo Pesa", "Cheque"] as const)[idx % 5]!,
      reference: `PMT-${String(idx + 1).padStart(6, "0")}`,
    }));

  const COLS: Column<Payment>[] = [
    { key: "date", label: "Date", sortable: true, render: (r) => formatDate(r.date) },
    { key: "reference", label: "Reference", className: "font-mono text-xs" },
    { key: "invoiceNumber", label: "Invoice", className: "font-mono text-xs" },
    { key: "customer", label: "Customer", sortable: true },
    { key: "method", label: "Method", render: (r) => {
      const Icon = METHOD_ICON[r.method];
      return <Badge variant="default"><Icon className="w-2.5 h-2.5" />{r.method}</Badge>;
    } },
    { key: "amount", label: "Amount", sortable: true, align: "right", render: (r) => <CurrencyDisplay amount={r.amount} className="font-bold" /> },
  ];

  return (
    <PageWrapper>
      <PageHeader
        title="Payments"
        subtitle={`${payments.length} payments received · TZS ${Math.round(payments.reduce((s, p) => s + p.amount, 0) / 1_000_000)}M`}
        breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Payments" }]}
        actions={<Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>Record payment</Button>}
      />
      {loading ? <TableSkeleton rows={10} columns={6} /> :
        <DataTable data={payments} columns={COLS} pageSize={15} initialSortKey="date" initialSortDir="desc" rowKey={(r) => r.id} />
      }
      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Record payment"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => { setOpen(false); toast.success("Payment recorded"); }}>Save</Button></>}
      >
        <div className="space-y-3">
          <Select label="Invoice" options={invoices.slice(0, 8).map((i) => ({ value: i.id, label: `${i.number} — ${i.customerName}` }))} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Amount" type="number" placeholder="0" />
            <Select label="Method" options={["M-Pesa", "Tigo Pesa", "Bank Transfer", "Cash", "Cheque"].map((m) => ({ value: m, label: m }))} value="M-Pesa" />
          </div>
          <Input label="Reference" placeholder="Transaction reference" />
          <Input label="Date" type="date" defaultValue={new Date().toISOString().split("T")[0]} />
        </div>
      </Modal>
    </PageWrapper>
  );
}
