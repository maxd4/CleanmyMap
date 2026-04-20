"use client";

import { Handshake, Heart, ShieldCheck, Users, Mail } from "lucide-react";
import Link from "next/link";

export default function PartnersNetworkPage() {
  const volunteerGoal = 1000;
  const currentVolunteers = 850;
  const progressPercent = (currentVolunteers / volunteerGoal) * 100;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-12">
      <style jsx>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          width: fit-content;
          animation: marquee 30s linear infinite;
        }
      `}</style>

      <header className="text-center space-y-4 py-12 bg-slate-900 rounded-[3rem] text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/20 to-transparent" />
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black tracking-widest uppercase">
            <ShieldCheck size={14} /> Réseau Certifié CleanMyMap
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter">L'Écosystème Engagé.</h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Nous ne sommes pas seuls. Découvrez les marques, les villes et les associations qui financent et soutiennent le nettoyage de la planète.
          </p>
        </div>
      </header>

      {/* MARQUEE LOGOS */}
      <section className="space-y-8 overflow-hidden py-12 border-y border-slate-100">
        <p className="text-center text-[10px] uppercase font-bold tracking-widest text-slate-400">Ils nous font confiance</p>
        <div className="relative flex overflow-x-hidden">
          <div className="animate-marquee whitespace-nowrap flex gap-12 items-center">
            {[
              "Ville de Paris", "ADEME", "Decathlon", "Suez", "Veolia", "Eco-Emballages", 
              "Ocean Conservancy", "UNESCO", "Patagonia", "SURFRIDER", "Sea Shepherd"
            ].map((name, i) => (
              <div key={i} className="flex items-center gap-4 group cursor-pointer grayscale hover:grayscale-0 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-300 group-hover:text-emerald-500 text-xl">
                  {name.charAt(0)}
                </div>
                <span className="text-2xl font-black text-slate-300 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                  {name}
                </span>
              </div>
            ))}
            {/* Duplicate for seamless loop */}
            {[
              "Ville de Paris", "ADEME", "Decathlon", "Suez", "Veolia", "Eco-Emballages", 
              "Ocean Conservancy", "UNESCO", "Patagonia", "SURFRIDER", "Sea Shepherd"
            ].map((name, i) => (
              <div key={`dup-${i}`} className="flex items-center gap-4 group cursor-pointer grayscale hover:grayscale-0 transition-all">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center font-black text-slate-300 group-hover:text-emerald-500 text-xl">
                  {name.charAt(0)}
                </div>
                <span className="text-2xl font-black text-slate-300 group-hover:text-slate-900 transition-colors uppercase tracking-tight">
                  {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VOLUNTEERS GAUGE */}
      <section className="grid md:grid-cols-2 gap-8 items-center bg-white/70 backdrop-blur-xl p-8 md:p-12 rounded-[3rem] border border-slate-200/50 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.05)]">
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-[2rem] bg-rose-50 flex items-center justify-center text-rose-500 shadow-inner">
            <Heart size={32} className="animate-pulse" />
          </div>
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 leading-tight tracking-tight">Objectif : 1000<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-orange-400">Sentinelles Actives.</span></h2>
          <p className="text-slate-600 text-lg">
            CleanMyMap n'est rien sans ses bénévoles. Nous avons besoin de votre aide pour atteindre la masse critique nécessaire à une cartographie parfaite du territoire.
          </p>
          <div className="space-y-3 pt-4">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-900 bg-slate-100 px-3 py-1 rounded-full">{currentVolunteers} collecteurs inscrits</span>
              <span className="text-slate-400">Palier v2 : {volunteerGoal}</span>
            </div>
            <div className="w-full h-6 bg-slate-100 rounded-full overflow-hidden shadow-inner p-1">
              <div 
                className="h-full bg-gradient-to-r from-rose-400 to-rose-600 rounded-full transition-all duration-1000 relative overflow-hidden"
                style={{ width: `${progressPercent}%` }}
              >
                <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]" />
              </div>
            </div>
            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest text-right">Plus que {volunteerGoal - currentVolunteers} membres</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="p-8 bg-gradient-to-br from-emerald-50 to-teal-50/20 rounded-[2.5rem] space-y-6 border border-emerald-100 shadow-sm hover:shadow-xl transition-all duration-300 group">
            <h3 className="text-2xl font-black flex items-center gap-3 text-emerald-950">
              <div className="p-3 bg-white rounded-2xl shadow-sm text-emerald-600 group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              Devenir Référent Local
            </h3>
            <p className="text-emerald-800/80 leading-relaxed">
              Vous connaissez votre quartier par cœur ? Devenez le point de contact stratégique pour organiser les collectes, auditer le terrain et valider les signalements.
            </p>
            <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-500 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_-5px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_-5px_rgba(16,185,129,0.6)] hover:-translate-y-1">
              <Mail size={18} /> Postuler à l'équipe
            </button>
          </div>
          
          <Link href="/sponsor-portal" className="block p-6 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100/50 hover:border-indigo-200 rounded-[2rem] text-indigo-900 transition-all duration-300 group">
             <div className="flex items-center gap-4">
               <div className="p-3 bg-white rounded-2xl shadow-sm text-indigo-500 group-hover:scale-110 transition-transform">
                 <Handshake size={24} />
               </div>
               <div>
                 <p className="text-sm font-black leading-tight mb-1">Vous représentez une ville ou entreprise ?</p>
                 <p className="text-xs text-indigo-600/80 group-hover:underline">Accédez à votre portail Dashboard ROI &rarr;</p>
               </div>
             </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
