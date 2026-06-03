"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Pencil, Trash2, Check, X, Users, Network } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDataStore } from "@/lib/store/dataStore";

export default function OrganisationSettingsPage() {
  const departments = useDataStore((s) => s.departments);
  const addDepartment = useDataStore((s) => s.addDepartment);
  const renameDepartment = useDataStore((s) => s.renameDepartment);
  const removeDepartment = useDataStore((s) => s.removeDepartment);
  const countEmployeesInDepartment = useDataStore((s) => s.countEmployeesInDepartment);

  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string; count: number } | null>(null);

  function handleAdd() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    if (departments.some((d) => d.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error(`Department "${trimmed}" already exists`);
      return;
    }
    addDepartment(trimmed);
    toast.success(`Added ${trimmed}`);
    setNewName("");
  }

  function startEdit(id: string, name: string) {
    setEditingId(id);
    setEditingName(name);
  }

  function saveEdit() {
    if (!editingId) return;
    const trimmed = editingName.trim();
    if (!trimmed) {
      toast.error("Department name cannot be empty");
      return;
    }
    renameDepartment(editingId, trimmed);
    toast.success("Department renamed");
    setEditingId(null);
    setEditingName("");
  }

  function requestDelete(id: string, name: string) {
    setConfirmDelete({ id, name, count: countEmployeesInDepartment(name) });
  }

  function confirmRemove() {
    if (!confirmDelete) return;
    removeDepartment(confirmDelete.id);
    toast.success(`Removed ${confirmDelete.name}`);
    setConfirmDelete(null);
  }

  return (
    <div className="space-y-6">
      <div className="bg-white border border-ud-border rounded-2xl p-6 shadow-card">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-ud-primary-50 text-ud-primary flex items-center justify-center flex-shrink-0">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-bold text-lg">Departments</h2>
            <p className="text-sm text-ud-text-muted mt-0.5">
              Define the departments used across Payroll, HR, and reporting. Uhasibu Digito does not dictate your org structure — these are yours.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-5">
          <div className="flex-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
              placeholder="e.g. Finance, Operations, R&D…"
            />
          </div>
          <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={handleAdd}>
            Add department
          </Button>
        </div>

        {departments.length === 0 ? (
          <EmptyState
            icon={Network}
            title="No departments yet"
            description="Add your first department to start assigning employees."
          />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {departments.map((d) => {
                const count = countEmployeesInDepartment(d.name);
                const isEditing = editingId === d.id;
                return (
                  <motion.li
                    key={d.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-ud-border bg-ud-surface-2/50 hover:bg-ud-surface-2 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-xl bg-white border border-ud-border flex items-center justify-center text-ud-text-muted text-xs font-mono">
                      {d.name.slice(0, 2).toUpperCase()}
                    </div>
                    {isEditing ? (
                      <div className="flex-1 flex items-center gap-2">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") saveEdit(); if (e.key === "Escape") setEditingId(null); }}
                        />
                        <Button size="sm" variant="primary" icon={<Check className="w-3.5 h-3.5" />} onClick={saveEdit} aria-label="Save" />
                        <Button size="sm" variant="ghost"   icon={<X     className="w-3.5 h-3.5" />} onClick={() => setEditingId(null)} aria-label="Cancel" />
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{d.name}</div>
                          <div className="flex items-center gap-1 text-xs text-ud-text-muted">
                            <Users className="w-3 h-3" />
                            {count} employee{count === 1 ? "" : "s"}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" icon={<Pencil className="w-3.5 h-3.5" />} onClick={() => startEdit(d.id, d.name)} aria-label="Rename" />
                          <Button size="sm" variant="ghost" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => requestDelete(d.id, d.name)} aria-label="Remove" />
                        </div>
                      </>
                    )}
                  </motion.li>
                );
              })}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={confirmDelete !== null}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        title={`Remove ${confirmDelete?.name ?? ""}?`}
        message={
          confirmDelete && confirmDelete.count > 0
            ? `${confirmDelete.count} employee${confirmDelete.count === 1 ? " is" : "s are"} currently assigned to ${confirmDelete.name}. Reassign them before removing the department.`
            : "This department has no employees assigned. You can safely remove it."
        }
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmRemove}
      />
    </div>
  );
}
