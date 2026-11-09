import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildManifestFormation, assertManifestFormation } from "./spogomi-cachan-formation.mjs";

const manifest = JSON.parse(readFileSync(new URL("../documentation/features/spogomi-references/fixtures/scenario_cachan_cleanmymap_mixed.json", import.meta.url), "utf8"));
const allPlaceIds = manifest.teams.flatMap((team) => team.place_ids);
const worldCupPlaceIds = new Set(manifest.teams.filter((team) => team.division_ref === "DIV-WORLD-CUP").flatMap((team) => team.place_ids));
const participants = allPlaceIds.map((externalReference, index) => ({
  id: `participant-${String(index + 1).padStart(3, "0")}`,
  external_reference: externalReference,
  division_id: worldCupPlaceIds.has(externalReference) ? "division-world-cup" : "division-casual",
}));

const divisions = {
  world_cup: { id: "division-world-cup", division_type: "world_cup" },
  casual: { id: "division-casual", division_type: "casual" },
};

function placeIdsForFormation(formation) {
  const participantsById = new Map(participants.map((participant) => [participant.id, participant.external_reference]));
  return formation.teams.map((team) => ({ teamNumber: team.teamNumber, placeIds: team.participantIds.map((id) => participantsById.get(id)) }));
}

test("Cachan maps all 37 imported UUIDs to the exact mixed-manifest teams", () => {
  const worldCup = buildManifestFormation({ manifest, division: divisions.world_cup, participants });
  const casual = buildManifestFormation({ manifest, division: divisions.casual, participants });
  assert.deepEqual(placeIdsForFormation(worldCup), manifest.teams.filter((team) => team.division_ref === "DIV-WORLD-CUP").map((team) => ({ teamNumber: Number(team.team_ref.split("-")[1]), placeIds: team.place_ids })));
  assert.deepEqual(placeIdsForFormation(casual), manifest.teams.filter((team) => team.division_ref === "DIV-CASUAL").map((team) => ({ teamNumber: Number(team.team_ref.split("-")[1]), placeIds: team.place_ids })));
  assert.equal(new Set([...worldCup.teams, ...casual.teams].flatMap((team) => team.participantIds)).size, 37);
});

test("Cachan refuses duplicate, unknown and cross-division formation places", () => {
  const formation = buildManifestFormation({ manifest, division: divisions.world_cup, participants });
  const duplicate = { ...formation, teams: formation.teams.map((team, index) => index === 1 ? { ...team, participantIds: [formation.teams[0].participantIds[0], ...team.participantIds.slice(1)] } : team) };
  assert.throws(() => assertManifestFormation({ manifest, division: divisions.world_cup, participants, formation: duplicate }), /apparaît plusieurs fois/);
  const unknown = { ...formation, teams: [{ ...formation.teams[0], participantIds: ["unknown-participant", ...formation.teams[0].participantIds.slice(1)] }, ...formation.teams.slice(1)] };
  assert.throws(() => assertManifestFormation({ manifest, division: divisions.world_cup, participants, formation: unknown }), /inconnue/);
  const wrongDivision = participants.map((participant) => participant.external_reference === "PLACE-004" ? { ...participant, division_id: "division-casual" } : participant);
  assert.throws(() => buildManifestFormation({ manifest, division: divisions.world_cup, participants: wrongDivision }), /autre division|absente/);
});
