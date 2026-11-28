import assert from "node:assert/strict";
import test from "node:test";
import { exportActionBackup } from "./export-actions-backup.mjs";
import { generatePublicActionFiches, mergePublicActionSnapshot } from "./action-public-fiches.mjs";

const actionId = "11111111-1111-4111-8111-111111111111";

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function actionRow(id = actionId, createdAt = "2026-10-01T10:00:00.000Z") {
  return {
    id,
    created_at: createdAt,
    created_by_clerk_id: "user_backup_owner",
    action_date: "2026-10-01",
    location_label: "Paris",
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {},
    published_at: null,
    volunteers_count: 3,
    children_count: 1,
    adult_count: 2,
    retired_count: 0,
  };
}

function organizerRow(index, relatedActionId = actionId) {
  return {
    id: uuid(index),
    action_id: relatedActionId,
    created_at: "2026-10-01T10:00:00.000Z",
  };
}

function makeSupabase({ rowsByTable = {}, pageCap = Number.POSITIVE_INFINITY, errorAt, responseAt } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const state = { from: 0, to: -1, orders: [], filters: [] };
      const query = {
        select() {
          return query;
        },
        in(column, values) {
          state.filters.push({ column, values: [...values] });
          return query;
        },
        order(column, options) {
          state.orders.push({ column, ...options });
          return query;
        },
        range(from, to) {
          state.from = from;
          state.to = to;
          calls.push({ table, from, to, orders: [...state.orders], filters: [...state.filters] });
          return query;
        },
        then(resolve) {
          const call = calls.at(-1);
          const errorMessage = errorAt?.(call);
          if (errorMessage) {
            return Promise.resolve(resolve({ data: null, error: { message: errorMessage } }));
          }
          const response = responseAt?.(call);
          if (response) return Promise.resolve(resolve(response));
          let rows = rowsByTable[table] ?? (table === "actions" ? [actionRow()] : []);
          for (const filter of state.filters) {
            rows = rows.filter((row) => filter.values.includes(row[filter.column]));
          }
          rows = [...rows].sort((left, right) => {
            for (const order of state.orders) {
              const leftValue = left[order.column] ?? "";
              const rightValue = right[order.column] ?? "";
              if (leftValue === rightValue) continue;
              const comparison = leftValue < rightValue ? -1 : 1;
              return order.ascending ? comparison : -comparison;
            }
            return 0;
          });
          const pageEnd = Math.min(state.to + 1, state.from + pageCap);
          return Promise.resolve(resolve({
            data: rows.slice(state.from, pageEnd),
            error: null,
          }));
        },
      };
      return query;
    },
  };
  return { supabase, calls };
}

test("paginates root actions after a short page with a total stable order", async () => {
  const actions = Array.from({ length: 1201 }, (_, index) =>
    actionRow(uuid(index + 1), "2026-10-01T10:00:00.000Z"),
  );
  const relations = actions.map((action, index) => organizerRow(index + 1, action.id));
  const { supabase, calls } = makeSupabase({
    rowsByTable: { actions, action_organizers: relations },
    pageCap: 400,
  });

  const backup = await exportActionBackup(supabase, "2026-10-18T10:00:00.000Z");
  const actionPages = calls.filter(({ table }) => table === "actions");
  const organizerPages = calls.filter(({ table }) => table === "action_organizers");
  const expectedActionIds = [...actions]
    .sort((left, right) => (right.id < left.id ? -1 : right.id > left.id ? 1 : 0))
    .map((action) => action.id);

  assert.deepEqual(
    actionPages.map(({ from, to }) => [from, to]),
    [[0, 999], [400, 1399], [800, 1799], [1200, 2199], [1201, 2200]],
  );
  assert.ok(actionPages.every(({ orders }) => orders.map(({ column }) => column).join(",") === "created_at,id"));
  assert.deepEqual(backup.tables.actions.map((action) => action.id), expectedActionIds);
  assert.equal(backup.counts.actions, 1201);
  assert.equal(backup.counts.action_organizers, 1201);
  assert.equal(new Set(backup.tables.action_organizers.map((row) => row.action_id)).size, 1201);
  assert.equal(backup.tables.actions[0].children_count, 1);
  assert.equal(backup.tables.actions[0].adult_count, 2);
  assert.equal(backup.tables.actions[0].retired_count, 0);
  assert.ok(organizerPages.every(({ filters }) => filters.length === 1 && filters[0].column === "action_id"));
  assert.equal(organizerPages[0].filters[0].values.length, 500);
});

