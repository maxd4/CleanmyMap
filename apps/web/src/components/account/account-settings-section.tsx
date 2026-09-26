"use client";

import { useState } from "react";
import { Settings, Trash2, Shield, Mail, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { CmmButton } from "@/components/ui/cmm-button";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import type { Locale } from "@/lib/ui/preferences";

const ACCOUNT_SETTINGS_COPY = {
  fr: {
    compactTitle: "Préférences et compte",
    compactDescription:
      "Langue, affichage, confidentialité, localisation et demande de suppression.",
    openSettings: "Ouvrir les réglages",
    title: "Paramètres du compte",
    subtitle: "Gérez vos préférences et vos données",
    privacy: "Confidentialité",
    privacyDescription: "Gérez la manière dont vos données sont utilisées et partagées.",
    privacyPolicy: "Politique de confidentialité",
    deletion: "Suppression du compte",
    deletionDescription:
      "Vous pouvez demander l'effacement de votre compte. Votre demande RGPD sera examinée et traitée selon les données concernées et les obligations applicables.",
    requestDeletion: "Demander la suppression de mon compte",
    deletionNotice:
      "Il s'agit d'une demande, et non d'une suppression immédiate. Certaines données peuvent devoir être conservées ou anonymisées lorsque le service ou la loi le justifie.",
    cancel: "Annuler",
    dataQuestions:
      "Pour toute question sur vos données, utilisez le formulaire RGPD de la page Contact.",
  },
  en: {
    compactTitle: "Preferences and account",
    compactDescription:
      "Language, display, privacy, location and account deletion request.",
    openSettings: "Open settings",
    title: "Account settings",
    subtitle: "Manage your preferences and data",
    privacy: "Privacy",
    privacyDescription: "Manage how your data is used and shared.",
    privacyPolicy: "Privacy policy",
    deletion: "Account deletion",
    deletionDescription:
      "You can request deletion of your account. Your GDPR request will be reviewed and handled according to the data concerned and applicable obligations.",
    requestDeletion: "Request account deletion",
    deletionNotice:
      "This is a request, not an immediate deletion. Some data may need to be retained or anonymized when required by the service or applicable law.",
    cancel: "Cancel",
    dataQuestions:
      "For questions about your data, use the GDPR form on the Contact page.",
  },
} as const;

export function AccountSettingsSection({
  compact = false,
  locale: localeOverride,
}: {
  compact?: boolean;
  locale?: Locale;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const { locale } = useSitePreferences();
  const copy = ACCOUNT_SETTINGS_COPY[localeOverride ?? locale];

  if (compact) {
    // Cette variante reste ambre pour s'intégrer aux cartes dashboard/profil.
    return (
      <div className="flex flex-col gap-3 rounded-2xl border border-amber-200/18 bg-[rgba(69,26,3,0.34)] p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{copy.compactTitle}</h2>
          <p className="mt-1 text-sm text-amber-100/75">
            {copy.compactDescription}
          </p>
        </div>
        <CmmButton
          href="/reglages"
          tone="secondary"
          variant="pill"
          className="w-full justify-center px-5 text-sm font-black sm:w-auto"
        >
          {copy.openSettings}
        </CmmButton>
      </div>
    );
  }

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-sky-200/60 bg-white/82 shadow-[0_18px_50px_-40px_rgba(14,165,233,0.35)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-sky-50/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.7),inset_0_-1px_0_rgba(14,165,233,0.08)]" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-sky-200 bg-sky-100">
            <Settings size={20} className="text-sky-700" aria-hidden="true" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {copy.title}
            </h2>
            <p className="text-sm text-slate-600">
              {copy.subtitle}
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Confidentialité */}
          <div className="rounded-2xl border border-sky-200/70 bg-sky-50/80 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]">
            <div className="flex items-center gap-2.5 mb-2">
              <Shield size={17} className="text-sky-700 shrink-0" aria-hidden="true" />
              <h3 className="font-bold text-slate-900">{copy.privacy}</h3>
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              {copy.privacyDescription}
            </p>
            <a
              href="/politique-confidentialite"
              className="inline-flex items-center gap-2 rounded-full border border-sky-300 bg-sky-100 px-3 py-1.5 text-sm font-semibold text-sky-800 transition-colors hover:bg-sky-200"
            >
              <Mail size={13} aria-hidden="true" />
              {copy.privacyPolicy}
            </a>
          </div>

          {/* Rose is reserved here for the destructive deletion action. */}
          <div className="rounded-2xl border border-rose-200 bg-rose-100/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="flex items-center gap-2.5 mb-2">
              <Trash2 size={17} className="text-rose-600 shrink-0" aria-hidden="true" />
              <h3 className="font-bold text-slate-900">{copy.deletion}</h3>
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              {copy.deletionDescription}
            </p>

            {!showDeleteConfirm ? (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <Trash2 size={13} aria-hidden="true" />
                {copy.requestDeletion}
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-100 p-3">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <p className="text-sm text-rose-900 leading-relaxed">
                    {copy.deletionNotice}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Link
                    href="/contact"
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    {copy.requestDeletion}
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    {copy.cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-5">
          {copy.dataQuestions}
        </p>
      </div>
    </section>
  );
}
