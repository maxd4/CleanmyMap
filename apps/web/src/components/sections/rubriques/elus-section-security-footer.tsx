import { ShieldCheck } from "lucide-react";

export function ElusSectionSecurityFooter({ fr }: { fr: boolean }) {
  return (
    <div className="p-12 rounded-[4rem] border border-white/5 bg-slate-900/20 backdrop-blur-3xl flex flex-col md:flex-row items-center justify-between gap-12 group overflow-hidden relative">
      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="flex items-center gap-8 relative z-10">
        <div className="p-5 rounded-3xl bg-white/5 border border-white/10 text-slate-600 group-hover:text-emerald-400 group-hover:scale-110 transition-all duration-500 shadow-2xl">
          <ShieldCheck size={32} />
        </div>
        <div className="space-y-2">
          <h4 className="text-base font-black text-white uppercase tracking-[0.2em]">{fr ? "Coffre-fort Numérique" : "Digital Vault"}</h4>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
            Protocole de sécurité AES-256 <br />
            {fr ? "Accès restreint aux habilitations territoriales" : "Restricted access to territorial clearances"}
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center md:items-end gap-3 relative z-10">
        <div className="flex items-center gap-3 bg-emerald-500/10 px-6 py-2.5 rounded-2xl border border-emerald-500/20 shadow-2xl">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em]">{fr ? "Certifié RGPD & OpenData" : "GDPR & OpenData Certified"}</span>
        </div>
        <span className="text-[9px] font-bold text-slate-700 uppercase tracking-widest italic">ISO 27001 Compliance Pending</span>
      </div>
    </div>
  );
}
