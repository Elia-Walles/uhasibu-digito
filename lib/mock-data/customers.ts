import type { Customer, CRMCustomer } from "@/types";
import {
  rngFromSeed,
  pick,
  range,
  randomInt,
  randomTZS,
  tinFormat,
  phoneFormat,
  TZ_COMPANY_PREFIX,
  TZ_COMPANY_SUFFIX,
  TZ_CITIES,
  TZ_FIRST_NAMES,
  TZ_LAST_NAMES,
  PAYMENT_TERMS,
} from "./generators";

const rnd = rngFromSeed(20251101);
const statusBuckets = ["Active","Active","Active","Active","Active","Inactive","Blocked"] as const;

export const CUSTOMERS: Customer[] = range(45, (i) => {
  const prefix = TZ_COMPANY_PREFIX[i % TZ_COMPANY_PREFIX.length] ?? "Trading Co";
  const suffix = pick(TZ_COMPANY_SUFFIX, rnd);
  const fn     = pick(TZ_FIRST_NAMES, rnd);
  const ln     = pick(TZ_LAST_NAMES, rnd);
  const city   = pick(TZ_CITIES, rnd);
  const creditLimit = randomTZS(5_000_000, 50_000_000, rnd);
  const outstanding = randomInt(0, 100, rnd) < 70
    ? randomTZS(0, Math.floor(creditLimit * 0.8), rnd)
    : 0;
  const status = pick(statusBuckets, rnd);
  const tin = tinFormat(rnd);
  const totalRevenue = randomTZS(8_000_000, 220_000_000, rnd);

  return {
    id: `cust_${String(i + 1).padStart(3, "0")}`,
    name: `${prefix} ${suffix}`,
    contactPerson: `${fn} ${ln}`,
    tin,
    phone: phoneFormat(rnd),
    email: `${prefix.toLowerCase().replace(/[^a-z]+/g, "")}@example.co.tz`,
    city,
    address: `${randomInt(10, 500, rnd)} ${pick(["Uhuru","Bagamoyo","Morogoro","Nyerere","Sokoine","Kilwa"], rnd)} Road, ${city}`,
    creditLimit,
    outstandingBalance: outstanding,
    status,
    paymentTerms: pick(PAYMENT_TERMS, rnd),
    totalRevenue,
  };
});

const CRM_RND = rngFromSeed(31415);
const LEAD_SOURCES = ["Referral", "Web", "Trade Show", "Cold Call", "Repeat Customer", "Walk-in"];
const TEAM = ["John Kamau", "Mary Ndungu", "David Osei", "Grace Mbeki"];

export const CRM_CUSTOMERS: CRMCustomer[] = CUSTOMERS.slice(0, 25).map((c, i) => ({
  ...c,
  leadSource: pick(LEAD_SOURCES, CRM_RND),
  assignedTo: TEAM[i % TEAM.length] ?? "John Kamau",
  lastContact: new Date(2025, 9, randomInt(1, 28, CRM_RND)).toISOString().split("T")[0]!,
  notes: pick([
    "Regular orders monthly; reliable.",
    "Pursuing larger contract for Q1 2025.",
    "Followed up on overdue invoice — payment expected next week.",
    "Interested in branch in Mwanza.",
    "Requested credit limit increase.",
  ], CRM_RND),
}));
