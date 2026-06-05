"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Mail, Phone, Network, Pencil, Trash2, X as XIcon, PlusCircle } from "lucide-react";
import toast from "react-hot-toast";
import PageWrapper from "@/components/layout/PageWrapper";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CurrencyDisplay } from "@/components/ui/CurrencyDisplay";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CardGridSkeleton } from "@/components/skeletons/CardGridSkeleton";
import { useEmployees } from "@/lib/hooks/useEmployees";
import { useDepartments } from "@/lib/hooks/useDepartments";
import type { Employee, AllowanceLine } from "@/types";

interface FormState {
  id: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  basicSalary: number;
  allowances: AllowanceLine[];
  overtimeRate: number;
  overtimeHoursDefault: number;
  nssf: string;
  tin: string;
  bankName: string;
  bankAccount: string;
  phone: string;
  email: string;
  hasHeslb: boolean;
}

function emptyForm(): FormState {
  return {
    id: "",
    employeeNumber: "",
    firstName: "",
    lastName: "",
    department: "",
    position: "",
    basicSalary: 0,
    allowances: [{ id: "al_1", label: "Housing", amount: 0, taxable: true }],
    overtimeRate: 1.5,
    overtimeHoursDefault: 0,
    nssf: "",
    tin: "",
    bankName: "CRDB Bank",
    bankAccount: "",
    phone: "+255 ",
    email: "",
    hasHeslb: false,
  };
}

function employeeToForm(e: Employee): FormState {
  const allowances = e.allowances && e.allowances.length > 0
    ? e.allowances
    : [
        { id: "seed_housing",   label: "Housing",   amount: e.housingAllowance,   taxable: true  },
        { id: "seed_transport", label: "Transport", amount: e.transportAllowance, taxable: true  },
        ...(e.otherAllowances > 0 ? [{ id: "seed_other", label: "Other", amount: e.otherAllowances, taxable: false }] : []),
      ];
  return {
    id: e.id,
    employeeNumber: e.employeeNumber,
    firstName: e.firstName,
    lastName: e.lastName,
    department: e.department,
    position: e.position,
    basicSalary: e.basicSalary,
    allowances,
    overtimeRate: e.overtimeRate ?? 1.5,
    overtimeHoursDefault: e.overtimeHoursDefault ?? 0,
    nssf: e.nssf,
    tin: e.tin,
    bankName: e.bankName,
    bankAccount: e.bankAccount,
    phone: e.phone,
    email: e.email,
    hasHeslb: e.hasHeslb,
  };
}

