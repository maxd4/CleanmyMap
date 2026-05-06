"use client";

import { useMemo, useState, type FormEvent } from"react";
import { useSitePreferences } from"@/components/ui/site-preferences-provider";
import { InlineFieldError } from"@/components/ui/inline-field-error";
import { ErrorMessage } from"@/components/ui/error-message";
import { PermissionErrorState } from"@/components/ui/permission-error-state";
import { toAppError, isAppError, defaultMessageForKind } from"@/lib/errors/app-errors";
import { notifyNetworkToast } from"@/lib/errors/network-toast";
import type { AppError } from"@/lib/errors/app-errors";

type SubmitState ="idle" |"submitting" |"success" |"error";

export function DiscussionBugReportForm() {
 const { locale } = useSitePreferences();
 const fr = locale ==="fr";
 const [reportType, setReportType] = useState<"bug" |"idea">("bug");
 const [title, setTitle] = useState("");
 const [description, setDescription] = useState("");
 const [submitState, setSubmitState] = useState<SubmitState>("idle");
 const [error, setError] = useState<AppError | null>(null);
 const [titleTouched, setTitleTouched] = useState(false);
 const [descriptionTouched, setDescriptionTouched] = useState(false);
 const [submitAttempted, setSubmitAttempted] = useState(false);

 const pagePath = useMemo(() => {
 if (typeof window ==="undefined") {
 return"/sections/annuaire";
 }
 return window.location.pathname;
 }, []);

 const titleError =
 (titleTouched || submitAttempted) && title.trim().length < 4
 ? (fr ? "Le sujet doit contenir au moins 4 caractères." : "The subject must contain at least 4 characters.")
 : null;
 const descriptionError =
 (descriptionTouched || submitAttempted) && description.trim().length < 10
 ? (fr ? "Ajoute au moins 10 caractères pour décrire le problème." : "Add at least 10 characters to describe the issue.")
 : null;
 const canSubmit = !titleError && !descriptionError && submitState !=="submitting";

 async function submitReport() {

 setSubmitState("submitting");
 setError(null);
 try {
 const response = await fetch("/api/community/bug-reports", {
 method:"POST",
 headers: {"content-type":"application/json" },
 body: JSON.stringify({
 reportType,
 title: title.trim(),
 description: description.trim(),
 pagePath,
 }),
 });

 if (!response.ok) {
 const body = (await response.json().catch(() => null)) as
 | { error?: string; kind?: string }
 | null;
 throw toAppError(
 new Error(body?.error ??"Impossible d'envoyer la demande."),
 {
 kind:
 body?.kind ==="validation" ? "validation" : body?.kind ==="permission" ? "permission" : "server",
 message: body?.error ??"Impossible d'envoyer la demande.",
 },
 );
 }

 setSubmitState("success");
 setTitle("");
 setDescription("");
 setTitleTouched(false);
 setDescriptionTouched(false);
 setSubmitAttempted(false);
 setError(null);
 } catch (error) {
 const appError = isAppError(error)
 ? error
 : toAppError(error, {
 kind:"server",
 message: fr ? "Une erreur inattendue est survenue. Réessayez." : "An unexpected error occurred. Please try again.",
 });
 if (appError.kind ==="network") {
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
 <section
 id="discussion-bug-report-form"
 className="rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-sm"
 >
 <h3 className="cmm-text-small font-semibold text-amber-900">
 {fr ?"Remonter un bug ou une idée produit" :"Report a bug or product idea"}
 </h3>
 <p className="mt-1 cmm-text-caption text-amber-900">
 {fr
 ?"Les bugs et idées de développement ne passent pas par le canal commun: utilisez ce formulaire dédié."
 :"Bugs and development ideas do not go through the common channel: use this dedicated form."}
 </p>

 <form onSubmit={handleSubmit} className="mt-3 space-y-3">
 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">Type</span>
 <select
 value={reportType}
 onChange={(event) => setReportType(event.target.value as"bug" |"idea")}
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 >
 <option value="bug">{fr ?"Bug" :"Bug"}</option>
 <option value="idea">{fr ?"Idée de développement" :"Development idea"}</option>
 </select>
 </label>

 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ?"Sujet" :"Subject"}</span>
 <input
 value={title}
 onChange={(event) => {
 setTitleTouched(true);
 setTitle(event.target.value);
 if (error) {
 setError(null);
 }
 }}
 placeholder={fr ?"Ex: Carte qui ne charge pas sur mobile" :"E.g. Map does not load on mobile"}
 className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 maxLength={160}
 />
 {titleError ? <InlineFieldError message={titleError} /> : null}
 </label>

 <label className="block space-y-1">
 <span className="cmm-text-caption font-semibold cmm-text-secondary">{fr ?"Description" :"Description"}</span>
 <textarea
 value={description}
 onChange={(event) => {
 setDescriptionTouched(true);
 setDescription(event.target.value);
 if (error) {
 setError(null);
 }
 }}
 placeholder={fr ?"Contexte, étapes, résultat observé, résultat attendu." :"Context, steps, observed result, expected result."}
 className="min-h-[120px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 cmm-text-small cmm-text-primary focus:border-amber-500 focus:outline-none"
 maxLength={3000}
 />
 {descriptionError ? <InlineFieldError message={descriptionError} /> : null}
 </label>

 <div className="flex items-center justify-between gap-2">
 <p className="cmm-text-caption cmm-text-secondary">
 {fr ?"Page concernée" :"Affected page"}: <span className="font-semibold">{pagePath}</span>
 </p>
 <button
 type="submit"
 disabled={!canSubmit}
 className="rounded-lg bg-amber-600 px-3 py-2 cmm-text-caption font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
 >
 {submitState ==="submitting" ? (fr ?"Envoi..." :"Sending...") : (fr ?"Envoyer" :"Send")}
 </button>
 </div>

 {submitState ==="success" ? (
 <p className="cmm-text-caption font-medium text-emerald-700">
 {fr ?"Merci, ta remontée a bien été envoyée." :"Thanks, your report has been sent."}
 </p>
 ) : null}
 {error ? (
 error.kind ==="permission" ? (
 <PermissionErrorState
 className="mt-2"
 title={fr ?"Connexion requise" :"Sign-in required"}
 message={error.message}
 />
 ) : (
 <ErrorMessage
 className="mt-2"
 kind={error.kind}
 title={fr ?"Une erreur a bloqué l'envoi" :"A problem blocked the submission"}
 message={error.message}
 actions={<button type="button" onClick={() => void submitReport()} className="rounded-full bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-700">{fr ?"Réessayer" :"Retry"}</button>}
 />
 )
 ) : null}
 </form>
 </section>
 );
}
