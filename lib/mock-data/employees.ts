import type { Employee } from "@/types";
import { calculateDeductions } from "@/lib/utils/paye";

interface SeedEmployee {
  id: string;
  firstName: string;
  lastName: string;
  department: string;
  position: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowances: number;
  hasHeslb: boolean;
}

const SEED: SeedEmployee[] = [
  { id: "emp_001", firstName: "Amina",   lastName: "Hassan",  department: "Finance",   position: "Bookkeeper",        basicSalary: 1_200_000, housingAllowance: 400_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_002", firstName: "John",    lastName: "Kamau",   department: "Sales",     position: "Sales Manager",     basicSalary: 1_800_000, housingAllowance: 400_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_003", firstName: "Grace",   lastName: "Mbeki",   department: "Finance",   position: "Finance Manager",   basicSalary: 2_500_000, housingAllowance: 600_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: true  },
  { id: "emp_004", firstName: "David",   lastName: "Osei",    department: "Sales",     position: "Sales Rep",         basicSalary: 900_000,   housingAllowance: 300_000, transportAllowance: 150_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_005", firstName: "Fatuma",  lastName: "Said",    department: "HR",        position: "HR Officer",        basicSalary: 1_100_000, housingAllowance: 350_000, transportAllowance: 150_000, otherAllowances: 0, hasHeslb: true  },
  { id: "emp_006", firstName: "Ibrahim", lastName: "Ally",    department: "Logistics", position: "Logistics Coord.",  basicSalary: 1_000_000, housingAllowance: 300_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_007", firstName: "Mary",    lastName: "Ndungu",  department: "Sales",     position: "Sales Rep",         basicSalary: 850_000,   housingAllowance: 300_000, transportAllowance: 150_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_008", firstName: "Peter",   lastName: "Msangi",  department: "Warehouse", position: "Store Keeper",      basicSalary: 800_000,   housingAllowance: 250_000, transportAllowance: 150_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_009", firstName: "Samuel",  lastName: "Kimani",  department: "Finance",   position: "Accountant",        basicSalary: 1_600_000, housingAllowance: 400_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: true  },
  { id: "emp_010", firstName: "Lilian",  lastName: "Ngowi",   department: "Admin",     position: "Admin Officer",     basicSalary: 900_000,   housingAllowance: 300_000, transportAllowance: 150_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_011", firstName: "Hassan",  lastName: "Juma",    department: "Logistics", position: "Driver",            basicSalary: 750_000,   housingAllowance: 250_000, transportAllowance: 100_000, otherAllowances: 0, hasHeslb: false },
  { id: "emp_012", firstName: "Rose",    lastName: "Mwita",   department: "Zanzibar",  position: "Branch Manager",    basicSalary: 1_400_000, housingAllowance: 400_000, transportAllowance: 200_000, otherAllowances: 0, hasHeslb: true  },
];

const BANKS = ["CRDB Bank", "NMB Bank", "Stanbic Bank", "NBC Bank"];

export const EMPLOYEES: Employee[] = SEED.map((e, i) => {
  const gross =
    e.basicSalary + e.housingAllowance + e.transportAllowance + e.otherAllowances;
  return {
    id: e.id,
    employeeNumber: `EMP-${String(i + 1).padStart(3, "0")}`,
    firstName: e.firstName,
    lastName: e.lastName,
    fullName: `${e.firstName} ${e.lastName}`,
    department: e.department,
    position: e.position,
    employmentType: "Permanent",
    startDate: "2020-01-15",
    basicSalary: e.basicSalary,
    housingAllowance: e.housingAllowance,
    transportAllowance: e.transportAllowance,
    otherAllowances: e.otherAllowances,
    grossSalary: gross,
    nssf: `NSSF-TZ-${String(100000 + i)}`,
    tin: `${200000000 + i * 1000}`,
    bankName: BANKS[i % BANKS.length] ?? "CRDB Bank",
    bankAccount: `${1000000000 + i * 123456}`,
    phone: `+255 7${String(i + 1).padStart(2, "0")} ${String(100000 + i * 7)}`,
    email: `${e.firstName.toLowerCase()}@kilimanjarotrading.co.tz`,
    status: "Active",
    leaveBalance: 18 - (i % 4),
    hasHeslb: e.hasHeslb,
  };
});

export function employeeWithDeductions(emp: Employee) {
  return { ...emp, ...calculateDeductions(emp.grossSalary, emp.hasHeslb) };
}
