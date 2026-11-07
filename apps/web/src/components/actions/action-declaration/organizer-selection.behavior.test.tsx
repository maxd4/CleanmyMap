import React from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { ActionAccountSelector } from "@/components/actions/action-participant-picker";
import type { ActionAccountOption } from "@/components/actions/action-participant-picker-model";
import { IdentityAndSharingSection } from "./before/identity-and-sharing-section";
import { createInitialFormState } from "./payload";
import { ActionOrganizerSection } from "./steps/action-step-identity.organizer";
import { SPONTANEOUS_PENDING_ORGANIZER_LABEL } from "@/lib/actions/organizer-type";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const selectedAccount: ActionAccountOption = {
  id: "user-referent",
  display_name: "Référent choisi",
  handle: "referent",
};

function findAccountSelector(renderer: ReactTestRenderer) {
  return renderer.root.findByType(ActionAccountSelector);
}

describe("spontaneous organizer selection behavior", () => {
  it("keeps identity metadata compact while retaining accessible labels", () => {
    const form = createInitialFormState("Créateur", "action");
    const markup = renderToStaticMarkup(
      React.createElement(ActionOrganizerSection, {
        form,
        updateField: vi.fn(),
        updateFields: vi.fn(),
        userMetadata: { userId: "user-creator" },
        isActionMode: true,
        variant: "identity-meta",
      }),
    );

    expect(markup).toContain("TYPE DE STRUCTURE · Sélectionnez…");
    expect(markup).toContain('id="action-action-date"');
    expect(markup).toContain('class="sr-only"');
    expect(markup).not.toContain("Cadre &amp; calendrier");
  });

  it("prepends the selected account in the complete action form without dropping co-organizers", () => {
    const form = createInitialFormState("Créateur", "action");
    form.organizerType = "spontaneous";
    form.organizerName = SPONTANEOUS_PENDING_ORGANIZER_LABEL;
    form.organizerAccounts = "user-existing, user-helper";
    const updateFields = vi.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
        React.createElement(ActionOrganizerSection, {
          form,
          updateField: vi.fn(),
          updateFields,
          userMetadata: { userId: "user-creator" },
          isActionMode: true,
          variant: "compact",
        }),
      );
    });

    act(() => { findAccountSelector(renderer).props.onSelectAccount(selectedAccount); });

    expect(updateFields).toHaveBeenCalledWith(expect.objectContaining({
      organizerName: "Référent choisi",
      organizerAccounts: "user-referent, user-existing, user-helper",
    }));
    renderer.unmount();
  });

  it("keeps the existing primary candidate when Autre is chosen in the pre-action form", () => {
    const form = createInitialFormState("Créateur", "action");
    form.organizerType = "spontaneous";
    form.organizerName = SPONTANEOUS_PENDING_ORGANIZER_LABEL;
    form.organizerAccounts = "user-existing, user-helper";
    const updateFields = vi.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
        React.createElement(IdentityAndSharingSection, {
          form,
          updateField: vi.fn(),
          updateFields,
          userMetadata: { userId: "user-creator" },
          showGroupJoinHelp: false,
          onToggleGroupJoinHelp: vi.fn(),
          hasAttemptedSubmit: false,
          validationIssueFields: [],
        }),
      );
    });

    act(() => { findAccountSelector(renderer).props.onOther(); });

    expect(updateFields).toHaveBeenCalledWith(expect.objectContaining({
      organizerName: "user-existing",
      organizerAccounts: "user-existing, user-helper",
    }));
    renderer.unmount();
  });

  it("keeps the persisted primary and presents a selected account as a co-organizer in an existing action", () => {
    const form = createInitialFormState("Créateur", "action");
    form.organizerType = "spontaneous";
    form.organizerName = "Principal actuel";
    form.organizerAccounts = "user-existing, user-helper";
    const updateFields = vi.fn();
    let renderer!: ReactTestRenderer;

    act(() => {
      renderer = create(
        React.createElement(ActionOrganizerSection, {
          form,
          updateField: vi.fn(),
          updateFields,
          userMetadata: { userId: "user-creator" },
          isActionMode: true,
          isExistingAction: true,
          variant: "compact",
        }),
      );
    });

    act(() => { findAccountSelector(renderer).props.onSelectAccount(selectedAccount); });

    expect(updateFields).toHaveBeenCalledWith(expect.objectContaining({
      organizerName: "Principal actuel",
      organizerAccounts: "user-existing, user-referent, user-helper",
    }));
    renderer.unmount();
  });
});
