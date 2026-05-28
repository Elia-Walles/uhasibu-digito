// Seeded RNG + Tanzania-flavored data pools for deterministic mock generation.

export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const rngFromSeed = (seed: number) => mulberry32(seed);

export function pick<T>(arr: readonly T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)] as T;
}

export function range<T>(n: number, fn: (i: number) => T): T[] {
  return Array.from({ length: n }, (_, i) => fn(i));
}

export function randomInt(min: number, max: number, rnd: () => number): number {
  return Math.floor(rnd() * (max - min + 1)) + min;
}

export function randomTZS(min: number, max: number, rnd: () => number): number {
  const v = randomInt(min, max, rnd);
  return Math.round(v / 1000) * 1000;
}

export function randomDateInRange(start: Date, end: Date, rnd: () => number): Date {
  const ts = start.getTime() + rnd() * (end.getTime() - start.getTime());
  return new Date(ts);
}

export function isoDate(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

// ====== POOLS ======
export const TZ_FIRST_NAMES = [
  "Amina","John","Grace","David","Fatuma","Ibrahim","Mary","Peter","Samuel","Lilian",
  "Hassan","Rose","Neema","Joseph","Aisha","Daudi","Zainabu","Emmanuel","Hawa","Juma",
  "Jane","Tumaini","Salma","Frank","Ester","Salim","Halima","Bahati","Rehema","Iddi",
];

export const TZ_LAST_NAMES = [
  "Hassan","Kamau","Mbeki","Osei","Said","Ally","Ndungu","Msangi","Kimani","Ngowi",
  "Juma","Mwita","Mwakasege","Bakari","Kihiyo","Lyimo","Massawe","Mwangoka","Nyerere","Mhina",
  "Mwakyusa","Lema","Tairo","Kabaka","Komba","Mwasapi","Bukuku","Mtui","Macha","Shao",
];

export const TZ_COMPANY_SUFFIX = ["Ltd","Company Ltd","Co. Ltd","Enterprises","Trading","Group"];

export const TZ_COMPANY_PREFIX = [
  "Kariakoo Wholesale","Arusha Merchants","Mwanza Trading House","Zanzibar Import Export",
  "Dodoma Supplies","Safari Lodge Supplies","Pwani Distributors","Kilimanjaro Coffee",
  "Mbeya Highland Foods","Tanga Hardware","Iringa Agro","Morogoro Cement",
  "Bukoba Coffee Estate","Tabora Honey","Singida Sunflower","Kigoma Fishing Co",
  "Lake Victoria Foods","Serengeti Crafts","Stone Town Spice","Ngorongoro Tours",
  "Mtwara Cashew","Lindi Sea Products","Manyara Gemstones","Shinyanga Cotton",
  "Sumbawanga Maize","Mara Dairy","Pemba Cloves","Mafia Marine","Tarime Gold",
  "Geita Resources","Songea Tobacco","Njombe Tea","Mafinga Logistics","Babati Hardware",
  "Korogwe Bus Lines","Mpwapwa Concrete","Maswa Cotton","Nzega Mining","Bunda Sisal",
  "Magu Foods","Bagamoyo Hospitality","Kibaha Pharmaceuticals","Mkuranga Plastics","Rufiji Logistics","Kibondo Refugee Supplies",
];

export const TZ_CITIES = [
  "Dar es Salaam","Arusha","Mwanza","Dodoma","Mbeya","Morogoro","Tanga","Zanzibar",
  "Kigoma","Mtwara","Iringa","Tabora","Bukoba","Songea","Sumbawanga","Lindi","Singida","Shinyanga",
];

export const TZ_BANKS = ["CRDB Bank","NMB Bank","Stanbic Bank","NBC Bank","Exim Bank","Equity Bank"];

export const PAYMENT_TERMS = ["Net 30","Net 14","Net 7","Cash on Delivery","Net 60"];

export const INVENTORY_CATEGORIES = [
  "Food & Beverages","Electronics","Clothing","Hardware","Services","Office Supplies",
];

export const INVENTORY_ITEMS_BY_CATEGORY: Record<string, string[]> = {
  "Food & Beverages": [
    "Bottled Water 500ml (Case)","Tropical Juice 1L","Coffee Beans 1kg","Tea Bags Premium 100ct",
    "Rice Bag 25kg","Cooking Oil 5L","Sugar 50kg","Maize Flour 25kg","Wheat Flour 50kg",
    "Tomato Sauce 500ml","Spices Pack","Honey 500g","Coconut Milk 400ml","Salt 1kg",
    "Mineral Water 1.5L","Soft Drink Crate","Powdered Milk 400g","Cocoa Powder 250g",
  ],
  "Electronics": [
    "Mobile Phone Lite","Tablet 10\"","Wireless Mouse","USB Keyboard","Power Bank 20000mAh",
    "Bluetooth Speaker","HDMI Cable 2m","USB-C Charger","Earphones Premium","Smartwatch",
    "Laptop Stand","Phone Case Universal","Solar Charger","LED Bulb 12W","Extension Cord",
  ],
  "Clothing": [
    "Cotton T-Shirt","Polo Shirt","Khanga Cloth","Kitenge Wrap","School Uniform (Set)",
    "Business Shirt","Trousers Khaki","Maasai Blanket","Football Jersey","Office Skirt",
  ],
  "Hardware": [
    "Cement 50kg","Iron Sheet (Gauge 28)","Nails 2 inch (kg)","Paint 4L White","Brush Set",
    "Hammer 16oz","Screwdriver Set","PVC Pipe 4\"","Padlock Heavy","Wire Roll 100m",
  ],
  "Services": [
    "Consultancy Hour","Installation Service","Maintenance Contract Monthly","Training Day",
    "Audit Engagement","Delivery Local","Delivery Upcountry","Cleaning Day","Security Shift",
  ],
  "Office Supplies": [
    "A4 Paper Ream","Pen Box (12)","Stapler Heavy","File Folder Pack","Notebook A5",
    "Marker Set","Receipt Book","Printer Cartridge","Calculator","Whiteboard 4ft",
  ],
};

export function tinFormat(rnd: () => number): string {
  const a = randomInt(100, 999, rnd);
  const b = randomInt(100, 999, rnd);
  const c = randomInt(100, 999, rnd);
  return `${a}-${b}-${c}`;
}

export function phoneFormat(rnd: () => number): string {
  const prefix = pick(["71","74","75","78","65","67","68","69"], rnd);
  const a = String(randomInt(100, 999, rnd));
  const b = String(randomInt(100, 999, rnd));
  return `+255 ${prefix} ${a} ${b}`;
}

export function efdFormat(seq: number): string {
  return `EFD-2024-${String(seq).padStart(8, "0")}`;
}
