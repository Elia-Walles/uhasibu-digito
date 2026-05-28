"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

const USERS = [
  { id: "u1", name: "Elia Mwangi",   email: "elia@kilimanjarotrading.co.tz",     role: "CFO",             department: "Finance" },
  { id: "u2", name: "Grace Mbeki",   email: "grace@kilimanjarotrading.co.tz",    role: "Finance Manager", department: "Finance" },
  { id: "u3", name: "Amina Hassan",  email: "amina@kilimanjarotrading.co.tz",    role: "Accountant",      department: "Finance" },
  { id: "u4", name: "Samuel Kimani", email: "samuel@kilimanjarotrading.co.tz",   role: "Accountant",      department: "Finance" },
  { id: "u5", name: "Lilian Ngowi",  email: "lilian@kilimanjarotrading.co.tz",   role: "Data Entry",      department: "Admin" },
  { id: "u6", name: "Joseph Mwakasege", email: "joseph@mwakasegeassociates.co.tz", role: "Auditor",        department: "External" },
];

const ROLE_COLOR = {
  Admin: "danger", CFO: "gold", "Finance Manager": "info", Accountant: "teal", "Data Entry": "default", "HR Manager": "warning", Auditor: "obsidian",
} as const;

export default function UsersPage() {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
      <div className="px-5 py-4 flex items-center justify-between border-b border-ud-border">
        <div>
          <h2 className="font-display font-bold text-lg">Users & roles</h2>
          <p className="text-xs text-ud-text-muted">Manage who can access what</p>
        </div>
        <Button variant="primary" icon={<Plus className="w-4 h-4" />} onClick={() => setOpen(true)}>Invite user</Button>
      </div>

      <div className="divide-y divide-ud-border">
        {USERS.map((u) => (
          <div key={u.id} className="flex items-center gap-4 px-5 py-3">
            <Avatar initials={u.name.split(" ").map((s) => s[0]).join("")} />
            <div className="flex-1 min-w-0">
              <div className="font-medium">{u.name}</div>
              <div className="text-xs text-ud-text-muted">{u.email}</div>
            </div>
            <Badge variant={ROLE_COLOR[u.role as keyof typeof ROLE_COLOR] ?? "default"}>{u.role}</Badge>
            <div className="text-xs text-ud-text-muted hidden md:block w-24 text-right">{u.department}</div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
        title="Invite user"
        description="They will receive an email to set up their password"
        footer={<><Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button><Button variant="primary" onClick={() => setOpen(false)}>Send invite</Button></>}
      >
        <div className="space-y-3">
          <Input label="Full name" placeholder="e.g. Mary Ndungu" />
          <Input label="Email" type="email" placeholder="mary@kilimanjarotrading.co.tz" />
          <Select label="Role" options={[
            { value: "Admin", label: "Admin" },
            { value: "CFO", label: "CFO" },
            { value: "Finance Manager", label: "Finance Manager" },
            { value: "Accountant", label: "Accountant" },
            { value: "Data Entry", label: "Data Entry" },
            { value: "HR Manager", label: "HR Manager" },
            { value: "Auditor", label: "Auditor" },
          ]} />
        </div>
      </Modal>
    </div>
  );
}
