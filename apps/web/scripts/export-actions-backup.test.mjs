import assert from "node:assert/strict";
import test from "node:test";
import { exportActionBackup } from "./export-actions-backup.mjs";

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
