import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const supabaseDirectory = path.join(root, "apps", "web");
const marker = `synthetic-spogomi-concurrency-${Date.now()}-${randomUUID()}`;

export function assertLocalSupabaseUrl(rawUrl) {
  const url = String(rawUrl ?? "").trim();
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Refusing SPOGOMI concurrency proof against an invalid Supabase URL.");
  }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
    throw new Error("Refusing SPOGOMI concurrency proof against a non-local database.");
  }
  return url;
}

function localStatus() {
  let output;
  try {
    output = execFileSync(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["supabase", "status", "--workdir", supabaseDirectory, "--output", "json"],
      { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" },
    );
  } catch {
    throw new Error("DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase status is unavailable on this host.");
  }
  const start = output.indexOf("{");
  const status = start >= 0 ? JSON.parse(output.slice(start)) : null;
  if (!status?.API_URL || !status.SERVICE_ROLE_KEY) {
    throw new Error("DB_SEMANTICS_NOT_EXECUTED: ephemeral Supabase credentials are unavailable.");
  }
  return { url: assertLocalSupabaseUrl(status.API_URL), key: status.SERVICE_ROLE_KEY };
}

export function resolveDestination(env = process.env, fallback = localStatus) {
  const url = env.SUPABASE_URL?.trim();
  const key = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (url || key) {
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be provided together.");
    }
    return { url: assertLocalSupabaseUrl(url), key };
  }
  const destination = fallback();
  return { ...destination, url: assertLocalSupabaseUrl(destination.url) };
}

let sessionA;
let sessionB;
let created;

async function must(result, label) {
  if (result.error) throw new Error(`${label}: ${result.error.message}`);
  return result.data;
}

async function createAction(client, preparationData = {}) {
  const row = await must(await client.from("actions").insert({
    created_by_clerk_id: marker,
    action_date: "2026-10-20",
    location_label: "Synthetic SPOGOMI concurrency fixture",
    status: "pending",
    preparation_data: preparationData,
  }).select("id").single(), "create synthetic action");
  created.actions.push(row.id);
  return row.id;
}

async function createEvent(client, actionId, mode = "world_cup") {
  const row = await must(await client.from("spogomi_events").insert({
    action_id: actionId,
    created_by_clerk_id: marker,
    name: `${marker} event`,
    mode,
    starts_at: "2026-10-20T09:00:00.000Z",
    regulation_version: "synthetic-v1",
    regulation_status: "complete",
    team_size_config: mode === "casual" ? { casual: { minMembers: 2, maxMembers: 4 } } : {},
  }).select("id, composition_revision").single(), "create synthetic event");
  created.events.push(row.id);
  return row;
}

async function participants(client, eventId, count, teamId = null) {
  return must(await client.from("spogomi_participants").insert(Array.from({ length: count }, (_, index) => ({
    event_id: eventId,
    team_id: teamId,
    external_reference: `${marker}-ticket-${eventId}-${index + 1}`,
    source_system: "manual_roster",
    registration_status: "registered",
  }))).select("id, team_id"), "create synthetic participants");
}

async function currentRevision(client, eventId) {
  const row = await must(await client.from("spogomi_events").select("composition_revision").eq("id", eventId).single(), "read event revision");
  return Number(row.composition_revision);
}

