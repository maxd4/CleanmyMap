import * as React from "react";
import { act, create } from "react-test-renderer";
import { beforeEach, describe, expect, it, vi } from "vitest";

const refreshMock = vi.hoisted(() => vi.fn());
const fetchMock = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("next/link", () => ({ default: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("a", props, children) }));
vi.mock("@/components/ui/cmm-button", () => ({ CmmButton: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("button", props, children) }));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => React.createElement("div", props, children) }));
vi.mock("lucide-react", () => ({ ArrowRight: () => null, CalendarDays: () => null, MapPin: () => null, Plus: () => null, ShieldCheck: () => null }));

vi.stubGlobal("fetch", fetchMock);

type TestForm = {
  values: Record<string, string>;
  reset: ReturnType<typeof vi.fn>;
};

class TestFormData {
  constructor(private readonly form: TestForm) {}

  get(name: string) {
    return this.form.values[name] ?? null;
  }
}

vi.stubGlobal("FormData", TestFormData);

import { SpogomiOrganizerDashboard } from "./spogomi-organizer-dashboard";

const validValues = {
  name: "Compétition test",
  locationLabel: "Paris",
  mode: "casual",
  startsAt: "2026-10-13T12:00",
  endsAt: "",
};

function buildForm() {
  return { values: { ...validValues }, reset: vi.fn() } satisfies TestForm;
}

function getFormSubmit() {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<SpogomiOrganizerDashboard initialEvents={[]} />);
  });
  return { renderer, submit: renderer.root.findByType("form").props.onSubmit as (event: unknown) => void };
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
      resolveFetch(new Response(JSON.stringify({ eventId: "event-1" }), { status: 201 }));
      await responsePromise;
    });

    expect(form.reset).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    renderer.unmount();
  });

  it("keeps the form and idempotency payload across a retry, and blocks double submission", async () => {
    const form = buildForm();
    let resolveFirst!: (response: Response) => void;
    const firstResponse = new Promise<Response>((resolve) => { resolveFirst = resolve; });
    fetchMock.mockReturnValueOnce(firstResponse).mockResolvedValueOnce(
      new Response(JSON.stringify({ eventId: "event-1" }), { status: 201 }),
    );
    const { renderer, submit } = getFormSubmit();
    const event = { preventDefault: vi.fn(), currentTarget: form };

    await act(async () => {
      submit(event);
      submit(event);
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveFirst(new Response(JSON.stringify({ error: "temporary failure" }), { status: 503 }));
    await act(async () => {
      await firstResponse;
      await Promise.resolve();
    });
    expect(form.reset).not.toHaveBeenCalled();
    expect(form.values.name).toBe(validValues.name);

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

  it("renders the three parent edition modes", () => {
    const { renderer } = getFormSubmit();
    const select = renderer.root.findByProps({ name: "mode" });
    expect(select.props.children.map((option: React.ReactElement<{ value: string }>) => option.props.value)).toEqual(["casual", "world_cup", "mixed"]);
    renderer.unmount();
  });
});
