import { describe, expect, it, vi } from "vitest";
import type { SpogomiRosterRow } from "./types";

vi.mock("server-only", () => ({}));

import { buildTicketParticipantPatch } from "./ticket-reconciliation";

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
});
