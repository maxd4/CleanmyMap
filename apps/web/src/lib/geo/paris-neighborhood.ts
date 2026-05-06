import {
  ALL_ZONES,
  getZonesByDepartment,
  type AreaType,
} from "./greater-paris";

export interface District {
  number: number;
  name: string;
  adjacentSuburbs: string[];
}

export interface Zone {
  name: string;
  department: string;
  departmentName: string;
  areaType: AreaType;
  adjacentZones: string[];
}

const SUBURBS_BY_BORDER_DISTRICT: Record<number, string[]> = {
  1: ["Neuilly-sur-Seine", "Levallois-Perret"],
  2: ["Neuilly-sur-Seine", "Levallois-Perret", "Courbevoie"],
  3: ["Montreuil", "Les Lilas", "Bagnolet", "Le Pré-Saint-Gervais"],
  4: ["Montreuil", "Vincennes", "Saint-Mandé"],
  5: ["Gentilly", "Le Kremlin-Bicêtre", "Arcueil"],
  6: ["Gentilly", "Montrouge", "Vanves", "Issy-les-Moulineaux"],
  7: ["Issy-les-Moulineaux", "Vanves", "Malakoff"],
  8: ["Neuilly-sur-Seine", "Levallois-Perret", "Courbevoie", "Puteaux"],
  9: ["Levallois-Perret", "Courbevoie", "Clichy"],
  10: ["Saint-Denis", "Aubervilliers", "La Courneuve", "Pantin"],
  11: ["Montreuil", "Bagnolet", "Les Lilas", "Le Pré-Saint-Gervais"],
  12: ["Vincennes", "Saint-Mandé", "Charenton-le-Pont", "Saint-Maurice"],
  13: ["Gentilly", "Le Kremlin-Bicêtre", "Ivry-sur-Seine", "Vitry-sur-Seine"],
  14: ["Gentilly", "Montrouge", "Vanves", "Issy-les-Moulineaux", "Malakoff"],
  15: ["Issy-les-Moulineaux", "Vanves", "Malakoff", "Boulogne-Billancourt"],
  16: ["Neuilly-sur-Seine", "Boulogne-Billancourt", "Puteaux", "Suresnes", "Rueil-Malmaison"],
  17: ["Neuilly-sur-Seine", "Levallois-Perret", "Clichy", "Saint-Ouen-sur-Seine"],
  18: ["Saint-Denis", "Aubervilliers", "La Courneuve", "Saint-Ouen-sur-Seine", "Clichy"],
  19: ["Aubervilliers", "La Courneuve", "Pantin", "Bobigny", "Bondy"],
  20: ["Montreuil", "Bagnolet", "Pantin", "Bobigny", "Noisy-le-Sec"],
};

export const PARIS_DISTRICTS: District[] = Array.from({ length: 20 }, (_, i) => ({
  number: i + 1,
  name: `${i + 1}er arrondissement`,
  adjacentSuburbs: SUBURBS_BY_BORDER_DISTRICT[i + 1] || [],
}));

