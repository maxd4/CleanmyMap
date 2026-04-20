"use client";

import { Handshake, Heart, ShieldCheck, Users, Mail } from "lucide-react";

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
      <section className="grid md:grid-cols-2 gap-8 items-center bg-white p-8 md:p-12 rounded-[3rem] border border-slate-200 shadow-sm">
        <div className="space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-rose-50 flex items-center justify-center text-rose-500">
            <Heart size={32} />
          </div>
          <h2 className="text-4xl font-black text-slate-900 leading-tight">Objectif : 1000<br/>Sentinelles Actives.</h2>
          <p className="text-slate-600">
            CleanMyMap n'est rien sans ses bénévoles. Nous avons besoin de votre aide pour atteindre la masse critique nécessaire à une cartographie parfaite du territoire.
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-bold">
              <span className="text-slate-900">{currentVolunteers} collecteurs inscrits</span>
              <span className="text-slate-400">Objectif {volunteerGoal}</span>
            </div>
            <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-rose-500 rounded-full transition-all duration-1000"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-rose-500 font-bold uppercase tracking-widest text-right">Plus que {volunteerGoal - currentVolunteers} pour le palier v2</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-8 bg-slate-50 rounded-3xl space-y-4 border border-slate-100">
            <h3 className="text-xl font-bold flex items-center gap-2">
              <Users size={20} className="text-emerald-600" />
              Devenir Référent Local
            </h3>
            <p className="text-slate-500 text-sm">
              Vous connaissez votre quartier par cœur ? Devenez le point de contact pour organiser les collectes et valider les signalements.
            </p>
            <button className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black hover:bg-emerald-700 transition flex items-center justify-center gap-2 shadow-lg">
              <Mail size={18} /> Postuler à l'équipe
            </button>
          </div>
          <div className="p-6 flex items-center gap-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-indigo-900">
             <Handshake size={24} />
             <p className="text-xs font-bold leading-tight">Vous représentez une ville ? <Link href="/sponsor-portal" className="underline">Accédez à votre portail ROI</Link></p>
          </div>
        </div>
      </section>
    </div>
  );
}
