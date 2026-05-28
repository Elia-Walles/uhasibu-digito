// English label registry, keyed by ID. Future Swahili rollout swaps the values.
export const STRINGS = {
  "nav.dashboard": "Dashboard",
  "nav.finance": "Finance",
  "nav.operations": "Operations",
  "nav.compliance": "Compliance",
  "nav.intelligence": "Intelligence",
  "nav.system": "System",

  "dashboard.kpi.revenue": "Revenue MTD",
  "dashboard.kpi.profit": "Net Profit MTD",
  "dashboard.kpi.cash": "Cash Position",
  "dashboard.kpi.receivables": "Outstanding Receivables",

  "actions.save": "Save",
  "actions.cancel": "Cancel",
  "actions.export": "Export",
  "actions.print": "Print",
  "actions.applyStamp": "Apply Digital Stamp",
  "actions.new": "New",
  "actions.viewAll": "View all",
  "actions.signIn": "Sign in",
  "actions.signOut": "Sign out",

  "status.paid": "Paid",
  "status.sent": "Sent",
  "status.overdue": "Overdue",
  "status.draft": "Draft",
  "status.cancelled": "Cancelled",
  "status.filed": "Filed",
  "status.pending": "Pending",
  "status.upcoming": "Upcoming",
} as const;

export type StringKey = keyof typeof STRINGS;

export function t(key: StringKey): string {
  return STRINGS[key];
}
