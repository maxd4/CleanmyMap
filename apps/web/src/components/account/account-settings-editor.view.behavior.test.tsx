import type { ReactNode } from "react";
import { act, create, type ReactTestInstance, type ReactTestRenderer } from "react-test-renderer";
import { describe, expect, it, vi } from "vitest";

import type { AccountSettingsCopy, AccountSettingsInitialData } from "./account-settings-editor";
import { AccountSettingsView } from "./account-settings-editor.view";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

const requestCookieConsentPreferencesMock = vi.hoisted(() => vi.fn());

vi.mock("@clerk/nextjs", () => ({
  UserButton: () => <button type="button" aria-label="user-account">User account</button>,
}));
vi.mock("next/link", () => ({
  default: ({ children, ...props }: { children: ReactNode; [key: string]: unknown }) => <a {...props}>{children}</a>,
}));
vi.mock("@/components/account/greater-paris-select", () => ({
  GreaterParisSelect: ({ value, onChange }: { value: { label?: string } | null; onChange: (value: unknown) => void }) => (
    <button type="button" data-testid="greater-paris-select" onClick={() => onChange({ level: "commune", label: "Paris" })}>
      {value?.label ?? "Choose a location"}
    </button>
  ),
}));
vi.mock("@/components/account/community-helper-skills-setting", () => ({
  CommunityHelperSkillsSetting: () => <div data-testid="helper-skills">Helper skills</div>,
}));
vi.mock("@/components/account/notification-preferences-setting", () => ({
  NotificationPreferencesSetting: () => <div data-testid="notification-preferences">Notifications</div>,
}));
vi.mock("@/components/sections/rubriques/gamification/leaderboard-opt-in-setting", () => ({
  LeaderboardOptInSetting: () => <div data-testid="leaderboard-opt-in">Leaderboard</div>,
}));
vi.mock("@/components/ui/site-preferences-controls", () => ({
  SitePreferencesControls: () => <div data-testid="site-preferences">Site preferences</div>,
}));
vi.mock("@/lib/storage/ui-state-storage", () => ({
  requestCookieConsentPreferences: requestCookieConsentPreferencesMock,
}));

type ViewProps = Parameters<typeof AccountSettingsView>[0];
const testEmail = ["ada", "example.test"].join("@");

const copy: AccountSettingsCopy = {
  identity: "Identity",
  identityDescription: "Identity description",
  firstName: "First name",
  lastName: "Last name",
  email: "Email",
  avatar: "Avatar",
  nativeAccount: "Native account",
  save: "Save identity",
  saving: "Saving",
  saved: "Saved",
  pending: "Pending",
  error: "Save error",
  publicIdentity: "Public identity",
  publicIdentityDescription: "Public identity description",
  fullName: "Full name",
  pseudo: "Handle",
  preview: "Preview",
  handle: "Public handle",
  handleHelp: "Handle help",
  handleInvalid: "Invalid handle",
  handleUnavailable: "Handle unavailable",
  handleSaved: "Handle saved",
  handleConflict: "Handle conflict",
  publicPrivacy: "Public privacy",
  locations: "Locations",
  locationsDescription: "Locations description",
  residence: "Residence",
  work: "Work",
  clearLocation: "Clear location",
  locationSaved: "Location saved",
  preferences: "Preferences",
  preferencesDescription: "Preferences description",
  browserPreference: "Browser preference",
  accountPreference: "Account preference",
  activity: "Activity",
  activityDescription: "Activity description",
  security: "Security",
  securityDescription: "Security description",
  clerkSecurity: "Clerk security",
  privacy: "Privacy policy",
  deletion: "Delete account",
  deletionDescription: "Deletion description",
  requestDeletion: "Request deletion",
  noLocation: "No location",
  ageBandTitle: "Age band",
  ageBandDescription: "Age band description",
  ageUnder15: "Under 15",
  age15OrOver: "15 or over",
  ageUnknown: "Unknown age",
  ageSaved: "Age saved",
  ageError: "Age error",
  manageAnalytics: "Manage analytics",
};

const initialData: AccountSettingsInitialData = {
  firstName: "Ada",
  lastName: "Lovelace",
  email: testEmail,
  imageUrl: null,
  handle: "ada_lovelace",
  displayNameMode: "full_name",
  locationPreferences: { residence: null, work: null },
  activityStatus: "active",
  ageBand: "15_or_over",
};