test("rejects an interrupted root read without returning a backup", async () => {
  const actions = Array.from({ length: 1201 }, (_, index) => actionRow(uuid(index + 1)));
  const { supabase, calls } = makeSupabase({
    rowsByTable: { actions },
    pageCap: 400,
    errorAt: (call) => call.table === "actions" && call.from === 400
      ? "simulated root page failure"
      : null,
  });

  let backup;
  await assert.rejects(
    async () => {
      backup = await exportActionBackup(supabase, "2026-10-18T10:00:00.000Z");
    },
    /actions: simulated root page failure/,
  );

  assert.equal(backup, undefined);
  assert.deepEqual(calls.filter(({ table }) => table === "actions").map(({ from }) => from), [0, 400]);
  assert.equal(calls.some(({ table }) => table === "action_organizers"), false);
});

test("rejects an anomalous root response instead of treating it as exhaustion", async () => {
  const actions = Array.from({ length: 1201 }, (_, index) => actionRow(uuid(index + 1)));
  const { supabase } = makeSupabase({
    rowsByTable: { actions },
    pageCap: 400,
    responseAt: (call) => call.table === "actions" && call.from === 400
      ? { data: { rows: [] }, error: null }
      : null,
  });

  await assert.rejects(
    exportActionBackup(supabase, "2026-10-18T10:00:00.000Z"),
    /actions: invalid page response/,
  );
});

test("rejects a non-tabular intermediate relation page instead of treating it as exhausted", async () => {
  const relations = Array.from({ length: 1201 }, (_, index) => organizerRow(index + 1));
  const { supabase, calls } = makeSupabase({
    rowsByTable: { actions: [actionRow()], action_organizers: relations },
    responseAt: (call) => call.table === "action_organizers" && call.from === 1000
      ? { data: null, error: null }
      : null,
  });
  let backup;

  await assert.rejects(
    async () => {
      backup = await exportActionBackup(supabase, "2026-10-18T00:00:00.000Z");
    },
    /action_organizers: invalid page response/,
  );

  assert.equal(backup, undefined);
  assert.deepEqual(
    calls.filter(({ table }) => table === "action_organizers").map(({ from }) => from),
    [0, 1000],
  );
  assert.equal(calls.some(({ table }) => table === "action_registrations"), false);
});

test("paginates a relation group beyond 1000 rows with stable ordering", async () => {
  const relations = Array.from({ length: 1201 }, (_, index) => organizerRow(index + 1));
  const { supabase, calls } = makeSupabase({
    rowsByTable: { actions: [actionRow()], action_organizers: relations },
    pageCap: 400,
  });

  const backup = await exportActionBackup(supabase, "2026-10-18T10:00:00.000Z");
  const organizerPages = calls.filter(({ table }) => table === "action_organizers");

  assert.equal(backup.tables.action_organizers.length, 1201);
  assert.deepEqual(
    organizerPages.map(({ from, to }) => [from, to]),
    [[0, 999], [400, 1399], [800, 1799], [1200, 2199], [1201, 2200]],
  );
  assert.deepEqual(organizerPages[0].orders.map(({ column }) => column), ["created_at", "id"]);
});

