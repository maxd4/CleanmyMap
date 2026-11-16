import * as React from "react";
import { act, create, type ReactTestInstance } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";
import { SitePreferencesControls } from "./site-preferences-controls";
import { SitePreferencesProvider, useSitePreferences } from "./site-preferences-provider";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

type BrowserFixture = {
  memory: Map<string, string>;
  documentElement: { lang: string; setAttribute: ReturnType<typeof vi.fn> };
  reload: ReturnType<typeof vi.fn>;
};

type ClickProps = { onClick: () => void };

function propsOf<Props>(node: ReactTestInstance): Props {
  return node.props as unknown as Props;
}

function installBrowser(seed: Record<string, string> = {}): BrowserFixture {
  const memory = new Map(Object.entries(seed));
  const localStorage = {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => { memory.set(key, value); },
    removeItem: (key: string) => { memory.delete(key); },
  };
  const documentElement = { lang: "", setAttribute: vi.fn() };
  const reload = vi.fn();
  vi.stubGlobal("window", { localStorage, location: { reload } } as unknown as Window);
  vi.stubGlobal("document", { cookie: "", documentElement } as unknown as Document);
  return { memory, documentElement, reload };
}

async function flushEffects() {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

function PreferenceProbe() {
  const preferences = useSitePreferences();
  return (
    <div>
      <button type="button" data-action="locale" onClick={() => preferences.setLocale(preferences.locale === "fr" ? "en" : "fr")}>{preferences.locale}</button>
      <button type="button" data-action="set-theme-dark" onClick={() => preferences.setTheme("dark")}>dark</button>
      <button type="button" data-action="set-theme-mixed" onClick={() => preferences.setTheme("mixed")}>mixed</button>
      <button type="button" data-action="toggle-theme" onClick={preferences.toggleTheme}>toggle</button>
      <button type="button" data-action="display-sobre" onClick={() => preferences.setDisplayMode("sobre")}>sobre</button>
      <button type="button" data-action="display-minimaliste" onClick={() => preferences.setDisplayMode("minimaliste")}>minimaliste</button>
      <output data-state="summary">{`${preferences.locale}|${preferences.theme}|${preferences.displayMode}|${preferences.isDisplayModeExplicitlySet}`}</output>
    </div>
  );
}

type ProviderProps = Omit<React.ComponentProps<typeof SitePreferencesProvider>, "children">;

function renderProvider(children: React.ReactNode, props: ProviderProps = {}) {
  let renderer!: ReturnType<typeof create>;
  act(() => {
    renderer = create(<SitePreferencesProvider {...props}>{children}</SitePreferencesProvider>);
  });
  return renderer;
}

function PreferencesOutsideProvider() {
  useSitePreferences();
  return null;
}

class PreferenceErrorBoundary extends React.Component<React.PropsWithChildren, { message: string | null }> {
  state = { message: null };

  static getDerivedStateFromError(error: Error) {
    return { message: error.message };
  }

  render() {
    return this.state.message ? <output data-error={this.state.message}>{this.state.message}</output> : this.props.children;
  }
}

vi.mock("framer-motion", () => ({
  MotionConfig: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock("@/components/ui/cmm-field", () => ({
  CmmSelect: (props: React.SelectHTMLAttributes<HTMLSelectElement>) => <select {...props} />,
}));

vi.mock("next/link", () => ({
  default: (props: React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>) => <a {...props} />,
}));

describe("site preferences behavior", () => {
  it("hydrates stored preferences and persists locale, theme and display-mode changes", async () => {
    const browser = installBrowser({
      "cleanmymap.locale": "en",
      "cleanmymap.theme": "dark",
      "cleanmymap.display_mode": "minimaliste",
      "cleanmymap.display_mode_pending_sync": "1",
    });
    const renderer = renderProvider(<PreferenceProbe />, { initialLocale: "fr" });
    await flushEffects();

    expect(renderer.root.findByProps({ "data-state": "summary" }).props.children).toBe("en|dark|minimaliste|true");
    expect(browser.documentElement.lang).toBe("en");
    expect(browser.documentElement.setAttribute).toHaveBeenCalledWith("data-theme", "dark");
    expect(browser.documentElement.setAttribute).toHaveBeenCalledWith("data-display-mode", "minimaliste");
    expect(browser.memory.has("cleanmymap.display_mode_pending_sync")).toBe(false);

    await act(async () => {
      propsOf<ClickProps>(renderer.root.findByProps({ "data-action": "locale" })).onClick();
      await Promise.resolve();
    });
    await flushEffects();
    expect(renderer.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|dark|minimaliste|true");
    expect(browser.memory.get("cleanmymap.locale")).toBe("fr");
    expect(browser.documentElement.lang).toBe("fr");
    expect(browser.reload).toHaveBeenCalledOnce();

    await act(async () => {
      propsOf<ClickProps>(renderer.root.findByProps({ "data-action": "toggle-theme" })).onClick();
      await Promise.resolve();
    });
    await flushEffects();
    expect(renderer.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|mixed|minimaliste|true");
    expect(browser.memory.get("cleanmymap.theme")).toBe("mixed");

    await act(async () => {
      propsOf<ClickProps>(renderer.root.findByProps({ "data-action": "display-sobre" })).onClick();
      await Promise.resolve();
    });
    await flushEffects();
    expect(renderer.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|mixed|sobre|true");
    expect(browser.memory.get("cleanmymap.display_mode")).toBe("sobre");
    expect((document as unknown as { cookie: string }).cookie).toContain("cleanmymap.display_mode=sobre");

    await act(async () => {
      propsOf<ClickProps>(renderer.root.findByProps({ "data-action": "toggle-theme" })).onClick();
      await Promise.resolve();
    });
    await flushEffects();
    expect(renderer.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|dark|sobre|true");
    renderer.unmount();
  });

  it("uses server defaults when storage is empty and supports explicit and implicit display modes", async () => {
    const explicitBrowser = installBrowser();
    const explicit = renderProvider(<PreferenceProbe />, {
      initialLocale: "en",
      initialDisplayMode: "minimaliste",
      initialDisplayModeExplicit: true,
    });
    await flushEffects();
    expect(explicit.root.findByProps({ "data-state": "summary" }).props.children).toBe("en|mixed|minimaliste|true");
    expect(explicitBrowser.memory.get("cleanmymap.display_mode")).toBe("minimaliste");
    act(() => explicit.unmount());

    const implicitBrowser = installBrowser({ "cleanmymap.display_mode": "sobre" });
    const implicit = renderProvider(<PreferenceProbe />, { initialDisplayModeExplicit: false });
    await flushEffects();
    expect(implicit.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|mixed|sobre|true");
    expect(implicitBrowser.memory.get("cleanmymap.display_mode")).toBe("sobre");
    act(() => implicit.unmount());

    const defaultBrowser = installBrowser();
    const defaults = renderProvider(<PreferenceProbe />);
    await flushEffects();
    expect(defaults.root.findByProps({ "data-state": "summary" }).props.children).toBe("fr|mixed|exhaustif|false");
    expect(defaultBrowser.memory.has("cleanmymap.display_mode")).toBe(false);
    expect((document as unknown as { cookie: string }).cookie).toContain("Max-Age=0");
    act(() => defaults.unmount());
  });

  it("switches accessible controls, locales, display modes and surfaces through real events", async () => {
    installBrowser();
    const renderer = renderProvider(<SitePreferencesControls variant="compact" surface="light" />);
    await flushEffects();

    const localeSelect = renderer.root.findByProps({ id: "locale-switch" });
    act(() => localeSelect.props.onChange({ target: { value: "en" } }));
    await flushEffects();
    expect(renderer.root.findByProps({ "aria-label": "Choose language" })).toBeTruthy();
    expect(renderer.root.findByProps({ "aria-label": "Learn more about display modes" })).toBeTruthy();
    expect(renderer.root.findAllByProps({ name: "display-mode" })).toHaveLength(3);

    act(() => localeSelect.props.onChange({ target: { value: "invalid" } }));
    await flushEffects();
    expect(renderer.root.findByProps({ "aria-label": "Choisir la langue" })).toBeTruthy();

    const radios = renderer.root.findAllByProps({ name: "display-mode" });
    act(() => radios.find((radio) => radio.props.value === "sobre")?.props.onChange());
    await flushEffects();
    expect(renderer.root.findByProps({ value: "sobre" }).props.checked).toBe(true);
    expect(renderer.root.findByProps({ value: "exhaustif" }).props.checked).toBe(false);
    renderer.unmount();

    installBrowser();
    const localeRenderer = renderProvider(<SitePreferencesControls variant="locale" />, { initialLocale: "en" });
    await flushEffects();
    const localeButton = localeRenderer.root.findByProps({ "aria-label": "Switch to French" });
    act(() => propsOf<ClickProps>(localeButton).onClick());
    await flushEffects();
    expect(localeRenderer.root.findByProps({ "aria-label": "Passer à l'anglais" })).toBeTruthy();
    localeRenderer.unmount();
  });

  it("rejects consumers mounted outside the provider boundary", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(
        <PreferenceErrorBoundary>
          <PreferencesOutsideProvider />
        </PreferenceErrorBoundary>,
      );
    });
    expect(renderer.root.findByProps({ "data-error": "useSitePreferences must be used inside SitePreferencesProvider" })).toBeTruthy();
    renderer.unmount();
    error.mockRestore();
  });
});
