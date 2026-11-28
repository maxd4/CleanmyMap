import TestRenderer, { act } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { qualifyActionFormalities } from "@/lib/actions/formalities/qualification";
import { deriveActionFormalitiesFacts } from "@/lib/actions/formalities/facts";
import { buildFormalitiesWorkflowState } from "@/lib/actions/formalities/workflow";
import type { ActionFormalitiesResponse } from "@/lib/actions/http";
import type { MetropolitanContacts } from "@/lib/actions/formalities/metropolitan-contacts-contract";
import { ActionFormalitiesWorkflowPanel } from "./action-formalities-workflow-panel";
import { ActionFormalitiesEmailComposer } from "./action-formalities-email-composer";
import { ActionFormalitiesParisContactPanel } from "./action-formalities-paris-contact-panel";
import { ActionFormalitiesPrintSheet } from "./action-formalities-print-sheet";

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  fetchFormalities: vi.fn(),
  updateFormalities: vi.fn(),
  fetchContacts: vi.fn(),
}));

vi.mock("@/lib/actions/http", () => ({
  fetchActionFormalities: mocks.fetchFormalities,
  updateActionFormalities: mocks.updateFormalities,
}));
vi.mock("@/lib/actions/http-action-formalities", () => ({ fetchMetropolitanFormalitiesContacts: mocks.fetchContacts }));

const facts = {
  ...deriveActionFormalitiesFacts({
    departmentCode: "75",
    departmentName: "Paris",
    plannedObjective: "nettoyage",
    resolvedPoint: true,
    resolvedTerritory: {
      commune: { code: "75056", name: "Paris" },
      department: { code: "75", name: "Paris" },
      region: { code: "11", name: "Île-de-France" },
      specialTerritory: { code: "FR-PARIS", name: "Paris" },
      source: "geo.api.gouv.fr" as const,
    },
  }),
  publicSpace: "public_domain" as const,
  manager: { kind: "paris_city" as const, label: "Ville de Paris" },
  hasInstallations: true,
  requiresPhysicalOccupation: true,
  isPublicRoadwayActivity: false,
  isItinerant: false,
  isClaiming: false,
  localCustomaryUse: false,
  largeCrowdOrComplexInstallations: false,
};

function response(): ActionFormalitiesResponse {
  const qualification = qualifyActionFormalities(facts);
  const workflow = buildFormalitiesWorkflowState({ facts, qualification, now: "2026-11-28T10:00:00.000Z" });
  return {
    status: "ok",
    actionId: "action-1",
    facts,
    qualification,
    workflow,
    availableTransitions: Object.fromEntries(qualification.formalities.map(formality => [formality.id, ["mark_prepared"]])),
    actionData: { title: "Nettoyage à Paris", organizerName: "Association", location: "Paris", date: "2026-12-01", participantCount: 12 },
  };
}

function text(node: TestRenderer.ReactTestInstance): string {
  return node.children.map(child => typeof child === "string" || typeof child === "number" ? String(child) : text(child)).join(" ");
}

function textContent(renderer: TestRenderer.ReactTestRenderer): string {
  return renderer.root.children.map(child => typeof child === "string" || typeof child === "number" ? String(child) : text(child)).join(" ").replace(/\s+/g, " ");
}

function button(renderer: TestRenderer.ReactTestRenderer, label: string) {
  return renderer.root.findAll(node => node.type === "button").find(node => text(node).includes(label));
}

function click(node: TestRenderer.ReactTestInstance | undefined) {
  if (!node || typeof node.props.onClick !== "function") throw new Error("Expected an enabled button");
  node.props.onClick({ preventDefault() {}, stopPropagation() {} });
}

