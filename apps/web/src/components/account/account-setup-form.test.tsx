import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

const controllerState = vi.hoisted(() => ({
  currentStep: "identity" as "identity" | "usage" | "location",
}));

vi.mock("./use-account-setup-controller", () => ({
  useAccountSetupController: () => ({
    currentStep: controllerState.currentStep,
    isLoaded: true,
    clerkReachable: true,
    user: { id: "user_1" },
    locale: "fr",
    profileOptions: ["benevole", "coordinateur", "scientifique", "entreprise"],
    selectedProfile: "benevole",
    selectedDisplayMode: "sobre",
    residence: null,
    work: null,
    residenceEnabled: false,
    workEnabled: false,
    noneSelected: true,
    isSaving: false,
    isDirty: false,
    error: null,
    firstName: "Ada",
    lastName: "Lovelace",
    firstNameError: null,
    lastNameError: null,
    profileError: null,
    locationError: null,
    displayNameMode: "pseudo",
    publicDisplayName: "@ada-lovelace",
    publicHandle: "ada-lovelace",
    shouldShowFieldError: () => false,
    markFormDirty: vi.fn(),
    touchField: vi.fn(),
    handleFirstNameChange: vi.fn(),
    handleLastNameChange: vi.fn(),
    handleProfileChange: vi.fn(),
    handleDisplayModeChange: vi.fn(),
    handleDisplayNameModeChange: vi.fn(),
    updateResidence: vi.fn(),
    updateWork: vi.fn(),
    updateResidenceEnabled: vi.fn(),
    updateWorkEnabled: vi.fn(),
    updateNoneSelected: vi.fn(),
    handleDefer: vi.fn(),
    handleSubmit: vi.fn(),
    handleNext: vi.fn(),
    handlePrevious: vi.fn(),
    getDeferralLabel: () => "Configurer plus tard",
  }),
}));

vi.mock("./account-setup-sections", () => ({
  AccountSetupDisplayModeGrid: () => <div />,
  AccountSetupLocationFields: ({ noneSelected }: { noneSelected: boolean }) => <div>{noneSelected ? "Aucune zone sélectionnée" : "Zone sélectionnée"}</div>,
  AccountSetupProfileGrid: () => <div />,
}));

vi.mock("./account-setup-primitives", () => ({
  AccountSetupSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
  AccountSetupChoiceCard: ({ label, description }: { label: string; description: string }) => (
    <label><span>{label}</span><span>{description}</span></label>
  ),
}));

vi.mock("@/components/ui/cmm-field", () => ({
  CmmField: ({ children, label, required }: { children: React.ReactNode; label: string; required?: boolean }) => (
    <label>{label}{required ? "*" : ""}{children}</label>
  ),
  CmmInput: (props: React.InputHTMLAttributes<HTMLInputElement>) => <input {...props} />,
}));

vi.mock("@/components/ui/cmm-button", () => ({
  CmmButton: (props: React.ButtonHTMLAttributes<HTMLButtonElement> & { loading?: boolean; tone?: string; size?: string }) => {
    const { children, loading, tone, size, ...buttonProps } = props;
    void loading;
    void tone;
    void size;
    return <button {...buttonProps}>{children}</button>;
  },
}));
vi.mock("@/components/ui/cmm-card", () => ({ CmmCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/components/ui/error-message", () => ({ ErrorMessage: () => null }));
vi.mock("@/components/ui/permission-error-state", () => ({ PermissionErrorState: () => null }));
vi.mock("@/components/ui/system-state", () => ({
  SystemStateAction: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SystemStateDescription: () => null,
  SystemStateIcon: () => null,
  SystemStateLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SystemStateMeta: () => null,
  SystemStateTitle: () => null,
}));

import { AccountSetupForm } from "./account-setup-form";

describe("AccountSetupForm progressive setup", () => {
  afterEach(() => {
    controllerState.currentStep = "identity";
  });

  it("renders required names, public identity choices and progress on the identity step", () => {
    const markup = renderToStaticMarkup(
      <AccountSetupForm initialProfile="benevole" clerkReachable initialRole="benevole" initialHandle="ada-lovelace" />,
    );

    expect(markup).toContain("Prénom*");
    expect(markup).toContain("Nom*");
    expect(markup).toContain('autoComplete="given-name"');
    expect(markup).toContain('autoComplete="family-name"');
    expect(markup).toContain("Pseudonyme");
    expect(markup).toContain("@ada-lovelace");
    expect(markup).toContain("Progression de la configuration");
    expect(markup).toContain("Suivant");
  });

  it("renders the open usage paths and Clerk-controlled role explanation", () => {
    controllerState.currentStep = "usage";
    const markup = renderToStaticMarkup(<AccountSetupForm initialProfile="benevole" clerkReachable initialRole="benevole" />);

    expect(markup).toContain("Utilisation de CleanMyMap");
    expect(markup).toContain("Les parcours bénévole, coordinateur, scientifique et entreprise");
    expect(markup).toContain("réellement attribués à votre compte Clerk");
    expect(markup).toContain('href="/compte/evolution"');
    expect(markup).toContain("Précédent");
  });

  it("renders optional locations and the explicit no-location path", () => {
    controllerState.currentStep = "location";
    const markup = renderToStaticMarkup(<AccountSetupForm initialProfile="benevole" clerkReachable initialRole="benevole" />);

    expect(markup).toContain("Localisation");
    expect(markup).toContain("Aucune zone sélectionnée");
    expect(markup).toContain("Enregistrer et continuer");
  });
});
