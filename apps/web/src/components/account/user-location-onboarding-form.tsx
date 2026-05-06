"use client";

import { useState } from"react";
import { useUser } from"@clerk/nextjs";
import { useRouter } from"next/navigation";
import {
  parseParisArrondissement,
} from"@/lib/geo/paris-arrondissements";
import { GreaterParisSelect } from"@/lib/geo/greater-paris-select";
import {
 extractUserLocationPreferenceFromMetadata,
 extractGreaterParisLocationPreferenceFromMetadata,
 createGreaterParisMetadata,
 type UserLocationType,
} from"@/lib/user-location-preference";
import { ErrorMessage } from"@/components/ui/error-message";
import { InlineFieldError } from"@/components/ui/inline-field-error";
import { PermissionErrorState } from"@/components/ui/permission-error-state";
import { notifyNetworkToast } from"@/lib/errors/network-toast";
import { defaultMessageForKind, isAppError, toAppError, type AppError } from"@/lib/errors/app-errors";

type UserLocationOnboardingFormProps = {
 nextPath: string;
};

export function UserLocationOnboardingForm({
  nextPath,
}: UserLocationOnboardingFormProps) {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const currentPreference = extractUserLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
  const greaterParisPref = extractGreaterParisLocationPreferenceFromMetadata(
    user?.unsafeMetadata as Record<string, unknown> | undefined,
  );
 const [locationType, setLocationType] = useState<UserLocationType>(
   greaterParisPref?.locationType ?? currentPreference?.locationType ?? "residence",
 );
  const [arrondissement, setArrondissement] = useState<number>(
    currentPreference?.arrondissement ?? 0,
  );
 const [selectedZone, setSelectedZone] = useState<string>(
   greaterParisPref?.zone ?? "",
 );
 const [isSaving, setIsSaving] = useState(false);
 const [error, setError] = useState<AppError | null>(null);

 const zoneIsValid = Boolean(selectedZone || arrondissement > 0);

 async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setError(null);

  if (!user) {
    setError(
      toAppError("Compte introuvable, reconnectez-vous.", {
        kind: "permission",
        message: "Compte introuvable, reconnectez-vous.",
      }),
    );
    return;
  }

  const metadata: Record<string, unknown> = {
    ...(user.unsafeMetadata ?? {}),
  };

  if (selectedZone && greaterParisPref) {
    const zonePrefs = createGreaterParisMetadata(
      selectedZone,
      greaterParisPref.department,
      greaterParisPref.areaType,
      locationType,
    );
    Object.assign(metadata, zonePrefs);
  } else if (selectedZone && arrondissement > 0) {
    const parsedArr = parseParisArrondissement(arrondissement);
    if (parsedArr) {
      metadata["parisArrondissement"] = parsedArr;
      metadata["parisLocationType"] = locationType;
    }
  } else if (arrondissement > 0) {
    const parsedArr = parseParisArrondissement(arrondissement);
    if (parsedArr) {
      metadata["parisArrondissement"] = parsedArr;
      metadata["parisLocationType"] = locationType;
    } else {
      setError(
        toAppError("Sélectionnez une zone (arrondissement ou commune).", {
          kind: "validation",
          message: "Sélectionnez une zone (arrondissement ou commune).",
        }),
      );
      return;
    }
  } else {
    setError(
      toAppError("Sélectionnez une zone (arrondissement ou commune).", {
        kind: "validation",
        message: "Sélectionnez une zone (arrondissement ou commune).",
      }),
    );
    return;
  }

  try {
    setIsSaving(true);
    await user.update({ unsafeMetadata: metadata });
    router.replace(nextPath);
    router.refresh();
  } catch (error) {
    console.error("User location preference update failed", error);
    const appError = isAppError(error)
      ? error
      : toAppError(error, {
          kind: "server",
          message: "Impossible d'enregistrer le lieu. Réessayez.",
        });
    if (appError.kind === "network") {
      notifyNetworkToast({
        message: appError.message || defaultMessageForKind("network"),
        onRetry: () => window.location.reload(),
        onRefresh: () => window.location.reload(),
      });
    }
    setError(appError);
  } finally {
    setIsSaving(false);
  }
 }

 if (!isLoaded) {
 return (
 <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
 <p className="cmm-text-small cmm-text-secondary">Chargement du compte...</p>
 </div>
 );
 }

 if (!user) {
 return (
 <PermissionErrorState
 title="Connexion requise"
 message="Reconnectez-vous pour définir votre zone prioritaire."
 />
 );
 }

 return (
 <form
 onSubmit={(event) => void handleSubmit(event)}
 className="space-y-4 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
 >
<div>
  <h1 className="text-lg font-semibold cmm-text-primary">
  Votre zone prioritaire
  </h1>
  <p className="mt-2 cmm-text-small cmm-text-secondary">
  Indiquez votre lieu principal (arrondissement ou commune) pour prioriser les associations et
  commerçant·e·s proches dans les rubriques.
  </p>
  </div>

 <fieldset className="space-y-2">
 <legend className="cmm-text-small font-medium cmm-text-primary">
 Ce lieu correspond à :
 </legend>
<label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
  <input
  type="radio"
  name="locationType"
  value="residence"
  checked={locationType ==="residence"}
  onChange={() => setLocationType("residence")}
  />
  Ma zone de résidence
  </label>
  <label className="flex items-center gap-2 cmm-text-small cmm-text-secondary">
  <input
  type="radio"
  name="locationType"
  value="work"
  checked={locationType ==="work"}
  onChange={() => setLocationType("work")}
  />
  Ma zone de travail
  </label>
 </fieldset>

<label className="block space-y-2">
  <span className="cmm-text-small font-medium cmm-text-primary">
  Zone (arrondissement ou commune)
  </span>
  <GreaterParisSelect
    value={selectedZone || (arrondissement ? `${arrondissement}e arrondissement` : "")}
    onChange={(value) => {
      setSelectedZone(value);
      const arrMatch = value.match(/^(\d{1,2})/);
      const matchedArrondissement = arrMatch?.[1];
      if (matchedArrondissement) {
        setArrondissement(parseInt(matchedArrondissement, 10));
      }
    }}
    placeholder="Sélectionnez une zone..."
  />
  {!zoneIsValid ? <InlineFieldError message="Sélectionnez une zone (arrondissement ou commune)." /> : null}
  </label>

 {error ? (
 error.kind ==="permission" ? (
 <PermissionErrorState
 title="Connexion requise"
 message={error.message}
 />
 ) : (
 <ErrorMessage
 kind={error.kind}
 title="Le lieu n'a pas pu être enregistré"
 message={error.message}
 actions={<button type="button" onClick={() => window.location.reload()} className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">Réessayer</button>}
 />
 )
 ) : null}

 <button
  type="submit"
  disabled={isSaving || !zoneIsValid}
  className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 cmm-text-small font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
 >
 {isSaving ?"Enregistrement..." :"Valider et continuer"}
 </button>
 </form>
 );
}
