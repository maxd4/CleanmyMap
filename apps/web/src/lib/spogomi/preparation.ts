import { parseRosterFile, type SpogomiRosterPreviewOptions } from "./preparation-import";
import type { SpogomiRosterColumnMapping, SpogomiRosterPreview, SpogomiTeamFormation } from "./types";
import { validateTeamComposition } from "./validation";

export async function previewRosterFile(file: File, mappingOrOptions?: SpogomiRosterColumnMapping | SpogomiRosterPreviewOptions): Promise<SpogomiRosterPreview> {
  return parseRosterFile(file, mappingOrOptions);
}

type FormationParticipant = { id: string; sourceOrder: number; groupPreference: string | null };
type FormationDraft = { trios: number; teamCount: number; sizes: number[] };

function invalidFormation(participants: FormationParticipant[]): SpogomiTeamFormation {
  return {
    teams: [],
    unassignedParticipantIds: participants.map(({ id }) => id),
    reasons: Object.fromEntries(participants.map(({ id }) => [id, "team_size_required"])),
    explanation: ["La configuration de taille d'équipe est incomplète ou incohérente."],
  };
}

function isFormationConfigInvalid(minMembers: number | null, maxMembers: number | null): boolean {
  return !maxMembers || maxMembers < 1 || (minMembers !== null && minMembers < 1) || (minMembers !== null && minMembers > maxMembers);
}

function sortFormationParticipants(participants: FormationParticipant[]): FormationParticipant[] {
  return [...participants].sort((a, b) => a.sourceOrder - b.sourceOrder || a.id.localeCompare(b.id));
}

function partitionFormationParticipants(sorted: FormationParticipant[]): { groups: Map<string, FormationParticipant[]>; ungrouped: FormationParticipant[] } {
  const groups = new Map<string, FormationParticipant[]>();
  const ungrouped: FormationParticipant[] = [];
  for (const participant of sorted) {
    const key = participant.groupPreference?.trim().toLocaleLowerCase("fr-FR");
    if (key) groups.set(key, [...(groups.get(key) ?? []), participant]);
    else ungrouped.push(participant);
  }
  return { groups, ungrouped };
}

function addFormationTeam(
  teams: SpogomiTeamFormation["teams"],
  members: FormationParticipant[],
  explanation: "same_order_trio" | "remainder_repacked",
): void {
  teams.push({ draftKey: `team-${teams.length + 1}`, teamNumber: teams.length + 1, participantIds: members.map(({ id }) => id), compositionState: "draft", explanation });
}

function preserveGroupTrios(
  groups: Map<string, FormationParticipant[]>,
  minMembers: number,
  maxMembers: number,
  teams: SpogomiTeamFormation["teams"],
): FormationParticipant[] {
  const remainder: FormationParticipant[] = [];
  for (const group of groups.values()) {
    let offset = 0;
    while (offset + 3 <= group.length && minMembers <= 3 && maxMembers >= 3) {
      addFormationTeam(teams, group.slice(offset, offset + 3), "same_order_trio");
      offset += 3;
    }
    remainder.push(...group.slice(offset));
  }
  return remainder;
}

function preferredFormationSizes(maxMembers: number, minMembers: number, mode: "casual" | "world_cup"): number[] {
  const allowed = Array.from({ length: maxMembers }, (_, index) => index + 1).filter((size) => size >= minMembers && (mode === "world_cup" ? size === 3 : true));
  const preference = (size: number) => (size === 3 ? 0 : size === 4 ? 1 : size === 2 ? 2 : 3);
  return allowed.sort((a, b) => preference(a) - preference(b) || a - b);
}

function isBetterFormation(candidate: FormationDraft, current: FormationDraft, preferredSizes: number[]): boolean {
  if (candidate.trios !== current.trios) return candidate.trios > current.trios;
  if (candidate.teamCount !== current.teamCount) return candidate.teamCount < current.teamCount;
  const ranks = (size: number) => preferredSizes.indexOf(size);
  for (let index = 0; index < Math.min(candidate.sizes.length, current.sizes.length); index += 1) {
    if (ranks(candidate.sizes[index]!) !== ranks(current.sizes[index]!)) return ranks(candidate.sizes[index]!) < ranks(current.sizes[index]!);
  }
  return candidate.sizes.length < current.sizes.length;
}

function chooseRemainderFormation(remainderLength: number, preferredSizes: number[]): number[] | undefined {
  const best: Array<FormationDraft | undefined> = [{ trios: 0, teamCount: 0, sizes: [] }];
  for (let count = 1; count <= remainderLength; count += 1) {
    for (const size of preferredSizes) {
      if (size > count || !best[count - size]) continue;
      const previous = best[count - size]!;
      const candidate = { trios: previous.trios + (size === 3 ? 1 : 0), teamCount: previous.teamCount + 1, sizes: [...previous.sizes, size] };
      if (!best[count] || isBetterFormation(candidate, best[count]!, preferredSizes)) best[count] = candidate;
    }
  }
  let assigned = remainderLength;
  while (assigned > 0 && !best[assigned]) assigned -= 1;
  return assigned ? best[assigned]?.sizes : undefined;
}

