import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: null as unknown,
}));

vi.mock("@clerk/nextjs", () => ({ useUser: () => ({ user: mocks.user }) }));

import { usePartnerOnboarding } from "./use-partner-onboarding";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type HookResult = ReturnType<typeof usePartnerOnboarding>;

function renderHook() {
  let result!: HookResult;
  let renderer!: ReactTestRenderer;
  function Harness() {
    result = usePartnerOnboarding();
    return null;
  }
  act(() => { renderer = create(React.createElement(Harness)); });
  return {
    get result() { return result; },
    unmount() { act(() => renderer.unmount()); },
  };
}

function event() {
  return { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;
}

describe("usePartnerOnboarding", () => {
  beforeEach(() => {
    mocks.user = {
      firstName: "Ada",
      username: "ada-lovelace",
      primaryEmailAddress: { emailAddress: "ada.example.test" },
    };
    vi.stubGlobal("fetch", vi.fn());
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
  });

  it("déduit les contacts Clerk, déduplique les quartiers et les arrondissements", () => {
    const hook = renderHook();
    act(() => {
      hook.result.setCoverageQuartierInput("  Saint-Martin, République; Saint-Martin ");
    });
    act(() => { hook.result.addCoverageQuartiers(); });
    act(() => {
      hook.result.toggleArrondissement(10);
      hook.result.toggleArrondissement(3);
      hook.result.toggleArrondissement(10);
      hook.result.toggleArrondissement(10);
    });
    expect(hook.result.coverage).toEqual({ arrondissements: [3, 10], quartiers: ["Saint-Martin", "République"] });
    expect(hook.result.contactName).toBe("Ada");
    expect(hook.result.contactDetails).toBe("ada.example.test");
    expect(hook.result.coverageQuartierInput).toBe("");
    hook.unmount();
  });

  it("gère les périmètres alternatifs, les créneaux et le dernier type de contribution", () => {
    const hook = renderHook();
    act(() => {
      hook.result.setPartnerScope("national");
      hook.result.setCoverageQuartierInput("Quartier");
    });
    act(() => { hook.result.addCoverageQuartiers(); });
    act(() => {
      hook.result.addAvailabilitySlot();
      hook.result.removeAvailabilitySlot(1);
      hook.result.removeAvailabilitySlot(0);
    });
    expect(hook.result.coverage.arrondissements).toEqual([]);
    expect(hook.result.availabilitySlots).toHaveLength(1);
    act(() => { hook.result.toggleContribution("accueil"); });
    expect(hook.result.contributionTypes).toEqual(["accueil"]);
    expect(hook.result.contributionError).toContain("au moins un type");
    act(() => { hook.result.setContactNameTouched(true); hook.result.setContactName("  Contact manuel "); });
    expect(hook.result.contactName).toBe("  Contact manuel ");
    hook.unmount();
  });

  it("refuse les contraintes locales, créneaux invalides et contributions vides sans conserver le verrou", async () => {
    const hook = renderHook();
    const submit = vi.mocked(fetch);
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(hook.result.errorMessage).toContain("arrondissement");
    expect(submit).not.toHaveBeenCalled();

    act(() => { hook.result.toggleArrondissement(1); hook.result.updateAvailabilitySlot(0, "end", "08:00"); });
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(hook.result.errorMessage).toContain("heure de début");

    act(() => { hook.result.updateAvailabilitySlot(0, "end", "18:00"); });
    act(() => { hook.result.toggleContribution("accueil"); });
    expect(hook.result.contributionTypes).toEqual(["accueil"]);
    expect(hook.result.contributionError).toContain("au moins un type");
    hook.unmount();
  });

  it("transmet le payload exact, protège la double soumission et nettoie le verrou après erreur", async () => {
    const response = { ok: true, json: async () => ({ requestId: "req-42" }) };
    const fetchMock = vi.mocked(fetch).mockResolvedValue(response as Response);
    const hook = renderHook();
    act(() => {
      hook.result.setPartnerScope("france");
      hook.result.setOrganizationName("  CleanMyMap  ");
      hook.result.setOrganizationType("association");
      hook.result.setLegalIdentity("RNA-42");
      hook.result.setAvailabilityNote("  Matériel disponible  ");
      hook.result.setMotivation("Aider");
      hook.result.setRelayActions("Relais locaux");
      hook.result.setCoverageQuartierInput("Centre");
      hook.result.setContactName("Contact");
      hook.result.setContactDetails("contact.example.test");
      hook.result.setHoneypot("");
    });
    act(() => { hook.result.addCoverageQuartiers(); });
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(fetchMock).toHaveBeenCalledWith("/api/partners/onboarding-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationName: "  CleanMyMap  ",
        organizationType: "association",
        partnerScope: "france",
        legalIdentity: "RNA-42",
        coverage: { arrondissements: [], quartiers: ["Centre"] },
        contributionTypes: ["accueil"],
        relayActions: "Relais locaux",
        availability: { slots: [{ day: "tue", start: "09:00", end: "18:00" }], note: "Matériel disponible" },
        contactName: "Contact",
        contactChannel: "Email",
        contactDetails: "contact.example.test",
        motivation: "Aider",
        publicWebsiteConsent: false,
        honeypot: "",
        submittedAt: 1_700_000_000_000,
      }),
    });
    expect(hook.result.message).toContain("req-42");
    const firstSubmittedAt = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).submittedAt;

    fetchMock.mockRejectedValueOnce(new Error("réseau"));
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(hook.result.errorMessage).toBe("réseau");
    const secondSubmittedAt = JSON.parse(fetchMock.mock.calls[1][1]!.body as string).submittedAt;
    expect(secondSubmittedAt).toBe(firstSubmittedAt + 1);
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ requestId: "req-43" }) } as Response);
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(hook.result.message).toContain("req-43");
    expect(JSON.parse(fetchMock.mock.calls[2][1]!.body as string).submittedAt).toBe(secondSubmittedAt);

    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => ({ requestId: "req-44" }) } as Response);
    await act(async () => { await hook.result.handleSubmit(event()); });
    expect(JSON.parse(fetchMock.mock.calls[3][1]!.body as string).submittedAt).toBe(secondSubmittedAt + 1);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    hook.unmount();
  });

  it("signale un refus HTTP et empêche une seconde requête pendant la première", async () => {
    let resolve!: (value: Response) => void;
    const pending = new Promise<Response>((res) => { resolve = res; });
    const fetchMock = vi.mocked(fetch).mockReturnValueOnce(pending);
    const hook = renderHook();
    act(() => { hook.result.setPartnerScope("national"); });
    let first!: Promise<void>;
    await act(async () => {
      first = hook.result.handleSubmit(event());
      await Promise.resolve();
      await hook.result.handleSubmit(event());
    });
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(hook.result.errorMessage).toContain("déjà en cours");
    resolve({ ok: false, json: async () => ({ error: "refus serveur" }) } as Response);
    await act(async () => { await first; });
    expect(hook.result.errorMessage).toBe("refus serveur");
    hook.unmount();
  });
});