async function consolidationSourceSnapshot(client, eventId) {
  const [event, categories, mappings, teams, submissions, items, participants, routes] = await Promise.all([
    must(await client.from("spogomi_events").select("id, name, location_label, starts_at, ends_at, environmental_mapping_version, updated_at, action_id").eq("id", eventId).single(), "read consolidation event snapshot"),
    must(await client.from("spogomi_category_rules").select("id, updated_at").eq("event_id", eventId), "read consolidation category snapshot"),
    must(await client.from("spogomi_environment_category_mappings").select("id, updated_at").eq("event_id", eventId), "read consolidation mapping snapshot"),
    must(await client.from("spogomi_teams").select("id, updated_at").eq("event_id", eventId), "read consolidation team snapshot"),
    must(await client.from("spogomi_result_submissions").select("id, updated_at").eq("event_id", eventId), "read consolidation submission snapshot"),
    must(await client.from("spogomi_result_items").select("id, updated_at").eq("event_id", eventId), "read consolidation item snapshot"),
    must(await client.from("spogomi_participants").select("id, updated_at").eq("event_id", eventId), "read consolidation participant snapshot"),
    must(await client.from("spogomi_event_routes").select("id, updated_at, event_id").eq("event_id", eventId), "read consolidation route snapshot"),
  ]);
  const actionRow = await must(
    await client.from("actions").select("id, organizer_id, organizer_name, organizer_type, updated_at").eq("id", event.action_id).single(),
    "read consolidation Action snapshot",
  );
  const snapshotRows = (rows) => rows.map((row) => ({ id: row.id, updatedAt: row.updated_at }));
  return {
    event: {
      id: event.id,
      name: event.name,
      locationLabel: event.location_label,
      startsAt: event.starts_at,
      endsAt: event.ends_at,
      mappingVersion: event.environmental_mapping_version,
      updatedAt: event.updated_at,
    },
    action: {
      id: actionRow.id,
      organizerId: actionRow.organizer_id,
      organizerName: actionRow.organizer_name,
      organizerType: actionRow.organizer_type,
      updatedAt: actionRow.updated_at,
    },
    categories: snapshotRows(categories),
    mappings: snapshotRows(mappings),
    teams: snapshotRows(teams),
    submissions: snapshotRows(submissions),
    items: snapshotRows(items),
    participants: snapshotRows(participants),
    route: routes[0] ? { id: routes[0].id, updatedAt: routes[0].updated_at } : null,
  };
}

async function verifySupabaseSchema(client) {
  await must(
    await client.from("actions").select("id").limit(1),
    "verify canonical local Supabase schema",
  );
}

async function concurrentCompositionConfirmation() {
  const actionId = await createAction(sessionA);
  const event = await createEvent(sessionA, actionId);
  const rows = await participants(sessionA, event.id, 6);
  const assignments = rows.map((row, index) => ({
    participantId: row.id,
    teamNumber: index < 3 ? 1 : 2,
  }));
  const expectedRevision = await currentRevision(sessionA, event.id);
  const results = await Promise.allSettled([
    sessionA.rpc("spogomi_confirm_team_composition", {
      p_event_id: event.id, p_expected_revision: expectedRevision,
      p_assignments: assignments, p_actor_clerk_id: `${marker}-A`,
    }),
    sessionB.rpc("spogomi_confirm_team_composition", {
      p_event_id: event.id, p_expected_revision: expectedRevision,
      p_assignments: assignments, p_actor_clerk_id: `${marker}-B`,
    }),
  ]);
  const responses = results.map((result) => result.status === "fulfilled" ? result.value : null);
  assert.equal(responses.filter((response) => response && !response.error).length, 1, "exactly one composition confirmation must commit");
  assert.equal(results.filter((result) => result.status === "rejected").length, 0, "RPC transport must remain available");
  assert.equal(responses.filter((response) => response?.error).length, 1, "the stale composition confirmation must be rejected");

  const finalRows = await must(await sessionA.from("spogomi_participants").select("id, team_id").eq("event_id", event.id), "read confirmed participants");
  assert.equal(finalRows.length, 6);
  assert.equal(finalRows.filter((row) => row.team_id).length, 6, "a successful composition cannot be partial");
  const finalTeams = await must(await sessionA.from("spogomi_teams").select("id, team_number").eq("event_id", event.id), "read confirmed teams");
  assert.deepEqual(finalTeams.map((row) => row.team_number).sort((a, b) => a - b), [1, 2]);
}

