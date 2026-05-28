import type { PipelineDeal, Lead, DealStage, LeadTemperature, LeadSource, LeadStatus } from "@/types";
import {
  rngFromSeed,
  pick,
  range,
  randomInt,
  randomTZS,
  phoneFormat,
  TZ_COMPANY_PREFIX,
  TZ_COMPANY_SUFFIX,
  TZ_FIRST_NAMES,
  TZ_LAST_NAMES,
} from "./generators";

const rnd = rngFromSeed(8675309);

const STAGE_DISTRIBUTION: DealStage[] = [
  "Lead","Lead","Lead","Lead","Lead","Lead",
  "Qualified","Qualified","Qualified","Qualified","Qualified",
  "Proposal","Proposal","Proposal","Proposal",
  "Negotiation","Negotiation","Negotiation",
  "Won","Won","Won","Won",
  "Lost","Lost","Lost",
];

const STAGE_PROBABILITY: Record<DealStage, number> = {
  Lead: 10, Qualified: 30, Proposal: 50, Negotiation: 75, Won: 100, Lost: 0,
};

const TEAM = [
  { name: "John Kamau",   initials: "JK" },
  { name: "Mary Ndungu",  initials: "MN" },
  { name: "David Osei",   initials: "DO" },
  { name: "Grace Mbeki",  initials: "GM" },
];

export const PIPELINE_DEALS: PipelineDeal[] = range(25, (i) => {
  const prefix = TZ_COMPANY_PREFIX[(i + 12) % TZ_COMPANY_PREFIX.length] ?? "Deal Co";
  const teamMember = TEAM[i % TEAM.length]!;
  const stage = STAGE_DISTRIBUTION[i] ?? "Lead";
  const close = new Date(2024, 10 + randomInt(0, 2, rnd), randomInt(1, 28, rnd));
  return {
    id: `deal_${String(i + 1).padStart(3, "0")}`,
    dealName: `${pick(["Annual contract","Bulk order","Q1 supply","Branch expansion","Master agreement"], rnd)} — ${prefix}`,
    companyName: `${prefix} ${pick(TZ_COMPANY_SUFFIX, rnd)}`,
    contactName: `${pick(TZ_FIRST_NAMES, rnd)} ${pick(TZ_LAST_NAMES, rnd)}`,
    value: randomTZS(2_500_000, 85_000_000, rnd),
    probability: STAGE_PROBABILITY[stage],
    stage,
    assignedTo: teamMember.name,
    assignedInitials: teamMember.initials,
    expectedCloseDate: close.toISOString().split("T")[0]!,
    daysInStage: randomInt(1, 28, rnd),
    notes: pick([
      "Decision expected by end of month.",
      "Awaiting proposal review.",
      "Customer requested updated pricing.",
      "Site visit scheduled for next week.",
      "Negotiating volume discount.",
    ], rnd),
  };
});

const LEAD_SOURCES: LeadSource[] = ["Web","Referral","Cold Call","Social","Walk-in"];
const LEAD_STATUSES: LeadStatus[] = ["New","Contacted","Qualified","Lost"];
const TEMPERATURES: LeadTemperature[] = ["Hot","Warm","Cold"];

export const LEADS: Lead[] = range(18, (i) => {
  const prefix = TZ_COMPANY_PREFIX[(i + 20) % TZ_COMPANY_PREFIX.length] ?? "Lead Co";
  return {
    id: `lead_${String(i + 1).padStart(3, "0")}`,
    name: `${pick(TZ_FIRST_NAMES, rnd)} ${pick(TZ_LAST_NAMES, rnd)}`,
    company: prefix,
    phone: phoneFormat(rnd),
    email: `lead${i + 1}@example.co.tz`,
    source: pick(LEAD_SOURCES, rnd),
    status: pick(LEAD_STATUSES, rnd),
    temperature: pick(TEMPERATURES, rnd),
    assignedTo: TEAM[i % TEAM.length]!.name,
    expectedValue: randomTZS(1_000_000, 35_000_000, rnd),
    followUpDate: new Date(2024, 10, randomInt(1, 28, rnd)).toISOString().split("T")[0]!,
    createdAt: new Date(2024, 9, randomInt(1, 28, rnd)).toISOString(),
  };
});
