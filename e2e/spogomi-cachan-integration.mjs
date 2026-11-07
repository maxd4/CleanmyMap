import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";
import * as XLSX from "xlsx";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fixtureRoot = path.join(root, "documentation", "features", "spogomi-references", "fixtures");
const fixture = JSON.parse(readFileSync(path.join(fixtureRoot, "scenario_cachan_cleanmymap_mixed.json"), "utf8"));
const places = readFileSync(path.join(fixtureRoot, "cachan_2026_places_SYNTHETIQUES.csv"), "utf8")
  .trim().split(/\r?\n/).slice(1).map((line) => {
    const [placeId, orderGroupId, groupPreference, identityStatus, registrationStatus, attendanceStatus, displayName, sourceRowId] = line.split(",");
    return { placeId, orderGroupId, groupPreference, identityStatus, registrationStatus, attendanceStatus, displayName, sourceRowId };
  });

const ownerId = "synthetic-cachan-integration-owner";
const observerId = "synthetic-cachan-integration-observer";
const operationalDate = process.env.SPOGOMI_OPERATIONAL_DATE ?? "2030-06-01";
const marker = "DEMONSTRATION / NON OFFICIEL";
const steps = [];
let ownerServer = null;
let observerServer = null;
let createdEventId = null;

function assertLocalUrl(raw, label) {
  let parsed;
  try { parsed = new URL(String(raw ?? "")); } catch { throw new Error(`Refus ${label}: URL invalide.`); }
  if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") throw new Error(`Refus ${label}: une URL distante ou de production est interdite.`);
  return parsed.origin;
}

