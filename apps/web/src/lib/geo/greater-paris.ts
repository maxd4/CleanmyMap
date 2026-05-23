export type GeographicBounds = {
  west: number;
  south: number;
  east: number;
  north: number;
};

export const GREATER_PARIS_BOUNDS: GeographicBounds = {
  west: 2.12,
  south: 48.74,
  east: 2.55,
  north: 48.98,
};

export function buildGreaterParisViewbox(): string {
  return [
    GREATER_PARIS_BOUNDS.west,
    GREATER_PARIS_BOUNDS.north,
    GREATER_PARIS_BOUNDS.east,
    GREATER_PARIS_BOUNDS.south,
  ]
    .map(String)
    .join(",");
}

export function buildGreaterParisLeafletBounds(): [[number, number], [number, number]] {
  return [
    [GREATER_PARIS_BOUNDS.south, GREATER_PARIS_BOUNDS.west],
    [GREATER_PARIS_BOUNDS.north, GREATER_PARIS_BOUNDS.east],
  ];
}

export function buildGreaterParisNominatimSearchUrl(query: string): string | null {
  return buildGreaterParisNominatimSearchUrlWithLimit(query, 1);
}

export function buildGreaterParisNominatimSearchUrlWithLimit(
  query: string,
  limit: number,
): string | null {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) {
    return null;
  }

  const params = new URLSearchParams({
    format: "jsonv2",
    q: normalizedQuery,
    limit: String(Math.max(1, Math.min(10, Math.trunc(limit) || 1))),
    addressdetails: "1",
    countrycodes: "fr",
    bounded: "1",
    viewbox: buildGreaterParisViewbox(),
  });

  return `https://nominatim.openstreetmap.org/search?${params.toString()}`;
}

export type GreaterParisAddressSuggestion = {
  label: string;
  subtitle: string;
  latitude: number;
  longitude: number;
  importance: number;
};

const LOCAL_GREATER_PARIS_ADDRESS_SUGGESTIONS: Array<
  GreaterParisAddressSuggestion & { keywords: string[] }
> = [
  {
    label: "12 Rue de Rivoli, 75004 Paris",
    subtitle: "Paris 4e · Louvre",
    latitude: 48.8557,
    longitude: 2.3562,
    importance: 0.98,
    keywords: ["rue de rivoli", "rivoli"],
  },
  {
    label: "5 Rue de Rivoli, 75001 Paris",
    subtitle: "Paris 1er · Hôtel de Ville",
    latitude: 48.8601,
    longitude: 2.3419,
    importance: 0.94,
    keywords: ["rue de rivoli", "rivoli"],
  },
  {
    label: "Place de la République, 75003 Paris",
    subtitle: "Paris 3e / 10e / 11e",
    latitude: 48.8675,
    longitude: 2.3633,
    importance: 0.99,
    keywords: ["place de la république", "place de la republique", "république", "republique"],
  },
  {
    label: "1 Place de la République, 75003 Paris",
    subtitle: "Paris 3e · angle nord",
    latitude: 48.8672,
    longitude: 2.3646,
    importance: 0.92,
    keywords: ["place de la république", "place de la republique", "république", "republique"],
  },
  {
    label: "29 Boulevard Voltaire, 75011 Paris",
    subtitle: "Paris 11e · Oberkampf",
    latitude: 48.8619,
    longitude: 2.3778,
    importance: 0.87,
    keywords: ["voltaire", "boulevard voltaire"],
  },
  {
    label: "10 Avenue de la République, 75011 Paris",
    subtitle: "Paris 11e · République",
    latitude: 48.8653,
    longitude: 2.3768,
    importance: 0.89,
    keywords: ["avenue de la république", "avenue de la republique", "république", "republique"],
  },
  {
    label: "21 Rue du Temple, 75004 Paris",
    subtitle: "Paris 4e · Marais",
    latitude: 48.8609,
    longitude: 2.3561,
    importance: 0.84,
    keywords: ["rue du temple", "temple"],
  },
  {
    label: "3 Rue de Turbigo, 75001 Paris",
    subtitle: "Paris 1er · Sentier",
    latitude: 48.8648,
    longitude: 2.3461,
    importance: 0.83,
    keywords: ["turbigo", "rue de turbigo"],
  },
  {
    label: "1 Boulevard de Sébastopol, 75001 Paris",
    subtitle: "Paris 1er / 2e",
    latitude: 48.8629,
    longitude: 2.3496,
    importance: 0.82,
    keywords: ["sébastopol", "sebastopol", "boulevard de sebastopol", "boulevard de sébastopol"],
  },
  {
    label: "25 Quai de la Tournelle, 75005 Paris",
    subtitle: "Paris 5e · Seine",
    latitude: 48.8507,
    longitude: 2.3513,
    importance: 0.81,
    keywords: ["quai de la tournelle", "tournelle"],
  },
];

