// @vitest-environment jsdom

import { act } from "react";
import { createRoot } from "react-dom/client";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpogomiInternationalContent } from "./spogomi-international-content";
import {
  SPOGOMI_EXTERNAL_EVENTS,
  SPOGOMI_INTERNATIONAL_NEWS,
} from "@/lib/spogomi/international-content";

const copy = {
  worldTitle: "SPOGOMI worldwide",
  worldDescription: "Movement overview.",
  cleanMyMapRole: "CleanMyMap local role.",
  worldDetails: "View CleanMyMap's role and sources",
  officialSources: "Verified official references",
  verifiedOn: "Verified on",
  newsTitle: "Official news",
  confirmed: "Confirmed",
  planned: "Planned",
  dateSet: "Date set",
  internationalEvents: "International events",
  year: "Year",
  country: "Country",
  allYears: "All years",
  allCountries: "All known countries",
  externalEvent: "External references",
  source: "Official source",
  noExternalEvents: "No verified external event for these filters.",
};

afterEach(() => {
  document.body.innerHTML = "";
});

describe("SpogomiInternationalContent hydration", () => {
  it.each([
    ["UTC", "America/Los_Angeles"],
    ["America/Los_Angeles", "Europe/Paris"],
  ])("keeps the editorial civil date stable from SSR %s to hydration %s", async (serverTimeZone, clientTimeZone) => {
    const element = (
      <SpogomiInternationalContent
        locale="en"
        sources={[]}
        news={SPOGOMI_INTERNATIONAL_NEWS}
        externalEvents={[]}
        visibleSections={["news"]}
        copy={copy}
      />
    );
    const hydrationErrors: unknown[][] = [];
    const consoleError = vi.spyOn(console, "error").mockImplementation((...args) => {
      hydrationErrors.push(args);
    });
    let root: Root | undefined;

    try {
      const hostFormattedDates = [serverTimeZone, clientTimeZone].map((timeZone) => new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone }).format(new Date("2026-11-05T00:00:00.000Z")));
      expect(hostFormattedDates[0]).not.toBe(hostFormattedDates[1]);
      const serverMarkup = renderToString(element);
      const container = document.createElement("div");
      container.innerHTML = serverMarkup;
      document.body.appendChild(container);
      const serverText = container.textContent;

      await act(async () => {
        root = hydrateRoot(container, element);
      });

      expect(container.textContent).toBe(serverText);
      expect(container.textContent).toContain("November 5, 2026");
      expect(hydrationErrors.some(([message]) => typeof message === "string" && message.toLowerCase().includes("hydration"))).toBe(false);
    } finally {
      root?.unmount();
      consoleError.mockRestore();
    }
  });

  it("keeps the country filter usable while rendering editorial event cards", async () => {
    const container = document.createElement("div");
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(async () => {
      root.render(
        <SpogomiInternationalContent
          locale="fr"
          sources={[]}
          news={[]}
          externalEvents={SPOGOMI_EXTERNAL_EVENTS}
          visibleSections={["events"]}
          copy={copy}
        />,
      );
    });

    expect(container.querySelectorAll("article")).toHaveLength(2);
    const country = container.querySelector<HTMLSelectElement>('select[aria-label="Country"]');
    expect(country).not.toBeNull();
    await act(async () => {
      if (!country) return;
      country.value = "France";
      country.dispatchEvent(new Event("change", { bubbles: true }));
    });

    expect(container.querySelectorAll("article")).toHaveLength(1);
    expect(container.textContent).toContain("Qualification française World Cup 2027");
    expect(container.textContent).not.toContain("SPOGOMI World Cup 2027");
    root.unmount();
  });
});
