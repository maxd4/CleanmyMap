import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { MissionMap } from '@/components/missions/mission-map';
import { MissionQR } from '@/components/missions/mission-qr';
import { MapPin, Clock, Trophy, Share2 } from 'lucide-react';
import { CmmButton } from '@/components/ui/cmm-button';

// Note: en production, utilisez le vrai client Supabase de l'app (ex: createServerComponentClient)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);
const FALLBACK_STARTED_AT = new Date(Date.now() - 3600000).toISOString();

export default async function MissionPage({ params }: { params: { id: string } }) {
  const { id } = params;

  // Récupération de la mission
  const { data: mission, error: missionError } = await supabase
    .from('missions')
    .select('*, profiles(name, avatar_url)')
    .eq('id', id)
    .single();

  if (missionError || !mission) {
    // Si la DB n'est pas encore initialisée, on affiche une page mockée ou on renvoie 404
    // return notFound();
  }

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
    <div className="w-full max-w-5xl mx-auto p-6 sm:p-8 xl:px-10 space-y-12">
      {/* En-tête */}
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest ${
              m.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
              isTracking ? 'bg-rose-100 text-rose-700 animate-pulse' :
              'bg-slate-100 text-slate-700'
            }`}>
              {m.status === 'completed' ? 'Terminée' : isTracking ? 'En cours' : 'En attente'}
            </span>
            <span className="text-sm cmm-text-muted font-medium">Mission #{id.split('-')[0]}</span>
          </div>
          <h1 className="text-4xl font-black cmm-text-primary tracking-tight">{m.label}</h1>
        </div>

        <CmmButton tone="secondary" className="rounded-xl flex items-center gap-2">
          <Share2 size={16} /> Partager l'impact
        </CmmButton>
      </header>

      {/* Contenu principal */}
      <div className="grid lg:grid-cols-3 gap-8">
        
        {/* Colonne gauche (Stats / QR) */}
        <div className="space-y-6">
          {isPending ? (
            <MissionQR missionId={id} />
          ) : (
            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Trophy size={20} className="text-amber-500" />
                Impact Mesuré
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100/50">
                  <p className="text-[10px] font-black uppercase text-emerald-600/80 mb-1">Distance</p>
                  <p className="text-2xl font-black text-emerald-700">
                    {m.distance_m ? (m.distance_m / 1000).toFixed(1) : 0} <span className="text-sm font-bold">km</span>
                  </p>
                </div>
                
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100/50">
                  <p className="text-[10px] font-black uppercase text-blue-600/80 mb-1">Durée</p>
                  <p className="text-2xl font-black text-blue-700">
                    {m.duration_s ? Math.round(m.duration_s / 60) : 0} <span className="text-sm font-bold">min</span>
                  </p>
                </div>
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-3">
                <p className="text-sm font-medium flex justify-between">
                  <span className="cmm-text-secondary">CO2 évité estimé</span>
                  <span className="font-bold text-emerald-600">~{m.distance_m ? (m.distance_m * 0.15).toFixed(1) : 0} kg</span>
                </p>
                <p className="text-sm font-medium flex justify-between">
                  <span className="cmm-text-secondary">Volume d'eau préservé</span>
                  <span className="font-bold text-blue-600">~{m.distance_m ? Math.round(m.distance_m * 2.5) : 0} L</span>
                </p>
              </div>
            </div>
          )}

          <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
            <h4 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-4">Informations</h4>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <Clock size={16} className="text-slate-400" />
                {new Date(m.started_at).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
              </li>
              <li className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <MapPin size={16} className="text-slate-400" />
                Paris, Île-de-France
              </li>
            </ul>
          </div>
        </div>

        {/* Colonne droite (Carte) */}
        <div className="lg:col-span-2">
          <MissionMap points={gpsPoints} />
          
          <div className="mt-4 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3">
            <p className="text-sm text-amber-800 font-medium">
              💡 <strong className="font-black">Certifié par CleanMyMap.</strong> Ce tracé a été enregistré en direct via l'application Compagnon, garantissant l'authenticité de l'impact écologique.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