export default function EmployeesPage() {
  const [selected, setSelected] = useState<Employee | null>(null);
  const [editForm, setEditForm] = useState<FormState | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null); // null on add; id on edit
  const [confirmRemove, setConfirmRemove] = useState<Employee | null>(null);

  const { departments } = useDepartments();
  const { employees, addEmployee, updateEmployee, removeEmployee, loading: empLoading } = useEmployees();
  const loading = empLoading;

  const deptOptions = useMemo(
    () => departments.map((d) => ({ value: d.name, label: d.name })),
    [departments]
  );

  function openAdd() {
    const f = emptyForm();
    if (deptOptions[0]) f.department = deptOptions[0].value;
    setEditForm(f);
    setEditingId(null);
  }

  function openEdit(e: Employee) {
    setSelected(null);
    setEditForm(employeeToForm(e));
    setEditingId(e.id);
  }

  function addAllowance() {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      allowances: [...editForm.allowances, { id: `al_${Date.now()}`, label: "", amount: 0, taxable: true }],
    });
  }

  function updateAllowance(id: string, patch: Partial<AllowanceLine>) {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      allowances: editForm.allowances.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    });
  }

  function removeAllowance(id: string) {
    if (!editForm) return;
    setEditForm({ ...editForm, allowances: editForm.allowances.filter((a) => a.id !== id) });
  }

  async function saveForm() {
    if (!editForm) return;
    if (!editForm.firstName.trim() || !editForm.lastName.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editForm.department) {
      toast.error("Department is required");
      return;
    }
    const allowancesSum = editForm.allowances.reduce((s, a) => s + a.amount, 0);
    const overtimePay = editForm.overtimeRate * editForm.overtimeHoursDefault * (editForm.basicSalary / 176);
    const gross = editForm.basicSalary + allowancesSum + overtimePay;
    const housing   = editForm.allowances.find((a) => a.label.toLowerCase().includes("hous"))?.amount ?? 0;
    const transport = editForm.allowances.find((a) => a.label.toLowerCase().includes("trans"))?.amount ?? 0;
    const other     = allowancesSum - housing - transport;
    const isEdit = editingId !== null;
    const employeeNumber = editForm.employeeNumber || `EMP-${String(Date.now()).slice(-5)}`;

    const employee: Employee = {
      id: editForm.id || `emp_${Date.now()}`,
      employeeNumber,
      firstName: editForm.firstName.trim(),
      lastName: editForm.lastName.trim(),
      fullName: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`,
      department: editForm.department,
      position: editForm.position,
      employmentType: "Permanent",
      startDate: new Date().toISOString().split("T")[0]!,
      basicSalary: editForm.basicSalary,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowances: other,
      grossSalary: gross,
      nssf: editForm.nssf,
      tin: editForm.tin,
      bankName: editForm.bankName,
      bankAccount: editForm.bankAccount,
      phone: editForm.phone,
      email: editForm.email,
      status: "Active",
      leaveBalance: 20,
      hasHeslb: editForm.hasHeslb,
      allowances: editForm.allowances,
      overtimeRate: editForm.overtimeRate,
      overtimeHoursDefault: editForm.overtimeHoursDefault,
    };

    const res = isEdit ? await updateEmployee(employee.id, employee) : await addEmployee(employee);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(isEdit ? `Updated ${employee.fullName}` : `Added ${employee.fullName}`);
    setEditForm(null);
    setEditingId(null);
  }

  async function confirmRemoveEmployee() {
    if (!confirmRemove) return;
    const res = await removeEmployee(confirmRemove.id);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Removed ${confirmRemove.fullName}`);
    setConfirmRemove(null);
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Employees"
        subtitle={`${employees.length} active employees · ${departments.length} departments configured`}
        breadcrumbs={[{ label: "Payroll", href: "/payroll" }, { label: "Employees" }]}
        actions={
          <>
            <Link href="/settings/organisation">
              <Button variant="outline" icon={<Network className="w-4 h-4" />}>Manage departments</Button>
            </Link>
            <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={openAdd}>Add employee</Button>
          </>
        }
      />

      {loading ? <CardGridSkeleton count={12} cols={3} /> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((e) => (
            <div
              key={e.id}
              className="group relative bg-white border border-ud-border rounded-2xl p-4 hover:border-ud-primary hover:shadow-card-hover transition-all"
            >
              <button onClick={() => setSelected(e)} className="text-left w-full">
                <div className="flex items-start gap-3">
                  <Avatar initials={e.firstName[0]! + e.lastName[0]!} size="md" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-ud-text-primary truncate">{e.fullName}</div>
                    <div className="text-xs text-ud-text-muted">{e.position}</div>
                    <Badge variant="teal" size="sm" className="mt-1.5">{e.department}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <div className="text-ud-text-muted">Gross monthly</div>
                    <div className="font-mono font-bold tabular-nums"><CurrencyDisplay amount={e.grossSalary} compact /></div>
                  </div>
                  <div>
                    <div className="text-ud-text-muted">Leave balance</div>
                    <div className="font-mono tabular-nums">{e.leaveBalance} days</div>
                  </div>
                </div>
              </button>
              <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(e)} className="p-1.5 rounded-lg bg-white border border-ud-border hover:border-ud-primary text-ud-text-secondary hover:text-ud-primary" aria-label="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setConfirmRemove(e)} className="p-1.5 rounded-lg bg-white border border-ud-border hover:border-ud-danger text-ud-text-secondary hover:text-ud-danger" aria-label="Remove">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail modal */}
      <Modal
        open={selected !== null}
        onOpenChange={(o) => !o && setSelected(null)}
        title={selected?.fullName ?? ""}
        description={selected?.position}
        size="md"
        footer={selected && (
          <>
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
            <Button variant="primary" icon={<Pencil className="w-4 h-4" />} onClick={() => openEdit(selected)}>Edit</Button>
          </>
        )}
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Employee #">{selected.employeeNumber}</Field>
              <Field label="Department">{selected.department}</Field>
              <Field label="Start date">{selected.startDate}</Field>
              <Field label="Type">{selected.employmentType}</Field>
              <Field label="NSSF #">{selected.nssf}</Field>
              <Field label="TIN">{selected.tin}</Field>
            </div>
            <div className="divider-hairline" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Basic salary"><CurrencyDisplay amount={selected.basicSalary} /></Field>
              <Field label="Gross"><CurrencyDisplay amount={selected.grossSalary} className="font-bold" /></Field>
            </div>
            {(selected.allowances ?? []).length > 0 && (
              <>
                <div className="divider-hairline" />
                <div>
                  <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">Allowances</div>
                  <div className="space-y-1.5">
                    {(selected.allowances ?? []).map((a) => (
                      <div key={a.id} className="flex items-center justify-between text-sm">
                        <span>{a.label} {a.taxable && <span className="text-[10px] text-ud-text-muted">(taxable)</span>}</span>
                        <span className="font-mono tabular-nums"><CurrencyDisplay amount={a.amount} /></span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
            {(selected.overtimeHoursDefault ?? 0) > 0 && (
              <div className="text-xs text-ud-text-muted">
                Overtime: {selected.overtimeHoursDefault} hrs/mo @ {selected.overtimeRate ?? 1.5}× hourly
              </div>
            )}
            <div className="divider-hairline" />
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-ud-text-secondary"><Mail className="w-3.5 h-3.5" />{selected.email}</div>
              <div className="flex items-center gap-2 text-ud-text-secondary"><Phone className="w-3.5 h-3.5" />{selected.phone}</div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal
        open={editForm !== null}
        onOpenChange={(o) => !o && setEditForm(null)}
        title={editingId ? "Edit employee" : "Add employee"}
        description="Identity, compensation, allowances, and overtime — all configurable per employee."
        size="lg"
        footer={editForm && (
          <>
            <Button variant="ghost" onClick={() => setEditForm(null)}>Cancel</Button>
            <Button variant="primary" onClick={() => void saveForm()}>{editingId ? "Save changes" : "Add employee"}</Button>
          </>
        )}
      >
        {editForm && (
          <div className="space-y-5">
            <Section title="Identity">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="First name" value={editForm.firstName} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
                <Input label="Last name"  value={editForm.lastName}  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
                <Input label="Position"   value={editForm.position}  onChange={(e) => setEditForm({ ...editForm, position: e.target.value })} />
                <Select label="Department" value={editForm.department} onValueChange={(v) => setEditForm({ ...editForm, department: v })} options={deptOptions} />
                <Input label="NSSF #" value={editForm.nssf} onChange={(e) => setEditForm({ ...editForm, nssf: e.target.value })} />
                <Input label="TIN" value={editForm.tin} onChange={(e) => setEditForm({ ...editForm, tin: e.target.value })} />
              </div>
            </Section>

            <Section title="Compensation">
              <Input
                label="Basic salary (TZS / month)"
                type="number"
                value={String(editForm.basicSalary)}
                onChange={(e) => setEditForm({ ...editForm, basicSalary: Number(e.target.value) || 0 })}
              />

              <div className="mt-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted">Allowance lines</div>
                  <Button size="sm" variant="outline" icon={<PlusCircle className="w-3.5 h-3.5" />} onClick={addAllowance}>
                    Add allowance
                  </Button>
                </div>
                <div className="space-y-2">
                  {editForm.allowances.map((a) => (
                    <div key={a.id} className="grid grid-cols-1 sm:grid-cols-[1fr_140px_110px_40px] gap-2 items-end">
                      <Input
                        label="Label"
                        value={a.label}
                        onChange={(e) => updateAllowance(a.id, { label: e.target.value })}
                        placeholder="e.g. Fuel, Housing, Risk"
                      />
                      <Input
                        label="Amount (TZS)"
                        type="number"
                        value={String(a.amount)}
                        onChange={(e) => updateAllowance(a.id, { amount: Number(e.target.value) || 0 })}
                      />
                      <label className="flex items-center gap-1 text-xs text-ud-text-secondary mb-1 sm:mb-3">
                        <input
                          type="checkbox"
                          checked={a.taxable}
                          onChange={(e) => updateAllowance(a.id, { taxable: e.target.checked })}
                          className="w-3.5 h-3.5"
                        />
                        Taxable
                      </label>
                      <button
                        onClick={() => removeAllowance(a.id)}
                        className="p-2 rounded-lg hover:bg-ud-danger-bg text-ud-danger self-end mb-1 sm:mb-2"
                        aria-label="Remove allowance"
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {editForm.allowances.length === 0 && (
                    <div className="text-xs text-ud-text-muted italic">No allowances</div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-3 rounded-xl bg-ud-surface-2">
                <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">Overtime</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Overtime rate multiplier (× hourly)"
                    type="number"
                    step="0.1"
                    value={String(editForm.overtimeRate)}
                    onChange={(e) => setEditForm({ ...editForm, overtimeRate: Number(e.target.value) || 0 })}
                  />
                  <Input
                    label="Default overtime hrs / month"
                    type="number"
                    value={String(editForm.overtimeHoursDefault)}
                    onChange={(e) => setEditForm({ ...editForm, overtimeHoursDefault: Number(e.target.value) || 0 })}
                  />
                </div>
              </div>
            </Section>

            <Section title="Contact + bank">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input label="Email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                <Input label="Phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                <Input label="Bank" value={editForm.bankName} onChange={(e) => setEditForm({ ...editForm, bankName: e.target.value })} />
                <Input label="Bank account #" value={editForm.bankAccount} onChange={(e) => setEditForm({ ...editForm, bankAccount: e.target.value })} />
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={editForm.hasHeslb}
                  onChange={(e) => setEditForm({ ...editForm, hasHeslb: e.target.checked })}
                  className="w-4 h-4"
                />
                HESLB applicable (2.5%)
              </label>
            </Section>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
        title={`Remove ${confirmRemove?.fullName ?? ""}?`}
        message="This will remove the employee from the register for this session. Payroll history is unaffected."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemoveEmployee}
      />
    </PageWrapper>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-ud-text-muted">{label}</div>
      <div className="font-medium text-ud-text-primary mt-0.5">{children}</div>
    </div>
  );
}