async function teamPublicNameUniqueness() {
  const actionId = await createAction(sessionA);
  const event = await createEvent(sessionA, actionId);
  const initialTeam = await must(await sessionA.from("spogomi_teams").insert({
    event_id: event.id, team_number: 1, public_name: `${marker} seed`, composition_state: "draft",
  }).select("id, public_name").single(), "create public-name collision team");
  const rename = await sessionA.rpc("spogomi_rename_team_public_name", {
    p_event_id: event.id,
    p_team_id: initialTeam.id,
    p_expected_public_name: initialTeam.public_name,
    p_public_name: "Équipe 2",
    p_actor_clerk_id: `${marker}-rename`,
  });
  assert.equal(rename.error, null, "the seed team must be renamable before composition confirmation");

  const revisionBeforeCollision = await currentRevision(sessionA, event.id);
  const rows = await participants(sessionA, event.id, 6);
  const collision = await sessionA.rpc("spogomi_confirm_team_composition", {
    p_event_id: event.id,
    p_expected_revision: revisionBeforeCollision,
    p_assignments: rows.map((row, index) => ({
      participantId: row.id,
      teamNumber: index < 3 ? 2 : 3,
    })),
    p_actor_clerk_id: `${marker}-collision`,
  });
  assert.ok(collision.error, "a generated public-name collision must reject composition confirmation");
  assert.match(collision.error.message, /generated SPOGOMI team public name is already used/i);

  const teamsAfterCollision = await must(
    await sessionA.from("spogomi_teams").select("team_number, public_name").eq("event_id", event.id).order("team_number"),
    "read teams after public-name collision",
  );
  assert.deepEqual(teamsAfterCollision, [{ team_number: 1, public_name: "Équipe 2" }]);
  const participantsAfterCollision = await must(
    await sessionA.from("spogomi_participants").select("team_id").eq("event_id", event.id),
    "read participants after public-name collision",
  );
  assert.equal(participantsAfterCollision.filter((row) => row.team_id).length, 0, "a rejected composition cannot partially assign participants");
  assert.equal(await currentRevision(sessionA, event.id), revisionBeforeCollision, "a rejected composition cannot advance the revision");
  const historyAfterCollision = await must(
    await sessionA.from("spogomi_team_composition_history").select("event_id").eq("event_id", event.id),
    "read composition history after public-name collision",
  );
  assert.equal(historyAfterCollision.length, 0, "a rejected composition cannot create history");

  const normalizationActionId = await createAction(sessionA);
  const normalizationEvent = await createEvent(sessionA, normalizationActionId, "casual");
  const normalizationTeams = await must(await sessionA.from("spogomi_teams").insert([
    { event_id: normalizationEvent.id, team_number: 1, public_name: "Équipe Cible", composition_state: "draft" },
    { event_id: normalizationEvent.id, team_number: 2, public_name: "Autre", composition_state: "draft" },
    { event_id: normalizationEvent.id, team_number: 3, public_name: "Café", composition_state: "draft" },
    { event_id: normalizationEvent.id, team_number: 4, public_name: "Quatre", composition_state: "draft" },
  ]).select("id, team_number, public_name"), "create normalization teams");
  const spacingCaseCollision = await sessionA.rpc("spogomi_rename_team_public_name", {
    p_event_id: normalizationEvent.id,
    p_team_id: normalizationTeams.find((team) => team.team_number === 2).id,
    p_expected_public_name: "Autre",
    p_public_name: "  équipe   cible ",
    p_actor_clerk_id: `${marker}-spacing-case`,
  });
  assert.ok(spacingCaseCollision.error, "case and whitespace variants must collide");
  assert.match(spacingCaseCollision.error.message, /already used/i);
  const unicodeCollision = await sessionA.rpc("spogomi_rename_team_public_name", {
    p_event_id: normalizationEvent.id,
    p_team_id: normalizationTeams.find((team) => team.team_number === 4).id,
    p_expected_public_name: "Quatre",
    p_public_name: "Cafe\u0301",
    p_actor_clerk_id: `${marker}-unicode`,
  });
  assert.ok(unicodeCollision.error, "NFC-equivalent variants must collide");
  assert.match(unicodeCollision.error.message, /already used/i);

  const sharedName = `${marker} shared name`;
  const firstSharedEvent = await createEvent(sessionA, await createAction(sessionA), "casual");
  const secondSharedEvent = await createEvent(sessionA, await createAction(sessionA), "casual");
  const sharedTeams = await must(await sessionA.from("spogomi_teams").insert([
    { event_id: firstSharedEvent.id, team_number: 1, public_name: sharedName, composition_state: "draft" },
    { event_id: secondSharedEvent.id, team_number: 1, public_name: sharedName, composition_state: "draft" },
  ]).select("id, event_id, public_name"), "allow same public name across events");
  assert.equal(sharedTeams.length, 2, "the uniqueness scope must be one event");

  const sharedTeam = sharedTeams.find((team) => team.event_id === firstSharedEvent.id);
  const revisionBeforeReplay = await currentRevision(sessionA, firstSharedEvent.id);
  const auditBeforeReplay = await must(
    await sessionA.from("admin_operations_audit").select("operation_id").eq("target_id", sharedTeam.id).eq("operation_type", "spogomi_team_name_rename"),
    "read name audit before idempotent replay",
  );
  const replay = await sessionA.rpc("spogomi_rename_team_public_name", {
    p_event_id: firstSharedEvent.id,
    p_team_id: sharedTeam.id,
    p_expected_public_name: sharedName,
    p_public_name: sharedName,
    p_actor_clerk_id: `${marker}-replay`,
  });
  assert.equal(replay.error, null);
  assert.equal(replay.data.already_processed, true, "an identical rename must be idempotent");
  assert.equal(await currentRevision(sessionA, firstSharedEvent.id), revisionBeforeReplay, "an identical rename must not change composition_revision");
  const auditAfterReplay = await must(
    await sessionA.from("admin_operations_audit").select("operation_id").eq("target_id", sharedTeam.id).eq("operation_type", "spogomi_team_name_rename"),
    "read name audit after idempotent replay",
  );
  assert.equal(auditAfterReplay.length, auditBeforeReplay.length, "an identical rename must not add an audit row");
}

