import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import PolitiqueCookiesPage from "./page";

describe("politique cookies table semantics", () => {
  it("gives the retention table an accessible name without changing its columns or data", () => {
    const markup = renderToStaticMarkup(<PolitiqueCookiesPage />);

    expect(markup).toContain(
      '<caption class="sr-only">Durées de conservation des cookies, consentements, sessions et préférences de site</caption>',
    );
    expect(markup.match(/<th scope="col"/g)).toHaveLength(2);
    expect(markup).toContain("Consentement");
    expect(markup).toContain("Cookies analytiques");
    expect(markup).toContain("Sessions d&#x27;authentification");
    expect(markup).toContain("Préférences de site");
  });
});
