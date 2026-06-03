"use client";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight, Users, Calculator, FileCheck, PartyPopper, Calendar } from "lucide-react";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Steps } from "@/components/ui/Steps";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { useDataStore } from "@/lib/store/dataStore";
import { calculateDeductions } from "@/lib/utils/paye";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const STEPS = [
  { label: "Period",     description: "Select period",   icon: Calendar },
  { label: "Employees",  description: "Review roster",   icon: Users },
  { label: "Calculate",  description: "PAYE / NSSF",     icon: Calculator },
  { label: "Approve",    description: "Final review",    icon: FileCheck },
  { label: "Complete",   description: "Disburse",        icon: PartyPopper },
];

export default function RunPayrollPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [period, setPeriod] = useState("2024-10");
  const [processing, setProcessing] = useState(false);

  const employees = useDataStore((s) => s.employees);
  const enriched = useMemo(
    () => employees.map((e) => ({ ...e, ...calculateDeductions(e.grossSalary, e.hasHeslb) })),
    [employees]
  );

  const totals = useMemo(() => {
    return enriched.reduce(
      (acc, e) => ({
        gross: acc.gross + e.grossPay,
        paye:  acc.paye  + e.paye,
        nssfE: acc.nssfE + e.nssf_employee,
        nssfR: acc.nssfR + e.nssf_employer,
        sdl:   acc.sdl   + e.sdl,
        wcf:   acc.wcf   + e.wcf,
        heslb: acc.heslb + e.heslb,
        net:   acc.net   + e.netPay,
      }),
      { gross: 0, paye: 0, nssfE: 0, nssfR: 0, sdl: 0, wcf: 0, heslb: 0, net: 0 }
    );
  }, [enriched]);

  async function processNext() {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    setProcessing(true);
    await new Promise((r) => setTimeout(r, 1800));
    setProcessing(false);
    setStep(4);
    toast.success("Payroll approved and disbursed");
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Run payroll"
        subtitle="5 steps to process and disburse employee salaries"
        breadcrumbs={[{ label: "Payroll", href: "/payroll" }, { label: "Run payroll" }]}
      />

      <div className="bg-white border border-ud-border rounded-2xl p-6 mb-6 shadow-card">
        <Steps steps={STEPS} current={step} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          {step === 0 && (
            <Card title="Select payroll period" subtitle="Choose the month to process">
              <div className="max-w-sm">
                <Select
                  label="Payroll period"
                  value={period}
                  onValueChange={setPeriod}
                  options={[
                    { value: "2024-10", label: "October 2024" },
                    { value: "2024-09", label: "September 2024 (already paid)" },
                    { value: "2024-11", label: "November 2024 (upcoming)" },
                  ]}
                />
                <div className="mt-4 p-4 rounded-xl bg-ud-primary-50 border border-ud-primary-100">
                  <div className="text-sm font-medium text-ud-primary mb-1">Period summary</div>
                  <ul className="text-xs text-ud-text-secondary space-y-1">
                    <li>• 12 active employees</li>
                    <li>• Pay date: 28 October 2024</li>
                    <li>• Statutory due (PAYE/NSSF/SDL/WCF): 7 November 2024</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {step === 1 && (
            <Card title="Review employees" subtitle="12 active employees · all included by default">
              <div className="overflow-x-auto rounded-xl border border-ud-border">
                <table className="w-full text-sm">
                  <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                    <tr>
                      <th className="text-left px-4 py-3" scope="col">Employee</th>
                      <th className="text-left px-4 py-3" scope="col">Department</th>
                      <th className="text-right px-4 py-3" scope="col">Basic</th>
                      <th className="text-right px-4 py-3" scope="col">Allowances</th>
                      <th className="text-right px-4 py-3" scope="col">Gross</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{e.fullName}</div>
                          <div className="text-xs text-ud-text-muted">{e.employeeNumber}</div>
                        </td>
                        <td className="px-4 py-3 text-ud-text-secondary">{e.department}</td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums"><CurrencyDisplay amount={e.basicSalary} compact showSymbol={false} /></td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums"><CurrencyDisplay amount={e.housingAllowance + e.transportAllowance + e.otherAllowances} compact showSymbol={false} /></td>
                        <td className="px-4 py-3 text-right font-mono tabular-nums font-medium"><CurrencyDisplay amount={e.grossPay} compact showSymbol={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {step === 2 && (
            <Card title="Statutory deductions" subtitle="TRA-compliant calculation (PAYE 2024 bands · NSSF 10/10 · SDL 4% · WCF 0.5%)">
              <div className="overflow-x-auto rounded-xl border border-ud-border">
                <table className="w-full text-sm">
                  <thead className="bg-ud-surface-2 text-xs uppercase tracking-[0.06em] text-ud-text-secondary">
                    <tr>
                      <th className="text-left px-3 py-3" scope="col">Employee</th>
                      <th className="text-right px-3 py-3" scope="col">Gross</th>
                      <th className="text-right px-3 py-3" scope="col">PAYE</th>
                      <th className="text-right px-3 py-3" scope="col">NSSF</th>
                      <th className="text-right px-3 py-3" scope="col">HESLB</th>
                      <th className="text-right px-3 py-3" scope="col">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enriched.map((e, i) => (
                      <tr key={e.id} className={i % 2 === 1 ? "bg-ud-surface-2/50" : ""}>
                        <td className="px-3 py-2.5">
                          <div className="text-sm font-medium">{e.fullName}</div>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums"><CurrencyDisplay amount={e.grossPay} compact showSymbol={false} /></td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ud-danger"><CurrencyDisplay amount={e.paye} compact showSymbol={false} /></td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ud-danger"><CurrencyDisplay amount={e.nssf_employee} compact showSymbol={false} /></td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums text-ud-danger">{e.heslb > 0 ? <CurrencyDisplay amount={e.heslb} compact showSymbol={false} /> : "—"}</td>
                        <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={e.netPay} compact showSymbol={false} /></td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-ud-primary text-white">
                    <tr>
                      <td className="px-3 py-3 font-bold">Totals</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={totals.gross} compact showSymbol={false} /></td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={totals.paye} compact showSymbol={false} /></td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={totals.nssfE} compact showSymbol={false} /></td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={totals.heslb} compact showSymbol={false} /></td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums font-bold"><CurrencyDisplay amount={totals.net} compact showSymbol={false} /></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </Card>
          )}

          {step === 3 && (
            <Card title="Final approval" subtitle="Review totals before disbursing">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <Summary label="Gross"        amount={totals.gross} color="teal" />
                <Summary label="PAYE"         amount={totals.paye}  color="danger" />
                <Summary label="NSSF (combined)" amount={totals.nssfE + totals.nssfR} color="warning" />
                <Summary label="Net to pay"   amount={totals.net}   color="emerald" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
                <Summary label="SDL (4%)"    amount={totals.sdl}   color="default" />
                <Summary label="WCF (0.5%)"  amount={totals.wcf}   color="default" />
                <Summary label="HESLB"        amount={totals.heslb} color="default" />
              </div>

              <div className="p-4 rounded-xl bg-ud-warning-bg border border-ud-warning/20">
                <div className="text-sm font-bold text-ud-warning mb-1">Statutory deadlines</div>
                <ul className="text-xs text-ud-text-secondary space-y-0.5">
                  <li>• PAYE, NSSF, SDL, WCF — due to TRA by 7 November 2024</li>
                  <li>• Net pay will be disbursed from CRDB Payroll account ({employees.length} transfers)</li>
                  <li>• Once approved, this cannot be reversed without a full reversal journal entry</li>
                </ul>
              </div>
            </Card>
          )}

          {step === 4 && (
            <Card title="Payroll complete" subtitle="All payments disbursed and statutory returns prepared">
              <div className="text-center py-8 relative overflow-hidden">
                <Confetti />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="w-24 h-24 mx-auto rounded-full gradient-emerald flex items-center justify-center mb-6 shadow-elevated"
                >
                  <Check className="w-12 h-12 text-white" />
                </motion.div>
                <h3 className="font-display font-extrabold text-2xl text-ud-text-primary">October payroll processed!</h3>
                <p className="mt-2 text-sm text-ud-text-muted">12 employees have been paid · TZS {Math.round(totals.net / 1_000_000)}M disbursed</p>
                <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                  <Button variant="primary" onClick={() => router.push("/payroll/statutory")}>View statutory returns</Button>
                  <Button variant="outline" onClick={() => router.push("/payroll")}>Back to payroll</Button>
                </div>
              </div>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {step < 4 && (
        <div className="flex justify-between mt-6">
          <Button
            variant="outline"
            disabled={step === 0}
            onClick={() => setStep(Math.max(0, step - 1))}
          >
            Back
          </Button>
          <Button
            variant={step === 3 ? "primary" : "primary"}
            loading={processing}
            onClick={processNext}
          >
            {step === 3 ? (processing ? "Processing…" : "Approve & disburse") : "Continue"}
            {!processing && <ChevronRight className="w-4 h-4" />}
          </Button>
        </div>
      )}
    </PageWrapper>
  );
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
      <h3 className="font-display font-bold text-lg text-ud-text-primary">{title}</h3>
      {subtitle && <p className="text-sm text-ud-text-muted mt-0.5 mb-5">{subtitle}</p>}
      {!subtitle && <div className="mb-5" />}
      {children}
    </div>
  );
}

function Summary({ label, amount, color }: { label: string; amount: number; color: "teal" | "danger" | "warning" | "emerald" | "default" }) {
  const bg = {
    teal:    "bg-ud-primary-50 text-ud-primary border-ud-primary-100",
    danger:  "bg-ud-danger-bg text-ud-danger border-ud-danger/20",
    warning: "bg-ud-warning-bg text-ud-warning border-ud-warning/20",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    default: "bg-ud-surface-2 text-ud-text-secondary border-ud-border",
  }[color];
  return (
    <div className={`p-3.5 rounded-xl border ${bg}`}>
      <div className="text-[10px] uppercase tracking-[0.08em] font-semibold opacity-75">{label}</div>
      <div className="mt-1 font-mono font-bold text-base tabular-nums"><CurrencyDisplay amount={amount} compact /></div>
    </div>
  );
}

function Confetti() {
  const COLORS = ["#0F7B5E", "#F5C842", "#14A87E", "#1DD4A2", "#F59E0B"];
  return (
    <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
      {Array.from({ length: 30 }).map((_, i) => {
        const left  = `${(i / 30) * 100}%`;
        const color = COLORS[i % COLORS.length]!;
        const delay = (i % 6) * 0.08;
        return (
          <motion.div
            key={i}
            initial={{ y: -40, opacity: 0, rotate: 0 }}
            animate={{ y: [-40, 320], opacity: [0, 1, 0], rotate: [0, 360] }}
            transition={{ duration: 2.4, delay, ease: "easeOut" }}
            style={{ left, top: 0, background: color, width: 8, height: 8 }}
            className="absolute rounded-sm"
          />
        );
      })}
    </div>
  );
}