function normalizeSearchText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function searchLocalGreaterParisAddressSuggestions(
  query: string,
  limit = 6,
): GreaterParisAddressSuggestion[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) {
    return [];
  }

  const scored = LOCAL_GREATER_PARIS_ADDRESS_SUGGESTIONS.map((item) => {
    const normalizedLabel = normalizeSearchText(item.label);
    const normalizedSubtitle = normalizeSearchText(item.subtitle);
    const matchesKeyword = item.keywords.some((keyword) =>
      normalizedQuery.includes(normalizeSearchText(keyword)) ||
      normalizeSearchText(keyword).includes(normalizedQuery),
    );
    const startsWith = normalizedLabel.startsWith(normalizedQuery) ? 4 : 0;
    const contains = normalizedLabel.includes(normalizedQuery) ? 2 : 0;
    const subtitleMatch = normalizedSubtitle.includes(normalizedQuery) ? 1 : 0;
    const keywordScore = matchesKeyword ? 3 : 0;
    const score = startsWith + contains + subtitleMatch + keywordScore;
    return { ...item, score };
  })
    .filter((item) => item.score > 0)
    .sort((left, right) =>
      right.score === left.score
        ? right.importance - left.importance
        : right.score - left.score,
    )
  .slice(0, Math.max(1, Math.min(8, Math.trunc(limit) || 1)));

  return scored.map((entry) => {
    const { score, keywords, ...item } = entry;
    void score;
    void keywords;
    return item;
  });
}

export type NominatimAddress = {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  footway?: string;
  cycleway?: string;
  path?: string;
  place?: string;
  suburb?: string;
  village?: string;
  town?: string;
  city?: string;
  municipality?: string;
  postcode?: string;
  state?: string;
  country?: string;
};

export type NominatimSearchResult = {
  lat?: string;
  lon?: string;
  display_name?: string;
  importance?: number;
  address?: NominatimAddress;
};

function cleanLabelPart(value: string | undefined): string {
  return value?.trim().replace(/\s+/g, " ") ?? "";
}

export function formatGreaterParisAddressLabel(
  result: NominatimSearchResult,
): string {
  const address = result.address;
  if (!address) {
    return cleanLabelPart(result.display_name) || "Adresse sans libellé";
  }

  const streetName =
    cleanLabelPart(address.road) ||
    cleanLabelPart(address.pedestrian) ||
    cleanLabelPart(address.footway) ||
    cleanLabelPart(address.cycleway) ||
    cleanLabelPart(address.path) ||
    cleanLabelPart(address.place);
  const number = cleanLabelPart(address.house_number);
  const city =
    cleanLabelPart(address.city) ||
    cleanLabelPart(address.town) ||
    cleanLabelPart(address.municipality) ||
    cleanLabelPart(address.village) ||
    cleanLabelPart(address.suburb);
  const postcode = cleanLabelPart(address.postcode);

  const firstLine = [number, streetName].filter(Boolean).join(" ").trim();
  const cityLine = [postcode, city].filter(Boolean).join(" ").trim();

  if (firstLine && cityLine) {
    return `${firstLine}, ${cityLine}`;
  }
  if (firstLine) {
    return firstLine;
  }
  if (cityLine) {
    return cityLine;
  }

  return cleanLabelPart(result.display_name) || "Adresse sans libellé";
}

export function formatGreaterParisAddressSubtitle(
  result: NominatimSearchResult,
): string {
  const address = result.address;
  if (!address) {
    return "Adresse exacte";
  }

  const city =
    cleanLabelPart(address.city) ||
    cleanLabelPart(address.town) ||
    cleanLabelPart(address.municipality) ||
    cleanLabelPart(address.village) ||
    cleanLabelPart(address.suburb);
  const state = cleanLabelPart(address.state);
  const parts = [city, state].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : "Adresse exacte";
}

