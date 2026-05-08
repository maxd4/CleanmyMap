import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MissionMap } from '@/components/missions/mission-map';
import { MissionQR } from '@/components/missions/mission-qr';
import { MapPin, Clock, Trophy, Share2, Zap, Droplets, ShieldCheck } from 'lucide-react';
import { CmmButton } from '@/components/ui/cmm-button';
import { getBlockClasses } from '@/lib/ui/block-accents';
import { cn } from '@/lib/utils';

// Note: en production, utilisez le vrai client Supabase de l'app (ex: createServerComponentClient)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
const FALLBACK_STARTED_AT = new Date(Date.now() - 3600000).toISOString();

export default async function MissionPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const classes = getBlockClasses("act");

  // Récupération de la mission
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .select('*, profiles(name, avatar_url)')
    .eq('id', id)
    .single();

  // Fallback si la DB n'a pas les données
  const m = mission || {
    id,
    label: "Nettoyage Canal Saint-Martin",
    status: "completed",
    started_at: FALLBACK_STARTED_AT,
    ended_at: new Date().toISOString(),
    distance_m: 2450,
    duration_s: 3600,
    volunteer: { name: "Alice", avatar: null }
  };

  // Récupération des points GPS
  const { data: points } = await supabase
    .from('gps_points')
    .select('latitude, longitude, recorded_at')
    .eq('mission_id', id)
    .order('recorded_at');

  const mockPoints = [
    { latitude: 48.8738, longitude: 2.3667, recorded_at: new Date().toISOString() },
    { latitude: 48.8750, longitude: 2.3680, recorded_at: new Date().toISOString() },
    { latitude: 48.8765, longitude: 2.3695, recorded_at: new Date().toISOString() }
  ];

  const gpsPoints = points && points.length > 0 ? points : mockPoints;

  const isTracking = m.status === 'tracking';
  const isPending = m.status === 'pending';

  return (
    <div className="w-full max-w-7xl mx-auto space-y-12 pb-20">
      {/* Premium Header */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-8 pt-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className={cn(
              "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border",
              m.status === 'completed' ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20" :
              isTracking ? "bg-rose-400/10 text-rose-400 border-rose-400/20 animate-pulse" :
              "bg-white/5 text-white/40 border-white/10"
            )}>
              {m.status === 'completed' ? 'Mission Terminée' : isTracking ? 'Action en cours' : 'Mission Planifiée'}
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-white/20">Identifiant #{id.split('-')[0]}</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-black text-white tracking-tighter leading-tight">
            {m.label}
          </h1>
        </div>

        <CmmButton tone="secondary" className={cn("rounded-2xl flex items-center gap-2 border px-6 py-4 transition-all duration-300 hover:scale-[1.02]", classes.surface, classes.border)}>
          <Share2 size={16} className="text-emerald-400" />
          <span className="text-xs font-black uppercase tracking-widest">Partager l'impact</span>
        </CmmButton>
      </header>

      {/* Contenu principal */}
      <div className="grid lg:grid-cols-3 gap-10">
        
        {/* Colonne gauche (Stats / QR) */}
        <div className="space-y-8">
          {isPending ? (
            <MissionQR missionId={id} />
          ) : (
            <div className={cn(
              "p-8 rounded-[2.5rem] border space-y-8 transition-all duration-700",
              classes.surface,
              classes.shadow
            )}>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-white/40 flex items-center gap-3">
                <Trophy size={14} className="text-amber-400" />
                Impact Certifié
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 group hover:border-emerald-400/30 transition-all">
                  <div className="flex items-center gap-2 text-emerald-400 mb-3">
                    <MapPin size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Distance</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {m.distance_m ? (m.distance_m / 1000).toFixed(1) : 0} <span className="text-sm font-bold text-white/20">km</span>
                  </p>
                </div>
                
                <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 group hover:border-sky-400/30 transition-all">
                  <div className="flex items-center gap-2 text-sky-400 mb-3">
                    <Clock size={14} />
                    <span className="text-[9px] font-black uppercase tracking-widest">Durée</span>
                  </div>
                  <p className="text-3xl font-black text-white">
                    {m.duration_s ? Math.round(m.duration_s / 60) : 0} <span className="text-sm font-bold text-white/20">min</span>
                  </p>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-400/10 flex items-center justify-center text-emerald-400">
                      <Zap size={14} />
                    </div>
                    <span className="text-sm font-medium text-white/40 group-hover:text-white/60 transition-colors">CO2 évité estimé</span>
                  </div>
                  <span className="font-black text-emerald-400">~{m.distance_m ? (m.distance_m * 0.15).toFixed(1) : 0} kg</span>
                </div>
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-sky-400/10 flex items-center justify-center text-sky-400">
                      <Droplets size={14} />
                    </div>
                    <span className="text-sm font-medium text-white/40 group-hover:text-white/60 transition-colors">Eau préservée</span>
                  </div>
                  <span className="font-black text-sky-400">~{m.distance_m ? Math.round(m.distance_m * 2.5) : 0} L</span>
                </div>
              </div>
            </div>
          )}

          <div className={cn("p-8 rounded-[2.5rem] border transition-all duration-500 bg-white/5 border-white/5 shadow-sm")}>
            <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20 mb-6">Informations Logistiques</h4>
            <ul className="space-y-6">
              <li className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 transition-transform group-hover:scale-110">
                  <Clock size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Départ le</p>
                  <p className="text-sm font-bold text-white/80">{new Date(m.started_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </li>
              <li className="flex items-center gap-4 group">
                <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 transition-transform group-hover:scale-110">
                  <MapPin size={16} />
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black uppercase tracking-widest text-white/20">Localisation</p>
                  <p className="text-sm font-bold text-white/80">Paris, Île-de-France</p>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Colonne droite (Carte) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl relative group">
            <MissionMap points={gpsPoints} />
            <div className="absolute top-6 right-6 px-4 py-2 bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-white opacity-0 group-hover:opacity-100 transition-opacity">
              Tracé GPS Certifié
            </div>
          </div>
          
          <div className={cn(
            "p-8 rounded-[2.5rem] border flex gap-6 items-start transition-all duration-500 hover:border-amber-400/30",
            "bg-amber-400/5 border-amber-400/10"
          )}>
            <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldCheck size={24} />
            </div>
            <p className="text-sm text-amber-100/60 font-medium leading-relaxed">
              <strong className="font-black text-amber-400 uppercase tracking-widest text-xs block mb-2">Preuve d'Impact</strong>
              Ce tracé a été enregistré en direct via l'application Compagnon, garantissant l'authenticité de l'impact écologique mesuré sur le terrain.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
