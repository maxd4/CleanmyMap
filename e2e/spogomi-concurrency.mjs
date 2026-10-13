import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const root = process.cwd();
const supabaseDirectory = path.join(root, "apps", "web", "supabase");
const marker = `synthetic-spogomi-concurrency-${Date.now()}-${randomUUID()}`;

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
  const hostname = new URL(status.API_URL).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") {
    throw new Error("Refusing SPOGOMI concurrency proof against a non-local database.");
  }
  return { url: status.API_URL, key: status.SERVICE_ROLE_KEY };
}

const configured = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? { url: process.env.SUPABASE_URL, key: process.env.SUPABASE_SERVICE_ROLE_KEY }
  : localStatus();

const sessionA = createClient(configured.url, configured.key, { auth: { persistSession: false } });
const sessionB = createClient(configured.url, configured.key, { auth: { persistSession: false } });
const created = { actions: [], events: [], certificates: [] };

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

function rpcError(result) {
  return result.status === "fulfilled" ? null : result.reason;
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
  const routes = await must(await sessionA.from("spogomi_event_routes").select("file_name, geometry_geojson").eq("event_id", event.id), "read synchronized route");
  assert.equal(routes.length, 1, "the route projection remains singular");
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

async function cleanup() {
  for (const eventId of created.events) {
    await sessionA.from("spogomi_volunteer_certificate_history").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_volunteer_certificates").delete().eq("event_id", eventId);
    await sessionA.from("spogomi_events").delete().eq("id", eventId);
  }
  for (const actionId of created.actions) await sessionA.from("actions").delete().eq("id", actionId);
}

try {
  await concurrentCompositionConfirmation();
  await concurrentMoveAndLock();
  await concurrentOfficialGpxSync();
  await concurrentCertificateReissue();
  process.stdout.write("EXECUTED_DB_CONTRACT: SPOGOMI two-session preparation and certificate concurrency passed.\n");
} finally {
  await cleanup();
}