describe("ActionFormalitiesWorkflowPanel runtime", () => {
  beforeEach(() => {
    mocks.fetchFormalities.mockReset().mockResolvedValue(response());
    mocks.updateFormalities.mockReset().mockResolvedValue(response());
    mocks.fetchContacts.mockReset().mockResolvedValue({
      status: "partial",
      coverage: { status: "partial", communeCodes: ["75056"], reason: "Certains résultats restent incomplets." },
      unresolvedCommuneCodes: ["75056"],
      lookupBudget: { requestsUsed: 3, requestsAllowed: 48 },
      contacts: [],
      resources: [],
    } satisfies MetropolitanContacts);
  });

  it("shows loading and retries qualification after a provider failure", async () => {
    mocks.fetchFormalities.mockRejectedValueOnce(new Error("service indisponible")).mockResolvedValueOnce(response());
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel actionId="action-1" />); });
    expect(textContent(renderer)).toContain("service indisponible");
    await act(async () => { click(button(renderer, "Réessayer la qualification")); });
    expect(mocks.fetchFormalities).toHaveBeenLastCalledWith("action-1");
    expect(textContent(renderer)).toContain("Enregistrer les faits");
  });

  it("serializes the editable facts through the shared contract and exposes server errors for retry", async () => {
    mocks.updateFormalities.mockRejectedValueOnce(new Error("conflit serveur")).mockResolvedValueOnce(response());
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel actionId="action-1" />); });
    const save = button(renderer, "Enregistrer les faits");
    await act(async () => { click(save); });
    expect(mocks.updateFormalities).toHaveBeenCalledWith("action-1", { facts });
    expect(textContent(renderer)).toContain("conflit serveur");
    await act(async () => { click(button(renderer, "Marquer comme préparée")); });
    expect(mocks.updateFormalities).toHaveBeenLastCalledWith("action-1", { transition: { formalityId: "paris-city-public-domain-aot", kind: "mark_prepared" } });
  });

  it("returns no false qualification before a draft has enough location facts", async () => {
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel />); });
    expect(textContent(renderer)).toContain("Renseignez le lieu pour obtenir une qualification indicative");
    await act(async () => { renderer.update(<ActionFormalitiesWorkflowPanel draftFacts={facts} />); });
    expect(textContent(renderer)).toContain("Qualification indicative");
    expect(mocks.fetchFormalities).not.toHaveBeenCalled();
  });

  it("updates indicative facts and optional support through the draft callbacks", async () => {
    const onDraftFactsChange = vi.fn();
    const onReadinessChange = vi.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel draftFacts={facts} onDraftFactsChange={onDraftFactsChange} onReadinessChange={onReadinessChange} />); });
    const manager = renderer.root.findAll(node => node.type === "select").find(node => text(node.parent!).includes("Gestionnaire identifié"));
    await act(async () => { manager?.props.onChange({ target: { value: "other_public" } }); });
    const managerLabel = renderer.root.findAll(node => node.type === "input").find(node => text(node.parent!).includes("Nom du gestionnaire"));
    await act(async () => { managerLabel?.props.onChange({ target: { value: "Gestionnaire du parc" } }); });
    expect(onDraftFactsChange).toHaveBeenLastCalledWith(expect.objectContaining({ manager: { kind: "other_public", label: "Gestionnaire du parc" } }));
    const parisManager = renderer.root.findAll(node => node.type === "select").find(node => text(node.parent!).includes("Gestionnaire identifié"));
    await act(async () => { parisManager?.props.onChange({ target: { value: "paris_city" } }); });

    const equipment = renderer.root.findAll(node => node.type === "input").find(node => node.props.type === "checkbox" && text(node.parent!).includes("Demander du matériel"));
    expect(equipment).toBeDefined();
    await act(async () => { equipment?.props.onChange({ target: { checked: true } }); });
    expect(textContent(renderer)).toContain("Matériel potentiellement disponible");
    expect(onReadinessChange).toHaveBeenCalledWith(expect.objectContaining({ known: true }));
  });

  it("copies a reviewable email draft and reports clipboard failure without sending", async () => {
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { clipboard: { writeText } } });
    const formal = response().qualification.formalities[0]!;
    let renderer!: TestRenderer.ReactTestRenderer;
    try {
      await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesEmailComposer formality={formal} actionData={{ title: "Nettoyage", location: "Paris" }} recipientEmail="service@example.test" />); });
      const subject = renderer.root.findAll(node => node.type === "input")[0];
      const body = renderer.root.findAll(node => node.type === "textarea")[0];
      await act(async () => {
        subject?.props.onChange({ target: { value: "Demande révisée" } });
        body?.props.onChange({ target: { value: "Message révisé" } });
      });
      const mailLink = renderer.root.findAll(node => node.type === "a").find(node => text(node).includes("Ouvrir la messagerie"));
      expect(mailLink?.props.href).toContain("Demande%20r%C3%A9vis%C3%A9e");
      await act(async () => { click(button(renderer, "Copier le courriel")); });
      expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Message révisé"));
      expect(textContent(renderer)).toContain("Courriel copié.");
      writeText.mockRejectedValueOnce(new Error("clipboard denied"));
      await act(async () => { click(button(renderer, "Copier le courriel")); });
      expect(textContent(renderer)).toContain("Copie indisponible");
      expect(textContent(renderer)).toContain("ne marque pas la démarche comme envoyée");
    } finally {
      if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
      else Reflect.deleteProperty(globalThis, "navigator");
    }
  });

  it("recovers from a failed official contact lookup and exposes partial coverage", async () => {
    mocks.fetchContacts.mockRejectedValueOnce(new Error("offline"));
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel actionId="action-1" supportNeeds={["pickup"]} />); });
    await act(async () => { click(button(renderer, "Rechercher les services")); });
    expect(textContent(renderer)).toContain("Annuaire indisponible");
    await act(async () => { click(button(renderer, "Rechercher les services")); });
    expect(mocks.fetchContacts).toHaveBeenCalledWith("action-1", ["pickup"]);
    expect(textContent(renderer)).toContain("Recherche partielle");
    expect(textContent(renderer)).toContain("75056");
  });

  it("renders complete official contact records, their links and resource guidance", async () => {
    mocks.fetchContacts.mockResolvedValueOnce({
      status: "complete",
      coverage: { status: "resolved_point", communeCodes: ["75056"] },
      unresolvedCommuneCodes: [],
      lookupBudget: { requestsUsed: 4, requestsAllowed: 48 },
      contacts: [{
        id: "official-service", name: "Direction de la propreté", types: ["service_dechets"], communeCodes: ["75056"],
        phones: ["0102030405"], emails: ["proprete@example.test"], websites: ["https://service.example.test"],
        directoryUrl: "https://lannuaire.service-public.gouv.fr/fiche", formUrl: "https://service.example.test/form",
        retrievedAt: "2026-11-28T10:00:00.000Z", territorialRelation: "official_geographic_competence", taskCompetence: "not_verified",
      }],
      resources: [{ id: "resource", label: "SINOE", url: "https://sinoe.example.test", needs: ["pickup"], guidance: "Confirmer la collecte." }],
    } satisfies MetropolitanContacts);
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesWorkflowPanel actionId="action-1" supportNeeds={["pickup"]} />); });
    await act(async () => { click(button(renderer, "Rechercher les services")); });
    expect(textContent(renderer)).toContain("Direction de la propreté");
    expect(textContent(renderer)).toContain("Fiche officielle DILA");
    expect(textContent(renderer)).toContain("Formulaire de contact");
    expect(textContent(renderer)).toContain("SINOE");
    expect(textContent(renderer)).toContain("Le type de service aide à l’orientation");
  });

  it("keeps the Paris area selector controlled and restores print styles after printing", async () => {
    const contactFormality = response().qualification.formalities[0]!;
    const onArrondissementsChange = vi.fn();
    let renderer!: TestRenderer.ReactTestRenderer;
    await act(async () => { renderer = TestRenderer.create(<ActionFormalitiesParisContactPanel contactFormality={contactFormality} selectedArrondissements={[]} onArrondissementsChange={onArrondissementsChange} needs={["notify"]} />); });
    const seventh = renderer.root.findAll(node => node.type === "input" && node.props.type === "checkbox")[6];
    await act(async () => { seventh?.props.onChange({ target: { checked: true } }); });
    expect(onArrondissementsChange).toHaveBeenCalledWith([7]);

    const previousDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
    const add = vi.fn();
    const remove = vi.fn();
    const print = vi.fn();
    let afterPrint: (() => void) | undefined;
    Object.defineProperty(globalThis, "document", { configurable: true, value: { body: { classList: { add, remove } } } });
    Object.defineProperty(globalThis, "window", { configurable: true, value: { addEventListener: (_name: string, listener: () => void) => { afterPrint = listener; }, print } });
    try {
      await act(async () => { renderer.update(<ActionFormalitiesPrintSheet summary="Requise" qualification={response().qualification} contacts={[]} />); });
      await act(async () => { click(button(renderer, "Imprimer la fiche d'action")); });
      expect(add).toHaveBeenCalledWith("cmm-print-formalities");
      expect(print).toHaveBeenCalledOnce();
      afterPrint?.();
      expect(remove).toHaveBeenCalledWith("cmm-print-formalities");
    } finally {
      if (previousDocument) Object.defineProperty(globalThis, "document", previousDocument);
      else Reflect.deleteProperty(globalThis, "document");
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
      else Reflect.deleteProperty(globalThis, "window");
    }
  });
});