function localSupabaseStatus() {
  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  let output;
  try {
    output = execFileSync(command, ["supabase", "status", "--workdir", path.join(root, "apps", "web"), "--output", "json"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" });
  } catch {
    throw new Error("DB_SEMANTICS_NOT_EXECUTED: le statut Supabase éphémère local est indisponible.");
  }
  const start = output.indexOf("{");
  const status = start >= 0 ? JSON.parse(output.slice(start)) : null;
  if (!status?.API_URL || !status?.SERVICE_ROLE_KEY || !status?.ANON_KEY) throw new Error("DB_SEMANTICS_NOT_EXECUTED: les credentials Supabase éphémères sont indisponibles.");
  return { url: assertLocalUrl(status.API_URL, "Supabase"), key: status.SERVICE_ROLE_KEY, anonKey: status.ANON_KEY };
}

function databaseDestination() {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const anonKey = process.env.SUPABASE_ANON_KEY?.trim() ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (url || key || anonKey) {
    if (!url || !key || !anonKey) throw new Error("SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY et SUPABASE_ANON_KEY sont requis ensemble.");
    return { url: assertLocalUrl(url, "Supabase"), key, anonKey };
  }
  return localSupabaseStatus();
}

function mustLocalAppUrl(raw) {
  return assertLocalUrl(raw, "application");
}

async function waitForApp(baseUrl) {
  const deadline = Date.now() + 90_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/spogomi`, { redirect: "manual" });
      if (response.status < 500) return;
    } catch { /* server is still booting */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error(`Application SPOGOMI indisponible sur ${baseUrl}.`);
}

function startApp({ port, userId, database }) {
  const publishableKey = process.env.CMM_E2E_CLERK_DEV_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const secretKey = process.env.CMM_E2E_CLERK_DEV_BACKEND_TOKEN ?? process.env.CLERK_SECRET_KEY;
  if (!publishableKey?.startsWith("pk_test_") || !secretKey?.startsWith("sk_test_")) throw new Error("Le scénario exige uniquement des clés Clerk Development pk_test_/sk_test_ pour son serveur local éphémère.");
  const child = spawn(process.execPath, [path.join(root, "scripts", "dev", "dev-with-fallback-port.mjs")], {
    cwd: root,
    env: {
      ...process.env,
      PORT: String(port),
      DEV_STRICT_PORT: "1",
      NEXT_PUBLIC_SUPABASE_URL: database.url,
      SUPABASE_URL: database.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: database.anonKey,
      SUPABASE_ANON_KEY: database.anonKey,
      SUPABASE_SERVICE_ROLE_KEY: database.key,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishableKey,
      CLERK_SECRET_KEY: secretKey,
      CMM_DEV_AUTH_BYPASS: "1",
      CMM_DISABLE_DEV_AUTH_BYPASS: "0",
      CMM_DEV_AUTH_BYPASS_USER_ID: userId,
      CMM_DEV_AUTH_BYPASS_ROLE: "coordinateur",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout.on("data", () => undefined);
  child.stderr.on("data", () => undefined);
  return child;
}

async function stopApp(child) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  await new Promise((resolve) => { const timer = setTimeout(resolve, 5000); child.once("exit", () => { clearTimeout(timer); resolve(); }); });
}

async function runStep(name, action) {
  try {
    await action();
    steps.push({ name, status: "PASS" });
    console.log(`SPOGOMI_CACHAN_STEP PASS ${name}`);
  } catch (error) {
    steps.push({ name, status: "FAIL", error: error instanceof Error ? error.message : String(error) });
    console.error(`SPOGOMI_CACHAN_STEP FAIL ${name}: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

async function api(baseUrl, route, init = {}, expected = [200]) {
  const response = await fetch(`${baseUrl}${route}`, { redirect: "manual", ...init });
  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("json") ? await response.json() : await response.arrayBuffer();
  if (!expected.includes(response.status)) throw new Error(`${init.method ?? "GET"} ${route}: HTTP ${response.status} ${typeof body === "object" && body !== null && !(body instanceof ArrayBuffer) ? JSON.stringify(body).slice(0, 500) : ""}`);
  return { response, body };
}

async function jsonApi(baseUrl, route, body, expected = [200, 201]) {
  return api(baseUrl, route, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }, expected);
}

function jsonBody(value) { return typeof value === "object" && value !== null && !(value instanceof ArrayBuffer) ? value : {}; }

function csvForRows(rows) {
  return ["place_id,order_group_id,registration_status,source_row_id", ...rows.map((row) => [row.placeId, row.orderGroupId, "registered", row.sourceRowId].join(","))].join("\n");
}

function formForRoster(csv, divisionId, fileName) {
  const form = new FormData();
  form.set("file", new Blob([csv], { type: "text/csv" }), fileName);
  form.set("divisionId", divisionId);
  form.set("mapping", JSON.stringify({ ticketReference: "place_id", orderReference: "order_group_id", ticketStatus: "registration_status", sourceRowId: "source_row_id" }));
  return form;
}

function regulationFor(division) {
  const source = fixture.divisions.find((item) => item.division_ref === (division.division_type === "world_cup" ? "DIV-WORLD-CUP" : "DIV-CASUAL"));
  assert(source, `règlement fixture absent pour ${division.division_type}`);
  return {
    regulationVersion: source.regulation_ref,
    regulationStatus: "complete",
    regulationSourceReference: `fixture:${source.regulation_ref}:fictional-not-official`,
    teamSize: { casual: { minMembers: source.team_size.min_members, maxMembers: source.team_size.max_members } },
    rounding: source.rounding,
    penalties: [],
    eligibility: { minimumPresentParticipants: null, requiresAllCategories: source.eligibility.all_categories_required },
    tiebreakers: ["mass_grams"],
    categories: source.categories.map((category, index) => ({
      id: null,
      code: category.code,
      label: category.label,
      measurementKind: "mass",
      unit: "g",
      coefficient: category.points_per_kg / 1000,
      coefficientStatus: "confirmed",
      environmentalCategorySlug: category.code === "cigarette_butts" ? "cigarette_butt" : category.code,
      displayOrder: index,
      isComplete: true,
    })),
    environmentMappings: source.categories.map((category) => ({
      id: null,
      categoryRuleId: null,
      categoryCode: category.code,
      environmentalCategorySlug: category.code === "cigarette_butts" ? "cigarette_butt" : category.code,
      sourceField: "mass_grams",
      sourceUnit: "g",
      targetUnit: "grams",
      unitFactorToTarget: 1,
      countsTowardTotal: true,
      isMegots: category.code === "cigarette_butts",
      mappingStatus: "mapped",
      exclusionReason: null,
    })),
  };
}

function expectedTeam(teamRef) { return fixture.teams.find((team) => team.team_ref === teamRef); }
function measurementsFor(teamRef) { return fixture.measurements.filter((measurement) => measurement.team_ref === teamRef); }
function assertNear(actual, expected, label) { assert.equal(Math.round(Number(actual) * 100), Math.round(Number(expected) * 100), label); }

async function main() {
  if (process.env.CMM_SUPABASE_TEST_ENVIRONMENT !== "ephemeral" || process.env.CMM_SUPABASE_EPHEMERAL_TEST_AUTHORIZATION !== "I_UNDERSTAND_EPHEMERAL_ONLY") throw new Error("Refus: le scénario doit être explicitement autorisé uniquement en environnement Supabase éphémère.");
  const database = databaseDestination();
  const supabase = createClient(database.url, database.key, { auth: { persistSession: false, autoRefreshToken: false } });
  const appUrl = process.env.CMM_SPOGOMI_APP_URL ? mustLocalAppUrl(process.env.CMM_SPOGOMI_APP_URL) : "http://127.0.0.1:3010";
  ownerServer = process.env.CMM_SPOGOMI_APP_URL ? null : startApp({ port: 3010, userId: ownerId, database });
  await waitForApp(appUrl);
  if (!process.env.CMM_SPOGOMI_APP_URL) observerServer = startApp({ port: 3011, userId: observerId, database });
  const observerUrl = process.env.CMM_SPOGOMI_APP_URL ? null : "http://127.0.0.1:3011";
  if (observerUrl) await waitForApp(observerUrl);

  try {
    await runStep("fixture-synthétique-et-partition", async () => {
      assert.equal(fixture.mode, "mixed");
      assert.equal(fixture.official, false);
      assert.equal(places.length, 37);
      assert.equal(new Set(places.map((row) => row.placeId)).size, 37);
      assert.equal(places.filter((row) => row.displayName || /@|\+33|[0-9]{8,}/.test(row.placeId)).length, 0);
      const allTeamPlaces = fixture.teams.flatMap((team) => team.place_ids);
      assert.equal(new Set(allTeamPlaces).size, 37);
      assert.equal(new Set(allTeamPlaces).size, allTeamPlaces.length);
      assert.equal(fixture.teams.filter((team) => team.division_ref === "DIV-WORLD-CUP").flatMap((team) => team.place_ids).length, 18);
      assert.equal(fixture.teams.filter((team) => team.division_ref === "DIV-CASUAL").flatMap((team) => team.place_ids).length, 19);
      for (const measurement of fixture.measurements) assert.match(measurement.provenance_ref, /^(scenario:|classeur_casual_2026:line-)/);
    });

    let event;
    let management;
    await runStep("création-idempotente-une-action-parent", async () => {
      const payload = { idempotencyKey: "cachan-cleanmymap-mixed-v1", name: `${fixture.scenario_name} — ${marker}`, locationLabel: "Cachan · fixture synthétique", mode: "mixed", startsAt: `${operationalDate}T09:00:00+02:00`, endsAt: `${operationalDate}T16:00:00+02:00` };
      const first = jsonBody((await api(appUrl, "/api/spogomi/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }, [201])).body);
      const second = jsonBody((await api(appUrl, "/api/spogomi/events", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) }, [200, 201])).body);
      assert.equal(first.eventId, second.eventId);
      assert.equal(first.actionId, second.actionId);
      createdEventId = String(first.eventId);
      event = { id: createdEventId, actionId: String(first.actionId) };
      const actionRows = await supabase.from("spogomi_events").select("id, action_id, event_slug, composition_revision, mode, name").eq("id", createdEventId).single();
      assert.ifError(actionRows.error);
      assert.equal(actionRows.data.mode, "mixed");
      assert.match(actionRows.data.name, /DEMONSTRATION \/ NON OFFICIEL/);
      const actionCount = await supabase.from("actions").select("id", { count: "exact", head: true }).eq("id", actionRows.data.action_id);
      assert.ifError(actionCount.error);
      assert.equal(actionCount.count, 1);
      management = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
    });

    const divisionByType = new Map((management.divisions ?? []).map((division) => [division.division_type, division]));
    const wcDivision = divisionByType.get("world_cup");
    const casualDivision = divisionByType.get("casual");
    assert(wcDivision && casualDivision, "les deux divisions mixed sont requises");

    await runStep("règlements-fictifs-certifiables", async () => {
      for (const division of [wcDivision, casualDivision]) {
        const current = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
        const expectedRevision = Number(current.event.composition_revision ?? 0);
        const existing = (current.divisions ?? []).find((candidate) => candidate.id === division.id);
        if (existing?.regulation_status !== "complete") {
          await api(appUrl, `/api/spogomi/events/${createdEventId}/divisions/${division.id}/regulation`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ expectedRevision, ...regulationFor(division) }) }, [200]);
        }
      }
      management = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
      assert.equal(management.divisions.filter((division) => division.regulation_status === "complete").length, 2);
      assert.equal(management.categoryRules.length, 10);
      assert.equal(management.environmentMappings.length, 10);
      assert(management.categoryRules.every((category) => category.coefficient_status === "confirmed" && category.is_complete));
    });

    await runStep("import-37-inscriptions-sans-PII", async () => {
      const currentParticipants = await supabase.from("spogomi_participants").select("id", { count: "exact", head: true }).eq("event_id", createdEventId);
      assert.ifError(currentParticipants.error);
      if ((currentParticipants.count ?? 0) === 0) {
        for (const division of [wcDivision, casualDivision]) {
          const allowed = new Set(fixture.teams.filter((team) => team.division_ref === (division.division_type === "world_cup" ? "DIV-WORLD-CUP" : "DIV-CASUAL")).flatMap((team) => team.place_ids));
          const rows = places.filter((row) => allowed.has(row.placeId));
          const preview = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}/imports/preview`, { method: "POST", body: formForRoster(csvForRows(rows), division.id, `${division.division_type}-synthetic.csv`) }, [200])).body);
          assert.equal(preview.errors?.length ?? 0, 0);
          const accepted = rows.map((_, index) => index + 2);
          const form = formForRoster(csvForRows(rows), division.id, `${division.division_type}-synthetic.csv`);
          form.set("acceptedRowNumbers", JSON.stringify(accepted));
          await api(appUrl, `/api/spogomi/events/${createdEventId}/imports/confirm`, { method: "POST", body: form }, [200, 201]);
        }
      }
      const rows = await supabase.from("spogomi_participants").select("id, division_id, external_reference, display_name").eq("event_id", createdEventId);
      assert.ifError(rows.error);
      assert.equal(rows.data.length, 37);
      assert.equal(new Set(rows.data.map((row) => row.external_reference)).size, 37);
      assert.equal(rows.data.filter((row) => row.division_id === wcDivision.id).length, 18);
      assert.equal(rows.data.filter((row) => row.division_id === casualDivision.id).length, 19);
      assert(rows.data.every((row) => row.display_name === null));
    });

    const teamsByDivision = new Map();
    await runStep("composition-11-équipes-et-verrouillage", async () => {
      for (const division of [wcDivision, casualDivision]) {
        const existing = await supabase.from("spogomi_teams").select("id, division_id, team_number, composition_state").eq("event_id", createdEventId).eq("division_id", division.id).order("team_number");
        assert.ifError(existing.error);
        if (existing.data.length === 0) {
          const current = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
          const preview = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}/teams/auto`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ divisionId: division.id }) }, [200])).body);
          await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/teams/auto`, { confirm: true, divisionId: division.id, expectedRevision: Number(current.event.composition_revision), proposalFingerprint: preview.proposalFingerprint, formation: preview.formation }, [200]);
        }
        const after = await supabase.from("spogomi_teams").select("id, division_id, team_number, composition_state").eq("event_id", createdEventId).eq("division_id", division.id).order("team_number");
        assert.ifError(after.error);
        teamsByDivision.set(division.id, after.data);
        assert.equal(after.data.length, division.division_type === "world_cup" ? 6 : 5);
        assert(after.data.every((team) => ["locked", "verified"].includes(team.composition_state)) || after.data.every((team) => team.composition_state === "draft"));
      }
      for (const division of [wcDivision, casualDivision]) {
        const teamRows = teamsByDivision.get(division.id);
        if (teamRows.some((team) => team.composition_state !== "locked" && team.composition_state !== "verified")) {
          const current = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
          await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/teams/lock`, { divisionId: division.id, expectedRevision: Number(current.event.composition_revision) }, [200]);
        }
      }
      const state = await supabase.from("spogomi_events").select("state").eq("id", createdEventId).single();
      assert.ifError(state.error);
      assert.equal(state.data.state, "composition_locked");
    });

    await runStep("présences-et-opérations-terrain", async () => {
      const participants = await supabase.from("spogomi_participants").select("id, division_id").eq("event_id", createdEventId);
      assert.ifError(participants.error);
      for (const participant of participants.data) await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/attendance`, { divisionId: participant.division_id, participantId: participant.id, status: "present", reason: "Fixture synthétique de validation", provenance: "fixture:scenario_cachan_cleanmymap_mixed" });
      const at = (hour) => new Date(`${operationalDate}T${String(hour).padStart(2, "0")}:00:00+02:00`).toISOString();
      for (const division of [wcDivision, casualDivision]) {
        for (const payload of [
          { action: "configure", divisionId: division.id, timezoneName: "Europe/Paris", regulationVersion: regulationFor(division).regulationVersion, officialStartAt: at(9), collectionLimitAt: at(11), sortingLimitAt: at(12), weighingStartAt: at(13), weighingEndAt: at(15), reason: "Configuration du scénario synthétique", provenance: "fixture:operational-date" },
          { action: "phase", divisionId: division.id, phase: "collection", at: at(9), reason: "Ouverture synthétique", provenance: "fixture:phase" },
          { action: "phase", divisionId: division.id, phase: "sorting", at: at(11), reason: "Tri synthétique", provenance: "fixture:phase" },
          { action: "phase", divisionId: division.id, phase: "weighing", at: at(13), reason: "Pesée synthétique", provenance: "fixture:phase" },
        ]) await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/field-operations`, payload, [200, 201]);
        const teamRows = teamsByDivision.get(division.id);
        for (const team of teamRows) {
          await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/field-operations`, { action: "return", divisionId: division.id, teamId: team.id, actualReturnAt: at(14), note: "Retour synthétique", reason: "Fixture de validation" }, [200, 201]);
        }
        for (const measurement of fixture.measurements.filter((item) => item.team_ref.startsWith(division.division_type === "world_cup" ? "WC-" : "CAS-"))) {
          const teamNumber = Number(measurement.team_ref.split("-")[1]);
          const team = teamRows.find((candidate) => candidate.team_number === teamNumber);
          if (!team) throw new Error(`équipe ${measurement.team_ref} absente`);
          const category = management.categoryRules.find((candidate) => candidate.division_id === division.id && candidate.code === measurement.category_code);
          if (!category) throw new Error(`catégorie ${measurement.category_code} absente`);
          const result = jsonBody((await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/field-operations`, { action: "measurement", divisionId: division.id, teamId: team.id, categoryRuleId: category.id, measurementKind: "mass", unit: "g", quantity: measurement.mass_grams, massGrams: measurement.mass_grams, objectCount: null, measurementMethod: "balance-synthetic", provenance: measurement.provenance_ref, sourceKind: "field_entry", sourceReference: measurement.provenance_ref, reason: "Mesure synthétique" }, [200, 201])).body);
          const measurementId = result.result?.id ?? result.result?.measurement_id;
          if (measurementId) await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/field-operations`, { action: "measurement_decision", divisionId: division.id, measurementId, decision: "certified", rejectionReason: null }, [200, 201]);
        }
        await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/field-operations`, { action: "phase", divisionId: division.id, phase: "closed", at: at(16), reason: "Clôture terrain synthétique", provenance: "fixture:phase" }, [200, 201]);
      }
    });

    const categoryRowsByDivision = new Map([wcDivision, casualDivision].map((division) => [division.id, management.categoryRules.filter((row) => row.division_id === division.id).sort((a, b) => a.display_order - b.display_order)]));
    const measuredTeamIds = new Map();
    await runStep("sessions-saisie-soumission-arbitrage-correction", async () => {
      for (const division of [wcDivision, casualDivision]) {
        const teamRows = teamsByDivision.get(division.id);
        for (const team of teamRows) {
          const teamRef = `${division.division_type === "world_cup" ? "WC" : "CAS"}-${String(team.team_number).padStart(2, "0")}`;
          const sourceTeam = expectedTeam(teamRef);
          const measurements = measurementsFor(teamRef);
          if (!measurements.length) continue;
          measuredTeamIds.set(teamRef, team.id);
          const grant = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}/teams/${team.id}/access`, { method: "POST" }, [201])).body);
          const accessUrl = mustLocalAppUrl(grant.accessUrl);
          const accessResponse = await fetch(accessUrl, { redirect: "manual" });
          assert.equal(accessResponse.status, 303);
          const setCookie = accessResponse.headers.getSetCookie?.()[0] ?? accessResponse.headers.get("set-cookie");
          assert(setCookie, "la session d'équipe doit être matérialisée par un cookie");
          const cookie = setCookie.split(";", 1)[0];
          const form = jsonBody((await api(appUrl, "/api/spogomi/team-form", { headers: { cookie } }, [200])).body);
          assert.equal(form.team.id, team.id);
          const categoryRows = categoryRowsByDivision.get(division.id);
          const items = categoryRows.map((category) => {
            const measurement = measurements.find((candidate) => candidate.category_code === category.code);
            assert(measurement, `${teamRef}/${category.code}: mesure manquante`);
            return { categoryRuleId: category.id, measurementKind: "mass", unit: "g", quantity: measurement.mass_grams, massGrams: measurement.mass_grams, objectCount: null, measurementMethod: "balance-synthetic", provenance: measurement.provenance_ref, arbitrationComment: null };
          });
          const first = jsonBody((await api(appUrl, "/api/spogomi/team-form", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ submissionId: null, idempotencyKey: `cachan-${teamRef.toLowerCase()}-v1`, status: "submitted", correctionReason: null, items }) }, [200])).body);
          assert(first.submission?.id, `${teamRef}: soumission absente`);
          if (sourceTeam.team_ref === "CAS-01") {
            const correction = jsonBody((await api(appUrl, "/api/spogomi/team-form", { method: "POST", headers: { cookie, "content-type": "application/json" }, body: JSON.stringify({ submissionId: null, idempotencyKey: "cachan-cas-01-v2", status: "submitted", correctionReason: "Correction contrôlée du relevé synthétique", items }) }, [200])).body);
            assert(Number(correction.submission?.version) > Number(first.submission.version));
            const audit = await supabase.from("spogomi_result_audit_events").select("action, details").eq("event_id", createdEventId).eq("team_id", team.id).order("created_at");
            assert.ifError(audit.error);
            assert(audit.data.some((row) => row.action === "corrected"));
          }
          const latest = await supabase.from("spogomi_result_submissions").select("id, status").eq("event_id", createdEventId).eq("team_id", team.id).eq("division_id", division.id).order("version", { ascending: false }).limit(1).single();
          assert.ifError(latest.error);
          const review = jsonBody((await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/results`, { teamId: team.id, submissionId: latest.data.id, divisionId: division.id, decision: "certified", reason: "Arbitrage synthétique" }, [200])).body);
          assert.equal(review.decision, "certified");
          await api(appUrl, `/api/spogomi/events/${createdEventId}/teams/${team.id}/access`, { method: "DELETE" }, [200]);
          const revoked = await api(appUrl, "/api/spogomi/team-form", { headers: { cookie } }, [401]);
          assert.equal(revoked.response.status, 401);
        }
      }
    });

    await runStep("refus-sans-session-et-sans-habilitation", async () => {
      const noSession = await api(appUrl, "/api/spogomi/team-form", {}, [401]);
      assert.equal(noSession.response.status, 401);
      if (observerUrl) {
        await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/reviewers`, { clerkId: observerId, role: "observer" }, [201]);
        const response = await api(observerUrl, `/api/spogomi/events/${createdEventId}/field-operations`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "configure", divisionId: casualDivision.id, timezoneName: "Europe/Paris", regulationVersion: regulationFor(casualDivision).regulationVersion, officialStartAt: new Date(`${operationalDate}T09:00:00+02:00`).toISOString(), collectionLimitAt: null, sortingLimitAt: null, weighingStartAt: null, weighingEndAt: null, reason: "negative capability check", provenance: "fixture:negative" }) }, [403]);
        assert.equal(response.response.status, 403);
      }
    });

    await runStep("clôture-indépendante-sport-environnement", async () => {
      for (const division of [wcDivision, casualDivision]) {
        for (const team of teamsByDivision.get(division.id)) {
          const teamRef = `${division.division_type === "world_cup" ? "WC" : "CAS"}-${String(team.team_number).padStart(2, "0")}`;
          const measured = measuredTeamIds.has(teamRef);
          await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/closure`, { action: "decide", divisionId: division.id, teamId: team.id, status: measured ? "present_measured" : "excluded", sportEligible: measured, environmentalEligibility: measured ? "eligible" : "excluded", reason: measured ? "Mesures synthétiques certifiées" : "Aucune mesure initiale ; exclusion explicite de la simulation", decisionVersion: 1 }, [200]);
        }
      }
      const decisions = await supabase.from("spogomi_team_closure_decisions").select("team_id, division_id, status, sport_eligible, environmental_eligibility, decision_version").eq("event_id", createdEventId).eq("is_current", true);
      assert.ifError(decisions.error);
      assert.equal(decisions.data.length, 11);
      assert(decisions.data.every((row) => row.decision_version === 1));
    });

    await runStep("consolidation-environnementale-et-classements", async () => {
      const preview = jsonBody((await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/consolidation`, { action: "preview" }, [200])).body);
      assert.equal(preview.projection.readyForPublication, true);
      assert.equal(preview.projection.teamsIncluded, 8);
      await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/consolidation`, { action: "publish", sourceHash: preview.projection.sourceHash }, [200]);
      const rankings = jsonBody((await jsonApi(appUrl, `/api/spogomi/events/${createdEventId}/rankings`, {}, [200])).body);
      assert.equal(rankings.status, "published");
      assert.equal(rankings.divisions.length, 2);
    });

    let slug;
    await runStep("publication-publique-export-XLSX-et-projections", async () => {
      const current = jsonBody((await api(appUrl, `/api/spogomi/events/${createdEventId}`)).body);
      slug = current.event.event_slug;
      assert(slug);
      await api(appUrl, `/api/spogomi/events/${createdEventId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ publicVisibility: "published", publicResultsVisibility: "certified" }) }, [200]);
      const exported = await api(appUrl, `/api/spogomi/events/${createdEventId}/export.xlsx`, {}, [200]);
      const workbook = XLSX.read(Buffer.from(exported.body), { type: "buffer" });
      assert(workbook.SheetNames.length > 0);
      const exportText = workbook.SheetNames.map((name) => JSON.stringify(XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1 }))).join(" ");
      assert(!exportText.includes("PLACE-"));
      const publicResponse = jsonBody((await api(appUrl, `/api/spogomi/public/events/${encodeURIComponent(slug)}`)).body);
      assert(publicResponse.results);
      const publicText = JSON.stringify(publicResponse.results);
      assert(publicText.includes("World Cup") || publicText.includes("world_cup"));
      assert(publicText.includes("Casual") || publicText.includes("casual"));
      assert(!publicText.includes("PLACE-"));
      assert(!publicText.includes("display_name"));
      const dbItems = await supabase.from("spogomi_result_items").select("quantity, mass_grams, object_count, division_id, category_rule_id").eq("event_id", createdEventId);
      assert.ifError(dbItems.error);
      assert(dbItems.data.some((item) => item.mass_grams === 0 && item.quantity === 0));
      assert(dbItems.data.some((item) => item.mass_grams === 100 && item.object_count === null));
      for (const team of fixture.teams.filter((candidate) => candidate.expected_score !== null)) {
        const expected = measurementsFor(team.team_ref).reduce((sum, item) => {
          const division = fixture.divisions.find((candidate) => candidate.division_ref === team.division_ref);
          const category = division.categories.find((candidate) => candidate.code === item.category_code);
          return sum + item.mass_grams * category.points_per_kg / 1000;
        }, 0);
        assertNear(expected, team.expected_score, `${team.team_ref} score fixture`);
      }
    });

    await runStep("rendu-navigateur-authentifié-local", async () => {
      const browser = await chromium.launch({ headless: true });
      try {
        const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
        await page.goto(`${appUrl}/spogomi/${encodeURIComponent(slug)}/espace`, { waitUntil: "domcontentloaded" });
        await assert.rejects(async () => page.getByText("Édition introuvable").waitFor({ state: "visible", timeout: 500 }), /timeout/i);
        await page.goto(`${appUrl}/spogomi/${encodeURIComponent(slug)}`, { waitUntil: "domcontentloaded" });
        await assert.rejects(async () => page.getByText("Édition introuvable").waitFor({ state: "visible", timeout: 500 }), /timeout/i);
        assert((await page.locator("body").innerText()).includes("DEMONSTRATION / NON OFFICIEL"));
      } finally { await browser.close(); }
    });

    console.log(`EXECUTED_SPOGOMI_INTEGRATION: Cachan mixed fixture completed with ${steps.filter((step) => step.status === "PASS").length} PASS steps.`);
  } finally {
    await stopApp(observerServer);
    await stopApp(ownerServer);
    if (createdEventId) {
      await supabase.from("spogomi_events").delete().eq("id", createdEventId);
    }
  }
}

main().catch((error) => {
  console.error("SPOGOMI_CACHAN_INTEGRATION_FAIL", error instanceof Error ? error.stack ?? error.message : String(error));
  console.log(`SPOGOMI_CACHAN_SUMMARY ${JSON.stringify(steps)}`);
  process.exitCode = 1;
});