async function concurrentMoveAndLock() {
  const actionId = await createAction(sessionA);
  const event = await createEvent(sessionA, actionId);
  const team = await must(await sessionA.from("spogomi_teams").insert({
    event_id: event.id, team_number: 1, public_name: `${marker} team`, composition_state: "draft",
  }).select("id").single(), "create synthetic team");
  const rows = await participants(sessionA, event.id, 3, team.id);
  const expectedRevision = await currentRevision(sessionA, event.id);
  const results = await Promise.allSettled([
    sessionA.rpc("spogomi_move_participant_to_team", {
      p_event_id: event.id, p_participant_id: rows[0].id, p_team_id: null,
      p_expected_revision: expectedRevision, p_actor_clerk_id: `${marker}-move`,
    }),
    sessionB.rpc("spogomi_lock_team_composition", {
      p_event_id: event.id, p_expected_revision: expectedRevision,
      p_actor_clerk_id: `${marker}-lock`,
    }),
  ]);
  assert.equal(results.filter((result) => result.status === "rejected").length, 0, "RPC transport must remain available");
  const responses = results.map((result) => result.status === "fulfilled" ? result.value : null);
  assert.equal(responses.filter((response) => response && !response.error).length, 1, "move and lock must not both commit");
  assert.equal(responses.filter((response) => response?.error).length, 1, "the second state transition must be rejected");

  const finalEvent = await must(await sessionA.from("spogomi_events").select("state").eq("id", event.id).single(), "read move-lock event");
  const finalTeam = await must(await sessionA.from("spogomi_teams").select("composition_state").eq("id", team.id).single(), "read move-lock team");
  const finalParticipant = await must(await sessionA.from("spogomi_participants").select("team_id").eq("id", rows[0].id).single(), "read moved participant");
  if (finalEvent.state === "composition_locked") {
    assert.equal(finalTeam.composition_state, "locked");
    assert.equal(finalParticipant.team_id, team.id, "a locked team keeps its complete membership");
  } else {
    assert.equal(finalEvent.state, "registration_open");
    assert.equal(finalTeam.composition_state, "draft");
    assert.equal(finalParticipant.team_id, null, "a successful move remains a preparation-only mutation");
  }
}

