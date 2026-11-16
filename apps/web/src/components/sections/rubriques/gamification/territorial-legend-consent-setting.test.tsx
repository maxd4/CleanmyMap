import { readFileSync } from "node:fs";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TerritorialLegendConsentSetting } from "./territorial-legend-consent-setting";

const source = readFileSync(new URL("./territorial-legend-consent-setting.tsx", import.meta.url), "utf8");
const fetchMock = vi.fn();

function response(payload: unknown, ok = true): Response {
  return { ok, json: vi.fn().mockResolvedValue(payload) } as unknown as Response;
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

describe("TerritorialLegendConsentSetting", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("keeps the territorial consent separate, revocable and private by default", () => {
    const markup = renderToStaticMarkup(<TerritorialLegendConsentSetting fr />);

    expect(markup).toContain("Légendes territoriales restent désactivées");
    expect(source).toContain("Participer aux Légendes territoriales");
    expect(source).toContain("révoqué à tout moment");
    expect(markup).not.toContain('checked=""');
    expect(source).toContain('fetch("/api/users/profile/territorial-legend-consent"');
    expect(source).toContain('method: "PATCH"');
    expect(source).toContain("event.target.checked");
    expect(source).toContain('role="alert"');
    expect(source).toContain('role="status"');
  });

  it("loads an eligible consent, toggles it and reports the saved state", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ enabled: true, ageBand: "15_or_over", optionalTreatmentAllowed: true }))
      .mockResolvedValueOnce(response({ enabled: false, ageBand: "15_or_over" }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TerritorialLegendConsentSetting fr />);
      await settle();
    });

    const input = renderer.root.findByType("input");
    expect(input.props.checked).toBe(true);
    expect(input.props.disabled).toBe(false);
    await act(async () => {
      input.props.onChange({ target: { checked: false } });
      await settle();
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/users/profile/territorial-legend-consent", expect.objectContaining({
      method: "PATCH",
      body: JSON.stringify({ enabled: false }),
    }));
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Consentement enregistré.");
    renderer.unmount();
  });

  it("keeps an ineligible or malformed response disabled and visible as an error", async () => {
    fetchMock.mockResolvedValueOnce(response({ enabled: false, ageBand: "unknown", optionalTreatmentAllowed: false }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TerritorialLegendConsentSetting fr={false} />);
      await settle();
    });
    const input = renderer.root.findByType("input");
    expect(input.props.disabled).toBe(true);
    expect(renderer.root.findByType("span").props.children).toContain("Territorial Legends stay disabled");
    renderer.unmount();

    fetchMock.mockReset().mockResolvedValueOnce(response([], true));
    vi.stubGlobal("fetch", fetchMock);
    await act(async () => {
      renderer = create(<TerritorialLegendConsentSetting fr />);
      await settle();
    });
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("Impossible");
    renderer.unmount();
  });

  it("shows update errors and clears them on a subsequent retry", async () => {
    fetchMock
      .mockResolvedValueOnce(response({ enabled: false, ageBand: "15_or_over" }))
      .mockResolvedValueOnce(response({ error: "nope" }, false))
      .mockResolvedValueOnce(response({ enabled: true, ageBand: "15_or_over" }));
    vi.stubGlobal("fetch", fetchMock);
    let renderer!: ReactTestRenderer;
    await act(async () => {
      renderer = create(<TerritorialLegendConsentSetting fr />);
      await settle();
    });
    const input = renderer.root.findByType("input");
    await act(async () => { input.props.onChange({ target: { checked: true } }); await settle(); });
    expect(renderer.root.findByProps({ role: "alert" }).props.children).toContain("Impossible");
    await act(async () => { input.props.onChange({ target: { checked: true } }); await settle(); });
    expect(renderer.root.findByProps({ role: "status" }).props.children).toBe("Consentement enregistré.");
    renderer.unmount();
  });
});