const NEIGHBOR_MATRIX: Record<string, string[]> = {
  "1er arrondissement": ["2e arrondissement", "4e arrondissement", "9e arrondissement"],
  "2e arrondissement": ["1er arrondissement", "3e arrondissement", "4e arrondissement", "9e arrondissement", "10e arrondissement"],
  "3e arrondissement": ["2e arrondissement", "4e arrondissement", "10e arrondissement", "11e arrondissement"],
  "4e arrondissement": ["1er arrondissement", "2e arrondissement", "3e arrondissement", "5e arrondissement", "11e arrondissement", "12e arrondissement"],
  "5e arrondissement": ["4e arrondissement", "6e arrondissement", "13e arrondissement", "14e arrondissement"],
  "6e arrondissement": ["5e arrondissement", "7e arrondissement", "14e arrondissement", "15e arrondissement"],
  "7e arrondissement": ["6e arrondissement", "8e arrondissement", "15e arrondissement", "16e arrondissement"],
  "8e arrondissement": ["7e arrondissement", "9e arrondissement", "16e arrondissement", "17e arrondissement"],
  "9e arrondissement": ["1er arrondissement", "2e arrondissement", "8e arrondissement", "10e arrondissement", "17e arrondissement", "18e arrondissement"],
  "10e arrondissement": ["2e arrondissement", "3e arrondissement", "9e arrondissement", "11e arrondissement", "18e arrondissement", "19e arrondissement"],
  "11e arrondissement": ["3e arrondissement", "4e arrondissement", "10e arrondissement", "12e arrondissement", "19e arrondissement", "20e arrondissement"],
  "12e arrondissement": ["4e arrondissement", "11e arrondissement", "13e arrondissement", "20e arrondissement"],
  "13e arrondissement": ["5e arrondissement", "12e arrondissement", "14e arrondissement"],
  "14e arrondissement": ["5e arrondissement", "6e arrondissement", "13e arrondissement", "15e arrondissement"],
  "15e arrondissement": ["6e arrondissement", "7e arrondissement", "14e arrondissement", "16e arrondissement"],
  "16e arrondissement": ["7e arrondissement", "8e arrondissement", "15e arrondissement", "17e arrondissement"],
  "17e arrondissement": ["8e arrondissement", "9e arrondissement", "16e arrondissement", "18e arrondissement"],
  "18e arrondissement": ["9e arrondissement", "10e arrondissement", "17e arrondissement", "19e arrondissement"],
  "19e arrondissement": ["10e arrondissement", "11e arrondissement", "18e arrondissement", "20e arrondissement"],
  "20e arrondissement": ["11e arrondissement", "12e arrondissement", "19e arrondissement"],
  "Neuilly-sur-Seine": ["Levallois-Perret", "Courbevoie", "16e arrondissement", "17e arrondissement"],
  "Levallois-Perret": ["Neuilly-sur-Seine", "Courbevoie", "Clichy", "17e arrondissement", "9e arrondissement"],
  "Courbevoie": ["Neuilly-sur-Seine", "Levallois-Perret", "Puteaux", "2e arrondissement", "8e arrondissement", "9e arrondissement"],
  "Puteaux": ["Courbevoie", "Suresnes", "Rueil-Malmaison", "16e arrondissement"],
  "Suresnes": ["Puteaux", "Rueil-Malmaison", "16e arrondissement"],
  "Rueil-Malmaison": ["Suresnes", "Puteaux", "16e arrondissement"],
  "Boulogne-Billancourt": ["Issy-les-Moulineaux", "15e arrondissement", "16e arrondissement"],
  "Issy-les-Moulineaux": ["Boulogne-Billancourt", "Vanves", "Malakoff", "15e arrondissement", "14e arrondissement", "6e arrondissement", "7e arrondissement"],
  "Vanves": ["Issy-les-Moulineaux", "Malakoff", "14e arrondissement", "15e arrondissement"],
  "Malakoff": ["Vanves", "Issy-les-Moulineaux", "14e arrondissement"],
  "Montrouge": ["Gentilly", "Arcueil", "14e arrondissement", "13e arrondissement"],
  "Gentilly": ["Montrouge", "Arcueil", "Le Kremlin-Bicêtre", "14e arrondissement", "13e arrondissement", "5e arrondissement"],
  "Arcueil": ["Gentilly", "Montrouge", "Cachan", "14e arrondissement", "13e arrondissement"],
  "Cachan": ["Arcueil", "Villejuif", "L'Haÿ-les-Roses", "14e arrondissement"],
  "Le Kremlin-Bicêtre": ["Gentilly", "Ivry-sur-Seine", "Villejuif", "13e arrondissement"],
  "Ivry-sur-Seine": ["Le Kremlin-Bicêtre", "Vitry-sur-Seine", "Villejuif", "13e arrondissement"],
  "Vitry-sur-Seine": ["Ivry-sur-Seine", "Villejuif", "Choisy-le-Roi", "13e arrondissement"],
  "Villejuif": ["Ivry-sur-Seine", "Vitry-sur-Seine", "Le Kremlin-Bicêtre", "Cachan", "13e arrondissement", "14e arrondissement"],
  "Montreuil": ["Bagnolet", "Les Lilas", "Le Pré-Saint-Gervais", "11e arrondissement", "20e arrondissement"],
  "Bagnolet": ["Montreuil", "Les Lilas", "Le Pré-Saint-Gervais", "Pantin", "20e arrondissement", "11e arrondissement"],
  "Les Lilas": ["Montreuil", "Bagnolet", "Le Pré-Saint-Gervais", "11e arrondissement", "20e arrondissement"],
  "Le Pré-Saint-Gervais": ["Les Lilas", "Bagnolet", "Pantin", "11e arrondissement", "19e arrondissement", "20e arrondissement"],
  "Saint-Denis": ["Aubervilliers", "La Courneuve", "18e arrondissement", "10e arrondissement"],
  "Aubervilliers": ["Saint-Denis", "La Courneuve", "Pantin", "18e arrondissement", "10e arrondissement", "19e arrondissement"],
  "La Courneuve": ["Saint-Denis", "Aubervilliers", "Pantin", "18e arrondissement", "10e arrondissement", "19e arrondissement"],
  "Pantin": ["Aubervilliers", "La Courneuve", "Le Pré-Saint-Gervais", "Bobigny", "19e arrondissement", "20e arrondissement"],
  "Bobigny": ["Pantin", "Bondy", "Noisy-le-Sec", "Drancy", "19e arrondissement", "20e arrondissement"],
  "Bondy": ["Bobigny", "Noisy-le-Sec", "19e arrondissement", "20e arrondissement"],
  "Noisy-le-Sec": ["Bobigny", "Bondy", "Montreuil", "20e arrondissement"],
  "Vincennes": ["Saint-Mandé", "Charenton-le-Pont", "12e arrondissement", "4e arrondissement"],
  "Saint-Mandé": ["Vincennes", "Charenton-le-Pont", "12e arrondissement"],
  "Charenton-le-Pont": ["Saint-Mandé", "Saint-Maurice", "Vincennes", "12e arrondissement"],
  "Saint-Maurice": ["Charenton-le-Pont", "12e arrondissement"],
};

