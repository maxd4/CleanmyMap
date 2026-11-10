/** @vitest-environment jsdom */

import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createRoot, type Root } from "react-dom/client";
import { act as domAct } from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock, push: pushMock }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("lucide-react", () => ({ ArrowRight: () => null, CalendarDays: () => null, MapPin: () => null, Plus: () => null, ShieldCheck: () => null }));
vi.mock("./spogomi-location-picker", () => ({
  SpogomiLocationPicker: ({ value, onChange, error }: { value: string; onChange: (value: string, coordinates: { latitude: number; longitude: number } | null) => void; error?: string[] }) => {
    return React.createElement("label", null,
      React.createElement("span", null, "Lieu"),
      React.createElement("input", { id: "spogomi-create-locationLabel", name: "locationLabel", value, onChange: (event: React.ChangeEvent<HTMLInputElement>) => onChange(event.target.value, { latitude: 48.8566, longitude: 2.3522 }) }),
      React.createElement("button", { type: "button", "data-testid": "select-location", onClick: () => onChange(value || "Paris", { latitude: 48.8566, longitude: 2.3522 }) }, "Sélectionner le lieu"),
      error?.map((message) => React.createElement("p", { key: message }, message)),
    );
  },
}));

vi.stubGlobal("fetch", fetchMock);

(globalThis as unknown as Record<string, boolean>).IS_REACT_ACT_ENVIRONMENT = true;
const NativeBrowserFormData = window.FormData;

type TestForm = {
  values: Record<string, string>;
  reset: ReturnType<typeof vi.fn>;
};

class TestFormData {
  private readonly values: Record<string, string> | null;
  private readonly nativeFormData: FormData | null;

  constructor(form: TestForm | HTMLFormElement) {
    if ("values" in form) {
      this.values = form.values;
      this.nativeFormData = null;
    } else {
      this.values = null;
      this.nativeFormData = new NativeBrowserFormData(form);
    }
  }

  get(name: string) {
    return this.values ? this.values[name] ?? null : this.nativeFormData?.get(name) ?? null;
  }
}

vi.stubGlobal("FormData", TestFormData);

import { SpogomiOrganizerDashboard } from "./spogomi-organizer-dashboard";

const validValues = {
  name: "Compétition test",
  locationLabel: "Paris",
  mode: "casual",
  startsAt: "2026-10-13T12:00",
};

function buildForm() {
  return { values: { ...validValues }, reset: vi.fn() } satisfies TestForm;
}

function getFormSubmit() {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<SpogomiOrganizerDashboard initialEvents={[]} canCreate />);
  });
  act(() => { renderer.root.findByProps({ "data-testid": "select-location" }).props.onClick(); });
  return { renderer, submit: renderer.root.findByType("form").props.onSubmit as (event: unknown) => void };
}

function textContent(node: ReactTestInstance): string {
  return node.children.map((child) => typeof child === "string" ? child : textContent(child)).join("");
}

