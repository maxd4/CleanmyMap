import type { Dispatch, FormEvent, MutableRefObject, SetStateAction } from "react";
import type { TerritoryLocationSelection } from "@/lib/user-location-preference";
import type { AppProfile, DisplayNameMode } from "@/lib/profiles";
import {
  clearLocationPreferenceMetadata,
  createLocationPreferencesMetadata,
} from "@/lib/user-location-preference";
import { defaultMessageForKind, isAppError, toAppError, type AppError } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import { ACCOUNT_SETUP_SCHEMA_VERSION, buildClerkMetadataPatch, logFailure } from "@/lib/account-setup/account-setup-runtime";
import {
  clearAccountSetupDeferralMetadata,
  createAccountSetupDeferralMetadata,
  persistAccountSetupChanges,
  type AccountSetupPersistenceStep,
} from "@/components/account/account-setup-save";
import {
  getAccountSetupDeferralConfirmationMessage,
  shouldConfirmAccountSetupDeferral,
} from "@/components/account/account-setup-state";

type AccountSetupUser = {
  unsafeMetadata?: unknown;
  update: (update: { firstName?: string; lastName?: string }) => Promise<unknown>;
  updateMetadata: (update: { unsafeMetadata: Record<string, unknown> }) => Promise<unknown>;
};

type ActionState = {
  user: AccountSetupUser | null | undefined;
  saveInFlight: MutableRefObject<boolean>;
  setError: Dispatch<SetStateAction<AppError | null>>;
  setIsSaving: Dispatch<SetStateAction<boolean>>;
  navigateAfterSetup: () => void;
};

export async function deferAccountSetup({
  user,
  saveInFlight,
  setError,
  setIsSaving,
  isDirty,
  completedPersistenceSteps,
  confirmDeferral,
  navigateAfterSetup,
}: ActionState & {
  isDirty: boolean;
  completedPersistenceSteps: Set<AccountSetupPersistenceStep>;
  confirmDeferral: (message: string) => boolean;
}): Promise<void> {
  if (saveInFlight.current) return;
  setError(null);
  if (!user) {
    setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
    return;
  }
  if (
    shouldConfirmAccountSetupDeferral(isDirty, completedPersistenceSteps.size) &&
    !confirmDeferral(getAccountSetupDeferralConfirmationMessage(completedPersistenceSteps.size))
  ) {
    return;
  }

  try {
    saveInFlight.current = true;
    setIsSaving(true);
    const metadata = createAccountSetupDeferralMetadata(
      { ...((user.unsafeMetadata ?? {}) as Record<string, unknown>) },
      ACCOUNT_SETUP_SCHEMA_VERSION,
      new Date().toISOString(),
    );
    await user.updateMetadata({
      unsafeMetadata: {
        profileSetupDeferred: metadata.profileSetupDeferred,
        profileSetupDeferredVersion: metadata.profileSetupDeferredVersion,
        profileSetupDeferredAt: metadata.profileSetupDeferredAt,
      },
    });
    navigateAfterSetup();
  } catch (caughtError) {
    logFailure("AccountSetup", "Deferral failed", caughtError);
    const appError = isAppError(caughtError)
      ? caughtError
      : toAppError(caughtError, { kind: "server", message: "Impossible de différer la configuration. Réessayez." });
    setError(appError);
  } finally {
    saveInFlight.current = false;
    setIsSaving(false);
  }
}

export async function submitAccountSetup({
  event,
  isSaving,
  currentStep,
  onAdvance,
  setSubmitAttempted,
  formIsValid,
  selectedProfile,
  displayNameMode,
  activeResidence,
  activeWork,
  residence,
  work,
  trimmedFirstName,
  trimmedLastName,
  completedPersistenceSteps,
  setIsDirty,
  updateActiveProfile,
  saveDisplayMode,
  onRetry,
  onRefresh,
  ...state
}: ActionState & {
  event?: FormEvent<HTMLFormElement>;
  isSaving: boolean;
  currentStep: "identity" | "usage" | "location";
  onAdvance: () => void;
  setSubmitAttempted: Dispatch<SetStateAction<boolean>>;
  formIsValid: boolean;
  selectedProfile: AppProfile;
  displayNameMode: DisplayNameMode;
  activeResidence: boolean;
  activeWork: boolean;
  residence: TerritoryLocationSelection | null;
  work: TerritoryLocationSelection | null;
  trimmedFirstName: string;
  trimmedLastName: string;
  completedPersistenceSteps: Set<AccountSetupPersistenceStep>;
  setIsDirty: Dispatch<SetStateAction<boolean>>;
  updateActiveProfile: (activeProfile: AppProfile) => Promise<void>;
  saveDisplayMode: () => void | Promise<void>;
  onRetry: () => void;
  onRefresh: () => void;
}): Promise<void> {
  event?.preventDefault();
  if (isSaving || state.saveInFlight.current) return;
  state.setError(null);
  if (!state.user) {
    state.setError(toAppError("Compte introuvable, reconnectez-vous.", { kind: "permission", message: "Compte introuvable, reconnectez-vous." }));
    return;
  }
  if (currentStep !== "location") {
    onAdvance();
    return;
  }
  setSubmitAttempted(true);
  if (!formIsValid) {
    state.setError(toAppError("Vérifiez les informations obligatoires.", { kind: "validation", message: "Vérifiez les informations obligatoires." }));
    return;
  }

  try {
    state.saveInFlight.current = true;
    state.setIsSaving(true);
    const metadata = clearLocationPreferenceMetadata({ ...((state.user.unsafeMetadata ?? {}) as Record<string, unknown>) });
    const completedMetadata = clearAccountSetupDeferralMetadata(metadata);
    Object.assign(completedMetadata, {
      profileSetupCompleted: true,
      profileSetupVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
      profileSetupSchemaVersion: ACCOUNT_SETUP_SCHEMA_VERSION,
      display_name_mode: displayNameMode,
    });
    Object.assign(
      completedMetadata,
      createLocationPreferencesMetadata({
        residence: activeResidence ? residence : null,
        work: activeWork ? work : null,
      }),
    );
    const metadataPatch = buildClerkMetadataPatch(
      (state.user.unsafeMetadata ?? {}) as Record<string, unknown>,
      completedMetadata,
    );

    await persistAccountSetupChanges({
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      metadata: metadataPatch,
      selectedProfile,
      updateUser: (update) => state.user!.update({
        firstName: update.firstName ?? "",
        lastName: update.lastName ?? "",
      }),
      updateMetadata: (patch) => state.user!.updateMetadata({ unsafeMetadata: patch }),
      updateActiveProfile,
      saveDisplayMode,
      completedSteps: completedPersistenceSteps,
    });

    completedPersistenceSteps.clear();
    setIsDirty(false);
    state.setError(null);
    state.navigateAfterSetup();
  } catch (caughtError) {
    logFailure("AccountSetup", "Update failed", caughtError, { profile: selectedProfile });
    const appError = isAppError(caughtError)
      ? caughtError
      : toAppError(caughtError, { kind: "server", message: "Impossible d’enregistrer les préférences. Réessayez." });
    if (appError.kind === "network") {
      notifyNetworkToast({
        message: appError.message || defaultMessageForKind("network"),
        onRetry,
        onRefresh,
      });
    }
    state.setError(appError);
  } finally {
    state.saveInFlight.current = false;
    state.setIsSaving(false);
  }
}
