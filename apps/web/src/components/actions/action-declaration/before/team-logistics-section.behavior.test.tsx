/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialFormState } from "../payload";
import { TeamLogisticsSection } from "./team-logistics-section";
import type { FormState } from "../model";

vi.mock("../../action-field-roles-panel", () => ({
  ActionFieldRolesPanel: () => <div data-testid="field-roles-panel" />,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let host: HTMLDivElement;
let root: Root;

function renderTeam(form: FormState, validationIssueFields: string[] = []) {
  act(() => {
    root.render(
      <TeamLogisticsSection
        form={form}
        updateField={vi.fn()}
        updateFields={vi.fn()}
        userMetadata={{ userId: "user-1", displayName: "Alex Martin" }}
        showGroupJoinHelp={false}
        onToggleGroupJoinHelp={vi.fn()}
        invitationStatuses={[]}
        validationIssueFields={validationIssueFields}
      />,
    );
  });
}

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("TeamLogisticsSection", () => {
  it("shows four named main disclosures and keeps essential safety guidance visible", () => {
    renderTeam(createInitialFormState("Organisateur", "action"));

    const mainDisclosures = Array.from(host.querySelectorAll<HTMLDetailsElement>("details[id^='team-logistics-']"));
    expect(mainDisclosures.map((item) => item.id)).toEqual([
      "team-logistics-coordination",
      "team-logistics-equipment",
      "team-logistics-safety",
      "team-logistics-flow",
    ]);
    expect(mainDisclosures.map((item) => item.querySelector("summary")?.textContent?.trim())).toEqual([
      expect.stringContaining("Coordination et participants"),
      expect.stringContaining("Matériel et équipements"),
      expect.stringContaining("Sécurité et accessibilité"),
      expect.stringContaining("Logistique et déroulement"),
    ]);
    expect(host.querySelector("#team-logistics-safety")?.hasAttribute("open")).toBe(false);
    expect(host.textContent).toContain("Ne ramasser que les déchets identifiés et sûrs");
    expect(host.textContent).toContain("Ne pas toucher aux objets dangereux");
    expect(host.textContent).not.toContain(">Complet<");
    expect(host.querySelectorAll("#before-volunteer-registration-title")).toHaveLength(1);
  });

  it("summarizes declared partners, organizer accounts, invitees, and expected headcount separately", () => {
    const form = createInitialFormState("Lycée Ellipse", "action");
    form.organizerName = "Lycée Ellipse";
    form.volunteersCount = "50";
    form.organizerAccounts = "account-1";
    form.participantAccounts = ["member-1", "member-2"];
    form.organizationalRelations = {
      ...form.organizationalRelations,
      partners: [{ organizerType: "association", name: "Association locale", role: "logistics" }],
    };
    renderTeam(form);

    const summary = host.querySelector("#team-logistics-coordination summary")?.textContent ?? "";
    expect(summary).toContain("1 partenaire déclaré");
    expect(summary).toContain("1 compte organisateur sélectionné");
    expect(summary).toContain("2 membres sélectionnés pour invitation");
    expect(summary).toContain("Effectif attendu : 50 (prévision)");
    expect(host.textContent).toContain("Lycée Ellipse");
    expect(host.textContent).toContain("Alex Martin");
    expect(host.textContent).toContain("Les partenaires déclarés décrivent l’organisation et n’accordent pas d’accès");
    expect(host.textContent).toContain("ne confirment ni inscription ni présence");
    expect(host.textContent).toContain("les responsabilités terrain s’appuient sur les participations confirmées");
  });

  it("opens the disclosure that contains a field validation issue", () => {
    const form = createInitialFormState("Organisateur", "action");
    renderTeam(form, ["logisticsNotes"]);

    expect(host.querySelector<HTMLDetailsElement>("#team-logistics-flow")?.open).toBe(true);
    expect(host.querySelector<HTMLDetailsElement>("#team-logistics-coordination")?.open).toBe(false);
  });

  it("shows contextual school and multiple-zone preparation guidance without inferring attendance", () => {
    const form = createInitialFormState("Lycée", "action");
    form.organizerType = "school";
    form.actionContext = "school";
    form.interventionMode = { mode: "multi_zone" } as FormState["interventionMode"];
    renderTeam(form);

    expect(host.textContent).toContain("pas des obligations légales universelles");
    expect(host.textContent).toContain("Plusieurs groupes ou zones");
    expect(host.textContent).toContain("Aucun nombre de groupes ni de personnes présentes n’est déduit automatiquement");
  });
});
