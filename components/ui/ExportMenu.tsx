"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson, Printer, ShieldCheck } from "lucide-react";
import { Button } from "./Button";
import toast from "react-hot-toast";

interface ExportMenuProps {
  onApplyStamp?: () => void;
  fileLabel?: string;
}

export function ExportMenu({ onApplyStamp, fileLabel = "report" }: ExportMenuProps) {
  function fakeExport(kind: string) {
    const t = toast.loading(`Generating ${kind} export…`);
    setTimeout(() => {
      toast.success(`${fileLabel} exported as ${kind.toUpperCase()}`, { id: t });
    }, 1100);
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
          Export
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 bg-white rounded-xl shadow-elevated border border-ud-border p-1"
        >
          <Item icon={<FileText className="w-3.5 h-3.5" />} onClick={() => fakeExport("PDF")}>
            Export as PDF
          </Item>
          <Item icon={<FileSpreadsheet className="w-3.5 h-3.5" />} onClick={() => fakeExport("Excel")}>
            Export as Excel
          </Item>
          <Item icon={<FileJson className="w-3.5 h-3.5" />} onClick={() => fakeExport("CSV")}>
            Export as CSV
          </Item>
          <DropdownMenu.Separator className="my-1 h-px bg-ud-border" />
          <Item icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            Print
          </Item>
          {onApplyStamp && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-ud-border" />
              <Item icon={<ShieldCheck className="w-3.5 h-3.5 text-ud-gold-dark" />} onClick={onApplyStamp}>
                Apply Digital Stamp
              </Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function Item({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-ud-surface-2 cursor-pointer outline-none focus:bg-ud-surface-2"
    >
      {icon}
      {children}
    </DropdownMenu.Item>
  );
}
