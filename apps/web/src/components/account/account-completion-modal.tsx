"use client";

import { useEffect, useMemo } from "react";
import { BadgeCheck, MapPin, RefreshCcw, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppProfile } from "@/lib/profiles";
import { AccountSetupForm } from "@/components/account/account-setup-form";

type AccountSetupReason = "initial_setup" | "schema_update" | null;

type AccountCompletionModalProps = {
  reason: AccountSetupReason;
  initialProfile: AppProfile;
  clerkReachable: boolean;
  isLocalHost: boolean;
  initialArrondissement?: number | null;
  initialLocationType?: "residence" | "work" | null;
};

export function AccountCompletionModal({
  reason,
  initialProfile,
  clerkReachable,
  isLocalHost,
  initialArrondissement = null,
  initialLocationType = null,
}: AccountCompletionModalProps) {
  useEffect(() => {
    const { body } = document;
    const previousOverflow = body.style.overflow;
    body.style.overflow = "hidden";

    return () => {
      body.style.overflow = previousOverflow;
    };
  }, []);

  const copy = useMemo(() => {
    if (reason === "schema_update") {
      return {
        eyebrow: "Mise à jour du compte",
        title: "Complétez la nouvelle donnée demandée",
        description:
          "Une évolution du site a ajouté une information utilisateur requise. Renseignez-la pour retrouver l'accès normal au contenu.",
        accent:
          "Cette fenêtre sert aussi à mettre à jour les comptes existants après une évolution du schéma utilisateur.",
      };
    }

    return {
      eyebrow: "Accès conditionnel",
      title: "Complétez ce qui manque pour continuer",
      description:
        "Certaines rubriques demandent un compte entièrement renseigné. La fenêtre ci-contre vous permet de compléter les données manquantes sans quitter la page.",
      accent:
        "Le site vous redonne l'accès dès que les informations requises sont enregistrées.",
    };
  }, [reason]);

  return (
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/72 px-4 py-6 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-completion-modal-title"
      aria-describedby="account-completion-modal-description"
    >
      <div className="relative w-full max-w-6xl overflow-hidden rounded-[2.75rem] border border-white/12 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.12)_0%,rgba(15,23,42,0.94)_34%,rgba(30,41,59,0.96)_68%,rgba(15,118,110,0.94)_100%)] shadow-[0_30px_110px_-50px_rgba(15,23,42,0.9)]">
        <div className="absolute -left-28 top-10 h-72 w-72 rounded-full bg-emerald-300/12 blur-3xl" />
        <div className="absolute right-0 top-0 h-96 w-96 rounded-full bg-cyan-300/10 blur-3xl" />

        <div className="relative grid min-h-[min(88vh,54rem)] gap-0 lg:grid-cols-[0.95fr_1.05fr]">
          <aside className="flex flex-col justify-between gap-8 border-b border-white/10 px-5 py-6 sm:px-8 sm:py-8 lg:border-b-0 lg:border-r lg:px-10 lg:py-10">
            <div className="space-y-5">
              <p className="cmm-text-caption font-black uppercase tracking-[0.24em] text-emerald-100/90">
                {copy.eyebrow}
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/20 bg-emerald-200/10 text-emerald-100">
                    {reason === "schema_update" ? (
                      <RefreshCcw className="h-6 w-6" />
                    ) : (
                      <ShieldAlert className="h-6 w-6" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h2
                      id="account-completion-modal-title"
                      className="text-3xl font-black tracking-tight text-white sm:text-4xl"
                    >
                      {copy.title}
                    </h2>
                    <p
                      id="account-completion-modal-description"
                      className="max-w-xl text-sm leading-relaxed text-violet-100/82 sm:text-base"
                    >
                      {copy.description}
                    </p>
                  </div>
                </div>

                <div className="rounded-[1.75rem] border border-white/10 bg-white/[0.06] p-4 shadow-[0_14px_40px_-28px_rgba(15,23,42,0.7)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    {[
                      {
                        icon: BadgeCheck,
                        title: "Compte à jour",
                        text: "Les métadonnées sont écrites pour les comptes existants et les nouveaux.",
                      },
                      {
                        icon: MapPin,
                        title: "Accès rétabli",
                        text: "La page se recharge dès que les données requises sont enregistrées.",
                      },
                    ].map(({ icon: Icon, title, text }) => (
                      <div
                        key={title}
                        className="rounded-2xl border border-white/10 bg-slate-950/28 p-4"
                      >
                        <div className="flex items-center gap-2">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200/15 bg-emerald-200/10 text-emerald-100">
                            <Icon className="h-4 w-4" />
                          </div>
                          <p className="text-sm font-semibold text-white">
                            {title}
                          </p>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-violet-100/74">
                          {text}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-3 rounded-[1.75rem] border border-white/10 bg-white/[0.05] p-4 text-sm leading-6 text-violet-100/78">
              <p>{copy.accent}</p>
              <p className={cn("text-[11px] font-medium uppercase tracking-[0.18em]", isLocalHost ? "text-cyan-100/72" : "text-amber-100/72")}>
                {isLocalHost
                  ? "Mode local actif"
                  : "Session de production ou de préproduction"}
              </p>
              <p className="text-[11px] text-violet-100/60">
                {clerkReachable
                  ? "Clerk est joignable pour enregistrer les modifications."
                  : "Clerk n'est pas joignable: la complétion reste affichée pour vous signaler le blocage."}
              </p>
            </div>
          </aside>

          <div className="flex min-h-0 items-stretch px-4 py-4 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
            <div className="min-h-0 w-full overflow-y-auto rounded-[2.25rem] border border-white/10 bg-white/[0.02] p-3 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.5)] sm:p-4">
              <AccountSetupForm
                submitMode="refresh"
                initialProfile={initialProfile}
                clerkReachable={clerkReachable}
                isLocalHost={isLocalHost}
                initialArrondissement={initialArrondissement}
                initialLocationType={initialLocationType}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
