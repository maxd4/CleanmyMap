"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisplayNameMode } from "@/lib/profiles";
import { cn } from "@/lib/utils";

type DisplayNameModeSettingProps = {
  currentMode: DisplayNameMode;
  displayName: string;
  userId: string;
  locale: "fr" | "en";
};

const MODE_COPY: Record<
  DisplayNameMode,
  {
    label: string;
    description: string;
  }
> = {
  full_name: {
    label: "Nom et prénom",
    description: "Affiche votre identité complète quand elle est disponible.",
  },
  pseudo: {
    label: "Pseudo",
    description: "Affiche votre handle / nom court à la place.",
  },
};

export function DisplayNameModeSetting({
  currentMode,
  displayName,
  userId,
  locale,
}: DisplayNameModeSettingProps) {
  const router = useRouter();
  const [mode, setMode] = useState<DisplayNameMode>(currentMode);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const saveMode = (nextMode: DisplayNameMode) => {
    if (nextMode === mode || isPending) {
      return;
    }

    setMessage(null);
    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/users/profile/display-name-mode", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ displayNameMode: nextMode }),
          });
          const payload = (await response.json().catch(() => null)) as
            | { displayName?: string; error?: string }
            | null;

          if (!response.ok) {
            throw new Error(payload?.error || "Impossible de mettre à jour l'affichage du compte.");
          }

          setMode(nextMode);
          setMessage(
            locale === "fr"
              ? `Affichage enregistré: ${payload?.displayName || displayName}`
              : `Display saved: ${payload?.displayName || displayName}`,
          );
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : locale === "fr"
                ? "Impossible de mettre à jour l'affichage du compte."
                : "Unable to update the account display.",
          );
        }
      })();
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">
          {locale === "fr" ? "Nom affiché du compte" : "Account display name"}
        </p>
        <p className="text-sm text-slate-600">
          {locale === "fr"
            ? "Choisissez comment votre compte apparaît dans l'interface."
            : "Choose how your account appears in the interface."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(MODE_COPY) as DisplayNameMode[]).map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              disabled={isPending}
              onClick={() => saveMode(option)}
              className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-amber-300 bg-amber-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-100",
                isPending && "opacity-70",
              )}
            >
              <p className="text-sm font-bold text-slate-900">{MODE_COPY[option].label}</p>
              <p className="mt-1 text-sm text-slate-600">{MODE_COPY[option].description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {locale === "fr" ? "Aperçu actuel" : "Current preview"}
        </p>
        <p className="mt-2 text-base font-semibold text-slate-900">{displayName}</p>
        <p className="mt-1 text-sm text-slate-600">
          {locale === "fr"
            ? `Identifiant backend unique: ${userId}`
            : `Unique backend identifier: ${userId}`}
        </p>
      </div>

      {message ? <p className="text-sm font-medium text-slate-700">{message}</p> : null}
    </div>
  );
}
