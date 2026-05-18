"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle, AlertCircle, Shield, Info, ArrowUpRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";

type RequestType = "access" | "rectification" | "erasure" | "portability" | "other";
type RequestStatus = "idle" | "sending" | "success" | "error";

export function RgpdRequestForm() {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const [requestType, setRequestType] = useState<RequestType>("erasure");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<RequestStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

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

    const mailtoLink = `mailto:${contactEmail}?subject=${subjectByType[requestType]}&body=${encodeURIComponent(
      `Type de demande: ${requestTypeLabels[requestType].fr}\n\nEmail: ${email}\n\nMessage:\n${message}\n\n---\nCe message a été envoyé via le formulaire RGPD de CleanMyMap.\nDate: ${new Date().toLocaleString("fr-FR")}`
    )}`;

    window.location.href = mailtoLink;
    setTimeout(() => {
        setStatus("success");
    }, 500);
  };

  if (status === "success") {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="p-8 rounded-[2.5rem] bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-3xl shadow-2xl relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
           <CheckCircle size={80} className="text-emerald-400" />
        </div>
        
        <div className="flex items-center gap-4 mb-6 relative z-10">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
             <CheckCircle size={24} />
          </div>
          <p className="text-xl font-black text-white tracking-tight">
            Demande transmise
          </p>
        </div>
        
        <p className="text-sm font-bold text-slate-400 leading-relaxed mb-6 relative z-10">
          Votre client de messagerie s'est ouvert avec un email pré-rempli. 
          <span className="text-white"> Envoyez-le </span> pour enregistrer votre demande officiellement.
        </p>
        
        <button
          onClick={() => setStatus("idle")}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          Envoyer une autre demande <ArrowUpRight size={14} />
        </button>
      </motion.div>
    );
  }

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onSubmit={handleSubmit} 
      className="space-y-6 p-10 rounded-[3rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl relative group"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-1000">
         <Shield size={120} className="text-white" />
      </div>

      <div className="space-y-4 relative z-10">
         <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-500/10 border border-slate-500/20 text-slate-400">
               <Shield size={18} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
              Protection des Données
            </p>
         </div>
         <h2 className="text-2xl font-black text-white tracking-tight">
           Exercice de vos droits (RGPD)
         </h2>
         <p className="text-xs font-bold text-slate-500 leading-relaxed max-w-md">
           Utilisez ce formulaire pour toute demande concernant vos données personnelles. Un email pré-rempli sera généré.
         </p>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Info size={12} className="text-slate-400" />
            Type de demande *
          </label>
          <select
            value={requestType}
            onChange={(e) => setRequestType(e.target.value as RequestType)}
            className="w-full px-5 py-3.5 rounded-2xl border border-white/10 bg-slate-950/40 text-sm font-bold text-white focus:border-white/20 focus:outline-none transition-all appearance-none"
          >
            {Object.entries(requestTypeLabels).map(([key, label]) => (
              <option key={key} value={key} className="bg-slate-900">
                {label.fr}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Mail size={12} className="text-slate-400" />
            Votre email de contact *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-5 py-3.5 rounded-2xl border border-white/10 bg-slate-950/40 text-sm font-bold text-white placeholder:text-slate-700 focus:border-white/20 focus:outline-none transition-all"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
            <Send size={12} className="text-slate-400" />
            Détails de votre demande *
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Précisez votre demande ici..."
            rows={4}
            className="w-full px-6 py-5 rounded-[2rem] border border-white/10 bg-slate-950/40 text-sm font-bold text-white placeholder:text-slate-700 focus:border-white/20 focus:outline-none transition-all resize-none"
            required
          />
        </div>
      </div>

      <AnimatePresence>
        {errorMessage && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400"
          >
            <AlertCircle size={16} />
            <p className="text-xs font-bold">{errorMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-6 pt-4 relative z-10">
        <button
          type="submit"
          disabled={status === "sending"}
          className={cn(
            "w-full flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn",
            status === "sending" 
              ? "bg-white/5 text-slate-500 cursor-not-allowed" 
              : "bg-white text-slate-950 hover:scale-[1.02] active:scale-[0.98] shadow-2xl shadow-white/10"
          )}
        >
          {status === "sending" ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-500 border-t-slate-300 rounded-full animate-spin" />
              <span>Traitement...</span>
            </>
          ) : (
            <>
              <Send size={16} className="group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
              <span>Générer l'email de demande</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center gap-4 text-[9px] font-black uppercase tracking-widest text-slate-600">
           <div className="flex items-center gap-1.5"><Shield size={12} /> {fr ? "Conformité RGPD" : "GDPR Compliant"}</div>
           <div className="w-1 h-1 rounded-full bg-white/10" />
           <span>{fr ? "Délai : 1 mois" : "Response : 1 month"}</span>
        </div>
      </div>
    </motion.form>
  );
}
