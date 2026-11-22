import { act, create } from "react-test-renderer";
import { act as reactAct } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { JSDOM } from "jsdom";
import { describe, expect, it, vi } from "vitest";
import { ActionSearchCountryField } from "./action-search-country-field";

describe("ActionSearchCountryField", () => {
  it("starts from the profile country while exposing the requested international countries", () => {
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ActionSearchCountryField countryCode="FR" onChange={vi.fn()} />);
    });
    const select = renderer.root.findByType("select");
    const optionValues = select.findAllByType("option").map((option) => option.props.value);
    const optionLabels = select.findAllByType("option").map((option) => option.children.join(""));

    expect(select.props.value).toBe("FR");
    expect(optionValues).toEqual(expect.arrayContaining(["BE", "CH", "CA", "SN"]));
    expect(optionLabels).toEqual(expect.arrayContaining(["France (FR)", "Îles Malouines (FK)", "Sénégal (SN)"]));
  });

  it("changes only the local search scope", () => {
    const onChange = vi.fn();
    let renderer!: ReturnType<typeof create>;
    act(() => {
      renderer = create(<ActionSearchCountryField countryCode="FR" onChange={onChange} />);
    });
    const select = renderer.root.findByType("select");

    act(() => select.props.onChange({ target: { value: "BE" } }));

    expect(onChange).toHaveBeenCalledWith("BE");
  });

  it("hydrates identical server markup when Intl country names differ by runtime", async () => {
    const originalIntl = globalThis.Intl;
    const intlWithNames = (name: string) => {
      const runtimeIntl = Object.create(originalIntl) as typeof Intl;
      Object.defineProperty(runtimeIntl, "DisplayNames", {
        configurable: true,
        value: class {
          of() {
            return name;
          }
        },
      });
      return runtimeIntl;
    };
    const onChange = vi.fn();
    const element = <ActionSearchCountryField countryCode="FR" onChange={onChange} />;
    const serverMarkup = (() => {
      vi.stubGlobal("Intl", intlWithNames("Libellé serveur"));
      return renderToString(element);
    })();
    const dom = new JSDOM(`<div id="root">${serverMarkup}</div>`, { url: "http://localhost" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      vi.stubGlobal("Intl", intlWithNames("Libellé Chrome"));
      vi.stubGlobal("window", dom.window);
      vi.stubGlobal("document", dom.window.document);
      vi.stubGlobal("navigator", dom.window.navigator);
      vi.stubGlobal("HTMLElement", dom.window.HTMLElement);
      vi.stubGlobal("Event", dom.window.Event);
      vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);

      const container = dom.window.document.getElementById("root");
      expect(container).not.toBeNull();
      let root: ReturnType<typeof hydrateRoot> | undefined;
      await reactAct(async () => {
        root = hydrateRoot(container!, element);
      });

      expect(container?.innerHTML).toBe(serverMarkup);
      expect(consoleError).not.toHaveBeenCalled();
      const select = container?.querySelector("select");
      expect(select?.selectedOptions[0]?.textContent).toBe("France (FR)");

      if (select) {
        select.value = "FK";
        await reactAct(async () => {
          select.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
        });
      }
      expect(onChange).toHaveBeenCalledWith("FK");

      await reactAct(async () => root?.unmount());
    } finally {
      consoleError.mockRestore();
      dom.window.close();
      vi.unstubAllGlobals();
    }
  });
});