export function parseNominatimCoordinates(
  result: unknown,
): { latitude: number; longitude: number } | null {
  if (!result || typeof result !== "object") {
    return null;
  }

  const candidate = result as { lat?: unknown; lon?: unknown };
  const latitude = Number(candidate.lat);
  const longitude = Number(candidate.lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return { latitude, longitude };
}

export function isWithinGreaterParisBounds(
  latitude: number,
  longitude: number,
): boolean {
  return (
    latitude >= GREATER_PARIS_BOUNDS.south &&
    latitude <= GREATER_PARIS_BOUNDS.north &&
    longitude >= GREATER_PARIS_BOUNDS.west &&
    longitude <= GREATER_PARIS_BOUNDS.east
  );
}

export type AreaType = "paris" | "petite_couronne" | "grande_couronne";

export interface Department {
  code: string;
  name: string;
  areaType: AreaType;
  communes: string[];
}

const DEPARTMENTS: Department[] = [
  {
    code: "75",
    name: "Paris",
    areaType: "paris",
    communes: [
      "1er arrondissement",
      "2e arrondissement",
      "3e arrondissement",
      "4e arrondissement",
      "5e arrondissement",
      "6e arrondissement",
      "7e arrondissement",
      "8e arrondissement",
      "9e arrondissement",
      "10e arrondissement",
      "11e arrondissement",
      "12e arrondissement",
      "13e arrondissement",
      "14e arrondissement",
      "15e arrondissement",
      "16e arrondissement",
      "17e arrondissement",
      "18e arrondissement",
      "19e arrondissement",
      "20e arrondissement",
    ],
  },
  {
    code: "92",
    name: "Hauts-de-Seine",
    areaType: "petite_couronne",
    communes: [
      "Antony",
      "Asnières-sur-Seine",
      "Bagneux",
      "Boulogne-Billancourt",
      "Bourg-la-Reine",
      "Châtenay-Malabry",
      "Chaville",
      "Châtillon",
      "Clamart",
      "Clichy",
      "Colombes",
      "Courbevoie",
      "Fontenay-aux-Roses",
      "Garches",
      "Issy-les-Moulineaux",
      "La Garenne-Colombes",
      "Le Plessis-Robinson",
      "Levallois-Perret",
      "Malakoff",
      "Marnes-la-Coquette",
      "Meudon",
      "Montrouge",
      "Nanterre",
      "Neuilly-sur-Seine",
      "Puteaux",
      "Rueil-Malmaison",
      "Saint-Cloud",
      "Suresnes",
      "Vanves",
      "Vaucresson",
      "Ville-d'Avray",
    ],
  },
  {
    code: "93",
    name: "Seine-Saint-Denis",
    areaType: "petite_couronne",
    communes: [
      "Aubervilliers",
      "Aulnay-sous-Bois",
      "Bagnolet",
      "Bobigny",
      "Bondy",
      "Le Bourget",
      "Clichy-sous-Bois",
      "Coubron",
      "La Courneuve",
      "Drancy",
      "Dugny",
      "Épinay-sur-Seine",
      "Gagny",
      "Gournay-sur-Marne",
      "Le Raincy",
      "Les Lilas",
      "Le Pré-Saint-Gervais",
      "Montreuil",
      "Noisy-le-Grand",
      "Noisy-le-Sec",
      "Pantin",
      "Pierrefitte-sur-Seine",
      "Romainville",
      "Rosny-sous-Bois",
      "Saint-Denis",
      "Saint-Ouen-sur-Seine",
      "Sevran",
      "Stains",
      "Tremblay-en-France",
      "Villemomble",
      "Villeneuve-la-Garenne",
    ],
  },
  {
    code: "94",
    name: "Val-de-Marne",
    areaType: "petite_couronne",
    communes: [
      "Alfortville",
      "Arcueil",
      "Boissy-Saint-Léger",
      "Bry-sur-Marne",
      "Cachan",
      "Champigny-sur-Marne",
      "Charenton-le-Pont",
      "Chennevières-sur-Marne",
      "Chevilly-Larue",
      "Choisy-le-Roi",
      "Créteil",
      "Fresnes",
      "Gentilly",
      "Ivry-sur-Seine",
      "Joinville-le-Pont",
      "Le Kremlin-Bicêtre",
      "Limeil-Brévannes",
      "Maisons-Alfort",
      "Mandres-les-Roses",
      "Marolles-en-Brie",
      "Nogent-sur-Marne",
      "Orly",
      "Ormesson-sur-Marne",
      "Le Perreux-sur-Marne",
      "Périgny",
      "Saint-Mandé",
      "Saint-Maur-des-Fossés",
      "Saint-Maurice",
      "Sucy-en-Brie",
      "Thiais",
      "Valenton",
      "Villecresnes",
      "Villejuif",
      "Villeneuve-le-Roi",
      "Villeneuve-Saint-Georges",
      "Vincennes",
      "Vitry-sur-Seine",
    ],
  },
  {
    code: "77",
    name: "Seine-et-Marne",
    areaType: "grande_couronne",
    communes: [
      "Avon",
      "Brie-Comte-Robert",
      "Castres",
      "Champagne-sur-Seine",
      "Chelles",
      "Compiègne",
      "Coulommiers",
      "Dammarie-lès-Lys",
      "Fontainebleau",
      "Lagny-sur-Marne",
      "Melun",
      "Meaux",
      "Montereau-Fault-Yonne",
      "Nemours",
      "Ozoir-la-Ferrière",
      "Pontault-Combault",
      "Provins",
      "Saint-Fargeau-Ponthierry",
      "Savigny-le-Temple",
      "Torcy",
      "Vaux-le-Pénil",
      "Villeparisis",
    ],
  },
  {
    code: "78",
    name: "Yvelines",
    areaType: "grande_couronne",
    communes: [
      "Achères",
      "Bougival",
      "Chatou",
      "Conflans-Sainte-Honorine",
      "Houilles",
      "Le Chesnay-Rocquencourt",
      "Le Pecq",
      "Les Mureaux",
      "Maisons-Laffitte",
      "Mantes-la-Jolie",
      "Montesson",
      "Plaisir",
      "Poissy",
      "Rambouillet",
      "Saint-Germain-en-Laye",
      "Sartrouville",
      "Trappes",
      "Versailles",
      "Viry-Châtillon",
      "Yvelines",
    ],
  },
  {
    code: "91",
    name: "Essonne",
    areaType: "grande_couronne",
    communes: [
      "Arpajon",
      "Athis-Mons",
      "Brétigny-sur-Orge",
      "Corbeil-Essonnes",
      "Draveil",
      "Épinay-sur-Orge",
      "Étampes",
      "Évry-Courcouronnes",
      "Gif-sur-Yvette",
      "Grigny",
      "Longjumeau",
      "Massy",
      "Morsang-sur-Orge",
      "Palaiseau",
      "Ris-Orangis",
      "Sainte-Geneviève-des-Bois",
      "Saint-Michel-sur-Orge",
      "Savigny-sur-Orge",
      "Vigneux-sur-Seine",
      "Viry-sur-Orge",
    ],
  },
  {
    code: "95",
    name: "Val-d'Oise",
    areaType: "grande_couronne",
    communes: [
      "Argenteuil",
      "Beauchamp",
      "Bezons",
      "Cergy",
      "Cormeilles-en-Parisis",
      "Deuil-la-Barre",
      "Domont",
      "Eaubonne",
      "Enghien-les-Bains",
      "Eragny",
      "Ermont",
      "Franconville",
      "Garges-lès-Gonesse",
      "Gonesse",
      "Goussainville",
      "Herblay-sur-Seine",
      "L'Isle-Adam",
      "Jouy-le-Moutier",
      "Montmorency",
      "Osny",
      "Pontoise",
      "Saint-Brice-sous-Forêt",
      "Saint-Gratien",
      "Saint-Ouen-l'Aumône",
      "Sannois",
      "Sartrouville",
      "Soisy-sous-Montmorency",
      "Taverny",
      "Vauréal",
    ],
  },
];

export const ALL_DEPARTMENTS = DEPARTMENTS;

export const ALL_ZONES = DEPARTMENTS.flatMap((dept) =>
  dept.communes.map((name) => ({
    name,
    department: dept.code,
    departmentName: dept.name,
    areaType: dept.areaType,
  }))
);

export function getZonesByAreaType(areaType: AreaType) {
  return ALL_ZONES.filter((z) => z.areaType === areaType);
}

export function getZonesByDepartment(departmentCode: string) {
  return ALL_ZONES.filter((z) => z.department === departmentCode);
}

export function getDepartmentByCode(code: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.code === code);
}