test("exports delegated editors and their audit history with stable multi-page ordering", async () => {
  const editors = Array.from({ length: 1001 }, (_, index) => ({
    action_id: actionId,
    clerk_user_id: `user-editor-${index}`,
    granted_by_clerk_id: "user_backup_owner",
    granted_at: "2026-10-01T10:00:00.000Z",
  }));
  const audit = Array.from({ length: 1001 }, (_, index) => ({
    id: index + 1,
    action_id: actionId,
    request_id: uuid(index + 1),
    actor_clerk_id: "user_backup_owner",
    target_clerk_id: `user-editor-${index}`,
    operation: "grant",
    before_granted: false,
    after_granted: true,
    created_at: "2026-10-01T10:00:00.000Z",
  }));
  const { supabase, calls } = makeSupabase({
    rowsByTable: { actions: [actionRow()], action_form_editors: editors, action_form_editor_audit: audit },
    pageCap: 400,
  });

  const backup = await exportActionBackup(supabase, "2026-10-18T10:00:00.000Z");
  const editorPages = calls.filter(({ table }) => table === "action_form_editors");
  const auditPages = calls.filter(({ table }) => table === "action_form_editor_audit");
  assert.equal(backup.tables.action_form_editors.length, 1001);
  assert.equal(backup.tables.action_form_editor_audit.length, 1001);
  assert.deepEqual(editorPages[0].orders.map(({ column }) => column), ["granted_at", "action_id", "clerk_user_id"]);
  assert.deepEqual(auditPages[0].orders.map(({ column }) => column), ["created_at", "id"]);
  assert.deepEqual(editorPages.map(({ from }) => from), [0, 400, 800, 1001]);
  assert.deepEqual(auditPages.map(({ from }) => from), [0, 400, 800, 1001]);
});

test("rejects duplicate relations instead of producing a valid backup", async () => {
  const first = organizerRow(1);
  const relations = [
    ...Array.from({ length: 1000 }, (_, index) => organizerRow(index + 1)),
    first,
  ];
  const { supabase } = makeSupabase({
    rowsByTable: { actions: [actionRow()], action_organizers: relations },
  });

  await assert.rejects(
    exportActionBackup(supabase, "2026-10-18T10:00:00.000Z"),
    /tables\.action_organizers contains duplicate id/,
  );
});

test("rejects a partial relation read when a later page fails", async () => {
  const relations = Array.from({ length: 1201 }, (_, index) => organizerRow(index + 1));
  const { supabase } = makeSupabase({
    rowsByTable: { actions: [actionRow()], action_organizers: relations },
    errorAt: (call) => call.table === "action_organizers" && call.from === 1000
      ? "simulated page failure"
      : null,
  });

  await assert.rejects(
    exportActionBackup(supabase, "2026-10-18T10:00:00.000Z"),
    /action_organizers: simulated page failure/,
  );
});

test("generates deterministic public fiches from the validated snapshot using a private-field whitelist", async () => {
  const candidates = [
    ["b1f71234-21e2-4954-8526-f45f238249ae", "2026-02-14"],
    ["15ee0be8-3747-48c8-9de0-c12b40e79eb9", "2026-03-06"],
    ["e168fb7a-034c-4b22-9b5f-b138188bf1e2", "2026-03-21"],
    ["da367653-530f-4554-9e9b-164519336f52", "2026-04-11"],
    ["f92499c2-aa14-4a51-8b56-c835a7d436f6", "2026-04-22"],
  ].map(([id, date], index) => ({
    ...actionRow(id, `${date}T12:00:00.000Z`),
    action_date: date,
    location_label: `Public place ${index}`,
    organizer_type: "association",
    organizer_name: "Brigade Verte",
    waste_kg: index === 0 ? null : index === 1 ? 0 : index,
    cigarette_butts: 0,
    collectors_count: null,
    notes: "PRIVATE_SENTINEL",
    preparation_data: { secret: "PRIVATE_PREPARATION_SENTINEL" },
  }));
  const { supabase } = makeSupabase({ rowsByTable: { actions: candidates } });
  const backup = await exportActionBackup(supabase, "2026-11-28T10:00:00.000Z");
  const first = generatePublicActionFiches(backup);
  const again = generatePublicActionFiches(backup);

  assert.deepEqual(first, again);
  assert.equal(first.length, 5);
  assert.match(first[0].markdown, /Masse hors mégots : Inconnu/);
  assert.match(first[1].markdown, /Masse hors mégots : 0 kg/);
  assert.doesNotMatch(first.map((item) => item.markdown).join("\n"), /PRIVATE_SENTINEL|preparation_data/);
  const existing = "# Historique relu\nSource et hypothèses conservées.\n";
  const merged = mergePublicActionSnapshot(existing, first[0].markdown);
  assert.match(merged, /Source et hypothèses conservées/);
  assert.equal(mergePublicActionSnapshot(merged, first[0].markdown), merged);
});
