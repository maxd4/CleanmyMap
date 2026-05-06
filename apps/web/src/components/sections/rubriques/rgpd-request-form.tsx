"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle } from "lucide-react";

type RequestType = "access" | "rectification" | "erasure" | "portability" | "other";
type RequestStatus = "idle" | "sending" | "success" | "error";

export function RgpdRequestForm() {
  const [requestType, setRequestType] = useState<RequestType>("erasure");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const requestTypeLabels: Record<RequestType, { fr: string; en: string }> = {
    access: { fr: "Droit d'accès (obtenir mes données)", en: "Right of access" },
    rectification: { fr: "Droit de rectification (corriger mes données)", en: "Right to rectification" },
    erasure: { fr: "Droit à l'effacement (supprimer mes données)", en: "Right to erasure" },
    portability: { fr: "Droit à la portabilité (exporter mes données)", en: "Right to portability" },
    other: { fr: "Autre demande RGPD", en: "Other GDPR request" },
  };

  const subjectByType: Record<RequestType, string> = {
    access: "Demande%20RGPD%20-%20Droit%20d%27acc%C3%A8s",
    rectification: "Demande%20RGPD%20-%20Droit%20de%20rectification",
    erasure: "Demande%20RGPD%20-%20Droit%20%C3%A0%20l%27effacement",
    portability: "Demande%20RGPD%20-%20Droit%20%C3%A0%20la%20portabilit%C3%A9",
    other: "Demande%20RGPD%20-%20Autre",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !message) {
      setErrorMessage("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    setStatus("sending");
    setErrorMessage("");

    const mailtoLink = `mailto:maxence.drm@gmail.com?subject=${subjectByType[requestType]}&body=${encodeURIComponent(
      `Type de demande: ${requestTypeLabels[requestType].fr}\n\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nCe message a été envoyé via le formulaire RGPD de CleanMyMap.\nDate: ${new Date().toLocaleString("fr-FR")}`
    )}`;

    window.location.href = mailtoLink;
    setStatus("success");
  };

  if (status === "success") {
    return (
      <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
        <div className="flex items-center gap-3 mb-3">
          <CheckCircle className="w-5 h-5 text-emerald-600" />
          <p className="font-semibold text-emerald-800 dark:text-emerald-200">
            Demande envoyée avec succès
          </p>
        </div>
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Votre client de messagerie s'est ouvert avec un email pré-rempli. 
          Envoyez-le pour enregistrer votre demande. Vous recevrez une confirmation sous 48h.
        </p>
        <button
          onClick={() => setStatus("idle")}
          className="mt-3 text-sm text-emerald-600 hover:underline"
        >
          Envoyer une autre demande
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800">
      <div>
        <label className="block text-sm font-semibold cmm-text-primary mb-2">
          Type de demande *
        </label>
        <select
          value={requestType}
          onChange={(e) => setRequestType(e.target.value as RequestType)}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cmm-text-secondary text-sm"
        >
          {Object.entries(requestTypeLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label.fr}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-semibold cmm-text-primary mb-2">
          Votre email *
        </label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="votre@email.com"
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cmm-text-secondary text-sm"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-semibold cmm-text-primary mb-2">
          Détails de votre demande *
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Décrivez votre demande en quelques mots..."
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 cmm-text-secondary text-sm resize-none"
          required
        />
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600" />
          <p className="text-sm text-rose-700 dark:text-rose-300">{errorMessage}</p>
        </div>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
      >
        {status === "sending" ? (
          <>Envoi en cours...</>
        ) : (
          <>
            <Send size={16} />
            Envoyer ma demande RGPD
          </>
        )}
      </button>

      <p className="text-xs cmm-text-muted text-center">
        Réponse garantie sous 1 mois (renouvelable 2 mois)
      </p>
    </form>
  );
}