import { beforeEach, describe, expect, it, vi } from "vitest";

const requireAdminAccessMock = vi.hoisted(() => vi.fn());
const appendAdminOperationAuditMock = vi.hoisted(() => vi.fn());
const listRunbookChecksMock = vi.hoisted(() => vi.fn());
const upsertRunbookCheckMock = vi.hoisted(() => vi.fn());
const RunbookCheckPersistenceErrorMock = vi.hoisted(
  () =>
    class RunbookCheckPersistenceErrorMock extends Error {
      readonly stage: "persistence" | "post_write";
      readonly partialMutation: boolean;

      constructor(params: {
        stage: "persistence" | "post_write";
        partialMutation: boolean;
      }) {
        super("raw runbook persistence error");
        this.stage = params.stage;
        this.partialMutation = params.partialMutation;
      }
    },
);

vi.mock("@/lib/authz", () => ({
  requireAdminAccess: requireAdminAccessMock,
}));

vi.mock("@/lib/http/auth-responses", () => ({
  adminAccessErrorJsonResponse: () => new Response("forbidden", { status: 403 }),
}));

vi.mock("@/lib/admin/operation-audit", () => ({
  appendAdminOperationAudit: appendAdminOperationAuditMock,
}));

vi.mock("@/lib/sections/runbook-checks-store", () => ({
  listRunbookChecks: listRunbookChecksMock,
  upsertRunbookCheck: upsertRunbookCheckMock,
  RunbookCheckPersistenceError: RunbookCheckPersistenceErrorMock,
}));

import { GET, POST } from "./route";

const previousChecks = {
  version: "2026.04",
  checks: [
    {
      profile: "admin" as const,
      status: "pass" as const,
      durationSeconds: 240,
      lastRunAt: "2026-08-26T10:00:00.000Z",
      notes: ["old private note"],
    },
  ],
};

const updatedChecks = {
  version: "2026.04",
  checks: [
    {
      profile: "admin" as const,
      status: "fail" as const,
      durationSeconds: 300,
      lastRunAt: "2026-08-27T10:00:00.000Z",
      notes: ["new private note"],
    },
  ],
};

const validPayload = {
  profile: "admin",
  status: "fail",
  durationSeconds: 300,
  notes: ["new private note"],
};

function request(body: BodyInit): Request {
  return new Request("http://localhost/api/sandbox/runbook-checks", {
    method: "POST",
    body,
    headers: { "Content-Type": "application/json" },
  });
}

describe("/api/sandbox/runbook-checks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdminAccessMock.mockResolvedValue({ ok: true, userId: "admin-1" });
    appendAdminOperationAuditMock.mockResolvedValue(undefined);
    listRunbookChecksMock.mockResolvedValue(previousChecks);
    upsertRunbookCheckMock.mockResolvedValue(updatedChecks);
  });

  it("keeps GET unaudited", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).not.toHaveBeenCalled();
  });

  it("audits one success with allowlisted before and after snapshots", async () => {
    const response = await POST(request(JSON.stringify(validPayload)));

    expect(response.status).toBe(200);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      actorUserId: "admin-1",
      operationType: "admin_operation",
      outcome: "success",
      targetId: "runbook-admin",
      details: {
        operation: "upsert_runbook_check",
        stage: "post_write",
        previousValue: {
          profile: "admin",
          status: "pass",
          durationSeconds: 240,
          notesChanged: false,
        },
        newValue: {
          profile: "admin",
          status: "fail",
          durationSeconds: 300,
          notesChanged: true,
        },
      },
    });
    expect(Object.keys(audit.details.previousValue)).toEqual([
      "profile",
      "status",
      "durationSeconds",
      "notesChanged",
    ]);
    expect(Object.keys(audit.details.newValue)).toEqual([
      "profile",
      "status",
      "durationSeconds",
      "notesChanged",
    ]);
    expect(JSON.stringify(audit)).not.toContain("private note");
  });

  it("audits invalid JSON without calling the store", async () => {
    const response = await POST(request("{"));

    expect(response.status).toBe(400);
    expect(listRunbookChecksMock).not.toHaveBeenCalled();
    expect(upsertRunbookCheckMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "validation",
        partialMutation: false,
        code: "invalid_json",
      },
    });
  });

  it("audits invalid payload without calling the store", async () => {
    const response = await POST(
      request(JSON.stringify({ ...validPayload, durationSeconds: 0 })),
    );

    expect(response.status).toBe(400);
    expect(listRunbookChecksMock).not.toHaveBeenCalled();
    expect(upsertRunbookCheckMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      targetId: "runbook-admin",
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "validation",
        partialMutation: false,
        code: "invalid_payload",
      },
    });
  });

  it("audits lookup failures without raw errors", async () => {
    listRunbookChecksMock.mockRejectedValueOnce(new Error("raw lookup error"));

    const response = await POST(request(JSON.stringify(validPayload)));

    expect(response.status).toBe(503);
    expect(upsertRunbookCheckMock).not.toHaveBeenCalled();
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "lookup",
        partialMutation: false,
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw lookup error");
  });

  it("audits persistence failures as non-partial", async () => {
    upsertRunbookCheckMock.mockRejectedValueOnce(new Error("raw write error"));

    const response = await POST(request(JSON.stringify(validPayload)));

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    const audit = appendAdminOperationAuditMock.mock.calls[0]?.[0];
    expect(audit).toMatchObject({
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "persistence",
        partialMutation: false,
        code: "persistence_failed",
      },
    });
    expect(JSON.stringify(audit)).not.toContain("raw write error");
    expect(JSON.stringify(audit)).not.toContain("private note");
  });

  it("audits a known post-write failure as partial", async () => {
    upsertRunbookCheckMock.mockRejectedValueOnce(
      new RunbookCheckPersistenceErrorMock({
        stage: "post_write",
        partialMutation: true,
      }),
    );

    const response = await POST(request(JSON.stringify(validPayload)));

    expect(response.status).toBe(503);
    expect(appendAdminOperationAuditMock).toHaveBeenCalledTimes(1);
    expect(appendAdminOperationAuditMock.mock.calls[0]?.[0]).toMatchObject({
      outcome: "error",
      details: {
        operation: "upsert_runbook_check",
        stage: "post_write",
        partialMutation: true,
        code: "persistence_failed",
      },
    });
  });
});
