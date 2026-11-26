import type { GeoNetworkIncidentRelation } from "./annuaire-geo-network.model";
import type { PublicCleanlinessOrganizationRelation } from "@/lib/partners/public-cleanliness-organization";

export function getNetworkNeighbourhood(selected: string | null, edges: readonly GeoNetworkIncidentRelation[], depth: 1 | 2): Set<string> {
  const seen = new Set<string>();
  if (!selected) return seen;
  seen.add(selected);
  let frontier = [selected];
  const adjacent = new Map<string, Set<string>>();
  for (const edge of edges) {
    const a = edge.fromEntity.id, b = edge.toEntity.id;
    if (a === b) continue;
    for (const [from, to] of [[a,b],[b,a]]) {
      const peers = adjacent.get(from) ?? new Set<string>();
      peers.add(to);
      adjacent.set(from, peers);
    }
  }
  for (let i=0; i<depth; i++) {
    const next: string[] = [];
    for (const id of frontier) for (const peer of adjacent.get(id) ?? []) {
      if (!seen.has(peer)) { seen.add(peer); next.push(peer); }
    }
    frontier = next;
  }
  return seen;
}
export function getInstitutionalAncestors(id: string|null, edges: readonly PublicCleanlinessOrganizationRelation[]): Set<string> {
  const parents = new Map(edges.filter(edge=>edge.kind==="hierarchy").map(edge=>[edge.to,edge.from]));
  const result = new Set<string>();
  let current = id;
  while (current && !result.has(current)) { result.add(current); current=parents.get(current)??null; }
  return result;
}
export function countInstitutionalDescendants(id:string, children:ReadonlyMap<string,readonly string[]>, included:ReadonlySet<string>):number{
  const seen = new Set([id]), stack = [...(children.get(id)??[])];
  while (stack.length) {
    const child = stack.pop()!;
    if (seen.has(child)||!included.has(child)) continue;
    seen.add(child); stack.push(...(children.get(child)??[]));
  }
  return seen.size-1;
}
type Badge = { id:string; x:number; y:number; diameter:number; selected:boolean };
/** Stable, bounded screen-space displacement. Never move the ground pin. */
export function separateNetworkBadges(badges:readonly Badge[], width:number,height:number): Map<string,{x:number;y:number}> {
  const placed: Badge[] = [];
  const result = new Map<string,{x:number;y:number}>();
  for (const badge of [...badges].sort((a,b)=>Number(b.selected)-Number(a.selected)||a.id.localeCompare(b.id))) {
    let chosen = {x:badge.x,y:badge.y};
    const fits = (x:number,y:number) => x>=badge.diameter/2 && y>=badge.diameter/2 && x<=width-badge.diameter/2 && y<=height-badge.diameter/2 && placed.every(other=>Math.hypot(x-other.x,y-other.y)>=(badge.diameter+other.diameter)/2+8);
    if (!fits(chosen.x,chosen.y)) {
      let found=false;
      for (const ring of [1,2,3]) {
        for (let i=0;i<8;i++) {
          const angle=i*Math.PI/4, radius=ring*(badge.diameter+10);
          const x=badge.x+Math.cos(angle)*radius,y=badge.y+Math.sin(angle)*radius;
          if (fits(x,y)) {chosen={x,y}; found=true; break;}
        }
        if (found) break;
      }
    }
    placed.push({...badge,...chosen});
    result.set(badge.id,chosen);
  }
  return result;
}