async function concurrentOfficialGpxSync() {
  const actionId = await createAction(sessionA, { keepMe: `${marker}-preserved` });
  const event = await createEvent(sessionA, actionId, "casual");
  const expectedRevision = await currentRevision(sessionA, event.id);
  const rpcArgs = (fileName, actor, longitude) => ({
    p_event_id: event.id,
    p_expected_revision: expectedRevision,
    p_file_name: fileName,
    p_point_count: 2,
    p_reference_distance_km: 1.25,
    p_inferred_topology: "point_to_point",
    p_geometry_geojson: { type: "LineString", coordinates: [[longitude, 48.79], [longitude + 0.01, 48.8]] },
    p_actor_clerk_id: actor,
  });
  const results = await Promise.all([
    sessionA.rpc("spogomi_attach_official_gpx", rpcArgs(`${marker}-a.gpx`, `${marker}-A`, 2.31)),
    sessionB.rpc("spogomi_attach_official_gpx", rpcArgs(`${marker}-b.gpx`, `${marker}-B`, 2.41)),
  ]);
  assert.equal(results.filter((result) => !result.error).length, 1, "exactly one GPX revision may commit");
  assert.equal(results.filter((result) => result.error).length, 1, "a stale GPX revision must be rejected");
  const action = await must(await sessionA.from("actions").select("preparation_data").eq("id", actionId).single(), "read synchronized Action");
  assert.equal(action.preparation_data.keepMe, `${marker}-preserved`, "unrelated Action metadata is preserved");
  const routes = await must(await sessionA.from("spogomi_event_routes").select("source, file_name, point_count, reference_distance_km, inferred_topology, geometry_geojson").eq("event_id", event.id), "read synchronized route");
  assert.equal(routes.length, 1, "the route projection remains singular");
  const persistedRoute = routes[0];
  assert.deepEqual(
    action.preparation_data.spogomiOfficialReference,
    {
      source: persistedRoute.source,
      fileName: persistedRoute.file_name,
      pointCount: persistedRoute.point_count,
      referenceDistanceKm: persistedRoute.reference_distance_km,
      note: "Parcours officiel de référence, non observé sur le terrain.",
    },
    "the Action official reference must exactly describe the persisted route",
  );
}

async function concurrentCertificateReissue() {
  const actionId = await createAction(sessionA);
  const event = await createEvent(sessionA, actionId);
  const results = await Promise.all([
    sessionA.rpc("issue_spogomi_volunteer_certificate", {
      p_user_id: `${marker}-volunteer`, p_event_id: event.id,
      p_source_fingerprint: "a".repeat(64), p_source_snapshot: { source: marker, version: "a" },
      p_actor_clerk_id: `${marker}-A`,
    }),
    sessionB.rpc("issue_spogomi_volunteer_certificate", {
      p_user_id: `${marker}-volunteer`, p_event_id: event.id,
      p_source_fingerprint: "b".repeat(64), p_source_snapshot: { source: marker, version: "b" },
      p_actor_clerk_id: `${marker}-B`,
    }),
  ]);
  assert.equal(results.filter((result) => !result.error).length, 2, "certificate reissue serialization must not reject either committed version");
  const certificates = await must(await sessionA.from("spogomi_volunteer_certificates").select("status").eq("event_id", event.id), "read certificate versions");
  assert.equal(certificates.filter((row) => row.status === "active").length, 1);
  assert.equal(certificates.filter((row) => row.status === "replaced").length, 1);
  const history = await must(await sessionA.from("spogomi_volunteer_certificate_history").select("action").eq("event_id", event.id), "read certificate history");
  assert.equal(history.length, 3, "certificate concurrency keeps issued and replaced history");
}

