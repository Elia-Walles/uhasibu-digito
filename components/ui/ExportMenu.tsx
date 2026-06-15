"use client";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Download, FileText, FileSpreadsheet, FileJson, Printer, ShieldCheck } from "lucide-react";
import { Button } from "./Button";
import { useTier } from "@/lib/hooks/useTier";
import { useT } from "@/lib/hooks/useT";
import toast from "react-hot-toast";

interface ExportMenuProps {
  onApplyStamp?: () => void;
  fileLabel?: string;
  /** When provided, the "Export as Excel" item invokes this real Excel builder instead of the fake toast. */
  onExportExcel?: () => Promise<void> | void;
}

export function ExportMenu({ onApplyStamp, fileLabel = "report", onExportExcel }: ExportMenuProps) {
  // Digital Stamp is a Premium-tier feature.
  const { atLeast } = useTier();
  const t = useT();
  const canStamp = atLeast("premium");

  function fakeExport(kind: string) {
    const id = toast.loading(t("Generating {kind} export…", { kind }));
    setTimeout(() => {
      toast.success(t("{file} exported as {kind}", { file: fileLabel, kind: kind.toUpperCase() }), { id });
    }, 1100);
  }

  async function runExcelExport() {
    if (!onExportExcel) {
      fakeExport("Excel");
      return;
    }
    const id = toast.loading(t("Generating Excel workbook…"));
    try {
      await onExportExcel();
      toast.success(t("{file} exported as {kind}", { file: fileLabel, kind: "XLSX" }), { id });
    } catch (err) {
      console.error(err);
      toast.error(t("Excel export failed"), { id });
    }
  }

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" size="md" icon={<Download className="w-4 h-4" />}>
          {t("Export")}
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={6}
          className="z-50 min-w-48 bg-white rounded-xl shadow-elevated border border-ud-border p-1"
        >
          <Item icon={<FileText className="w-3.5 h-3.5" />} onClick={() => fakeExport("PDF")}>
            {t("Export as PDF")}
          </Item>
          <Item icon={<FileSpreadsheet className="w-3.5 h-3.5" />} onClick={() => { void runExcelExport(); }}>
            {t("Export as Excel")}
          </Item>
          <Item icon={<FileJson className="w-3.5 h-3.5" />} onClick={() => fakeExport("CSV")}>
            {t("Export as CSV")}
          </Item>
          <DropdownMenu.Separator className="my-1 h-px bg-ud-border" />
          <Item icon={<Printer className="w-3.5 h-3.5" />} onClick={() => window.print()}>
            {t("Print")}
          </Item>
          {onApplyStamp && canStamp && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-ud-border" />
              <Item icon={<ShieldCheck className="w-3.5 h-3.5 text-ud-gold-dark" />} onClick={onApplyStamp}>
                {t("Apply Digital Stamp")}
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
