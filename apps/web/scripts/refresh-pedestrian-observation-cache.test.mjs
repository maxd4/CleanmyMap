import assert from "node:assert/strict";
import test from "node:test";
import {
  buildObservationCacheFailureRequest,
  buildObservationCacheRefreshRequest,
} from "./refresh-pedestrian-observation-cache.mjs";

test("worker sends the projection, event and lease identity to the transactional RPC", () => {
  assert.deepEqual(
    buildObservationCacheRefreshRequest("projection-1", [11, 12], "worker-a", "lease-a"),
    { p_projection_version_id: "projection-1", p_event_ids: [11, 12], p_worker_id: "worker-a", p_lease_token: "lease-a" },
  );
});

test("worker failure requests retain the lease identity", () => {
  assert.deepEqual(
    buildObservationCacheFailureRequest([11], "database failure", "worker-a", "lease-a"),
    { p_event_ids: [11], p_error: "database failure", p_worker_id: "worker-a", p_lease_token: "lease-a" },
  );
});

test("worker can carry one lease identity for a multi-event batch", () => {
  const request = buildObservationCacheRefreshRequest("projection-1", [11, 12, 13], "worker-a", "lease-batch");
  assert.deepEqual(request.p_event_ids, [11, 12, 13]);
  assert.equal(request.p_lease_token, "lease-batch");
  assert.deepEqual(
    buildObservationCacheFailureRequest(request.p_event_ids, "batch failure", request.p_worker_id, request.p_lease_token),
    { p_event_ids: [11, 12, 13], p_error: "batch failure", p_worker_id: "worker-a", p_lease_token: "lease-batch" },
  );
});
