"use client";
import Link from "next/link";
import { Truck, Users, FileText } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { StatCard } from "@/components/ui/StatCard";
import { PURCHASE_ORDERS } from "@/lib/mock-data/suppliers";

export default function ProcurementHome() {
  const totalValue = PURCHASE_ORDERS.reduce((s, p) => s + p.total, 0);
  const received   = PURCHASE_ORDERS.filter((p) => p.status === "Received").length;
  const pending    = PURCHASE_ORDERS.filter((p) => p.status !== "Received" && p.status !== "Cancelled").length;

  return (
    <PageWrapper>
      <PageHeader
        title="Procurement"
        subtitle="Purchase orders, suppliers, 3-way match"
        actions={
          <>
            <Link href="/procurement/suppliers"><Button variant="outline" icon={<Users className="w-4 h-4" />}>Suppliers</Button></Link>
            <Link href="/procurement/purchase-orders"><Button variant="primary" icon={<FileText className="w-4 h-4" />}>Purchase orders</Button></Link>
          </>
        }
      />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total PO value YTD" value={totalValue} prefix="TSh" variant="teal"    format="compact" />
        <StatCard label="Open POs"           value={pending}    variant="amber"   format="raw" />
        <StatCard label="Received"           value={received}   variant="emerald" format="raw" />
        <StatCard label="Active suppliers"   value={25}         variant="blue"    icon={<Truck />} format="raw" />
      </div>
    </PageWrapper>
  );
}
