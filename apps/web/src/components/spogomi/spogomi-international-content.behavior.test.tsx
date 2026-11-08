// @vitest-environment jsdom

import { act } from "react";
import { hydrateRoot, type Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpogomiInternationalContent } from "./spogomi-international-content";
import { SPOGOMI_INTERNATIONAL_NEWS } from "@/lib/spogomi/international-content";

const copy = {
  worldTitle: "SPOGOMI worldwide",
  worldDescription: "Movement overview.",
  cleanMyMapRole: "CleanMyMap local role.",
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
    const previousTimeZone = process.env.TZ;
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
      process.env.TZ = serverTimeZone;
      const serverMarkup = renderToString(element);
      const container = document.createElement("div");
      container.innerHTML = serverMarkup;
      document.body.appendChild(container);
      const serverText = container.textContent;

      process.env.TZ = clientTimeZone;
      await act(async () => {
        root = hydrateRoot(container, element);
      });

      expect(container.textContent).toBe(serverText);
      expect(container.textContent).toContain("November 5, 2026");
      expect(hydrationErrors.some(([message]) => typeof message === "string" && message.toLowerCase().includes("hydration"))).toBe(false);
    } finally {
      root?.unmount();
      consoleError.mockRestore();
      if (previousTimeZone === undefined) delete process.env.TZ;
      else process.env.TZ = previousTimeZone;
    }
  });
});