function buildAllZones(): Zone[] {
  return ALL_ZONES.map((z) => {
    const neighbors = NEIGHBOR_MATRIX[z.name] || [];
    const deptZones = getZonesByDepartment(z.department);
    const deptNeighbors = deptZones
      .filter((dz) => dz.name !== z.name)
      .map((dz) => dz.name);
    const allNeighbors = [...new Set([...neighbors, ...deptNeighbors])];
    return {
      name: z.name,
      department: z.department,
      departmentName: z.departmentName,
      areaType: z.areaType,
      adjacentZones: allNeighbors,
    };
  });
}

export const ALL_NEIGHBORHOODS = buildAllZones();

export function getNeighbors(zoneName: string): string[] {
  const zone = ALL_NEIGHBORHOODS.find(
    (z) => z.name.toLowerCase() === zoneName.toLowerCase()
  );
  return zone?.adjacentZones || [];
}

export function findZoneWithNeighbors(name: string): Zone | null {
  const normalized = name.toLowerCase();
  return ALL_NEIGHBORHOODS.find(
    (z) => z.name.toLowerCase() === normalized || z.name.toLowerCase().includes(normalized)
  ) || null;
}

export function getZonesInSameDepartment(zoneName: string): string[] {
  const zone = findZoneWithNeighbors(zoneName);
  if (!zone) return [];
  return getZonesByDepartment(zone.department).map((z) => z.name);
}

export function getBorderZones(): Zone[] {
  return ALL_NEIGHBORHOODS.filter((z) => z.adjacentZones.length > 0);
}

export function getZonesByType(type: AreaType): Zone[] {
  return ALL_NEIGHBORHOODS.filter((z) => z.areaType === type);
}

export function getBorderDistricts(): District[] {
  return PARIS_DISTRICTS.filter((d) => d.adjacentSuburbs.length > 0);
}

export function getSuburbsForDistrict(districtNumber: number): string[] {
  const district = PARIS_DISTRICTS.find((d) => d.number === districtNumber);
  return district?.adjacentSuburbs || [];
}

export function isBorderDistrict(districtNumber: number): boolean {
  const district = PARIS_DISTRICTS.find((d) => d.number === districtNumber);
  return (district?.adjacentSuburbs.length ?? 0) > 0;
}

export function getAllSuburbs(): string[] {
  const allSuburbs = new Set<string>();
  PARIS_DISTRICTS.forEach((d) => d.adjacentSuburbs.forEach((s) => allSuburbs.add(s)));
  return Array.from(allSuburbs).sort();
}

export function findDistrictByName(name: string): District | null {
  const normalized = name.toLowerCase();
  return (
    PARIS_DISTRICTS.find((d) => d.name.toLowerCase().includes(normalized)) ||
    PARIS_DISTRICTS.find((d) => d.number === parseInt(name, 10)) ||
    null
  );
}

export function isParisDistrict(name: string): boolean {
  return findDistrictByName(name) !== null;
}

export function isSuburb(name: string): boolean {
  return getAllSuburbs().some(
    (s) => s.toLowerCase() === name.toLowerCase()
  );
}

export function isGreaterParisZone(name: string): boolean {
  return findZoneWithNeighbors(name) !== null;
}

export function getAreaTypeForZone(name: string): AreaType | null {
  const zone = findZoneWithNeighbors(name);
  return zone?.areaType || null;
}

export function getDepartmentForZone(name: string): string | null {
  const zone = findZoneWithNeighbors(name);
  return zone?.department || null;
}

export function getDepartmentNameForZone(name: string): string | null {
  const zone = findZoneWithNeighbors(name);
  return zone?.departmentName || null;
}