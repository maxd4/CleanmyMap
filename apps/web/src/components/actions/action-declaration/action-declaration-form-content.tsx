"use client";

import { AlertTriangle, History, Loader2, X } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmDialog } from "@/components/ui/cmm-dialog";
import { cn } from "@/lib/utils";
import type { getBlockClasses } from "@/lib/ui/block-accents";
import type { CreateActionPayload } from "@/lib/actions/types";
import { ActionDeclarationFormConfirmation } from "./ui/action-declaration-form-confirmation";
import { ActionDeclarationExportPicker } from "./ui/action-declaration-export-picker";
import { ActionDeclarationFormFeedback } from "./ui/action-declaration-form.feedback";
import { ActionDeclarationFormSections } from "./action-declaration-form-sections";
import type { ActionDeclarationFormProps } from "./action-declaration-form.types";
import type { FormState } from "./model";

type SurfaceSectionProps = React.ComponentProps<typeof ActionDeclarationFormSections>;

export function ActionDeclarationFormStatus({ error }: { error: string | null }) {
  return (
    <div className="relative overflow-hidden px-4 py-6 md:px-6 lg:px-8">
      <div className="cmm-page-width relative flex items-center justify-center">
        <CmmCard tone={error ? "rose" : "emerald"} variant="glass" size="lg" className="w-full max-w-2xl">
          <div className={cn("space-y-4", error ? undefined : "text-center")}>
            {error ? <p className="text-xs font-black uppercase tracking-[0.18em] text-rose-700">Erreur</p> : null}
            {!error ? <Loader2 size={22} className="mx-auto animate-spin text-emerald-600" /> : null}
            <h2 className={cn("text-2xl font-black tracking-tight", error ? "text-rose-950" : "text-emerald-950")}>
              {error ? "Le formulaire existant n'a pas pu être chargé" : "Chargement du formulaire existant"}
            </h2>
            <p className={cn("text-sm leading-6", error ? "text-rose-950" : "text-emerald-950")}>
              {error ?? "Nous récupérons les informations préparées avant l'action pour reprendre le même enregistrement."}
            </p>
          </div>
        </CmmCard>
      </div>
    </div>
  );
}

type OverlayProps = {
  form: FormState;
  payload: CreateActionPayload;
  userMetadata: ActionDeclarationFormProps["userMetadata"];
  showConfirmation: boolean;
  onModify: () => void;
  onConfirm: () => void;
  isSubmitting: boolean;
  isExportPickerOpen: boolean;
  onCloseExport: () => void;
  actorName: string;
  showRestrictionDialog: boolean;
  onCloseRestriction: () => void;
  signInHref?: string;
  signUpHref?: string;
};

export function ActionDeclarationFormOverlays({
  form,
  payload,
  userMetadata,
  showConfirmation,
  onModify,
  onConfirm,
  isSubmitting,
  isExportPickerOpen,
  onCloseExport,
  actorName,
  showRestrictionDialog,
  onCloseRestriction,
  signInHref,
  signUpHref,
}: OverlayProps) {
  return (
    <>
      {showConfirmation ? (
        <ActionDeclarationFormConfirmation
          form={form}
          payload={payload}
          userMetadata={userMetadata}
          onModify={onModify}
          onConfirm={onConfirm}
          isSubmitting={isSubmitting}
        />
      ) : null}
      <ActionDeclarationExportPicker
        isOpen={isExportPickerOpen}
        onClose={onCloseExport}
        form={form}
        actorName={actorName}
      />
      {showRestrictionDialog ? (
        <CmmDialog
          open
          onClose={onCloseRestriction}
          ariaLabelledBy="action-restriction-title"
          size="lg"
          panelClassName="w-full max-w-2xl overflow-hidden rounded-[2.5rem] border border-amber-200/80 bg-[#FFF8EE]/98 shadow-[0_28px_72px_-28px_rgba(217,119,6,0.28)] backdrop-blur-xl"
        >
          <div className="flex items-start justify-between gap-4 border-b border-amber-200/70 bg-gradient-to-r from-amber-50 via-[#FFF6E7] to-[#FFF3DB] px-6 py-5">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200/80 bg-white text-amber-700 shadow-sm">
                <AlertTriangle size={18} />
              </div>
              <div>
                <p className="cmm-text-caption font-black uppercase tracking-[0.2em] text-amber-700/80">Avertissement</p>
                <h3 id="action-restriction-title" className="mt-1 text-xl font-black tracking-tight text-amber-950">Connexion requise</h3>
              </div>
            </div>
            <button type="button" onClick={onCloseRestriction} aria-label="Fermer le message" className="flex h-10 w-10 items-center justify-center rounded-full border border-amber-200/70 bg-white text-amber-700 transition hover:bg-amber-100/80">
              <X size={16} />
            </button>
          </div>
          <div className="space-y-4 px-6 py-6">
            <p className="text-sm leading-7 text-amber-950/82">Connectez-vous pour compléter et envoyer ce formulaire.</p>
            <div className="flex flex-wrap gap-2">
              {signInHref ? <CmmButton href={signInHref} tone="primary" variant="pill" size="sm">Se connecter et reprendre</CmmButton> : null}
              {signUpHref ? <CmmButton href={signUpHref} tone="secondary" variant="pill" size="sm">Créer un compte</CmmButton> : null}
            </div>
          </div>
          <div className="flex justify-end gap-3 border-t border-amber-200/70 bg-[#FFF8EE] px-6 py-5">
            <button type="button" onClick={onCloseRestriction} className="rounded-2xl border border-amber-200/80 bg-white px-4 py-2.5 text-sm font-bold text-amber-900 transition hover:bg-amber-100/70">Fermer</button>
          </div>
        </CmmDialog>
      ) : null}
    </>
  );
}

