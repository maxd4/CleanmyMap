import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/site-preferences-provider", () => ({
  useSitePreferences: () => ({ locale: "fr" }),
}));

import { RgpdRequestForm } from "./rgpd-request-form";

function textOf(renderer: ReactTestRenderer): string {
  return JSON.stringify(renderer.toJSON());
}

function changeValue(renderer: ReactTestRenderer, type: "email" | "textarea", value: string): void {
  const control = type === "email"
    ? renderer.root.findAllByType("input").find((input) => input.props.type === "email")
    : renderer.root.findByType("textarea");
  if (!control) throw new Error(`Missing ${type} control`);
  act(() => {
    control.props.onChange({ target: { value } });
  });
}

function submit(renderer: ReactTestRenderer): void {
  act(() => {
    renderer.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() });
  });
}

describe("RgpdRequestForm", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("uses canonical fields with explicit labels, required state and descriptions", () => {
    const markup = renderToStaticMarkup(<RgpdRequestForm />);

    expect(markup).toContain('for="rgpd-request-type"');
    expect(markup).toContain('id="rgpd-request-type"');
    expect(markup).toContain('data-cmm-field-control="select"');
    expect(markup).toContain('for="rgpd-request-email"');
    expect(markup).toContain('id="rgpd-request-email"');
    expect(markup).toContain('data-cmm-field-control="input"');
    expect(markup).toContain('for="rgpd-request-message"');
    expect(markup).toContain('id="rgpd-request-message"');
    expect(markup).toContain('data-cmm-field-control="textarea"');
    expect(markup).toContain('aria-required="true"');
    expect(markup).not.toMatch(/<(?:input|select|textarea)\b[^>]*class="w-full/);
  });

  it("announces required-field failures and attaches their errors to the controls", () => {
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RgpdRequestForm />);
    });

    submit(renderer);

    expect(renderer.root.findAllByProps({ role: "alert" }).length).toBeGreaterThanOrEqual(1);
    const markup = textOf(renderer);
    expect(markup).toContain("Veuillez remplir tous les champs obligatoires.");
    expect(markup).toContain("rgpd-request-email-error");
    expect(markup).toContain("rgpd-request-message-error");
    expect(markup).toContain("aria-invalid");
  });

  it("keeps the automatic success response and the manual mail draft path", async () => {
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    let renderer!: ReactTestRenderer;
    act(() => {
      renderer = create(<RgpdRequestForm />);
    });
    changeValue(renderer, "email", "personne@example.com");
    changeValue(renderer, "textarea", "Demande d'accès");
    await act(async () => {
      renderer.root.findByType("form").props.onSubmit({ preventDefault: vi.fn() });
      await Promise.resolve();
    });
    expect(textOf(renderer)).toContain("Demande transmise");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const manualWindow = {
      location: { href: "" },
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    vi.stubGlobal("window", manualWindow);
    act(() => {
      renderer = create(<RgpdRequestForm />);
    });
    const modeButtons = renderer.root.findAllByType("button").slice(0, 2);
    act(() => {
      modeButtons[1].props.onClick();
    });
    changeValue(renderer, "email", "personne@example.com");
    changeValue(renderer, "textarea", "Demande manuelle");
    submit(renderer);

    expect(manualWindow.location.href).toMatch(/^mailto:/);
    expect(textOf(renderer)).toContain("Brouillon ouvert");
  });
});
