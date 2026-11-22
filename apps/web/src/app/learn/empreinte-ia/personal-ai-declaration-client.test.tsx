/** @vitest-environment jsdom */

import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PersonalAiDeclarationClient } from "./personal-ai-declaration-client";
import { PersonalAiQuickScenarioClient } from "./personal-ai-quick-scenario-client";
import { calculatePersonalAiDeclaration, parsePersonalAiDeclaration, personalAiDeclarationSchema } from "@/lib/environmental-impact-estimator/personal-ai-declaration-http";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const clerk = vi.hoisted(() => ({ useUser: vi.fn() }));
vi.mock("@clerk/nextjs", () => ({ useUser: clerk.useUser }));

let container: HTMLDivElement;
let root: Root;

function mount(element: ReactNode) {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  return act(async () => { root.render(element); });
}

async function click(button: HTMLButtonElement) {
  await act(async () => { button.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
}

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  container?.remove();
  vi.unstubAllGlobals();
});

describe("personal AI declaration client", () => {
  beforeEach(() => {
    clerk.useUser.mockReturnValue({ isSignedIn: true, isLoaded: true });
  });

  it("sends raw HTTP drafts for create and edit so the strict API normalizes them server-side", async () => {
    const requests: Array<{ url: string; init: RequestInit }> = [];
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = String(input);
      const method = init.method ?? "GET";
      if (method === "POST" || method === "PATCH") requests.push({ url, init });
      if (url === "/api/personal-ai/declarations?limit=50") {
        return new Response(JSON.stringify({ items: [], hasMore: false }), { status: 200 });
      }
      const body = JSON.parse(String(init.body)) as unknown;
      const draft = method === "PATCH" ? (body as { declaration: unknown }).declaration : body;
      const parsed = parsePersonalAiDeclaration(draft);
      const item = {
        id: "declaration-1", status: "ACTIVE", declaration: parsed,
        snapshot: calculatePersonalAiDeclaration(parsed).snapshot, created_at: "2026-11-22T00:00:00.000Z",
      };
      return new Response(JSON.stringify({ item }), { status: method === "POST" ? 201 : 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    await mount(<PersonalAiDeclarationClient />);
    const calculate = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Calculer");
    expect(calculate).toBeTruthy();
    await click(calculate!);
    const save = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Enregistrer dans mon espace privé");
    expect(save).toBeTruthy();
    await click(save!);

    expect(requests).toHaveLength(1);
    const createBody = JSON.parse(String(requests[0]!.init.body)) as Record<string, unknown>;
    expect(personalAiDeclarationSchema.safeParse(createBody).success).toBe(true);
    expect(createBody).not.toHaveProperty("normalizationVersion");
    expect(createBody.tokens).not.toHaveProperty("logicalTotal");

    const row = container.querySelector('[data-declaration-id="declaration-1"]');
    expect(row).toBeTruthy();
    await click([...row!.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Modifier")!);
    const saveEdit = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Enregistrer la modification");
    expect(saveEdit).toBeTruthy();
    await click(saveEdit!);

    expect(requests).toHaveLength(2);
    expect(requests[1]!.url).toBe("/api/personal-ai/declarations/declaration-1");
    const updateBody = JSON.parse(String(requests[1]!.init.body)) as { declaration: Record<string, unknown> };
    expect(personalAiDeclarationSchema.safeParse(updateBody.declaration).success).toBe(true);
    expect(updateBody.declaration).not.toHaveProperty("normalizationVersion");
    expect(updateBody.declaration.tokens).not.toHaveProperty("logicalTotal");
  });

  it("offers reimport instead of generic editing for a stored import", async () => {
    const imported = {
      id: "imported-declaration-1", source_identity_hash: "a".repeat(64), status: "ACTIVE",
      declaration: { provider: "OPENAI", periodStartUtc: null, periodEndUtc: null },
      snapshot: { physicalTotals: { operationalKgCo2e: null, totalWaterLiters: null } },
      created_at: "2026-11-22T00:00:00.000Z",
    };
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [imported], hasMore: false }), { status: 200 })));

    await mount(<PersonalAiDeclarationClient />);

    const row = container.querySelector('[data-declaration-id="imported-declaration-1"]');
    expect(row?.textContent).toContain("réimportez la source");
    expect([...row!.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Modifier")).toBe(false);
    expect([...row!.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Exclure")).toBe(true);
  });

  it("keeps the anonymous quick chatbot path first and its personal impacts NA without sending a request", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await mount(<>
      <PersonalAiQuickScenarioClient isSignedIn={false} isLoaded />
      <h2>Déclaration d’usage</h2>
    </>);

    const quickTitle = container.querySelector("#personal-ai-quick-title")!;
    const declarationTitle = [...container.querySelectorAll("h2")].find((heading) => heading.textContent?.trim() === "Déclaration d’usage")!;
    expect(quickTitle.compareDocumentPosition(declarationTitle) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const selectors = [...container.querySelectorAll("select")];
    expect(selectors[0]!.textContent).toContain("ChatGPT");
    expect(selectors[0]!.textContent).toContain("Claude");
    expect(selectors[0]!.textContent).toContain("Gemini");
    expect(selectors.some((select) => select.textContent?.includes("Gratuite") && select.textContent.includes("Abonnement"))).toBe(true);

    const calculate = [...container.querySelectorAll("button")].find((button) => button.textContent?.trim() === "Calculer sans compte");
    await click(calculate!);
    expect(container.textContent).toContain("Énergie attribuable à cette activité : NA kWh. CO₂e et eau : NA.");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
