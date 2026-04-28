"use client";

import { useState } from"react";
import { Send, CheckCircle2, Leaf, Loader2 } from "lucide-react";

export function NewsletterSignup() {
 const [email, setEmail] = useState("");
 const [consent, setConsent] = useState(false);
 const [status, setStatus] = useState<"idle" |"loading" |"success" |"error">("idle");
 const [message, setMessage] = useState("");

 const handleSubmit = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!consent) return;

 setStatus("loading");
 try {
 const res = await fetch("/api/newsletter/subscribe", {
 method:"POST",
 headers: {"Content-Type":"application/json" },
 body: JSON.stringify({ email, gdprConsent: consent, source:"community_section" }),
 });

 const data = await res.json();
 if (res.ok) {
 setStatus("success");
 setMessage(data.message);
 } else {
 setStatus("error");
 setMessage(typeof data.error ==="object" ?"Données invalides" : data.error);
 }
 } catch (err) {
 setStatus("error");
      setMessage("Impossible de vous inscrire pour le moment. Veuillez vérifier votre adresse email ou réessayer plus tard.");
 }
 };

 if (status ==="success") {
 return (
 <div className="p-8 rounded-3xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-center space-y-4 animate-in fade-in zoom-in duration-500">
 <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500 text-white mb-2">
 <CheckCircle2 size={32} />
 </div>
 <h3 className="text-xl font-bold text-emerald-900 dark:text-emerald-400">Inscription Réussie !</h3>
 <p className="cmm-text-small text-emerald-700 dark:text-emerald-500/80 max-w-sm mx-auto leading-relaxed">
 {message}. <br />
 <span className="font-bold">Zéro mail inutile, promis.</span>
 </p>
 </div>
 );
 }

 return (
 <div className="relative group p-8 md:p-12 rounded-[2.5rem] cmm-surface border shadow-xl overflow-hidden transition-all hover:shadow-2xl hover:border-emerald-500/30">
 {/* Background Decor */}
 <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-emerald-500/5 blur-3xl rounded-full" />
 
 <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
 <div className="flex-1 space-y-4 text-center md:text-left">
 <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 cmm-text-caption font-bold uppercase tracking-widest rounded-full">
 <Leaf size={12} /> Newsletter Éco-Responsable
 </div>
 <h3 className="text-3xl font-bold cmm-text-primary dark:text-white tracking-tight">
 Restez informé de l&apos;impact local.
 </h3>
 <p className="cmm-text-muted dark:cmm-text-muted leading-relaxed max-w-md">
 Recevez un condensé mensuel des actions et résultats de votre territoire. Pas de spam, pas de futilités.
 </p>
 </div>

 <div className="flex-1 w-full max-w-sm">
 <form onSubmit={handleSubmit} className="space-y-4">
 <div className="relative">
 <input
 id="newsletter-email"
 type="email"
 required
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 placeholder="Votre adresse email..."
 aria-label="Votre adresse email pour la newsletter"
 className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-950 border rounded-2xl focus:ring-2 focus:ring-emerald-500 focus:outline-none dark:text-white transition-all"
 />
 <button
 type="submit"
 disabled={status ==="loading" || !consent}
 aria-label="S'inscrire à la newsletter"
 className="absolute right-2 top-2 h-12 w-12 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:bg-slate-400 text-white rounded-xl transition-all shadow-lg active:scale-95"
 >
 {status === "loading" ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} aria-hidden="true" />}
 </button>
 </div>
 
 <label htmlFor="newsletter-consent" className="flex items-start gap-3 cursor-pointer group/consent">
 <div className="relative mt-1">
 <input
 id="newsletter-consent"
 type="checkbox"
 required
 checked={consent}
 onChange={(e) => setConsent(e.target.checked)}
 className="peer sr-only"
 />
 <div className="w-5 h-5 border-2 border-slate-300 dark:border-slate-700 rounded cmm-surface peer-checked:bg-emerald-500 peer-checked:border-emerald-500 transition-all" />
 <CheckCircle2 size={14} className="absolute inset-0 m-auto text-white opacity-0 peer-checked:opacity-100 transition-all" />
 </div>
 <span className="cmm-text-caption leading-tight cmm-text-muted dark:cmm-text-muted group-hover/consent:cmm-text-secondary dark:group-hover/consent:cmm-text-muted transition-colors">
 En cochant cette case, j&apos;accepte que CleanMyMap stocke mon adresse email pour m&apos;envoyer des actualités. Je pourrai me désinscrire à tout moment.
 </span>
 </label>

 {status ==="error" && (
 <p className="cmm-text-caption font-bold text-rose-500 animate-in fade-in slide-in-from-top-2">{message}</p>
 )}
 </form>
 </div>
 </div>
 </div>
 );
}
