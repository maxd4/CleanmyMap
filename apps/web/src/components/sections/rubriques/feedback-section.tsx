"use client";

import { useMemo } from "react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { QuestionnaireCard } from "./feedback/questionnaire-card";
import { QUESTIONNAIRES } from "./feedback/questionnaire-config";
import { SectionShell } from "@/components/sections/rubriques/shared";
import { MessageSquare, Mail, Sparkles, ArrowRight } from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";

type FeedbackSectionProps = {
  pagePath?: string;
  source?: "feedback_section" | "feedback_discussion";
};

export function FeedbackSection({
  pagePath: pagePathOverride,
  source = "feedback_section",
}: FeedbackSectionProps = {}) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const pagePath = useMemo(() => {
    if (pagePathOverride) {
      return pagePathOverride;
    }
    if (typeof window === "undefined") {
      return "/sections/feedback";
    }
    return window.location.pathname;
  }, [pagePathOverride]);

  const supportPrefill = useMemo<Partial<Record<string, string>> | null>(() => {
    if (typeof window === "undefined") {
      return null;
    }

    const params = new URLSearchParams(window.location.search);
    const hasPrefill =
      params.has("subject") ||
      params.has("context") ||
      params.has("steps") ||
      params.has("expected");

    if (!hasPrefill) {
      return null;
    }

    return {
      subject: params.get("subject") ?? "",
      context: params.get("context") ?? "",
      steps: params.get("steps") ?? "",
      expected: params.get("expected") ?? "",
    };
  }, []);
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <SectionShell
      id="feedback"
      title={fr ? "Retours & Qualité" : "Feedback & Quality"}
      subtitle={fr 
        ? "Votre avis nous permet d'ajuster les algorithmes et d'améliorer continuellement l'expérience utilisateur."
        : "Your feedback allows us to tune algorithms and continuously improve the user experience."}
      icon={MessageSquare}
      gradient="from-cyan-500/20 via-blue-500/10 to-transparent"
    >
      <div className="space-y-12 pt-8">
        {/* Questionnaire Grid */}
        <div className="grid gap-6 xl:grid-cols-3">
          {QUESTIONNAIRES.map((questionnaire) => (
            <div key={questionnaire.id} id={questionnaire.id}>
              <QuestionnaireCard
                questionnaire={questionnaire}
                pagePath={pagePath}
                source={source}
                initialValues={questionnaire.id === "bug" ? supportPrefill ?? undefined : undefined}
              />
            </div>
          ))}
        </div>

        {/* Direct Contact Card */}
        <div className="p-10 rounded-[3.5rem] border border-white/5 bg-slate-900/40 backdrop-blur-3xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-10 group relative overflow-hidden">
           <div className="absolute -right-20 -bottom-20 p-20 opacity-5 group-hover:scale-110 group-hover:opacity-10 transition-all duration-1000 pointer-events-none">
              <Mail size={300} className="text-cyan-400" />
           </div>

           <div className="relative z-10 flex items-center gap-8">
              <div className="p-5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-2xl group-hover:scale-110 transition-transform duration-700">
                 <Mail size={32} />
              </div>
              <div className="space-y-2">
                 <h3 className="text-2xl font-black text-white tracking-tight">
                    {fr ? "Besoin d'un contact direct ?" : "Need a direct contact?"}
                 </h3>
                 <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">
                    {fr ? "Support & Partenariats" : "Support & Partnerships"}
                 </p>
              </div>
           </div>

           <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
              <p className="text-sm font-bold text-slate-400 leading-relaxed max-w-xs md:text-right">
                {fr
                  ? "Le mail reste disponible si le retour doit sortir du cadre des formulaires standardisés."
                  : "Email remains available if the reply needs to go beyond standardized forms."}
              </p>
              <a
                href={`mailto:${contactEmail}`}
                className="inline-flex h-16 items-center gap-4 rounded-2xl bg-white px-8 text-xs font-black uppercase tracking-[0.2em] text-slate-950 shadow-2xl hover:scale-105 active:scale-95 transition-all"
              >
                {fr ? "Écrire un mail" : "Write an email"}
                <ArrowRight size={18} />
              </a>
           </div>
        </div>

        {/* Quality Commitment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-950/20 backdrop-blur-3xl shadow-xl flex items-center gap-6 group">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                 <Sparkles size={20} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">{fr ? "Traitement Prioritaire" : "Priority Processing"}</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fr ? "Réponse garantie sous 48h" : "Response guaranteed within 48h"}</p>
              </div>
           </div>
           
           <div className="p-8 rounded-[2.5rem] border border-white/5 bg-slate-950/20 backdrop-blur-3xl shadow-xl flex items-center gap-6 group">
              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-slate-400">
                 <MessageSquare size={20} />
              </div>
              <div className="space-y-1">
                 <h4 className="text-sm font-black text-white uppercase tracking-widest">{fr ? "Amélioration Continue" : "Continuous Improvement"}</h4>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{fr ? "100% des retours sont analysés" : "100% of feedback is analyzed"}</p>
              </div>
           </div>
        </div>
      </div>
    </SectionShell>
  );
}
