"use client";

import { useEffect, useState, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { InlineFieldError } from "@/components/ui/inline-field-error";
import { ErrorMessage } from "@/components/ui/error-message";
import { PermissionErrorState } from "@/components/ui/permission-error-state";
import { toAppError, isAppError, defaultMessageForKind } from "@/lib/errors/app-errors";
import { notifyNetworkToast } from "@/lib/errors/network-toast";
import type { AppError } from "@/lib/errors/app-errors";
import { Bug, Lightbulb, Send, Info, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useSubmissionLock } from "@/hooks/use-submission-lock";
import { CmmButton } from "@/components/ui/cmm-button";

type SubmitState = "idle" | "submitting" | "success" | "error";

export function DiscussionBugReportForm() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [reportType, setReportType] = useState<"bug" | "idea">("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [formStartedAt, setFormStartedAt] = useState<number | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [error, setError] = useState<AppError | null>(null);
  const [titleTouched, setTitleTouched] = useState(false);
  const [descriptionTouched, setDescriptionTouched] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const { acquire, release } = useSubmissionLock();
  const pathname = usePathname();

  useEffect(() => {
    setFormStartedAt(Date.now());
  }, []);

  const pagePath = pathname ?? "/sections/annuaire";

  const titleError =
    (titleTouched || submitAttempted) && title.trim().length < 4
      ? (fr ? "Le sujet doit contenir au moins 4 caractères." : "The subject must contain at least 4 characters.")
      : null;
  const descriptionError =
    (descriptionTouched || submitAttempted) && description.trim().length < 10
      ? (fr ? "Ajoute au moins 10 caractères pour décrire le problème." : "Add at least 10 characters to describe the issue.")
      : null;
  const canSubmit = !titleError && !descriptionError && submitState !== "submitting";

  async function submitReport() {
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
      const response = await fetch("/api/community/bug-reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          reportType,
          title: title.trim(),
          description: description.trim(),
          pagePath,
          honeypot,
          submittedAt: formStartedAt ?? Date.now(),
        }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as
          | { error?: string; message?: string; kind?: string }
          | null;
        throw toAppError(
          new Error(body?.message ?? body?.error ?? "Impossible d'envoyer la demande."),
          {
            kind:
              response.status === 429
                ? "validation"
                : body?.kind === "validation"
                ? "validation"
                : body?.kind === "permission"
                ? "permission"
                : "server",
            message: body?.message ?? body?.error ?? "Impossible d'envoyer la demande.",
          }
        );
      }

      setSubmitState("success");
      setTitle("");
      setDescription("");
      setTitleTouched(false);
      setDescriptionTouched(false);
      setSubmitAttempted(false);
      setError(null);
      
      // Reset success state after 5 seconds
      setTimeout(() => setSubmitState("idle"), 5000);
    } catch (error) {
      const appError = isAppError(error)
        ? error
        : toAppError(error, {
            kind: "server",
            message: fr ? "Une erreur inattendue est survenue. Réessayez." : "An unexpected error occurred. Please try again.",
          });
      if (appError.kind === "network") {
        notifyNetworkToast({
          message: appError.message || defaultMessageForKind("network"),
          onRetry: () => void submitReport(),
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
    await submitReport();
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      id="discussion-bug-report-form"
      className="rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl p-10 shadow-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:rotate-12 transition-transform duration-1000">
         {reportType === 'bug' ? <Bug size={100} className="text-rose-400" /> : <Lightbulb size={100} className="text-amber-400" />}
      </div>

      <div className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden opacity-0" aria-hidden="true">
        <label htmlFor="bug-report-website">Website</label>
        <input
          id="bug-report-website"
          name="website"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(event) => setHoneypot(event.target.value)}
        />
      </div>

      <div className="space-y-4 mb-8">
         <div className="flex items-center gap-4">
            <div className={cn(
               "p-3 rounded-2xl border transition-colors duration-500",
               reportType === 'bug' ? "bg-rose-500/10 border-rose-500/20 text-rose-400" : "bg-amber-500/10 border-amber-500/20 text-amber-400"
            )}>
               {reportType === 'bug' ? <Bug size={20} /> : <Lightbulb size={20} />}
            </div>
            <h3 className="text-xl font-black text-white tracking-tight">
               {fr ? "Remonter un bug ou une idée" : "Report a bug or idea"}
            </h3>
         </div>
         <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-xl">
            {fr
              ? "Les bugs et idées de développement ne passent pas par le canal commun : utilisez ce formulaire dédié pour nous aider à améliorer l'outil."
              : "Bugs and development ideas do not go through the common channel: use this dedicated form to help us improve the tool."}
         </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Type</span>
              <div className="flex p-1 rounded-xl bg-slate-950/50 border border-white/5 backdrop-blur-xl">
                 <CmmButton
                    type="button"
                    onClick={() => setReportType("bug")}
                    tone={reportType === "bug" ? "primary" : "tertiary"}
                    variant="pill"
                    className={cn(
                       "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                       reportType === "bug" ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20" : "text-slate-500 hover:text-white"
                    )}
                 >
                    <Bug size={14} />
                    {fr ? "Bug" : "Bug"}
                 </CmmButton>
                 <CmmButton
                    type="button"
                    onClick={() => setReportType("idea")}
                    tone={reportType === "idea" ? "primary" : "tertiary"}
                    variant="pill"
                    className={cn(
                       "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                       reportType === "idea" ? "bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20" : "text-slate-500 hover:text-white"
                    )}
                 >
                    <Lightbulb size={14} />
                    {fr ? "Idée" : "Idea"}
                 </CmmButton>
              </div>
           </div>

           <div className="space-y-2">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{fr ? "Sujet" : "Subject"}</span>
              <input
                value={title}
                onChange={(event) => {
                  setTitleTouched(true);
                  setTitle(event.target.value);
                  if (error) setError(null);
                }}
                placeholder={fr ? "Ex: Carte qui ne charge pas..." : "E.g. Map does not load..."}
                className="w-full rounded-xl border border-white/5 bg-white/5 px-5 py-3 text-sm font-bold text-white placeholder:text-slate-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all"
                maxLength={160}
              />
              {titleError && <InlineFieldError message={titleError} />}
           </div>
        </div>

        <div className="space-y-2">
           <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">{fr ? "Description" : "Description"}</span>
           <textarea
             value={description}
             onChange={(event) => {
               setDescriptionTouched(true);
               setDescription(event.target.value);
               if (error) setError(null);
             }}
             placeholder={fr ? "Contexte, étapes, résultat observé, résultat attendu." : "Context, steps, observed result, expected result."}
             className="min-h-[160px] w-full rounded-2xl border border-white/5 bg-white/5 px-5 py-4 text-sm font-bold text-white placeholder:text-slate-600 focus:border-white/20 focus:bg-white/10 focus:outline-none transition-all resize-none"
             maxLength={3000}
           />
           {descriptionError && <InlineFieldError message={descriptionError} />}
        </div>

        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-4">
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/5 border border-white/5">
             <div className="p-1.5 rounded-lg bg-white/5 text-slate-500">
                <Info size={14} />
             </div>
             <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
               {fr ? "Page concernée" : "Affected page"} : <span className="text-white ml-1">{pagePath}</span>
             </p>
          </div>

          <CmmButton
            type="submit"
            disabled={!canSubmit}
            tone={reportType === 'bug' ? "primary" : "secondary"}
            variant="pill"
            className={cn(
               "w-full md:w-auto flex items-center justify-center gap-4 px-10 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105 disabled:scale-100 disabled:opacity-40 disabled:cursor-not-allowed",
               reportType === 'bug' ? "bg-rose-500 text-white shadow-rose-500/20" : "bg-amber-500 text-slate-950 shadow-amber-500/20"
            )}
          >
            {submitState === "submitting" ? (fr ? "Envoi..." : "Sending...") : (fr ? "Envoyer" : "Send")}
            <Send size={14} />
          </CmmButton>
        </div>

        <AnimatePresence>
          {submitState === "success" && (
            <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
               className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
            >
               <CheckCircle2 size={20} />
               <p className="text-sm font-black uppercase tracking-widest">
                 {fr ? "Merci, ta remontée a bien été envoyée." : "Thanks, your report has been sent."}
               </p>
            </motion.div>
          )}

          {error && (
            <motion.div
               initial={{ opacity: 0, height: 0 }}
               animate={{ opacity: 1, height: 'auto' }}
               exit={{ opacity: 0, height: 0 }}
            >
              {error.kind === "permission" ? (
                <PermissionErrorState
                  className="rounded-2xl border-rose-500/20 bg-rose-500/5"
                  title={fr ? "Connexion requise" : "Sign-in required"}
                  message={error.message}
                />
              ) : (
                <ErrorMessage
                  className="rounded-2xl border-rose-500/20 bg-rose-500/5"
                  kind={error.kind}
                  title={fr ? "Une erreur a bloqué l'envoi" : "A problem blocked the submission"}
                  message={error.message}
                  actions={
                    <CmmButton 
                       type="button" 
                       onClick={() => void submitReport()} 
                       tone="primary"
                       variant="pill"
                       className="px-4 py-2 rounded-xl text-white text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 transition-all"
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
    </motion.section>
  );
}
