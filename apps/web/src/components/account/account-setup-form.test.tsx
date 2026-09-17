import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./use-account-setup-controller", () => ({
  useAccountSetupController: () => ({
    isLoaded: true,
    clerkReachable: true,
    user: { id: "user_1" },
    locale: "fr",
    profileOptions: ["benevole"],
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
    shouldShowFieldError: () => false,
    markFormDirty: vi.fn(),
    touchField: vi.fn(),
    handleFirstNameChange: vi.fn(),
    handleLastNameChange: vi.fn(),
    handleProfileChange: vi.fn(),
    handleDisplayModeChange: vi.fn(),
    updateResidence: vi.fn(),
    updateWork: vi.fn(),
    updateResidenceEnabled: vi.fn(),
    updateWorkEnabled: vi.fn(),
    updateNoneSelected: vi.fn(),
    handleDefer: vi.fn(),
    handleSubmit: vi.fn(),
    getDeferralLabel: () => "Configurer plus tard",
  }),
}));

vi.mock("./account-setup-sections", () => ({
  AccountSetupDisplayModeGrid: () => <div />,
  AccountSetupLocationFields: () => <div />,
  AccountSetupProfileGrid: () => <div />,
}));

vi.mock("./account-setup-primitives", () => ({
  AccountSetupSection: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <section><h2>{title}</h2>{children}</section>
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

describe("AccountSetupForm initial identity", () => {
  it("renders required first and last names without an initial pseudo control", () => {
    const markup = renderToStaticMarkup(
      <AccountSetupForm initialProfile="benevole" clerkReachable initialRole="benevole" />,
    );

    expect(markup).toContain("Prénom*");
    expect(markup).toContain("Nom*");
    expect(markup).toContain('autoComplete="given-name"');
    expect(markup).toContain('autoComplete="family-name"');
    expect(markup).not.toContain("Pseudo");
    expect(markup).not.toContain("Je reste pseudonyme");
    expect(markup).not.toContain('type="checkbox"');
  });
});