async function concurrentConsolidationPublication() {
  const actionId = await createAction(sessionA, { preserved: `${marker}-consolidation` });
  const event = await createEvent(sessionA, actionId, "casual");
  await must(
    await sessionA.from("spogomi_events").update({ state: "judging" }).eq("id", event.id),
    "prepare consolidation concurrency event",
  );
  const team = await must(
    await sessionA.from("spogomi_teams").insert({
      event_id: event.id,
      team_number: 1,
      public_name: `${marker} consolidation team`,
      composition_state: "verified",
    }).select("id").single(),
    "create consolidation concurrency team",
  );
  const participant = await must(
    await sessionA.from("spogomi_participants").insert({
      event_id: event.id,
      team_id: team.id,
      external_reference: `${marker}-consolidation-ticket`,
      registration_status: "registered",
      attendance_status: "present",
    }).select("id").single(),
    "create consolidation concurrency participant",
  );
  const submission = await must(
    await sessionA.from("spogomi_result_submissions").insert({
      event_id: event.id,
      team_id: team.id,
      version: 1,
      status: "certified",
      regulation_version: "synthetic-v1",
      submitted_by_clerk_id: `${marker}-team`,
      submitted_at: "2026-10-20T10:00:00.000Z",
      certified_by_clerk_id: `${marker}-referee`,
      certified_at: "2026-10-20T10:01:00.000Z",
    }).select("id").single(),
    "create consolidation concurrency submission",
  );
  await must(
    await sessionA.from("spogomi_teams").update({ certified_submission_id: submission.id }).eq("id", team.id),
    "link consolidation concurrency certification",
  );
  const sourceSnapshot = await consolidationSourceSnapshot(sessionA, event.id);
  const projection = {
    readyForPublication: true,
    teamsIncluded: 1,
    participantsPresent: 1,
    sourceSubmissionIds: [submission.id],
    sourceSnapshot,
    action: { wasteKg: "1.250", cigaretteButts: 5, volunteersCount: 1 },
    totalWasteMassGrams: 1250,
    cigaretteButtsMassGrams: 5,
    cigaretteButtsCount: 5,
    consolidation: { source: marker },
  };
  const results = await Promise.all([
    sessionA.rpc("consolidate_spogomi_event_to_action", {
      p_event_id: event.id,
      p_consolidation_key: `${marker}-consolidation`,
      p_source_hash: "a".repeat(64),
      p_projection_version: "spogomi-cleanmymap-v1",
      p_mappings: [],
      p_projection: projection,
      p_published_by_clerk_id: `${marker}-publisher-a`,
    }),
    sessionB.rpc("consolidate_spogomi_event_to_action", {
      p_event_id: event.id,
      p_consolidation_key: `${marker}-consolidation`,
      p_source_hash: "a".repeat(64),
      p_projection_version: "spogomi-cleanmymap-v1",
      p_mappings: [],
      p_projection: projection,
      p_published_by_clerk_id: `${marker}-publisher-b`,
    }),
  ]);
  assert.equal(results.filter((result) => !result.error).length, 2, "same-hash consolidation must serialize as one committed projection");
  const current = await must(
    await sessionA.from("spogomi_action_consolidations").select("source_hash, projection_revision, is_current").eq("event_id", event.id),
    "read concurrent consolidation projection",
  );
  assert.deepEqual(current, [{ source_hash: "a".repeat(64), projection_revision: 1, is_current: true }], "concurrent consolidation must leave one current projection");
  const action = await must(
    await sessionA.from("actions").select("spogomi_projection_source_hash, preparation_data").eq("id", actionId).single(),
    "read Action after concurrent consolidation",
  );
  assert.equal(action.spogomi_projection_source_hash, "a".repeat(64));
  assert.equal(action.preparation_data.preserved, `${marker}-consolidation`, "failed or duplicate publication must preserve unrelated Action data");
  assert.doesNotMatch(JSON.stringify(projection), /display_name|clerk_id|external_reference|email/i, "public consolidation projection must not contain nominative fields");
  void participant;
}

