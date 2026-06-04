"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertTriangle, Circle, ExternalLink, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAudit } from "@/lib/hooks/useAudit";
import { Attachments } from "@/components/ui/Attachments";
import { cn } from "@/lib/utils/cn";
import type { AuditProcedure, AuditStep, AuditStepStatus } from "@/types";

interface AuditChecklistProps {
  procedure: AuditProcedure;
  title: string;
  description: string;
  steps: AuditStep[];
}

export function AuditChecklist({ procedure, title, description, steps }: AuditChecklistProps) {
  const { results, setStep: setAuditStep, resetProcedure: resetAuditProcedure } = useAudit();
  const state = results[procedure];
  const [expanded, setExpanded] = useState<string | null>(steps[0]?.key ?? null);

  const summary = useMemo(() => {
    const passed = steps.filter((s) => state.results[s.key]?.status === "Passed").length;
    const exceptions = steps.filter((s) => state.results[s.key]?.status === "Exception").length;
    const total = steps.length;
    return { passed, exceptions, total, complete: passed + exceptions === total };
  }, [steps, state]);

  const overall = summary.exceptions > 0 ? "exception" : summary.complete ? "passed" : "pending";

  return (
    <div className="space-y-4">
      <div className="bg-white border border-ud-border rounded-2xl p-5 shadow-card flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-lg">{title}</h2>
          <p className="text-sm text-ud-text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant={overall === "exception" ? "danger" : overall === "passed" ? "success" : "warning"}
            size="md"
            pulse={overall === "exception"}
          >
            {overall === "exception" ? `${summary.exceptions} exception${summary.exceptions === 1 ? "" : "s"}`
              : overall === "passed" ? "All steps passed"
              : `${summary.passed} / ${summary.total} passed`}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => resetAuditProcedure(procedure)}>Reset</Button>
        </div>
      </div>

      <ol className="space-y-3">
        {steps.map((step, idx) => {
          const result = state.results[step.key];
          const stepStatus: AuditStepStatus = result?.status ?? "Pending";
          const isExpanded = expanded === step.key;
          return (
            <li key={step.key} className="bg-white border border-ud-border rounded-2xl shadow-card overflow-hidden">
              <button
                type="button"
                onClick={() => setExpanded(isExpanded ? null : step.key)}
                className="w-full flex items-start gap-3 p-4 text-left hover:bg-ud-surface-2 transition-colors"
                aria-expanded={isExpanded}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
                  stepStatus === "Passed"    ? "bg-ud-success text-white" :
                  stepStatus === "Exception" ? "bg-ud-danger  text-white" :
                                               "bg-ud-surface-2 text-ud-text-muted border border-ud-border"
                )}>
                  {stepStatus === "Passed"    ? <CheckCircle2 className="w-4 h-4" />
                  : stepStatus === "Exception" ? <AlertTriangle className="w-4 h-4" />
                  : <span className="text-xs font-bold">{idx + 1}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-display font-semibold text-sm">{step.title}</span>
                    <Badge
                      variant={stepStatus === "Passed" ? "success" : stepStatus === "Exception" ? "danger" : "default"}
                      size="sm"
                    >
                      {stepStatus}
                    </Badge>
                  </div>
                  <p className="text-xs text-ud-text-muted mt-0.5">{step.description}</p>
                </div>
                <ChevronDown className={cn("w-4 h-4 text-ud-text-muted transition-transform flex-shrink-0 mt-1", isExpanded && "rotate-180")} />
              </button>

              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden border-t border-ud-border"
                  >
                    <div className="p-4 space-y-4 bg-ud-surface-2/30">
                      <div>
                        <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">Evidence</div>
                        <div className="flex flex-wrap gap-1.5">
                          {step.evidence.map((e, i) => (
                            e.href
                              ? <Link key={i} href={e.href} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-ud-border text-xs hover:border-ud-primary hover:text-ud-primary transition-colors">
                                  {e.label}<ExternalLink className="w-3 h-3" />
                                </Link>
                              : <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-ud-border text-xs text-ud-text-muted">
                                  {e.label}
                                </span>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-1">
                          Notes (working papers)
                        </label>
                        <textarea
                          value={result?.notes ?? ""}
                          onChange={(e) => setAuditStep(procedure, step.key, stepStatus === "Pending" ? "Pending" : stepStatus, e.target.value)}
                          placeholder="Observations, exceptions, samples checked, follow-ups…"
                          rows={3}
                          className="w-full rounded-xl border border-ud-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ud-primary"
                        />
                      </div>

                      <div>
                        <div className="text-xs uppercase tracking-[0.08em] font-semibold text-ud-text-muted mb-2">Working-paper files</div>
                        <Attachments ownerType="AuditStep" ownerId={`${procedure}:${step.key}`} compact />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={stepStatus === "Passed" ? "primary" : "outline"}
                          icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          onClick={() => setAuditStep(procedure, step.key, "Passed", result?.notes ?? "")}
                        >
                          Passed
                        </Button>
                        <Button
                          size="sm"
                          variant={stepStatus === "Exception" ? "danger" : "outline"}
                          icon={<AlertTriangle className="w-3.5 h-3.5" />}
                          onClick={() => setAuditStep(procedure, step.key, "Exception", result?.notes ?? "")}
                        >
                          Exception
                        </Button>
                        <Button
                          size="sm"
                          variant={stepStatus === "Pending" ? "secondary" : "ghost"}
                          icon={<Circle className="w-3.5 h-3.5" />}
                          onClick={() => setAuditStep(procedure, step.key, "Pending", result?.notes ?? "")}
                        >
                          Clear
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
