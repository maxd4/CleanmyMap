import { parseRosterFile, type SpogomiRosterPreviewOptions } from "./preparation-import";
import type { SpogomiRosterColumnMapping, SpogomiRosterPreview, SpogomiTeamFormation } from "./types";

export async function previewRosterFile(file: File, mappingOrOptions?: SpogomiRosterColumnMapping | SpogomiRosterPreviewOptions): Promise<SpogomiRosterPreview> {
  return parseRosterFile(file, mappingOrOptions);
}

export function buildDeterministicTeamFormation(input: {
  participants: Array<{ id: string; sourceOrder: number; groupPreference: string | null }>;
  mode: "casual" | "world_cup";
  casualTeamSize: number | null;
  casualTeamBounds?: { minMembers: number | null; maxMembers: number | null };
}): SpogomiTeamFormation {
  const casualMin = input.casualTeamBounds?.minMembers ?? input.casualTeamSize;
  const casualMax = input.casualTeamBounds?.maxMembers ?? input.casualTeamSize;
  const minMembers = input.mode === "world_cup" ? 3 : casualMin;
  const maxMembers = input.mode === "world_cup" ? 3 : casualMax;
  if (!maxMembers || maxMembers < 1 || (minMembers !== null && minMembers !== undefined && minMembers < 1) || (minMembers !== null && minMembers !== undefined && minMembers > maxMembers)) {
    return {
      teams: [],
      unassignedParticipantIds: input.participants.map(({ id }) => id),
      reasons: Object.fromEntries(input.participants.map(({ id }) => [id, "team_size_required"])),
      explanation: ["La configuration de taille d'équipe est incomplète ou incohérente."],
    };
  }
  const effectiveMinMembers = minMembers ?? 1;
  const sorted = [...input.participants].sort((a, b) => a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id));
  const groups = new Map<string, typeof sorted>();
  const ungrouped: typeof sorted = [];
  for (const participant of sorted) {
    const key = participant.groupPreference?.trim().toLocaleLowerCase("fr-FR");
    if (key) groups.set(key, [...(groups.get(key) ?? []), participant]);
    else ungrouped.push(participant);
  }
  const remainder: typeof sorted = [];
  const teams: SpogomiTeamFormation["teams"] = [];
  const unassigned: string[] = [];
  const reasons: SpogomiTeamFormation["reasons"] = {};
  const explanation: string[] = [];
  const addTeam = (members: typeof sorted, reason: "same_order_trio" | "remainder_repacked") => {
    teams.push({ draftKey: `team-${teams.length + 1}`, teamNumber: teams.length + 1, participantIds: members.map(({ id }) => id), compositionState: "draft", explanation: reason });
  };
  for (const group of groups.values()) {
    let offset = 0;
    while (offset + 3 <= group.length && effectiveMinMembers <= 3 && maxMembers >= 3) {
      addTeam(group.slice(offset, offset + 3), "same_order_trio");
      offset += 3;
    }
    remainder.push(...group.slice(offset));
  }
  remainder.push(...ungrouped);
  const allowedSizes = Array.from({ length: maxMembers }, (_, index) => index + 1).filter((size) => size >= effectiveMinMembers && (input.mode === "world_cup" ? size === 3 : true));
  const preferredSizes = allowedSizes.sort((a, b) => {
    const preference = (size: number) => (size === 3 ? 0 : size === 4 ? 1 : size === 2 ? 2 : 3);
    return preference(a) - preference(b) || a - b;
  });
  const best: Array<{ trios: number; teamCount: number; sizes: number[] } | undefined> = [{ trios: 0, teamCount: 0, sizes: [] }];
  const better = (candidate: { trios: number; teamCount: number; sizes: number[] }, current: { trios: number; teamCount: number; sizes: number[] }) => {
    if (candidate.trios !== current.trios) return candidate.trios > current.trios;
    if (candidate.teamCount !== current.teamCount) return candidate.teamCount < current.teamCount;
    const ranks = (size: number) => preferredSizes.indexOf(size);
    for (let index = 0; index < Math.min(candidate.sizes.length, current.sizes.length); index += 1) {
      if (ranks(candidate.sizes[index]) !== ranks(current.sizes[index])) return ranks(candidate.sizes[index]) < ranks(current.sizes[index]);
    }
    return candidate.sizes.length < current.sizes.length;
  };
  for (let count = 1; count <= remainder.length; count += 1) {
    for (const size of preferredSizes) {
      if (size > count || !best[count - size]) continue;
      const previous = best[count - size] as { trios: number; teamCount: number; sizes: number[] };
      const candidate = { trios: previous.trios + (size === 3 ? 1 : 0), teamCount: previous.teamCount + 1, sizes: [...previous.sizes, size] };
      if (!best[count] || better(candidate, best[count] as { trios: number; teamCount: number; sizes: number[] })) best[count] = candidate;
    }
  }
  let assignedRemainder = remainder.length;
  while (assignedRemainder > 0 && !best[assignedRemainder]) assignedRemainder -= 1;
  const selected = assignedRemainder ? best[assignedRemainder] : undefined;
  let remainderOffset = 0;
  for (const size of selected?.sizes ?? []) {
    addTeam(remainder.slice(remainderOffset, remainderOffset + size), "remainder_repacked");
    remainderOffset += size;
  }
  for (const participant of remainder.slice(remainderOffset)) {
    unassigned.push(participant.id);
    reasons[participant.id] = input.mode === "world_cup" ? "incomplete_team" : "casual_bounds_no_fit";
  }
  if (teams.length) explanation.push(`Proposition déterministe : ${teams.filter((team) => team.explanation === "same_order_trio").length} trio(s) conservé(s) par commande/groupe.`);
  if (selected?.sizes.length) explanation.push(`Les restes sont regroupés selon les bornes de l'événement : ${selected.sizes.join(" + ")}.`);
  if (unassigned.length) explanation.push(`${unassigned.length} place(s) restent en attente car aucune équipe conforme ne peut être formée.`);
  return { teams, unassignedParticipantIds: unassigned, reasons, explanation };
}
