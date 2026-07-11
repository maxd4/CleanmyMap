import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { ComponentProps } from "react";
import { describe, expect, it } from "vitest";
import { createInitialFormState } from "./payload";
import { ActionStepIdentity } from "./ActionStepIdentity";

describe("ActionStepIdentity", () => {
  it("shows manual members without exposing the publication control in the complete form", () => {
    const form = createInitialFormState("Aperçu local", "action");
    form.associationName = "Action spontanée";
    form.participantAccounts = ["user-manual-1"];

    const html = renderToStaticMarkup(
      React.createElement(ActionStepIdentity, {
        form,
        updateField: () => undefined,
        userMetadata: {
          userId: "preview-local",
          username: "preview-local",
          displayName: "Aperçu local",
        },
        recordType: "action",
        hasAttemptedSubmit: false,
      } as ComponentProps<typeof ActionStepIdentity>),
    );

    expect(html).toContain("Membres de l'action");
    expect(html).toContain("user-manual-1");
    expect(html).not.toContain("Ouvrir le formulaire de groupe");
    expect(html).not.toContain("Publier en tant que formulaire de groupe");
  });
});
