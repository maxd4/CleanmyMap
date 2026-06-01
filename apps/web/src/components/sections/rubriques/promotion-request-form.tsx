"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { toAppError, isAppError, defaultMessageForKind } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { AppError } from "@/lib/errors/app-errors";
import type { AppProfile } from "@/lib/profiles";
import { ShieldCheck, Send, Sparkles, UserPlus, Info, ArrowUpRight, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { CmmButton } from "@/components/ui/cmm-button";

type SubmitState = "idle" | "submitting" | "success" | "error";

type PromotionRequestFormProps = {
  currentRole: AppProfile;
};

const REQUESTABLE_ROLES: Record<
  AppProfile,
  { requestedRole: "elu" | "admin"; label: string }[]
> = {
  benevole: [
    { requestedRole: "elu", label: "Demander le rôle Elu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  coordinateur: [
    { requestedRole: "elu", label: "Demander le rôle Elu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  scientifique: [
    { requestedRole: "elu", label: "Demander le rôle Elu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  entreprise: [
    { requestedRole: "elu", label: "Demander le rôle Elu" },
    { requestedRole: "admin", label: "Demander le rôle admin" },
  ],
  elu: [{ requestedRole: "admin", label: "Demander le rôle admin" }],
  admin: [],
  max: [],
};

export function PromotionRequestForm({ currentRole }: PromotionRequestFormProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const options = REQUESTABLE_ROLES[currentRole];
  const [requestedRole, setRequestedRole] = useState<"elu" | "admin">(
    options[0]?.requestedRole ?? "elu",
  );
  const [motivation, setMotivation] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<AppError | null>(null);
  const [motivationTouched, setMotivationTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { acquire, release } = useSubmissionLock();

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  const motivationError =
    (motivationTouched || submitAttempted) && motivation.trim().length < 10
      ? (fr
          ? "La motivation doit contenir au moins 10 caractères."
          : "The motivation must contain at least 10 characters.")
      : null;
  const canSubmit = useMemo(
    () => options.length > 0 && !motivationError && submitState !== "submitting",
    [motivationError, options.length, submitState],
  );

  async function submitRequest() {
    if (!acquire()) {
      setError(
        toAppError(new Error("Un envoi est déjà en cours. Réessayez dans un instant."), {
          kind: "validation",
          message: "Un envoi est déjà en cours. Réessayez dans un instant.",
        }),
      );
      return;
    }

    setSubmitState("submitting");
    setError(null);

    try {
      const response = await fetch("/api/community/promotion-requests", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          requestedRole,
          motivation: motivation.trim(),
          honeypot,
          submittedAt: formStartedAt ?? Date.now(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; kind?: string; message?: string }
          | null;
        throw toAppError(
          new Error(body?.message ?? body?.error ?? "Impossible d'envoyer la demande."),
          {
            kind:
              body?.kind === "validation"
                ? "validation"
                : body?.kind === "permission"
                  ? "permission"
                  : "server",
            message: body?.message ?? body?.error ?? "Impossible d'envoyer la demande.",
          },
        );
      }

      setSubmitState("success");
      setMotivation("");
      setMotivationTouched(false);
      setSubmitAttempted(false);
      setError(null);
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: fr
              ? "Une erreur inattendue est survenue. Réessayez."
              : "An unexpected error occurred. Please try again.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void submitRequest(),
          onRefresh: () => window.location.reload(),
        });
        setSubmitState("idle");
        return;
      }
      setSubmitState("error");
      setError(appError);
    } finally {
      release();
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitAttempted(true);
    if (!canSubmit) {
      return;
    }
    await submitRequest();
  }

  if (options.length === 0) {
    return (
      <motion.section 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-amber-500/20 bg-amber-500/5 backdrop-blur-3xl p-8"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <ShieldCheck size={80} className="text-amber-400" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <ShieldCheck size={18} />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
               {fr ? "Privilèges Système" : "System Privileges"}
             </p>
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            {fr
              ? "Vous avez déjà un niveau de supervision élevé."
              : "You already have a high supervision level."}
          </h2>
          <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-md">
            {fr
              ? "Le formulaire de promotion est réservé aux profils de terrain et de coordination nécessitant des droits étendus."
              : "The promotion form is reserved for field and coordination profiles requiring extended rights."}
          </p>
        </div>
      </motion.section>
    );
  }

  return (
    <motion.section 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="relative overflow-hidden rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl group"
    >
      <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <UserPlus size={160} className="text-amber-400" />
      </div>

      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="promotion-website">Website</label>
        <input
          id="promotion-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="relative z-10 p-10 space-y-8">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Sparkles size={18} />
             </div>
             <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400">
               {fr ? "Demande de promotion" : "Promotion request"}
             </p>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            {fr
              ? "Envoyer une demande vers IMU pour validation"
              : "Send a request to IMU for review"}
          </h2>
          <p className="max-w-2xl text-sm font-bold text-slate-400 leading-relaxed">
            {fr
              ? "Votre demande sera traitée par l'administration centrale. En cas d'approbation, vos droits seront automatiquement mis à jour."
              : "Your request will be processed by the central administration. Upon approval, your rights will be automatically updated."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <ShieldCheck size={12} className="text-amber-500" />
                  {fr ? "Rôle souhaité" : "Requested role"}
                </label>
                <select
                  value={requestedRole}
                  onChange={(event) => setRequestedRole(event.target.value as "elu" | "admin")}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-5 py-3.5 text-sm font-bold text-white focus:border-amber-500/50 focus:outline-none transition-all appearance-none"
                >
                  {options.map((option) => (
                    <option key={option.requestedRole} value={option.requestedRole} className="bg-slate-900">
                      {option.label}
                    </option>
                  ))}
                </select>
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                  <Lock size={12} className="text-amber-500" />
                  {fr ? "Sécurité" : "Security"}
                </label>
                <div className="px-5 py-3.5 rounded-2xl border border-white/5 bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-400">
                   {fr ? "Traitement réservé à IMU" : "Review reserved for IMU"}
                </div>
             </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
              <Info size={12} className="text-amber-500" />
              {fr ? "Note de motivation" : "Motivation note"}
            </label>
            <textarea
              value={motivation}
              onChange={(event) => {
                setMotivationTouched(true);
                setMotivation(event.target.value);
                if (error) setError(null);
              }}
              placeholder={
                fr
                  ? "Expliquez brièvement pourquoi ce niveau est justifié..."
                  : "Briefly explain why this level is justified..."
              }
              className="min-h-[160px] w-full rounded-[2rem] border border-white/10 bg-slate-950/40 px-6 py-5 text-sm font-bold text-white placeholder:text-slate-600 focus:border-amber-500/50 focus:outline-none transition-all resize-none"
              maxLength={1200}
            />
            <AnimatePresence>
               {motivationError && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                    <InlineFieldError message={motivationError} />
                 </motion.div>
               )}
            </AnimatePresence>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pt-4">
            <div className="flex items-center gap-4">
               <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                 {fr ? "Canal chiffré" : "Encrypted channel"}
               </p>
            </div>
            
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <CmmButton
                href="/sections/feedback#collaboration"
                tone="secondary"
                variant="pill"
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest text-white hover:bg-white/10 transition-all"
              >
                {fr ? "Guide Rôles" : "Role Guide"}
                <ArrowUpRight size={14} />
              </CmmButton>
              
              <CmmButton
                type="submit"
                disabled={!canSubmit}
                tone="primary"
                variant="pill"
                className={cn(
                  "flex-1 sm:flex-none flex items-center justify-center gap-3 px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn",
                  canSubmit ? "hover:scale-[1.02] active:scale-[0.98]" : "cursor-not-allowed"
                )}
              >
                {submitState === "submitting" ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>{fr ? "Envoi..." : "Sending..."}</span>
                  </>
                ) : (
                  <>
                    <Send size={14} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                    <span>{fr ? "Soumettre" : "Submit Request"}</span>
                  </>
                )}
              </CmmButton>
            </div>
          </div>

          <AnimatePresence>
            {submitState === "success" && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} 
                animate={{ opacity: 1, y: 0 }}
                className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                   <ShieldCheck size={20} />
                </div>
                <p className="text-sm font-bold text-emerald-400">
                  {fr
                    ? "Demande transmise avec succès. IMU reviendra vers vous prochainement."
                    : "Request successfully transmitted. IMU will get back to you shortly."}
                </p>
              </motion.div>
            )}

            {error && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                {error.kind === "permission" ? (
                  <PermissionErrorState
                    className="mt-2"
                    title={fr ? "Connexion requise" : "Sign-in required"}
                    message={error.message}
                  />
                ) : (
                  <ErrorMessage
                    className="mt-2"
                    kind={error.kind}
                    title={fr ? "Échec de l'envoi" : "Sending failed"}
                    message={error.message}
                    actions={
                      <CmmButton
                        type="button"
                        onClick={() => void submitRequest()}
                        tone="primary"
                        variant="pill"
                        className="rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white hover:bg-amber-400"
                      >
                        {fr ? "Réessayer" : "Retry"}
                      </CmmButton>
                    }
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </motion.section>
  );
}
