import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { SpogomiRosterRow } from "./types";

vi.mock("server-only", () => ({}));

import { buildTicketParticipantPatch, hasProtectedSpogomiHumanDecision, isCachanTicketCompositionEligible, isCancelledCachanTicket, readCachanCommercialWithdrawalProofs, reconcileCachanTicketRows } from "./ticket-reconciliation";

describe("SPOGOMI ticket reconciliation", () => {
  it("limits an existing-ticket update to ticket-owned and provenance fields", () => {
    const row: SpogomiRosterRow = {
      rowNumber: 2,
      name: null,
      groupPreference: "Groupe A",
      sourceRowId: "TICKET-1",
      externalReference: "TICKET-1",
      orderReference: "ORDER-1",
      orderAlternativeReference: "ADV-1",
      ticketStatus: "Payé",
      ticketDeleted: false,
      sourceSystem: "cachan_ticketing",
      sourceFingerprint: "fingerprint",
    };
    const patch = buildTicketParticipantPatch("import-new", row);
    expect(patch).toMatchObject({
      roster_import_id: "import-new",
      external_reference: "TICKET-1",
      order_reference: "ORDER-1",
      order_alternative_reference: "ADV-1",
      ticket_status: "Payé",
      ticket_deleted: false,
      source_system: "cachan_ticketing",
    });
    expect(patch).not.toHaveProperty("display_name");
    expect(patch).not.toHaveProperty("identity_status");
    expect(patch).not.toHaveProperty("attendance_status");
    expect(patch).not.toHaveProperty("account_link_status");
    expect(patch).not.toHaveProperty("clerk_id");
    expect(patch).not.toHaveProperty("team_id");
    expect(patch).not.toHaveProperty("registration_status");
  });

  it("treats a deleted or cancelled Cachan place as ineligible without changing human decisions", () => {
    expect(isCancelledCachanTicket("Annulé", false)).toBe(true);
    expect(isCancelledCachanTicket("Payé", true)).toBe(true);
    expect(isCachanTicketCompositionEligible({
      sourceSystem: "cachan_ticketing",
      ticketStatus: "Annulé",
      ticketDeleted: false,
      registrationStatus: "registered",
    })).toBe(false);
    expect(isCachanTicketCompositionEligible({
      sourceSystem: "cachan_ticketing",
      ticketStatus: "Payé",
      ticketDeleted: false,
      registrationStatus: "registered",
    })).toBe(true);
    expect(isCachanTicketCompositionEligible({
      sourceSystem: "manual_roster",
      ticketStatus: "Annulé",
      ticketDeleted: true,
      registrationStatus: "registered",
    })).toBe(true);
  });

  it("distinguishes commercial withdrawal history from protected human decisions", () => {
    expect(hasProtectedSpogomiHumanDecision({
      attendanceStatus: "unknown",
      accountLinkStatus: "unlinked",
      clerkId: null,
      identityStatus: "unknown",
      teamId: null,
      registrationStatus: "withdrawn",
      sourceWithdrawalProven: true,
    })).toBe(false);
    expect(hasProtectedSpogomiHumanDecision({
      attendanceStatus: "unknown",
      accountLinkStatus: "unlinked",
      clerkId: null,
      identityStatus: "unknown",
      teamId: null,
      registrationStatus: "withdrawn",
      sourceWithdrawalProven: false,
    })).toBe(true);
    expect(hasProtectedSpogomiHumanDecision({
      attendanceStatus: "unknown",
      accountLinkStatus: "unlinked",
      clerkId: null,
      identityStatus: "identified",
      teamId: null,
      registrationStatus: "registered",
      sourceWithdrawalProven: true,
    })).toBe(true);
  });

  it("delegates participant, change and row-proof writes to one transactional RPC", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: {
        participantIdsByReference: { "TICKET-1": "participant-1" },
        changedRows: [2],
        conflictRows: [],
      },
      error: null,
    });
    const row: SpogomiRosterRow = {
      rowNumber: 2,
      name: null,
      groupPreference: null,
      sourceRowId: "TICKET-1",
      externalReference: "TICKET-1",
      orderReference: "ORDER-1",
      orderAlternativeReference: null,
      ticketStatus: "Payé",
      ticketDeleted: false,
      sourceSystem: "cachan_ticketing",
      sourceFingerprint: "fingerprint",
    };

    const result = await reconcileCachanTicketRows({
      supabase: { rpc } as unknown as SupabaseClient,
      eventId: "event-1",
      rosterImport: { id: "import-1", created_at: "2026-10-13T00:00:00.000Z" },
      rows: [row],
    });

    expect(rpc).toHaveBeenCalledWith("spogomi_reconcile_cachan_ticket_rows", {
      p_event_id: "event-1",
      p_roster_import_id: "import-1",
      p_rows: [row],
    });
    expect(result.participantIdsByReference.get("TICKET-1")).toBe("participant-1");
  });

  it("accepts only matching commercial withdrawal history and fails closed on a history read error", async () => {
    const query = {
      select: () => query,
      eq: () => query,
      in: () => Promise.resolve({
        data: [
          { participant_id: "participant-1", current_snapshot: { ticketStatus: "Annulé", ticketDeleted: true } },
          { participant_id: "participant-2", current_snapshot: { ticketStatus: "Payé", ticketDeleted: true } },
        ],
        error: null,
      }),
    };
    const supabase = { from: vi.fn(() => query) } as unknown as SupabaseClient;
    await expect(readCachanCommercialWithdrawalProofs({
      supabase,
      eventId: "event-1",
      participants: [
        { id: "participant-1", ticket_status: "Annulé", ticket_deleted: true },
        { id: "participant-2", ticket_status: "Annulé", ticket_deleted: true },
      ],
    })).resolves.toEqual(new Set(["participant-1"]));

    const failingQuery = {
      select: () => failingQuery,
      eq: () => failingQuery,
      in: () => Promise.resolve({ data: null, error: new Error("history unavailable") }),
    };
    await expect(readCachanCommercialWithdrawalProofs({
      supabase: { from: () => failingQuery } as unknown as SupabaseClient,
      eventId: "event-1",
      participants: [{ id: "participant-1", ticket_status: "Annulé", ticket_deleted: true }],
    })).rejects.toThrow("history unavailable");
  });

  it("rejects missing or incomplete ticket references instead of producing a partial reconciliation", async () => {
    const row: SpogomiRosterRow = {
      rowNumber: 2,
      name: null,
      groupPreference: null,
      sourceRowId: null,
      externalReference: null,
      orderReference: "ORDER-1",
      orderAlternativeReference: null,
      ticketStatus: "Payé",
      ticketDeleted: false,
      sourceSystem: "cachan_ticketing",
      sourceFingerprint: "fingerprint",
    };
    const params = {
      supabase: { rpc: vi.fn() } as unknown as SupabaseClient,
      eventId: "event-1",
      rosterImport: { id: "import-1" },
      rows: [row],
    };
    await expect(reconcileCachanTicketRows(params)).rejects.toThrow(/référence de billet/i);
    expect(params.supabase.rpc).not.toHaveBeenCalled();

    const rpc = vi.fn().mockResolvedValue({ data: { participantIdsByReference: { "TICKET-1": "participant-1" } }, error: null });
    const validRow = { ...row, sourceRowId: "TICKET-1", externalReference: "TICKET-1" };
    await expect(reconcileCachanTicketRows({ ...params, supabase: { rpc } as unknown as SupabaseClient, rows: [validRow, { ...validRow, rowNumber: 3, sourceRowId: "TICKET-2", externalReference: "TICKET-2" }] })).rejects.toThrow(/toutes les places/i);
  });
});
