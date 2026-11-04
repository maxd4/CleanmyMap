import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { TerritorialLegendConsentSetting } from "./territorial-legend-consent-setting";

const source = readFileSync(new URL("./territorial-legend-consent-setting.tsx", import.meta.url), "utf8");

describe("TerritorialLegendConsentSetting", () => {
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
});
