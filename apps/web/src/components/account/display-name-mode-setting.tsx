"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { DisplayNameMode } from "@/lib/profiles";
import type { Locale } from "@/lib/ui/preferences";
import { cn } from "@/lib/utils";

type DisplayNameModeSettingProps = {
  currentMode: DisplayNameMode;
  displayName: string;
  userId: string;
  locale: "fr" | "en";
};

const MODE_COPY: Record<Locale, Record<DisplayNameMode, { label: string; description: string }>> = {
  fr: {
    full_name: {
      label: "Nom et prénom",
      description: "Affiche votre identité complète quand elle est disponible.",
    },
    pseudo: {
      label: "Pseudo",
      description: "Affiche votre handle / nom court à la place.",
    },
  },
  en: {
    full_name: {
      label: "Full name",
      description: "Shows your full identity when available.",
    },
    pseudo: {
      label: "Username",
      description: "Shows your handle or short name instead.",
    },
  },
};

const DISPLAY_NAME_COPY = {
  fr: {
    title: "Nom affiché du compte",
    description: "Choisissez comment votre compte apparaît dans l'interface.",
    preview: "Aperçu actuel",
    identifier: "Identifiant backend unique",
    saved: (displayName: string) => `Affichage enregistré : ${displayName}`,
    error: "Impossible de mettre à jour l'affichage du compte.",
  },
  en: {
    title: "Account display name",
    description: "Choose how your account appears in the interface.",
    preview: "Current preview",
    identifier: "Unique backend identifier",
    saved: (displayName: string) => `Display saved: ${displayName}`,
    error: "Unable to update the account display.",
  },
} as const;

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
  const copy = DISPLAY_NAME_COPY[locale];
  const modeCopy = MODE_COPY[locale];

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
            throw new Error(payload?.error || copy.error);
          }

          setMode(nextMode);
          setMessage(copy.saved(payload?.displayName || displayName));
          router.refresh();
        } catch (error) {
          setMessage(
            error instanceof Error
              ? error.message
              : copy.error,
          );
        }
      })();
    });
  };

  return (
    <div className="space-y-4 rounded-xl border border-sky-100 bg-sky-50/70 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-900">
          {copy.title}
        </p>
        <p className="text-sm text-slate-600">
          {copy.description}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {(Object.keys(modeCopy) as DisplayNameMode[]).map((option) => {
          const active = mode === option;
          return (
            <button
              key={option}
              type="button"
              disabled={isPending}
              aria-pressed={active}
              onClick={() => saveMode(option)}
                className={cn(
                "rounded-2xl border p-4 text-left transition-all",
                active
                  ? "border-sky-300 bg-sky-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
                isPending && "opacity-70",
              )}
            >
              <p className="text-sm font-bold text-slate-900">{modeCopy[option].label}</p>
              <p className="mt-1 text-sm text-slate-600">{modeCopy[option].description}</p>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white/85 p-4">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">
          {copy.preview}
        </p>
        <p className="mt-2 text-base font-semibold text-slate-900">{displayName}</p>
        <p className="mt-1 text-sm text-slate-600">
          {copy.identifier}: {userId}
        </p>
      </div>

      {message ? <p className="text-sm font-medium text-sky-700">{message}</p> : null}
    </div>
  );
}
