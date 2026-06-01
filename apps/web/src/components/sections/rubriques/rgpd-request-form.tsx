"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Shield, Info, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { buildContactMailtoHref } from "@/lib/contact/contact-request-mail";

type RequestType = "access" | "rectification" | "erasure" | "portability" | "other";
type RequestMode = "automatic" | "manual";
type RequestStatus = "idle" | "sending" | "success" | "draft" | "error";

export function RgpdRequestForm() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";
  const [requestType, setRequestType] = useState<RequestType>("erasure");
  const [deliveryMode, setDeliveryMode] = useState<RequestMode>("automatic");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [submittedAt, setSubmittedAt] = useState(() => Date.now());
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const requestTypeLabels: Record<RequestType, { fr: string; en: string }> = {
    access: { fr: "Droit d'accès (obtenir mes données)", en: "Right of access" },
    rectification: { fr: "Droit de rectification (corriger mes données)", en: "Right to rectification" },
    erasure: { fr: "Droit à l'effacement (supprimer mes données)", en: "Right to erasure" },
    portability: { fr: "Droit à la portabilité (exporter mes données)", en: "Right to portability" },
    other: { fr: "Autre demande RGPD", en: "Other GDPR request" },
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !message) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const normalizedEmail = email.trim();
    const normalizedMessage = message.trim();
    const requestLabel = requestTypeLabels[requestType].fr;

    if (deliveryMode === "manual") {
      const mailtoLink = buildContactMailtoHref({
        to: contactEmail,
        requestTypeLabel: requestLabel,
        email: normalizedEmail,
        message: normalizedMessage,
        dateLabel: new Date().toLocaleString("fr-FR"),
      });

      setStatus("draft");
      window.location.href = mailtoLink;
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          requestType,
          email: normalizedEmail,
          message: normalizedMessage,
          honeypot,
          submittedAt,
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { error?: string; details?: Record<string, string[]>; retryAfterSeconds?: number }
        | null;

      if (!response.ok) {
        const details = payload?.details;
        const fieldErrors = details
          ? Object.values(details)
              .flatMap((value) => value ?? [])
              .filter((value): value is string => typeof value === "string" && value.length > 0)
          : [];
        setStatus("error");
        setErrorMessage(
          fieldErrors[0] ||
            payload?.error ||
            "Impossible d'envoyer votre demande pour le moment.",
        );
        return;
      }

      setStatus("success");
      setEmail("");
      setMessage("");
      setHoneypot("");
      setSubmittedAt(Date.now());
    } catch {
      setStatus("error");
      setErrorMessage("Erreur réseau. Vérifiez votre connexion puis réessayez.");
    }
  };

  if (status === "success") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white/88 p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-10">
           <CheckCircle size={80} className="text-sky-400" />
        </div>
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
             <CheckCircle size={24} />
          </div>
          <p className="text-xl font-black text-slate-950 tracking-tight">
            Demande transmise
          </p>
        </div>
        
        <p className="relative z-10 mb-6 text-sm font-bold leading-relaxed text-slate-600">
          Votre demande a été transmise depuis le site et enregistrée dans la file de suivi.
          <span className="text-slate-950"> Une réponse vous sera envoyée par email.</span>
        </p>
        
        <CmmButton
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
            setSubmittedAt(Date.now());
          }}
          tone="tertiary"
          variant="pill"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-700 transition-colors hover:text-sky-900"
        >
          Envoyer une autre demande <ArrowUpRight size={14} />
        </CmmButton>
      </motion.div>
    );
  }

  if (status === "draft") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-slate-200/70 bg-white/88 p-8 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.35)] backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute right-0 top-0 p-8 opacity-10">
          <Mail size={80} className="text-sky-400" />
        </div>

        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
            <Mail size={24} />
          </div>
          <p className="text-xl font-black text-slate-950 tracking-tight">
            Brouillon ouvert
          </p>
        </div>

        <p className="relative z-10 mb-6 text-sm font-bold leading-relaxed text-slate-600">
          Votre boîte mail s&apos;est ouverte avec un brouillon prérempli.
          Vous pouvez relire, ajuster le texte puis envoyer le message manuellement.
        </p>

        <CmmButton
          onClick={() => {
            setStatus("idle");
            setErrorMessage("");
          }}
          tone="tertiary"
          variant="pill"
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-sky-700 transition-colors hover:text-sky-900"
        >
          Revenir au formulaire <ArrowUpRight size={14} />
        </CmmButton>
      </motion.div>
    );
  }

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit} 
      className="group relative space-y-6 rounded-[3rem] border border-slate-200/70 bg-white/88 p-10 shadow-[0_24px_80px_-55px_rgba(15,23,42,0.38)] backdrop-blur-2xl"
    >
      <div className="pointer-events-none absolute right-0 top-0 p-10 opacity-10 transition-transform duration-1000 group-hover:scale-110">
         <Shield size={120} className="text-sky-400" />
      </div>

      <div className="space-y-4 relative z-10">
         <div className="flex items-center gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-100 p-2.5 text-sky-700">
               <Shield size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">
              Protection des Données
            </p>
         </div>
         <h2 className="text-2xl font-black tracking-tight text-slate-950">
           Exercice de vos droits (RGPD)
         </h2>
         <p className="max-w-md text-xs font-bold leading-relaxed text-slate-600">
           Utilisez ce formulaire pour toute demande concernant vos données personnelles. Vous pouvez envoyer la
           demande directement depuis le site ou ouvrir votre boîte mail pour ajuster le texte avant envoi.
         </p>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            Mode d&apos;envoi *
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDeliveryMode("automatic")}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                deliveryMode === "automatic"
                  ? "border-sky-300 bg-sky-50 text-sky-950 shadow-[0_10px_24px_-18px_rgba(14,165,233,0.55)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-black">Envoi automatique</span>
              <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">
                Envoie la demande depuis le site et la suit dans CleanMyMap.
              </span>
            </button>
            <button
              type="button"
              onClick={() => setDeliveryMode("manual")}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                deliveryMode === "manual"
                  ? "border-sky-300 bg-sky-50 text-sky-950 shadow-[0_10px_24px_-18px_rgba(14,165,233,0.55)]"
                  : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-slate-50"
              }`}
            >
              <span className="block text-sm font-black">Ouvrir ma boîte mail</span>
              <span className="mt-1 block text-xs font-semibold leading-relaxed text-slate-500">
                Ouvre un brouillon pour modifier le texte avant l&apos;envoi.
              </span>
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Info size={12} className="text-sky-500" />
            Type de demande *
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
            className="w-full appearance-none rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-900 transition-all focus:border-sky-300 focus:outline-none"
          >
            {Object.entries(requestTypeLabels).map(([key, label]) => (
              <option key={key} value={key} className="bg-white">
                {label.fr}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Mail size={12} className="text-sky-500" />
            Votre email de contact *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full rounded-2xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-300 focus:outline-none"
            required
          />
        </div>

        <div className="sr-only" aria-hidden="true">
          <label>
            Ne pas remplir
            <input
              type="text"
              value={honeypot}
              onChange={(event) => setHoneypot(event.target.value)}
              tabIndex={-1}
              autoComplete="off"
            />
          </label>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Send size={12} className="text-sky-500" />
            Détails de votre demande *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Précisez votre demande ici..."
            rows={4}
            className="w-full resize-none rounded-[2rem] border border-slate-200 bg-white px-6 py-5 text-sm font-bold text-slate-900 placeholder:text-slate-400 transition-all focus:border-sky-300 focus:outline-none"
            required
          />
        </div>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700"
          >
            <AlertCircle size={16} />
            <p className="text-xs font-bold">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pt-4 relative z-10">
        <CmmButton
          type="submit"
          disabled={status === "sending"}
          className="w-full justify-center px-8 py-4"
        >
          {status === "sending" ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <Send size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              <span>{deliveryMode === "automatic" ? "Envoyer la demande" : "Ouvrir ma boîte mail"}</span>
            </>
          )}
        </CmmButton>

        <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-500">
           <div className="flex items-center gap-1.5"><Shield size={12} /> {fr ? "Conformité RGPD" : "GDPR Compliant"}</div>
           <div className="h-1 w-1 rounded-full bg-slate-300" />
           <span>{fr ? "Délai : 1 mois" : "Response : 1 month"}</span>
        </div>
      </div>
    </motion.form>
  );
}
