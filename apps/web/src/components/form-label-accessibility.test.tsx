import { renderToStaticMarkup } from "react-dom/server";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { JSDOM } from "jsdom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationPreferencesSetting } from "./account/notification-preferences-setting";
import { ActionLocationInputs } from "./actions/action-declaration/action-location-inputs";
import type { ActionLocationInputProps } from "./actions/action-declaration/action-location.types";
import { TrashSpotterObservationForm } from "./actions/quick-signalement-form";
import { ChatActionShareDialog } from "./chat/chat-action-share-dialog";
import { ReportsWebDocumentPreparation } from "./reports/web-document/reports-web-document-preparation";
import { REPORT_ADVANCED_FILTER_DEFAULTS } from "./reports/web-document/reports-web-document.shared";
import { createInitialFormState } from "./actions/action-declaration/payload";

type JsonNode = {
  type: string;
  props: Record<string, unknown>;
  children: Array<JsonNode | string> | null;
};

function renderDom(markup: string) {
  return new JSDOM(`<main>${markup}</main>`).window.document;
}

function labelFor(document: Document, control: HTMLInputElement | HTMLSelectElement) {
  return Array.from(document.querySelectorAll("label")).find(
    (label) => label.control === control,
  );
}

function expectNamedControl(
  document: Document,
  selector: string,
  expectedLabel: string,
) {
  const control = document.querySelector(selector) as HTMLInputElement | HTMLSelectElement | null;
  expect(control).not.toBeNull();
  expect(control?.id).not.toBe("");
  const label = control ? labelFor(document, control) : undefined;
  expect(label).toBeDefined();
  expect(control?.labels).toHaveLength(1);
  expect(label?.textContent).toContain(expectedLabel);
  return { control, label };
}

function textContent(node: JsonNode | string): string {
  if (typeof node === "string") return node;
  return (node.children ?? []).map(textContent).join("");
}

function findJsonNodes(node: JsonNode | JsonNode[] | null, type: string): JsonNode[] {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap((child) => findJsonNodes(child, type));
  return [
    ...(node.type === type ? [node] : []),
    ...(node.children ?? []).flatMap((child) =>
      typeof child === "string" ? [] : findJsonNodes(child, type),
    ),
  ];
}

const reportPreparationProps = {
  period: "six_months" as const,
  onPeriodChange: vi.fn(),
  detailLevel: "default" as const,
  onDetailLevelChange: vi.fn(),
  theme: "impact" as const,
  onThemeChange: vi.fn(),
  selectedScopeValue: "global",
  scopeOptions: { accounts: [], associations: [], arrondissements: [] },
  onScopeChange: vi.fn(),
  modules: {
    dataAndCartography: true,
    transparencyAndMethods: true,
    rawData: false,
    detailedFiles: true,
  },
  onModuleToggle: vi.fn(),
  advancedFilters: REPORT_ADVANCED_FILTER_DEFAULTS,
  onAdvancedFiltersChange: vi.fn(),
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe("form labels reported by Sonar S6853", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("proves the French and English notification labels are associated with unique controls", () => {
    for (const [locale, expectedLabels] of [
      ["fr", ["Informations facultatives", "Rappels J-1"]],
      ["en", ["Optional information", "J-1 reminders"]],
    ] as const) {
      const document = renderDom(
        renderToStaticMarkup(<NotificationPreferencesSetting locale={locale} />),
      );
      const inputs = Array.from(document.querySelectorAll("input[type=checkbox]"));
      expect(new Set(inputs.map((input) => input.id)).size).toBe(inputs.length);
      expectedLabels.forEach((label) => {
        expectNamedControl(document, `input[id="${label === expectedLabels[0] ? "notification-preference-informational" : "notification-preference-reminders"}"]`, label);
      });
    }
  });

  it("proves the route topology radios keep their visible names, label activation and keyboard focus", () => {
    const form = createInitialFormState("Alice");
    const props: ActionLocationInputProps = {
      form,
      updateField: () => undefined,
      updateFields: () => undefined,
      recordType: "action",
      gpsStatus: "idle",
      gpsMessage: null,
      onAutofillGps: () => undefined,
      mode: "details",
    };
    const document = renderDom(renderToStaticMarkup(<ActionLocationInputs {...props} />));
    const loop = expectNamedControl(document, "#route-topology-loop", "Boucle").control as HTMLInputElement;
    const pointToPoint = expectNamedControl(document, "#route-topology-point_to_point", "Départ → arrivée").control as HTMLInputElement;
    expect(new Set([loop.id, pointToPoint.id]).size).toBe(2);

    labelFor(document, loop)?.click();
    expect(loop.checked).toBe(true);
    loop.focus();
    expect(document.activeElement).toBe(loop);
    expect(loop.tabIndex).toBeGreaterThanOrEqual(0);
    expect(pointToPoint.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it("proves report module labels resolve dynamic text to unique checkboxes", () => {
    const document = renderDom(
      renderToStaticMarkup(<ReportsWebDocumentPreparation {...reportPreparationProps} />),
    );
    const moduleInputs = Array.from(document.querySelectorAll<HTMLInputElement>("input[type=checkbox]"));
    expect(new Set(moduleInputs.map((input) => input.id)).size).toBe(moduleInputs.length);
    expectNamedControl(document, "#reports-web-document-module-dataAndCartography", "Données & cartographie");
    const rawData = expectNamedControl(document, "#reports-web-document-module-rawData", "Données brutes").control as HTMLInputElement;
    labelFor(document, rawData)?.click();
    expect(rawData.checked).toBe(true);
    rawData.focus();
    expect(document.activeElement).toBe(rawData);
  });

  it("proves the evidence file control keeps its visible French label and keyboard target", () => {
    const document = renderDom(
      renderToStaticMarkup(<TrashSpotterObservationForm initialLocation={{ lat: 48.8566, lng: 2.3522 }} />),
    );
    const { control, label } = expectNamedControl(document, "#quick-signalement-evidence", "Déposer ou capturer");
    expect(label?.htmlFor).toBe("quick-signalement-evidence");
    expect(control?.tabIndex).toBeGreaterThanOrEqual(0);
    control?.focus();
    expect(document.activeElement).toBe(control);
  });

  it("proves dynamic chat destination labels contain and reference their radio controls", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        destinations: [
          {
            id: "community-1",
            channelType: "community",
            label: "Équipe locale",
            description: "Conversation de quartier",
          },
        ],
        shareKind: "invitation",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<ChatActionShareDialog actionId="action-1" onClose={() => undefined} />);
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    const labels = findJsonNodes(renderer.toJSON(), "label");
    const destinationLabel = labels.find((label) => textContent(label).includes("Équipe locale"));
    expect(destinationLabel).toBeDefined();
    const destinationInput = findJsonNodes(destinationLabel ?? null, "input")[0];
    expect(destinationInput?.props.type).toBe("radio");
    expect(destinationInput?.props.id).toBe(destinationLabel?.props.htmlFor);
    expect(destinationLabel?.props.htmlFor).toBe("share-destination-community-1");
    renderer.unmount();
  });
});
