import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";

export type AnnuaireGraphNode = AnnuaireEntry & {
  x: number;
  y: number;
  size: number;
};

export type AnnuaireGraphLink = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
};

export function buildAnnuaireGraphNodes(entries: AnnuaireEntry[]): AnnuaireGraphNode[] {
  return entries.slice(0, 40).map((entry, index) => {
    const hash = entry.name.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return {
      ...entry,
      x: 15 + (hash % 70) + Math.sin(index) * 5,
      y: 15 + ((hash * 7) % 70) + Math.cos(index) * 5,
      size: 40 + (hash % 40),
    };
  });
}

export function buildAnnuaireGraphLinks(nodes: AnnuaireGraphNode[]): AnnuaireGraphLink[] {
  const links: AnnuaireGraphLink[] = [];
  for (let firstIndex = 0; firstIndex < nodes.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nodes.length; secondIndex += 1) {
      const first = nodes[firstIndex];
      const second = nodes[secondIndex];
      if (!first || !second) continue;
      if (!first.tags?.some((tag) => second.tags?.includes(tag))) continue;
      links.push({ id: `${first.id}-${second.id}`, x1: first.x, y1: first.y, x2: second.x, y2: second.y });
    }
  }
  return links.slice(0, 60);
}

export function annuaireGraphColorClass(type: string) {
  switch (type) {
    case "humanitaire":
      return "fill-fuchsia-500 stroke-fuchsia-300";
    case "environnemental":
    case "social":
      return "fill-violet-500 stroke-violet-300";
    default:
      return "fill-violet-500 stroke-violet-400";
  }
}