describe("SpogomiOrganizerDashboard creation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resets and refreshes only after the server confirms success", async () => {
    const form = buildForm();
    let resolveFetch!: (response: Response) => void;
    const responsePromise = new Promise<Response>((resolve) => { resolveFetch = resolve; });
    fetchMock.mockReturnValueOnce(responsePromise);
    const { renderer, submit } = getFormSubmit();

    await act(async () => {
      submit({ preventDefault: vi.fn(), currentTarget: form });
      await Promise.resolve();
    });
    expect(form.reset).not.toHaveBeenCalled();
    expect(refreshMock).not.toHaveBeenCalled();

    await act(async () => {
      resolveFetch(new Response(JSON.stringify({ eventId: "event-1", eventSlug: "event-1" }), { status: 201 }));
      await responsePromise;
    });

    expect(form.reset).toHaveBeenCalledTimes(1);
    expect(pushMock).toHaveBeenCalledWith("/spogomi/event-1/espace");
    expect(JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string)).toMatchObject({ latitude: 48.8566, longitude: 2.3522, endsAt: null });
    renderer.unmount();
  });

  it("renders multi-field 422 details and keeps the form and idempotency payload across a retry", async () => {
    const form = buildForm();
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    fetchMock.mockReturnValueOnce(firstResponse).mockResolvedValueOnce(
      new Response(JSON.stringify({ eventId: "event-1", eventSlug: "event-1" }), { status: 201 }),
    );
    const { renderer, submit } = getFormSubmit();
    const event = { preventDefault: vi.fn(), currentTarget: form };

    await act(async () => {
      submit(event);
      submit(event);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirst(new Response(JSON.stringify({
      error: "Certains champs doivent être corrigés avant de continuer.",
      referenceCode: "VAL-RETRY",
      details: {
        name: ["Le nom est déjà utilisé."],
        startsAt: ["La date doit être dans le futur."],
      },
    }), { status: 422 }));
    await act(async () => {
      await firstResponse;
      await Promise.resolve();
    });
    expect(form.reset).not.toHaveBeenCalled();
    expect(form.values.name).toBe(validValues.name);
    expect(renderer.root.findByProps({ id: "spogomi-create-name" }).props["aria-invalid"]).toBe(true);
    expect(renderer.root.findByProps({ id: "spogomi-create-name" }).props["aria-describedby"]).toBe("spogomi-create-name-error");
    expect(renderer.root.findByProps({ id: "spogomi-create-startsAt" }).props["aria-invalid"]).toBe(true);
    expect(textContent(renderer.root.findByProps({ id: "spogomi-create-error-summary" }))).toContain("VAL-RETRY");
    expect(renderer.root.findAllByType("li").map((item) => item.children.join(" "))).toEqual(expect.arrayContaining([
      "Le nom est déjà utilisé.",
      "La date doit être dans le futur.",
    ]));

    await act(async () => {
      submit(event);
      await Promise.resolve();
    });

    const firstPayload = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string);
    const retryPayload = JSON.parse(fetchMock.mock.calls[1]?.[1]?.body as string);
    expect(retryPayload).toEqual(firstPayload);
    expect(form.reset).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("keeps field names independent from errors and announces one global summary", async () => {
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    fetchMock.mockReturnValueOnce(firstResponse);
    const container = document.createElement("div");
    document.body.appendChild(container);
    let root!: Root;

    await domAct(async () => {
      root = createRoot(container);
      root.render(<SpogomiOrganizerDashboard initialEvents={[]} canCreate />);
    });
    await domAct(async () => { (container.querySelector('[data-testid="select-location"]') as HTMLButtonElement).click(); });

    const form = container.querySelector("form")!;
    (container.querySelector('[name="name"]') as HTMLInputElement).value = validValues.name;
    (container.querySelector('[name="locationLabel"]') as HTMLInputElement).value = validValues.locationLabel;
    (container.querySelector('[name="startsAt"]') as HTMLInputElement).value = validValues.startsAt;
    await domAct(async () => {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
      await Promise.resolve();
    });

    resolveFirst(new Response(JSON.stringify({
      error: "Certains champs doivent être corrigés avant de continuer.",
      referenceCode: "VAL-DOM",
      details: {
        name: ["Le nom est déjà utilisé."],
        startsAt: ["La date doit être dans le futur."],
      },
    }), { status: 422 }));
    await domAct(async () => {
      await firstResponse;
      await Promise.resolve();
    });

    const labels = [...container.querySelectorAll("label")];
    expect(labels).toHaveLength(4);
    expect(labels.every((label) => !label.querySelector("ul"))).toBe(true);
    for (const label of labels) {
      const control = label.control;
      expect(control).not.toBeNull();
      expect(control?.getAttribute("aria-describedby")).toSatisfy((value: string | null) => value === null || value.endsWith("-error"));
    }

    const nameError = container.querySelector("#spogomi-create-name-error")!;
    const startsAtError = container.querySelector("#spogomi-create-startsAt-error")!;
    expect(nameError.closest("label")).toBeNull();
    expect(startsAtError.closest("label")).toBeNull();
    expect(container.querySelectorAll('[role="alert"]')).toHaveLength(1);
    const summary = container.querySelector("#spogomi-create-error-summary")!;
    expect(summary.querySelectorAll('a[href^="#spogomi-create-"]').length).toBe(2);
    expect(summary.textContent).toContain("VAL-DOM");
    expect(container.querySelector("#spogomi-create-name")?.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector("#spogomi-create-startsAt")?.getAttribute("aria-describedby")).toBe("spogomi-create-startsAt-error");

    await domAct(async () => root.unmount());
    container.remove();
  });

  it("marks a client-side date validation error on the corresponding field", async () => {
    const form = buildForm();
    form.values.startsAt = "";
    const { renderer, submit } = getFormSubmit();

    await act(async () => { submit({ preventDefault: vi.fn(), currentTarget: form }); await Promise.resolve(); });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({ id: "spogomi-create-startsAt" }).props["aria-invalid"]).toBe(true);
    expect(renderer.root.findByProps({ id: "spogomi-create-startsAt" }).props["aria-describedby"]).toBe("spogomi-create-startsAt-error");
    expect(textContent(renderer.root.findByProps({ id: "spogomi-create-startsAt-error" }))).toContain("Saisissez une date de début valide.");
    renderer.unmount();
  });

  it("keeps a server reference code visible for non-validation failures", async () => {
    const form = buildForm();
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Une erreur serveur est survenue.", referenceCode: "ERR-SPOGOMI-1" }), { status: 500 }));
    const { renderer, submit } = getFormSubmit();

    await act(async () => { submit({ preventDefault: vi.fn(), currentTarget: form }); await Promise.resolve(); });

    expect(textContent(renderer.root.findByProps({ id: "spogomi-create-error-summary" }))).toContain("ERR-SPOGOMI-1");
    expect(renderer.root.findByProps({ id: "spogomi-create-name" }).props["aria-invalid"]).toBe(false);
    expect(form.reset).not.toHaveBeenCalled();
    renderer.unmount();
  });

  it("renders the three parent edition modes", () => {
    const { renderer } = getFormSubmit();
    const select = renderer.root.findByProps({ name: "mode" });
    expect(select.props.children.map((option: React.ReactElement<{ value: string }>) => option.props.value)).toEqual(["casual", "world_cup", "mixed"]);
    renderer.unmount();
  });

  it("shows actionable field details and keeps creation hidden without permission", () => {
    const markup = renderToStaticMarkup(<SpogomiOrganizerDashboard initialEvents={[]} />);
    expect(markup).not.toContain("name=\"mode\"");
    expect(markup).not.toContain("Créer une compétition");
  });
});
