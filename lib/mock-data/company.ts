import type { Company, User } from "@/types";

export const COMPANY: Company = {
  id: "co_001",
  name: "Kilimanjaro Trading Company Limited",
  shortName: "Kilimanjaro Trading",
  tin: "123-456-789",
  vatNumber: "40-123456-E",
  efdSerial: "EFD-TZ-2024-00847",
  nbaaNumber: "NBAA-2018-F-4421",
  regNumber: "TZ-CO-2018-004821",
  address: "Plot 47, Bibi Titi Mohamed Road, Upanga, Dar es Salaam",
  branch: "Mwanakwerekwe Market, Stone Town, Zanzibar",
  email: "info@kilimanjarotrading.co.tz",
  phone: "+255 22 219 8800",
  website: "www.kilimanjarotrading.co.tz",
  financialYear: { start: "January", end: "December" },
  baseCurrency: "TZS",
  secondaryCurrency: "USD",
};

export const CURRENT_USER: User = {
  id: "usr_001",
  name: "Elia Mwangi",
  role: "CFO",
  email: "elia@kilimanjarotrading.co.tz",
  avatar: null,
  initials: "EM",
  department: "Finance",
};
