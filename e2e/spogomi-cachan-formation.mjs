function divisionReference(divisionType) {
  if (divisionType === "world_cup") return "DIV-WORLD-CUP";
  if (divisionType === "casual") return "DIV-CASUAL";
  throw new Error(`Division Cachan inconnue : ${divisionType}.`);
}

function teamNumber(teamRef) {
  const match = /^\w+-(\d+)$/.exec(String(teamRef));
  if (!match) throw new Error(`Référence d'équipe Cachan invalide : ${teamRef}.`);
  return Number(match[1]);
}

function sorted(values) {
  return [...values].sort((left, right) => String(left).localeCompare(String(right)));
}

export function assertManifestFormation({ manifest, division, participants, formation }) {
  const divisionRef = divisionReference(division.division_type);
  const expectedTeams = manifest.teams.filter((team) => team.division_ref === divisionRef);
  const expectedByNumber = new Map(expectedTeams.map((team) => [teamNumber(team.team_ref), team]));
  const actualByNumber = new Map();

  for (const team of formation.teams) {
    const number = Number(team.teamNumber);
    if (!Number.isInteger(number) || actualByNumber.has(number)) throw new Error("La formation du manifeste contient un numéro d'équipe en doublon ou invalide.");
    if (!expectedByNumber.has(number)) throw new Error(`La formation contient une équipe inconnue pour ${divisionRef} : ${number}.`);
    actualByNumber.set(number, team);
  }
  if (actualByNumber.size !== expectedByNumber.size) throw new Error(`La formation ${divisionRef} ne contient pas exactement les équipes du manifeste.`);

  const participantsById = new Map(participants.map((participant) => [participant.id, participant]));
  const expectedPlaceIds = expectedTeams.flatMap((team) => team.place_ids);
  const expectedPlaceSet = new Set(expectedPlaceIds);
  const seenPlaceIds = new Set();
  for (const [number, expectedTeam] of expectedByNumber) {
    const actualTeam = actualByNumber.get(number);
    const placeIds = [];
    for (const participantId of actualTeam.participantIds) {
      const participant = participantsById.get(participantId);
      if (!participant) throw new Error(`La formation contient une place importée inconnue : ${participantId}.`);
      if (participant.division_id !== division.id) throw new Error(`La place ${participant.external_reference} appartient à une autre division.`);
      if (!expectedPlaceSet.has(participant.external_reference)) throw new Error(`La place ${participant.external_reference} n'appartient pas au manifeste ${divisionRef}.`);
      if (seenPlaceIds.has(participant.external_reference)) throw new Error(`La place ${participant.external_reference} apparaît plusieurs fois dans la formation.`);
      seenPlaceIds.add(participant.external_reference);
      placeIds.push(participant.external_reference);
    }
    if (sorted(placeIds).join("|") !== sorted(expectedTeam.place_ids).join("|")) throw new Error(`Les places de l'équipe ${expectedTeam.team_ref} ne correspondent pas au manifeste.`);
  }
  if (formation.unassignedParticipantIds.length > 0) throw new Error("Le manifeste Cachan ne prévoit aucune place en attente.");
  if (seenPlaceIds.size !== expectedPlaceSet.size || sorted(seenPlaceIds).join("|") !== sorted(expectedPlaceIds).join("|")) throw new Error(`La partition des places ${divisionRef} ne correspond pas au manifeste.`);
  return true;
}

export function buildManifestFormation({ manifest, division, participants }) {
  const divisionRef = divisionReference(division.division_type);
  const expectedTeams = manifest.teams.filter((team) => team.division_ref === divisionRef);
  const participantsByPlaceId = new Map();
  for (const participant of participants.filter((candidate) => candidate.division_id === division.id)) {
    if (participantsByPlaceId.has(participant.external_reference)) throw new Error(`La place importée ${participant.external_reference} est dupliquée.`);
    participantsByPlaceId.set(participant.external_reference, participant);
  }
  const formation = {
    teams: expectedTeams.map((team) => ({
      draftKey: `team-${teamNumber(team.team_ref)}`,
      teamNumber: teamNumber(team.team_ref),
      participantIds: team.place_ids.map((placeId) => {
        const participant = participantsByPlaceId.get(placeId);
        if (!participant) throw new Error(`La place du manifeste ${placeId} est absente de la division ${divisionRef}.`);
        return participant.id;
      }),
      compositionState: "draft",
      explanation: "remainder_repacked",
    })),
    unassignedParticipantIds: [],
    reasons: {},
    explanation: [`Formation explicite issue du manifeste ${manifest.scenario_ref}.`],
  };
  assertManifestFormation({ manifest, division, participants, formation });
  return formation;
}
