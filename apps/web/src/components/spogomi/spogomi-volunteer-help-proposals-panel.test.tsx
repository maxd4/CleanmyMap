/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot } from "react-dom/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpogomiVolunteerHelpProposalsPanel } from "./spogomi-volunteer-help-proposals-panel";
const testEmail = ["ada", "example.test"].join("@");

describe("SpogomiVolunteerHelpProposalsPanel", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true); });

  it("loads a private organizer queue and processes a decision without a public route", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposals: [{ id: "proposal-1", requesterClerkId: "user-1", contactFirstName: "Ada", contactLastName: "Lovelace", contactEmail: testEmail, contactPhone: null, helpType: "Accueil", motivation: "Aider l’équipe.", usefulSkills: "Organisation", cleanwalkExperience: "", status: "pending", decisionNote: null, createdAt: "2026-11-09T10:00:00.000Z" }] }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ proposal: { id: "proposal-1", requesterClerkId: "user-1", contactFirstName: "Ada", contactLastName: "Lovelace", contactEmail: testEmail, contactPhone: null, helpType: "Accueil", motivation: "Aider l’équipe.", usefulSkills: "Organisation", cleanwalkExperience: "", status: "accepted", decisionNote: null, createdAt: "2026-11-09T10:00:00.000Z" } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);
    await act(async () => { root.render(<SpogomiVolunteerHelpProposalsPanel eventId="event-1" />); });
    await new Promise((resolve) => window.setTimeout(resolve, 10));
    await act(async () => undefined);
    expect(container.textContent).toContain("Ada Lovelace");
    await act(async () => { (Array.from(container.querySelectorAll("button")).find((button) => button.textContent === "Retenir") as HTMLButtonElement).click(); });
    expect(fetchMock).toHaveBeenLastCalledWith("/api/spogomi/events/event-1/volunteer-help-proposals/review", expect.objectContaining({ method: "PATCH" }));
    await act(async () => root.unmount());
    container.remove();
  });
});