async function concurrentClosureCorrectionAndRankingPublication() {
  const actionId = await createAction(sessionA, { independent: `${marker}-preserved` });
  const event = await createEvent(sessionA, actionId, "casual");
  await must(
    await sessionA.rpc("spogomi_ensure_parent_divisions", { p_event_id: event.id, p_mode: "casual" }),
    "create closure concurrency division",
  );
  const division = await must(
    await sessionA.from("spogomi_divisions").select("id, division_type, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config").eq("event_id", event.id).single(),
    "read closure concurrency division",
  );
  const regulationConfig = {
    rounding: { decimals: 0, mode: "half_up" },
    eligibility: { requiresAllCategories: true },
    tiebreakers: ["rank"],
  };
  const updatedDivision = await must(
    await sessionA.from("spogomi_divisions").update({
      regulation_version: "synthetic-v1",
      regulation_status: "complete",
      regulation_source_reference: `${marker}-regulation`,
      regulation_config: regulationConfig,
      team_size_config: { casual: { minMembers: 1, maxMembers: 4 } },
    }).eq("id", division.id).select("id, division_type, regulation_version, regulation_status, regulation_source_reference, regulation_config, team_size_config, updated_at").single(),
    "complete closure concurrency division regulation",
  );
  const category = await must(
    await sessionA.from("spogomi_category_rules").insert({
      event_id: event.id,
      division_id: division.id,
      regulation_version: "synthetic-v1",
      code: `${marker}-plastic`,
      label: "Plastic",
      measurement_kind: "mass",
      unit: "g",
      coefficient_status: "not_applicable",
      display_order: 1,
      is_complete: true,
    }).select("id, regulation_version, code, label, measurement_kind, unit, coefficient, coefficient_status, environmental_category_slug, is_complete, updated_at").single(),
    "create closure concurrency category",
  );
  const team = await must(
    await sessionA.from("spogomi_teams").insert({
      event_id: event.id,
      division_id: division.id,
      team_number: 1,
      public_name: `${marker} closure team`,
      composition_state: "verified",
    }).select("id, division_id, team_number, composition_state, certified_submission_id, updated_at").single(),
    "create closure concurrency team",
  );
  await must(
    await sessionA.from("spogomi_events").update({ state: "certified", regulation_status: "complete" }).eq("id", event.id),
    "certify closure concurrency event",
  );
  const decision = await must(
    await sessionA.rpc("spogomi_set_team_closure_decision", {
      p_event_id: event.id,
      p_division_id: division.id,
      p_team_id: team.id,
      p_status: "present_measured",
      p_sport_eligible: true,
      p_environmental_eligibility: "eligible",
      p_reason: "Synthetic closure concurrency fixture",
      p_decision_version: 1,
      p_actor_clerk_id: `${marker}-decision-1`,
    }),
    "create closure concurrency decision",
  );
  assert.equal(decision.decision_version, 1);

  const sourceSnapshot = {
    event: { id: event.id },
    divisions: [{
      id: updatedDivision.id,
      type: updatedDivision.division_type,
      regulationVersion: updatedDivision.regulation_version,
      regulationStatus: updatedDivision.regulation_status,
      regulationSourceReference: updatedDivision.regulation_source_reference,
      regulationConfig: updatedDivision.regulation_config,
      teamSizeConfig: updatedDivision.team_size_config,
    }],
    categories: [{
      id: category.id,
      divisionId: division.id,
      regulationVersion: category.regulation_version,
      code: category.code,
      label: category.label,
      measurementKind: category.measurement_kind,
      unit: category.unit,
      coefficient: category.coefficient,
      coefficientStatus: category.coefficient_status,
      environmentalCategorySlug: category.environmental_category_slug,
      isComplete: category.is_complete,
      updatedAt: category.updated_at,
    }],
    teams: [{
      id: team.id,
      divisionId: division.id,
      teamNumber: team.team_number,
      compositionState: team.composition_state,
      certifiedSubmissionId: team.certified_submission_id,
      updatedAt: team.updated_at,
      closureStatus: "present_measured",
      sportEligible: true,
      environmentalEligibility: "eligible",
      closureDecisionVersion: 1,
    }],
    submissions: [],
    items: [],
    participants: [],
  };
  await must(
    await sessionA.from("spogomi_official_rankings").insert({
      event_id: event.id,
      division_id: division.id,
      team_id: team.id,
      kind: "points",
      rank: 1,
      status: "certified",
      team_eligible: true,
      decision_version: "1",
      source_reference: `${marker}-ranking-v1`,
      source_snapshot: sourceSnapshot,
      decided_by_clerk_id: `${marker}-seed`,
    }).select("id").single(),
    "seed certified closure ranking",
  );

  const [publication, correction] = await Promise.all([
    sessionA.rpc("publish_spogomi_official_rankings_for_division_checked_closure", {
      p_event_id: event.id,
      p_division_id: division.id,
      p_decision_version: "1",
      p_source_reference: `${marker}-ranking-v1-republish`,
      p_rankings: [{ divisionId: division.id, kind: "points", teamId: team.id, rank: 1, teamEligible: true }],
      p_actor_clerk_id: `${marker}-publisher`,
      p_source_snapshot: sourceSnapshot,
    }),
    sessionB.rpc("spogomi_set_team_closure_decision", {
      p_event_id: event.id,
      p_division_id: division.id,
      p_team_id: team.id,
      p_status: "disqualified",
      p_sport_eligible: false,
      p_environmental_eligibility: "excluded",
      p_reason: "Synthetic concurrent correction",
      p_decision_version: 2,
      p_actor_clerk_id: `${marker}-decision-2`,
    }),
  ]);
  assert.equal(correction.error, null, "the concurrent closure correction must commit");
  assert.ok(publication.error === null || publication.error.code === "40001", "publication must either commit before the correction or reject its stale snapshot");

  const certified = await must(
    await sessionA.from("spogomi_official_rankings").select("id").eq("event_id", event.id).eq("division_id", division.id).eq("status", "certified"),
    "read rankings after closure correction",
  );
  assert.equal(certified.length, 0, "a concurrent correction cannot leave an obsolete certified ranking");
  const currentDecision = await must(
    await sessionA.from("spogomi_team_closure_decisions").select("decision_version").eq("event_id", event.id).eq("division_id", division.id).eq("team_id", team.id).eq("is_current", true).single(),
    "read current closure decision",
  );
  assert.equal(currentDecision.decision_version, 2);
}

