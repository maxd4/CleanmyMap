// @vitest-environment jsdom

import { act } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createReactDomHarness, deferred } from "@/__tests__/support/action-behavior-test-helpers";
import { TrashSpotterObservationForm } from "./quick-signalement-form";

const createActionMock = vi.hoisted(() => vi.fn());
const acquireMock = vi.hoisted(() => vi.fn());
const releaseMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/actions/http", () => ({ createAction: createActionMock }));
vi.mock("@/hooks/use-submission-lock", () => ({
  useSubmissionLock: () => ({ acquire: acquireMock, release: releaseMock }),
}));
vi.mock("@/lib/actions/signalement/signalement-media-client", () => ({
  createSignalementEvidenceUploadItem: (file: File) => ({ file, id: file.name }),
  uploadSignalementEvidence: vi.fn(),
}));
vi.mock("@/lib/browser/geolocation", () => ({ canRequestGeolocation: () => false }));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const harness = createReactDomHarness();

function mount(isAuthenticated = true) {
  return harness.mount(<TrashSpotterObservationForm initialLocation={{ lat: 48.8566, lng: 2.3522 }} isAuthenticated={isAuthenticated} signInHref="/sign-in" />);
}

function findButton(label: string): HTMLButtonElement {
  const candidate = [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes(label));
  expect(candidate, `button containing ${label}`).toBeTruthy();
  return candidate!;
}

afterEach(() => {
  harness.cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("TrashSpotterObservationForm behavior", () => {
  it("prevents a repeated submission while the first signalement is unresolved", async () => {
    const created = deferred<{ id: string }>();
    createActionMock.mockReturnValue(created.promise);
    let locked = false;
    acquireMock.mockImplementation(() => {
      if (locked) return false;
      locked = true;
      return true;
    });
    const mounted = mount();

    act(() => findButton("Lieu constaté propre").click());
    const submit = findButton("Signaler le lieu propre");
    act(() => submit.click());
    expect(createActionMock).toHaveBeenCalledTimes(1);
    expect(submit.disabled).toBe(true);

    await act(async () => {
      submit.click();
      await Promise.resolve();
    });
    expect(createActionMock).toHaveBeenCalledTimes(1);

    created.resolve({ id: "spot-1" });
    await harness.flush();
    expect(mounted.textContent).toContain("Lieu propre signalé");
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });

  it("stores only the prepared observation choices when authentication is required", async () => {
    acquireMock.mockReturnValue(true);
    const mounted = mount(false);
    act(() => findButton("Lieu constaté propre").click());
    act(() => findButton("Signaler le lieu propre").click());
    await harness.flush();

    expect(createActionMock).not.toHaveBeenCalled();
    expect(mounted.textContent).toContain("Connectez-vous pour transmettre");
    expect(mounted.querySelector('a[href="/sign-in"]')?.textContent).toContain("Se connecter");
    expect(JSON.parse(window.sessionStorage.getItem("cmm:signalement:pending-draft:v1") ?? "{}"))
      .toMatchObject({ recordType: "clean_place", selectedCategories: [] });
  });

  it("releases the submission lock and exposes a failed transmission", async () => {
    createActionMock.mockRejectedValue(new Error("network unavailable"));
    acquireMock.mockReturnValue(true);
    const mounted = mount();

    act(() => findButton("Lieu constaté propre").click());
    act(() => findButton("Signaler le lieu propre").click());
    await harness.flush();

    expect(mounted.textContent).toContain("Transmission échouée");
    expect(mounted.textContent).not.toContain("Lieu propre signalé");
    expect(releaseMock).toHaveBeenCalledTimes(1);
  });
});
