import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ActionAccessibilitySupportPanel } from "./action-accessibility-support-panel";

describe("ActionAccessibilitySupportPanel", () => {
  it("explains the confirmed-registration prerequisite without requesting disability or medical details", () => {
    const markup = renderToStaticMarkup(
      <ActionAccessibilitySupportPanel actionId="action-1" isRegistrationConfirmed={false} fr />,
    );

    expect(markup).toContain("Participer avec des besoins d’accessibilité");
    expect(markup).toContain("attendez la confirmation de votre inscription");
    expect(markup).toContain("Vous n’avez pas à déclarer un handicap ni à fournir de renseignement médical.");
    expect(markup).not.toContain("type=\"checkbox\"");
    expect(markup).not.toContain("type=\"textarea\"");
  });
});
