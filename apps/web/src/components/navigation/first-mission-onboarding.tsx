"use client";

import Link from"next/link";
import { useEffect, useMemo, useState } from"react";
import type { AppProfile } from"@/lib/profiles";

type OnboardingStep = {
 id: string;
 label: string;
 hint: string;
 href: string;
};

const PROFILE_ONBOARDING: Record<AppProfile, OnboardingStep[]> = {
 benevole: [
 {
 id:"brief",
 label:"Lire le brief de mission",
 hint:"2 min - objectifs + sécurité",
 href:"/sections/guide",
 },
 {
 id:"kit",
 label:"Vérifier le kit terrain",
 hint:"1 min - gants, sacs, pince",
 href:"/sections/kit",
 },
 {
 id:"declare",
 label:"Créer la déclaration",
 hint:"moins de 60 sec",
 href:"/actions/new?mode=quick",
 },
 {
 id:"map",
 label:"Vérifier la carte avant sortie",
 hint:"zone + points prioritaires",
 href:"/actions/map",
 },
 ],
 coordinateur: [
 {
 id:"agenda",
 label:"Vérifier les événements à venir",
 hint:"capacite + RSVP",
 href:"/sections/community",
 },
 {
 id:"zones",
 label:"Définir les zones de campagne",
 hint:"priorités 30 jours",
 href:"/sections/actors",
 },
 {
 id:"dashboard",
 label:"Valider les alertes métier",
 hint:"zones critiques + backlog",
 href:"/dashboard",
 },
 {
 id:"launch",
 label:"Lancer la mission",
 hint:"communiquer le plan à l'équipe",
 href:"/actions/new?mode=quick",
 },
 ],
 scientifique: [
 {
 id:"baseline",
 label:"Vérifier la base de données",
 hint:"qualité et couverture",
 href:"/reports",
 },
 {
 id:"compare",
 label:"Comparer les zones prioritaires",
 hint:"brut vs normalisé",
 href:"/sections/climate",
 },
 {
 id:"climate",
 label:"Croiser avec le contexte climat",
 hint:"signal météo-climat",
 href:"/sections/climate",
 },
 {
 id:"insight",
 label:"Partager une observation actionnable",
 hint:"1 recommandation argumentée",
 href:"/dashboard",
 },
 ],
 elu: [
 {
 id:"overview",
 label:"Ouvrir la synthèse de gouvernance",
 hint:"3 KPI + alerte",
 href:"/reports",
 },
 {
 id:"zones",
 label:"Vérifier les priorités territoriales",
 hint:"zones à traiter",
 href:"/sections/elus",
 },
 {
 id:"compare",
 label:"Comparer les zones",
 hint:"brut vs normalisé",
 href:"/sections/climate",
 },
 {
 id:"action",
 label:"Valider l'action de la semaine",
 hint:"allocation terrain",
 href:"/dashboard",
 },
 ],
 admin: [
 {
 id:"alerts",
 label:"Analyser les alertes métier",
 hint:"backlog + zones critiques",
 href:"/admin",
 },
 {
 id:"moderation",
 label:"Traiter le backlog de modération",
 hint:"priorité haute d'abord",
 href:"/reports",
 },
 {
 id:"quality",
 label:"Vérifier la fiabilité des données",
 hint:"scores A/B/C + incohérences",
 href:"/actions/history",
 },
 {
 id:"journal",
 label:"Journaliser les opérations",
 hint:"traçabilité admin",
 href:"/admin",
 },
 ],
};

function storageKey(profile: AppProfile): string {
 return `cleanmymap.onboarding.first-mission.${profile}`;
}

export function FirstMissionOnboarding({ profile }: { profile: AppProfile }) {
 const [checked, setChecked] = useState<Record<string, boolean>>(() => {
 if (typeof window ==="undefined") {
 return {};
 }
 try {
 const raw = window.localStorage.getItem(storageKey(profile));
 if (!raw) {
 return {};
 }
 return JSON.parse(raw) as Record<string, boolean>;
 } catch {
 return {};
 }
 });
 const steps = PROFILE_ONBOARDING[profile];

 useEffect(() => {
 try {
 window.localStorage.setItem(storageKey(profile), JSON.stringify(checked));
 } catch {
 // Ignore localStorage write errors.
 }
 }, [checked, profile]);

 const progress = useMemo(() => {
 const done = steps.filter((step) => checked[step.id]).length;
 const ratio = steps.length > 0 ? done / steps.length : 0;
 return {
 done,
 total: steps.length,
 percent: Math.round(ratio * 100),
 next: steps.find((step) => !checked[step.id]) ?? null,
 };
 }, [checked, steps]);

 return (
 <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
 <div className="flex flex-wrap items-center justify-between gap-2">
 <div>
 <p className="cmm-text-caption font-semibold uppercase tracking-[0.14em] text-emerald-700">
 Première mission
 </p>
 <h2 className="mt-1 text-base font-semibold text-emerald-900">
 Parcours d'accueil court (moins de 10 minutes)
 </h2>
 </div>
 <p className="cmm-text-caption font-semibold uppercase tracking-wide text-emerald-800">
 {progress.done}/{progress.total} étapes
 </p>
 </div>

 <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
 <div
 className="h-full rounded-full bg-emerald-600 transition-all"
 style={{ width: `${progress.percent}%` }}
 />
 </div>

 <ul className="mt-3 space-y-2">
 {steps.map((step) => (
 <li
 key={step.id}
 className="rounded-lg border border-emerald-200 bg-white p-2 cmm-text-small cmm-text-secondary"
 >
 <label className="flex items-start gap-2">
 <input
 type="checkbox"
 checked={Boolean(checked[step.id])}
 onChange={() =>
 setChecked((prev) => ({ ...prev, [step.id]: !prev[step.id] }))
 }
 className="mt-1"
 />
 <span>
 <span className="font-semibold cmm-text-primary">
 {step.label}
 </span>
 <span className="block cmm-text-caption cmm-text-muted">
 {step.hint}
 </span>
 </span>
 </label>
 <Link
 href={step.href}
 className="mt-2 inline-flex cmm-text-caption font-semibold text-emerald-700 hover:text-emerald-800"
 >
 Ouvrir l&apos;étape
 </Link>
 </li>
 ))}
 </ul>

 {progress.next ? (
 <div className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 cmm-text-small text-emerald-900">
 Prochaine étape recommandée:{""}
 <span className="font-semibold">{progress.next.label}</span>.
 </div>
 ) : (
 <div className="mt-3 rounded-lg border border-emerald-300 bg-white px-3 py-2 cmm-text-small font-semibold text-emerald-900">
 Mission prête à lancer.
 </div>
 )}
 </section>
 );
}
