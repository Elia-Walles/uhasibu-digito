import type { TaxFiling, VATReturn, VATTransaction } from "@/types";

export const TAX_FILINGS: TaxFiling[] = [
  { id: "tx_001", type: "VAT",  period: "October 2024",   dueDate: "2024-11-20", amount: 24_180_000, status: "Pending" },
  { id: "tx_002", type: "PAYE", period: "October 2024",   dueDate: "2024-11-07", amount: 31_400_000, status: "Filed",   filedAt: "2024-11-05" },
  { id: "tx_003", type: "SDL",  period: "October 2024",   dueDate: "2024-11-07", amount: 7_488_000,  status: "Filed",   filedAt: "2024-11-05" },
  { id: "tx_004", type: "WCF",  period: "October 2024",   dueDate: "2024-11-07", amount: 936_000,    status: "Filed",   filedAt: "2024-11-05" },
  { id: "tx_005", type: "CIT",  period: "Provisional Q4", dueDate: "2024-12-31", amount: 8_625_000,  status: "Upcoming" },
  { id: "tx_006", type: "WHT",  period: "October 2024",   dueDate: "2024-11-15", amount: 4_200_000,  status: "Overdue" },

  { id: "tx_011", type: "VAT",  period: "September 2024", dueDate: "2024-10-20", amount: 21_840_000, status: "Filed", filedAt: "2024-10-18" },
  { id: "tx_012", type: "PAYE", period: "September 2024", dueDate: "2024-10-07", amount: 29_900_000, status: "Filed", filedAt: "2024-10-06" },
  { id: "tx_021", type: "VAT",  period: "August 2024",    dueDate: "2024-09-20", amount: 19_440_000, status: "Filed", filedAt: "2024-09-19" },

  // Forward-dated mock filings (today is 2026-06-03) so the 5-day reminder pipeline is demonstrable.
  { id: "tx_101", type: "PAYE", period: "May 2026",       dueDate: "2026-06-07", amount: 32_100_000, status: "Pending"  },
  { id: "tx_102", type: "SDL",  period: "May 2026",       dueDate: "2026-06-07", amount: 7_640_000,  status: "Pending"  },
  { id: "tx_103", type: "WCF",  period: "May 2026",       dueDate: "2026-06-07", amount: 955_000,    status: "Pending"  },
  { id: "tx_104", type: "VAT",  period: "May 2026",       dueDate: "2026-06-20", amount: 25_700_000, status: "Upcoming" },
];

const OUTPUT_TX: VATTransaction[] = [
  { date: "2024-10-02", reference: "INV-2024-01001", description: "Kariakoo Wholesale Ltd",   netAmount: 12_700_000, vatRate: 18, vatAmount: 2_286_000 },
  { date: "2024-10-05", reference: "INV-2024-01007", description: "Arusha Merchants",          netAmount: 8_400_000,  vatRate: 18, vatAmount: 1_512_000 },
  { date: "2024-10-08", reference: "INV-2024-01015", description: "Mwanza Trading House",      netAmount: 14_200_000, vatRate: 18, vatAmount: 2_556_000 },
  { date: "2024-10-11", reference: "INV-2024-01022", description: "Zanzibar Import Export",    netAmount: 9_800_000,  vatRate: 18, vatAmount: 1_764_000 },
  { date: "2024-10-14", reference: "INV-2024-01029", description: "Dodoma Supplies Ltd",       netAmount: 11_300_000, vatRate: 18, vatAmount: 2_034_000 },
  { date: "2024-10-17", reference: "INV-2024-01034", description: "Safari Lodge Supplies",     netAmount: 7_650_000,  vatRate: 18, vatAmount: 1_377_000 },
  { date: "2024-10-21", reference: "INV-2024-01041", description: "Pwani Distributors",        netAmount: 13_900_000, vatRate: 18, vatAmount: 2_502_000 },
  { date: "2024-10-25", reference: "INV-2024-01048", description: "Kilimanjaro Coffee",        netAmount: 18_400_000, vatRate: 18, vatAmount: 3_312_000 },
  { date: "2024-10-28", reference: "INV-2024-01055", description: "Mbeya Highland Foods",      netAmount: 10_200_000, vatRate: 18, vatAmount: 1_836_000 },
  { date: "2024-10-30", reference: "INV-2024-01060", description: "Tanga Hardware",            netAmount: 26_700_000, vatRate: 18, vatAmount: 4_806_000 },
];

const INPUT_TX: VATTransaction[] = [
  { date: "2024-10-03", reference: "PO-2024-00102", description: "Office supplies — A1 Trading",  netAmount: 3_400_000,  vatRate: 18, vatAmount: 612_000 },
  { date: "2024-10-09", reference: "PO-2024-00115", description: "Inventory — Tanga Hardware",    netAmount: 22_400_000, vatRate: 18, vatAmount: 4_032_000 },
  { date: "2024-10-15", reference: "PO-2024-00124", description: "Vehicle fuel — Engen",          netAmount: 1_850_000,  vatRate: 18, vatAmount: 333_000 },
  { date: "2024-10-22", reference: "PO-2024-00131", description: "IT equipment — Tech Hub Ltd",   netAmount: 6_200_000,  vatRate: 18, vatAmount: 1_116_000 },
];

export const VAT_RETURN_OCT: VATReturn = {
  period: "October 2024",
  outputVAT: OUTPUT_TX.reduce((s, t) => s + t.vatAmount, 0),
  inputVAT: INPUT_TX.reduce((s, t) => s + t.vatAmount, 0),
  vatPayable: OUTPUT_TX.reduce((s, t) => s + t.vatAmount, 0) - INPUT_TX.reduce((s, t) => s + t.vatAmount, 0),
  outputTransactions: OUTPUT_TX,
  inputTransactions: INPUT_TX,
};