function baseProps(overrides: Partial<ViewProps> = {}): ViewProps {
  return {
    copy,
    locale: "fr",
    initialData,
    firstName: initialData.firstName,
    lastName: initialData.lastName,
    setFirstName: vi.fn(),
    setLastName: vi.fn(),
    identityState: "idle",
    onSaveIdentity: vi.fn(),
    handle: initialData.handle,
    setHandle: vi.fn(),
    displayNameMode: "full_name",
    modeState: "idle",
    onSaveMode: vi.fn(),
    handleState: "idle",
    handleError: null,
    onSaveHandle: vi.fn(),
    locations: { residence: null, work: null },
    setLocations: vi.fn(),
    locationState: { residence: "idle", work: "idle" },
    onSaveLocation: vi.fn(),
    activityStatus: "active",
    activityState: "idle",
    onSaveActivity: vi.fn(),
    ageBand: "15_or_over",
    ageBandState: "idle",
    onSaveAgeBand: vi.fn(),
    ...overrides,
  };
}

function renderView(overrides: Partial<ViewProps> = {}) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(<AccountSettingsView {...baseProps(overrides)} />);
  });
  return renderer;
}

function textContent(value: unknown): string {
  if (Array.isArray(value)) return value.map(textContent).join("");
  return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

function buttonWithText(renderer: ReactTestRenderer, text: string): ReactTestInstance {
  const button = renderer.root.findAllByType("button").find((node) => textContent(node.props.children) === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

describe("AccountSettingsView rendered behavior", () => {
  it("renders all sensitive account sections and observable save/error statuses", () => {
    const renderer = renderView({
      identityState: "saved",
      modeState: "pending",
      handleState: "error",
      handleError: "conflict",
      locationState: { residence: "saving", work: "error" },
      activityState: "idle",
      ageBandState: "saved",
      ageBand: "unknown",
    });

    expect(renderer.root.findAllByType("section")).toHaveLength(5);
    expect(renderer.root.findAllByProps({ role: "status" }).map((node) => textContent(node.props.children))).toEqual([
      "Saved",
      "Pending",
      "Saving",
      "Age saved",
    ]);
    expect(renderer.root.findAllByProps({ role: "alert" }).map((node) => textContent(node.props.children))).toEqual([
      "Handle conflict",
      "Save error",
    ]);
    expect(renderer.root.findAllByProps({ "data-testid": "site-preferences" })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ "data-testid": "notification-preferences" })).toHaveLength(1);
    expect(renderer.root.findAllByProps({ href: "/politique-confidentialite" }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({ href: "/contact" }).length).toBeGreaterThan(0);
    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain(testEmail);
    renderer.unmount();
  });

  it("forwards identity, public identity, location, activity, age and consent interactions", () => {
    const setFirstName = vi.fn();
    const setLastName = vi.fn();
    const setHandle = vi.fn();
    const setLocations = vi.fn();
    const onSaveIdentity = vi.fn();
    const onSaveMode = vi.fn();
    const onSaveHandle = vi.fn();
    const onSaveLocation = vi.fn();
    const onSaveActivity = vi.fn();
    const onSaveAgeBand = vi.fn();
    const renderer = renderView({
      setFirstName,
      setLastName,
      setHandle,
      setLocations,
      onSaveIdentity,
      onSaveMode,
      onSaveHandle,
      onSaveLocation,
      onSaveActivity,
      onSaveAgeBand,
    });

    act(() => {
      renderer.root.findByProps({ autoComplete: "given-name" }).props.onChange({ target: { value: "Grace" } });
      renderer.root.findByProps({ autoComplete: "family-name" }).props.onChange({ target: { value: "Hopper" } });
      renderer.root.findByProps({ autoComplete: "nickname" }).props.onChange({ target: { value: "grace_hopper" } });
    });
    expect(setFirstName).toHaveBeenCalledWith("Grace");
    expect(setLastName).toHaveBeenCalledWith("Hopper");
    expect(setHandle).toHaveBeenCalledWith("grace_hopper");

    act(() => {
      buttonWithText(renderer, "Save identity").props.onClick();
      renderer.root.findAllByProps({ "aria-pressed": false })[0]?.props.onClick();
      const handleInput = renderer.root.findByProps({ autoComplete: "nickname" });
      handleInput.parent?.parent?.findAllByType("button")[0]?.props.onClick();
      renderer.root.findByProps({ role: "switch" }).props.onClick();
      renderer.root.findByProps({ value: "under_15" }).props.onChange();
      buttonWithText(renderer, "Manage analytics").props.onClick();
    });
    expect(onSaveIdentity).toHaveBeenCalledTimes(1);
    expect(onSaveMode).toHaveBeenCalledWith("pseudo");
    expect(onSaveHandle).toHaveBeenCalledTimes(1);
    expect(onSaveActivity).toHaveBeenCalledWith("inactive");
    expect(onSaveAgeBand).toHaveBeenCalledWith("under_15");
    expect(requestCookieConsentPreferencesMock).toHaveBeenCalledTimes(1);

    const clearButtons = renderer.root.findAllByType("button").filter((node) => textContent(node.props.children) === "Clear location");
    expect(clearButtons).toHaveLength(2);
    act(() => {
      clearButtons[0]?.props.onClick();
      clearButtons[1]?.props.onClick();
      renderer.root.findAllByProps({ "data-testid": "greater-paris-select" })[0]?.props.onClick();
      renderer.root.findAllByProps({ "data-testid": "greater-paris-select" })[1]?.props.onClick();
      renderer.root.findAllByType("button").filter((node) => textContent(node.props.children) === "Save identity").slice(-2).forEach((button) => button.props.onClick());
    });
    expect(setLocations).toHaveBeenCalled();
    expect(onSaveLocation).toHaveBeenCalledWith("residence");
    expect(onSaveLocation).toHaveBeenCalledWith("work");
    renderer.unmount();
  });

  it("disables every sensitive mutation while its corresponding save is in flight", () => {
    const renderer = renderView({
      identityState: "saving",
      modeState: "saving",
      handleState: "saving",
      locationState: { residence: "saving", work: "saving" },
      activityState: "saving",
      ageBandState: "saving",
    });

    expect(buttonWithText(renderer, "Saving").props.disabled).toBe(true);
    expect(renderer.root.findAllByProps({ "aria-pressed": false })[0]?.props.disabled).toBe(true);
    expect(renderer.root.findByProps({ autoComplete: "nickname" }).parent?.parent?.findAllByType("button")[0]?.props.disabled).toBe(true);
    expect(renderer.root.findAllByProps({ role: "switch" })[0]?.props.disabled).toBe(true);
    expect(renderer.root.findAllByProps({ type: "radio" }).every((node) => node.props.disabled)).toBe(true);
    expect(renderer.root.findAllByProps({ "data-testid": "greater-paris-select" })).toHaveLength(2);
    expect(renderer.root.findAllByType("button").filter((node) => textContent(node.props.children) === "Save location").every((node) => node.props.disabled)).toBe(true);
    renderer.unmount();
  });

  it("renders absent identity values, an active avatar and each non-conflict handle error", () => {
    const onSaveActivity = vi.fn();
    const renderer = renderView({
      initialData: { ...initialData, firstName: "", lastName: "", email: null, imageUrl: "https://example.test/avatar.png" },
      firstName: "",
      lastName: "",
      handleState: "error",
      handleError: "validation",
      activityStatus: "inactive",
      onSaveActivity,
    });

    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain("Photo Clerk active");
    expect(renderer.root.findAllByProps({ role: "alert" }).map((node) => textContent(node.props.children))).toContain("Invalid handle");
    expect(textContent(renderer.root.findAllByType("strong").map((node) => node.props.children))).toContain("—");
    expect(textContent(renderer.root.findAllByType("p").map((node) => node.props.children))).toContain("—");
    act(() => {
      renderer.root.findAllByProps({ "aria-pressed": false })[0]?.props.onClick();
      renderer.root.findByProps({ role: "switch" }).props.onClick();
      renderer.root.findByProps({ value: "15_or_over" }).props.onChange();
      renderer.root.findByProps({ value: "unknown" }).props.onChange();
    });
    expect(onSaveActivity).toHaveBeenCalledWith("active");
    renderer.unmount();

    const unavailableRenderer = renderView({ handleState: "error", handleError: "unavailable" });
    expect(unavailableRenderer.root.findAllByProps({ role: "alert" }).map((node) => textContent(node.props.children))).toContain("Handle unavailable");
    unavailableRenderer.unmount();
  });
});
