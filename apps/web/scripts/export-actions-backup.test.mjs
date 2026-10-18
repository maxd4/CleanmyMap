import assert from "node:assert/strict";
import test from "node:test";
import { exportActionBackup } from "./export-actions-backup.mjs";

const actionId = "11111111-1111-4111-8111-111111111111";

function uuid(index) {
  return `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
}

function actionRow() {
  return {
    id: actionId,
    created_by_clerk_id: "user_backup_owner",
    action_date: "2026-10-01",
    location_label: "Paris",
    status: "approved",
    action_phase: "post_action_complete",
    preparation_data: {},
    published_at: null,
  };
}

function organizerRow(index) {
  return {
    id: uuid(index),
    action_id: actionId,
    created_at: "2026-10-01T10:00:00.000Z",
  };
}

function makeSupabase({ rowsByTable = {}, pageCap = Number.POSITIVE_INFINITY, errorAt } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      const state = { from: 0, to: -1, orders: [] };
      const query = {
        select() {
          return query;
        },
        in() {
          return query;
        },
        order(column, options) {
          state.orders.push({ column, ...options });
          return query;
        },
        range(from, to) {
          state.from = from;
          state.to = to;
          calls.push({ table, from, to, orders: [...state.orders] });
          return query;
        },
        then(resolve) {
          const call = calls.at(-1);
          const errorMessage = errorAt?.(call);
          if (errorMessage) {
            return Promise.resolve(resolve({ data: null, error: { message: errorMessage } }));
          }
          const rows = rowsByTable[table] ?? (table === "actions" ? [actionRow()] : []);
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
