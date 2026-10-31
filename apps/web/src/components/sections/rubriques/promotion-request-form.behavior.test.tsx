import * as React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SitePreferencesProvider } from "@/components/ui/site-preferences-provider";
import { PromotionRequestForm } from "./promotion-request-form";
import { deferred, jsonResponse, rendererText } from "@/__tests__/support/action-behavior-test-helpers";
import type { AppProfile } from "@/lib/profiles";
import { AppError } from "@/lib/errors/app-errors";

const notifyNetworkToastMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/errors/network-toast", () => ({
  notifyNetworkToast: notifyNetworkToastMock,
}));

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true, self: globalThis });

function renderForm(
  currentRole: AppProfile,
  locale: "fr" | "en" = "fr",
  onSubmitted = vi.fn(),
): ReactTestRenderer {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(
      React.createElement(
        SitePreferencesProvider,
        { initialLocale: locale } as React.ComponentProps<typeof SitePreferencesProvider>,
        React.createElement(PromotionRequestForm, { currentRole, onSubmitted }),
      ),
    );
  });
  return renderer;
}

function submitForm(renderer: ReactTestRenderer) {
  const form = renderer.root.findByType("form");
  return form.props.onSubmit({ preventDefault: vi.fn() });
}

function setMotivation(renderer: ReactTestRenderer, value: string) {
  const textarea = renderer.root.findByType("textarea");
  act(() => {
    textarea.props.onChange({ target: { value } });
  });
}

function submitButton(renderer: ReactTestRenderer) {
  return renderer.root.findAllByType("button").find((button) => button.props.type === "submit");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("PromotionRequestForm behavior", () => {
  it("hides the form for roles that cannot request a promotion", () => {
    const renderer = renderForm("admin");

    expect(renderer.root.findAllByType("form")).toHaveLength(0);
    expect(rendererText(renderer)).toContain("Privilèges Système");
    expect(rendererText(renderer)).not.toContain("Soumettre");
  });

  it("rejects a motivation below the minimum without calling the API", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderForm("benevole");
    setMotivation(renderer, "court");

    await act(async () => {
      await submitForm(renderer);
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(rendererText(renderer)).toContain("La motivation doit contenir au moins 10 caractères.");
    expect(submitButton(renderer)?.props.disabled).toBe(true);
  });

  it("locks a submission, sends the selected role and reports success", async () => {
    const pending = deferred<Response>();
    const fetchMock = vi.fn().mockReturnValueOnce(pending.promise);
    const onSubmitted = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderForm("benevole", "en", onSubmitted);
    setMotivation(renderer, "A sufficiently detailed motivation");

    act(() => {
      void submitForm(renderer);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/community/promotion-requests",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"requestedRole":"elu"'),
      }),
    );
    expect(submitButton(renderer)?.props.disabled).toBe(true);

    await act(async () => {
      await submitForm(renderer);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);

    pending.resolve(jsonResponse({ status: "created" }));
    await act(async () => {
      await pending.promise;
      await Promise.resolve();
    });

    expect(onSubmitted).toHaveBeenCalledTimes(1);
    expect(rendererText(renderer)).toContain("Request successfully transmitted");
    expect(renderer.root.findByType("textarea").props.value).toBe("");
  });

  it("renders an HTTP permission error and retries a server failure", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse({ kind: "permission", message: "Connexion requise" }, 403))
      .mockResolvedValueOnce(jsonResponse({ kind: "server", message: "Service indisponible" }, 500))
      .mockResolvedValueOnce(jsonResponse({ status: "created" }));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderForm("elu");
    setMotivation(renderer, "Une motivation suffisamment longue");

    await act(async () => {
      await submitForm(renderer);
    });
    expect(rendererText(renderer)).toContain("Connexion requise");

    setMotivation(renderer, "Une motivation encore suffisamment longue");
    await act(async () => {
      await submitForm(renderer);
    });
    expect(rendererText(renderer)).toContain("Service indisponible");

    const retryButton = renderer.root.findAllByType("button").find((button) => button.children.join("").includes("Réessayer"));
    expect(retryButton).toBeDefined();
    await act(async () => {
      await retryButton?.props.onClick();
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(rendererText(renderer)).toContain("Demande transmise avec succès");
  });

  it("delegates network recovery to the existing retry toast", async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new AppError({ kind: "network", message: "Connexion hors ligne" }))
      .mockResolvedValueOnce(jsonResponse({ status: "created" }));
    vi.stubGlobal("fetch", fetchMock);
    const renderer = renderForm("coordinateur");
    setMotivation(renderer, "Une motivation réseau suffisamment longue");

    await act(async () => {
      await submitForm(renderer);
    });

    const toast = notifyNetworkToastMock.mock.calls[0]?.[0] as { onRetry?: () => void } | undefined;
    expect(toast?.onRetry).toEqual(expect.any(Function));
    await act(async () => {
      toast?.onRetry?.();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(rendererText(renderer)).toContain("Demande transmise avec succès");
  });
});
