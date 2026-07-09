// Bundled Tanzania administrative hierarchy: the 31 regions and their local-government councils
// (TAMISEMI district/municipal/town/city councils). Used to drive the onboarding Region → District
// cascade for Tanzania, where the live countriesnow API is incomplete (it returns only 29 regions
// and sparse town lists). Suffixes: DC = District Council, MC = Municipal, CC = City, TC = Town.
// Region names are the clean forms (no trailing " Region").

export interface TzRegion {
  region: string;
  councils: string[];
}

export const TZ_REGIONS: TzRegion[] = [
  { region: "Arusha", councils: ["Arusha CC", "Arusha DC", "Karatu DC", "Longido DC", "Meru DC", "Monduli DC", "Ngorongoro DC"] },
  { region: "Dar es Salaam", councils: ["Ilala MC", "Kinondoni MC", "Temeke MC", "Ubungo MC", "Kigamboni MC"] },
  { region: "Dodoma", councils: ["Dodoma CC", "Bahi DC", "Chamwino DC", "Chemba DC", "Kondoa DC", "Kondoa TC", "Kongwa DC", "Mpwapwa DC"] },
  { region: "Geita", councils: ["Geita TC", "Geita DC", "Bukombe DC", "Chato DC", "Mbogwe DC", "Nyang'hwale DC"] },
  { region: "Iringa", councils: ["Iringa MC", "Iringa DC", "Kilolo DC", "Mafinga TC", "Mufindi DC"] },
  { region: "Kagera", councils: ["Bukoba MC", "Bukoba DC", "Biharamulo DC", "Karagwe DC", "Kyerwa DC", "Missenyi DC", "Muleba DC", "Ngara DC"] },
  { region: "Katavi", councils: ["Mpanda MC", "Mpimbwe DC", "Mlele DC", "Nsimbo DC", "Tanganyika DC"] },
  { region: "Kigoma", councils: ["Kigoma-Ujiji MC", "Kigoma DC", "Buhigwe DC", "Kakonko DC", "Kasulu DC", "Kasulu TC", "Kibondo DC", "Uvinza DC"] },
  { region: "Kilimanjaro", councils: ["Moshi MC", "Moshi DC", "Hai DC", "Mwanga DC", "Rombo DC", "Same DC", "Siha DC"] },
  { region: "Lindi", councils: ["Lindi MC", "Lindi DC", "Kilwa DC", "Liwale DC", "Nachingwea DC", "Ruangwa DC", "Mtama DC"] },
  { region: "Manyara", councils: ["Babati TC", "Babati DC", "Hanang DC", "Kiteto DC", "Mbulu DC", "Mbulu TC", "Simanjiro DC"] },
  { region: "Mara", councils: ["Musoma MC", "Musoma DC", "Bunda DC", "Bunda TC", "Butiama DC", "Rorya DC", "Serengeti DC", "Tarime DC", "Tarime TC"] },
  { region: "Mbeya", councils: ["Mbeya CC", "Mbeya DC", "Busokelo DC", "Chunya DC", "Kyela DC", "Mbarali DC", "Rungwe DC"] },
  { region: "Morogoro", councils: ["Morogoro MC", "Morogoro DC", "Gairo DC", "Ifakara TC", "Kilombero DC", "Kilosa DC", "Malinyi DC", "Mvomero DC", "Ulanga DC"] },
  { region: "Mtwara", councils: ["Mtwara-Mikindani MC", "Mtwara DC", "Masasi DC", "Masasi TC", "Nanyamba TC", "Nanyumbu DC", "Newala DC", "Newala TC", "Tandahimba DC"] },
  { region: "Mwanza", councils: ["Nyamagana MC", "Ilemela MC", "Buchosa DC", "Kwimba DC", "Magu DC", "Misungwi DC", "Sengerema DC", "Ukerewe DC"] },
  { region: "Njombe", councils: ["Njombe TC", "Njombe DC", "Ludewa DC", "Makambako TC", "Makete DC", "Wanging'ombe DC"] },
  { region: "Pwani", councils: ["Kibaha TC", "Kibaha DC", "Bagamoyo DC", "Chalinze DC", "Kisarawe DC", "Kibiti DC", "Mafia DC", "Mkuranga DC", "Rufiji DC"] },
  { region: "Rukwa", councils: ["Sumbawanga MC", "Sumbawanga DC", "Kalambo DC", "Nkasi DC"] },
  { region: "Ruvuma", councils: ["Songea MC", "Songea DC", "Madaba DC", "Mbinga DC", "Mbinga TC", "Namtumbo DC", "Nyasa DC", "Tunduru DC"] },
  { region: "Shinyanga", councils: ["Shinyanga MC", "Shinyanga DC", "Kahama MC", "Kishapu DC", "Msalala DC", "Ushetu DC"] },
  { region: "Simiyu", councils: ["Bariadi TC", "Bariadi DC", "Busega DC", "Itilima DC", "Maswa DC", "Meatu DC"] },
  { region: "Singida", councils: ["Singida MC", "Singida DC", "Ikungi DC", "Iramba DC", "Manyoni DC", "Mkalama DC"] },
  { region: "Songwe", councils: ["Mbozi DC", "Ileje DC", "Momba DC", "Songwe DC", "Tunduma TC"] },
  { region: "Tabora", councils: ["Tabora MC", "Uyui DC", "Igunga DC", "Kaliua DC", "Nzega DC", "Nzega TC", "Sikonge DC", "Urambo DC"] },
  { region: "Tanga", councils: ["Tanga CC", "Handeni DC", "Handeni TC", "Kilindi DC", "Korogwe DC", "Korogwe TC", "Lushoto DC", "Muheza DC", "Mkinga DC", "Pangani DC", "Bumbuli DC"] },
  { region: "Kaskazini Unguja", councils: ["Kaskazini A", "Kaskazini B"] },
  { region: "Kusini Unguja", councils: ["Kati", "Kusini"] },
  { region: "Mjini Magharibi", councils: ["Mjini", "Magharibi A", "Magharibi B"] },
  { region: "Kaskazini Pemba", councils: ["Micheweni", "Wete"] },
  { region: "Kusini Pemba", councils: ["Chake Chake", "Mkoani"] },
];

/** Region names for the Tanzania region dropdown (alphabetical). */
export const TZ_REGION_NAMES: string[] = TZ_REGIONS.map((r) => r.region).sort((a, b) => a.localeCompare(b));

const BY_REGION = new Map(TZ_REGIONS.map((r) => [r.region.toLowerCase(), r.councils] as const));

/** Councils for a Tanzania region. Tolerates a trailing " Region" suffix; returns [] if unknown. */
export function districtsForRegion(region: string): string[] {
  const key = region.trim().replace(/\s+region$/i, "").toLowerCase();
  return BY_REGION.get(key) ?? [];
}