type SurfaceProps = {
  actClasses: ReturnType<typeof getBlockClasses>;
  showDraftBanner: boolean;
  isCompletionBlocked: boolean;
  formattedPendingDraftSavedAt: string | null;
  onResumeDraft: () => void;
  onIgnoreDraft: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  sections: SurfaceSectionProps;
  feedback: React.ComponentProps<typeof ActionDeclarationFormFeedback>;
  onReset: () => void;
};

export function ActionDeclarationFormSurface({
  actClasses,
  showDraftBanner,
  isCompletionBlocked,
  formattedPendingDraftSavedAt,
  onResumeDraft,
  onIgnoreDraft,
  onSubmit,
  sections,
  feedback,
  onReset,
}: SurfaceProps) {
  return (
    <div className={cn("relative w-full overflow-hidden px-4 py-6 text-emerald-50 md:px-6 lg:px-8", "bg-gradient-to-b", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-300/40 to-transparent" />
        <div className="absolute -left-24 top-0 h-96 w-96 rounded-full bg-emerald-200/60 blur-[120px]" />
        <div className="absolute right-0 top-12 h-[30rem] w-[30rem] rounded-full bg-emerald-100/50 blur-[120px]" />
        <div className="absolute bottom-0 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-teal-100/45 blur-[120px]" />
      </div>
      <div className="cmm-page-width relative flex flex-col gap-6">
        {showDraftBanner && !isCompletionBlocked ? (
          <div className="flex flex-col gap-3 rounded-[2rem] border border-amber-200/80 bg-[#F3FBF6] px-4 py-3 shadow-[0_18px_36px_-28px_rgba(34,197,94,0.22)] sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <History size={15} className="shrink-0 text-amber-300" />
              <div>
                <p className="text-sm font-bold text-emerald-950">Reprendre votre déclaration{formattedPendingDraftSavedAt ? ` du ${formattedPendingDraftSavedAt}` : ""}</p>
                <p className="mt-0.5 text-xs font-medium text-emerald-900/62">Un brouillon local existe sur cet appareil. Il ne sera restauré que si vous le confirmez.</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button type="button" onClick={onResumeDraft} className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-black text-white transition hover:bg-emerald-500">Reprendre</button>
              <button type="button" onClick={onIgnoreDraft} className="rounded-full border border-emerald-200 bg-[#F3FBF6] px-4 py-2 text-xs font-bold text-emerald-900 transition hover:bg-[#EAF7EF]">Ignorer / recommencer</button>
            </div>
          </div>
        ) : null}
        <form onSubmit={onSubmit} className="overflow-hidden rounded-[3rem] border border-emerald-200/70 bg-[#F3FBF6] shadow-[0_20px_44px_-30px_rgba(34,197,94,0.18)] backdrop-blur-3xl">
          <div className="relative space-y-8 p-6 md:p-10">
            <fieldset className="relative z-10 space-y-8">
              <header className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-2xl">
                  <h2 className="text-[clamp(1.5rem,2.8vw,2.35rem)] font-black tracking-tighter text-emerald-950">Déclarer les résultats terrain</h2>
                  <p className="mt-2 max-w-xl text-sm font-medium leading-6 text-emerald-950 md:text-[0.98rem]">Commencez par les informations essentielles. Les détails complémentaires restent disponibles à la demande.</p>
                </div>
              </header>
              <ActionDeclarationFormSections {...sections} />
            </fieldset>
          </div>
        </form>
        <ActionDeclarationFormFeedback {...feedback} onReset={onReset} />
      </div>
    </div>
  );
}

export type { SurfaceSectionProps };
