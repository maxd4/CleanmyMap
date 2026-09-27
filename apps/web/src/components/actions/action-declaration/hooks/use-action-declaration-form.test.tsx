import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { useActionDeclarationForm } from "./use-action-declaration-form";

function HookProbe() {
  const value = useActionDeclarationForm({
    actorNameOptions: ["Alex"],
    defaultActorName: "Alex",
    isAuthenticated: true,
    userMetadata: { userId: "user-42" },
  });

  return React.createElement(
    "output",
    {
      "data-form-record-type": value.form.recordType,
      "data-submission-state": value.submissionState,
      "data-draft-banner": String(value.showDraftBanner),
      "data-handler-contract": String(
        typeof value.handleConfirmSubmit === "function" &&
          typeof value.handleGpxImport === "function" &&
          typeof value.handleResumeDraft === "function",
      ),
    },
    value.form.associationName,
  );
}

describe("useActionDeclarationForm public facade", () => {
  it("keeps the public form, state and handler contract usable on the server boundary", () => {
    const markup = renderToStaticMarkup(React.createElement(HookProbe));

    expect(markup).toContain('data-form-record-type="action"');
    expect(markup).toContain('data-submission-state="idle"');
    expect(markup).toContain('data-draft-banner="false"');
    expect(markup).toContain('data-handler-contract="true"');
    expect(markup).toContain("Action spontanée");
  });
});