export function isGreaterParisZone(name: string): boolean {
  const normalized = name.toLowerCase();
  return ALL_ZONES.some(
    (z) => z.name.toLowerCase() === normalized || z.name.toLowerCase().includes(normalized)
  );
}

export function findZoneByName(name: string) {
  const normalized = name.toLowerCase();
  return (
    ALL_ZONES.find(
      (z) => z.name.toLowerCase() === normalized || z.name.toLowerCase().includes(normalized)
    ) || null
  );
}

export function extractZoneFromLabel(label: string) {
  const found = ALL_ZONES.find((z) => {
    const normalizedLabel = label.toLowerCase();
    const normalizedZone = z.name.toLowerCase();
    return normalizedLabel.includes(normalizedZone) || normalizedZone.includes(normalizedLabel);
  });
  return found || null;
}

export function getAreaTypeLabel(areaType: AreaType): string {
  const labels: Record<AreaType, string> = {
    paris: "Paris intra-muros",
    petite_couronne: "Petite couronne (92, 93, 94)",
    grande_couronne: "Grande couronne (77, 78, 91, 95)",
  };
  return labels[areaType];
}

export function getZonesForNotification(zoneName: string): string[] {
  const zone = findZoneByName(zoneName);
  if (!zone) return [];

  const deptZones = getZonesByDepartment(zone.department);
  return deptZones.map((z) => z.name);
}