function appendRemainderFormation(
  remainder: FormationParticipant[],
  sizes: number[] | undefined,
  teams: SpogomiTeamFormation["teams"],
  unassigned: string[],
  reasons: SpogomiTeamFormation["reasons"],
  mode: "casual" | "world_cup",
): void {
  let offset = 0;
  for (const size of sizes ?? []) {
    addFormationTeam(teams, remainder.slice(offset, offset + size), "remainder_repacked");
    offset += size;
  }
  for (const participant of remainder.slice(offset)) {
    unassigned.push(participant.id);
    reasons[participant.id] = mode === "world_cup" ? "incomplete_team" : "casual_bounds_no_fit";
  }
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
  if (isFormationConfigInvalid(minMembers, maxMembers)) return invalidFormation(input.participants);
  const resolvedMaxMembers = maxMembers as number;
  const effectiveMinMembers = minMembers ?? 1;
  const { groups, ungrouped } = partitionFormationParticipants(sortFormationParticipants(input.participants));
  const remainder: FormationParticipant[] = [];
  const teams: SpogomiTeamFormation["teams"] = [];
  const unassigned: string[] = [];
  const reasons: SpogomiTeamFormation["reasons"] = {};
  const explanation: string[] = [];
  remainder.push(...preserveGroupTrios(groups, effectiveMinMembers, resolvedMaxMembers, teams));
  remainder.push(...ungrouped);
  const selectedSizes = chooseRemainderFormation(remainder.length, preferredFormationSizes(resolvedMaxMembers, effectiveMinMembers, input.mode));
  appendRemainderFormation(remainder, selectedSizes, teams, unassigned, reasons, input.mode);
  if (teams.length) explanation.push(`Proposition déterministe : ${teams.filter((team) => team.explanation === "same_order_trio").length} trio(s) conservé(s) par commande/groupe.`);
  if (selectedSizes?.length) explanation.push(`Les restes sont regroupés selon les bornes de l'événement : ${selectedSizes.join(" + ")}.`);
  if (unassigned.length) explanation.push(`${unassigned.length} place(s) restent en attente car aucune équipe conforme ne peut être formée.`);
  return { teams, unassignedParticipantIds: unassigned, reasons, explanation };
}

export function validateProposedTeamFormation(input: {
  formation: SpogomiTeamFormation;
  participantIds: string[];
  mode: "casual" | "world_cup";
  casualTeamBounds: { minMembers: number | null; maxMembers: number | null };
}): SpogomiTeamFormation {
  const participantSet = new Set(input.participantIds);
  const seen = new Set<string>();
  const teams = input.formation.teams.map((team) => {
    if (!Number.isInteger(team.teamNumber) || team.teamNumber < 1) throw new Error("Validation: un numéro d'équipe est invalide.");
    if (!team.participantIds.length) throw new Error(`Validation: l'équipe ${team.teamNumber} est vide.`);
    if (team.participantIds.some((participantId) => !participantSet.has(participantId))) throw new Error("Validation: la proposition contient une place inconnue.");
    if (team.participantIds.some((participantId) => seen.has(participantId))) throw new Error("Validation: une place apparaît plusieurs fois dans la proposition.");
    for (const participantId of team.participantIds) seen.add(participantId);
    const bounds = input.mode === "world_cup"
      ? { minMembers: 3, maxMembers: 3 }
      : input.casualTeamBounds;
    const validation = validateTeamComposition(input.mode, team.participantIds.length, {
      casual: bounds,
    });
    if (!validation.ok) throw new Error(`Validation: équipe ${team.teamNumber} non conforme (${validation.reason}).`);
    return {
      draftKey: `team-${team.teamNumber}`,
      teamNumber: team.teamNumber,
      participantIds: [...team.participantIds],
      compositionState: "draft" as const,
      explanation: "remainder_repacked" as const,
    };
  });
  const unassignedParticipantIds = [...input.formation.unassignedParticipantIds];
  if (unassignedParticipantIds.some((participantId) => !participantSet.has(participantId) || seen.has(participantId))) {
    throw new Error("Validation: une place en attente est inconnue ou déjà affectée.");
  }
  for (const participantId of unassignedParticipantIds) seen.add(participantId);
  if (seen.size !== participantSet.size) throw new Error("Validation: la proposition ne couvre pas toutes les places.");
  if (new Set(teams.map((team) => team.teamNumber)).size !== teams.length) throw new Error("Validation: un numéro d'équipe apparaît plusieurs fois.");
  return {
    teams,
    unassignedParticipantIds,
    reasons: {},
    explanation: ["Proposition personnalisée contrôlée par le serveur."],
  };
}