async function cleanup() {
  await sessionA.from("admin_operations_audit").delete().like("actor_user_id", `${marker}%`);
  for (const eventId of created.events) {
    await sessionA.from("spogomi_action_consolidations").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_environment_category_mappings").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_volunteer_certificate_history").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_volunteer_certificates").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_events").delete().eq("id", eventId);
  }
  for (const actionId of created.actions) await sessionA.from("actions").delete().eq("id", actionId);
}

async function main() {
  const configured = resolveDestination();
  sessionA = createClient(configured.url, configured.key, { auth: { persistSession: false } });
  sessionB = createClient(configured.url, configured.key, { auth: { persistSession: false } });
  created = { actions: [], events: [], certificates: [] };
  try {
    await verifySupabaseSchema(sessionA);
    await concurrentCompositionConfirmation();
    await teamPublicNameUniqueness();
    await concurrentMoveAndLock();
    await concurrentOfficialGpxSync();
    await concurrentCertificateReissue();
    await concurrentConsolidationPublication();
    await concurrentClosureCorrectionAndRankingPublication();
    process.stdout.write("EXECUTED_DB_CONTRACT: SPOGOMI composition, lock, GPX, certificate, consolidation and closure republication safety passed.\n");
  } finally {
    await cleanup();
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await main();
}
