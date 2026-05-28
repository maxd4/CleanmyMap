"use client";

import { useMemo, useState } from "react";
import {
  CheckCircle2,
  ClipboardList,
  FileText,
  Mail,
  Megaphone,
  Printer,
  Recycle,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  SunMedium,
  ThermometerSun,
  Wind,
  type LucideIcon,
} from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";

type KitTemplate = {
  id: string;
  title: string;
  icon: LucideIcon;
  description: string;
  content: string;
  accentClass: string;
};

const CHECKLIST_ITEMS = [
  {
    stage: "Avant",
    title: "Checklist avant cleanup",
    items: [
      "Définir l'objectif, la zone et le point de rendez-vous.",
      "Prévenir la mairie ou le gestionnaire du site si nécessaire.",
      "Préparer le nombre de bénévoles, le matériel et les contacts utiles.",
      "Partager l'affiche, le mail d'invitation et le message de rappel.",
    ],
  },
  {
    stage: "Pendant",
    title: "Checklist pendant cleanup",
    items: [
      "Faire l'accueil, rappeler les consignes et attribuer les zones.",
      "Vérifier la sécurité, la météo et les déchets à risque.",
      "Suivre le tri, les sacs pleins et le rythme de collecte.",
      "Conserver les observations terrain pour le bilan.",
    ],
  },
  {
    stage: "Après",
    title: "Checklist après cleanup",
    items: [
      "Peser ou estimer les déchets collectés.",
      "Compléter la fiche de tri et le bilan post-cleanup.",
      "Partager les photos, remerciements et résultats clés.",
      "Identifier les pollutions récurrentes et les actions ciblées.",
    ],
  },
];

const RESOURCE_SECTIONS = [
  {
    title: "Sécuriser l'action",
    icon: ShieldCheck,
    accentClass: "border-emerald-200 bg-emerald-50/80 text-emerald-900",
    items: [
      "Fiche sécurité pour rappeler les gants, pinces, objets dangereux et gestes d'alerte.",
      "Modèle d'autorisation mairie pour cadrer l'usage du lieu et le parcours.",
      "Liste matériel selon météo: soleil, pluie, vent, froid ou forte chaleur.",
    ],
  },
  {
    title: "Diffuser et recruter",
    icon: Megaphone,
    accentClass: "border-sky-200 bg-sky-50/80 text-sky-900",
    items: [
      "Modèle d'affiche personnalisable avec nom, date, lieu et contact.",
      "Modèle de mail pour bénévoles avec invitation, relance et rappel météo.",
      "Script d'accueil pour lancer l'action de façon claire et rassurante.",
    ],
  },
  {
    title: "Analyser la pollution",
    icon: Recycle,
    accentClass: "border-amber-200 bg-amber-50/80 text-amber-900",
    items: [
      "Fiche tri des déchets: mégots, plastique, verre, métal, mixte.",
      "Modèle de bilan post-cleanup avec quantités, observations et suites possibles.",
      "Remontée des déchets collectés pour alimenter les recommandations ciblées.",
    ],
  },
];

const TEMPLATES: KitTemplate[] = [
  {
    id: "poster",
    title: "Affiche personnalisable",
    icon: Printer,
    description: "À dupliquer puis adapter avec le nom, le lieu, la date et le contact.",
    accentClass: "border-emerald-200 bg-emerald-50 text-emerald-900",
    content:
      "NETTOYAGE PARTICIPATIF\n\nNom de l'action: [Votre titre]\nDate: [JJ/MM/AAAA]\nLieu: [Adresse / point de rendez-vous]\nHeure: [Départ / fin]\nContact: [Nom + téléphone + mail]\n\nRejoignez-nous pour un cleanup utile et convivial.\nPrévoir: gants, chaussures fermées, gourde et bonne humeur.\n\nObjectif: nettoyer, trier et mieux comprendre les déchets du site.",
  },
  {
    id: "mail",
    title: "Mail bénévoles",
    icon: Mail,
    description: "Message prêt à envoyer pour recruter, confirmer et relancer.",
    accentClass: "border-sky-200 bg-sky-50 text-sky-900",
    content:
      "Objet: Invitation à notre cleanup du [date]\n\nBonjour,\n\nNous organisons un cleanup le [date] à [lieu].\nVotre aide sera précieuse pour nettoyer la zone, trier les déchets et participer au bilan.\n\nMerci de nous confirmer votre présence.\nNous vous enverrons les consignes pratiques et les informations météo avant l'événement.\n\nÀ très vite,\n[Signature]",
  },
  {
    id: "welcome",
    title: "Script d'accueil",
    icon: ClipboardList,
    description: "Trame courte pour lancer l'action et poser les consignes.",
    accentClass: "border-violet-200 bg-violet-50 text-violet-900",
    content:
      "Bienvenue à toutes et tous.\n\n1. Présentation rapide de l'objectif et du parcours.\n2. Rappel sécurité: gants, pinces, pas d'objets dangereux seuls, signaler tout incident.\n3. Répartition des rôles et des zones.\n4. Consignes de tri et de remontée des observations terrain.\n5. Photo de groupe et départ de l'action.\n\nMerci pour votre aide et votre vigilance.",
  },
];

function CopyTemplateButton({
  content,
  label,
}: {
  content: string;
  label: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (typeof navigator === "undefined" || !navigator.clipboard) {
      return;
    }
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <CmmButton
      type="button"
      onClick={() => void handleCopy()}
      tone="tertiary"
      variant="pill"
      className="rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] transition hover:bg-white"
    >
      {copied ? "Copié" : label}
    </CmmButton>
  );
}

export function OrganizerKitCard() {
  const animatedSteps = useMemo(
    () => [
      "Accueillir",
      "Sécuriser",
      "Collecter",
      "Trier",
      "Documenter",
    ],
    [],
  );

  return (
    <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-100">
      <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700">
            <Sparkles size={12} />
            Kit organisateur
          </div>
          <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-900">
            {"Tout ce qu'il faut pour préparer, animer et clôturer un cleanup"}
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
            Une base pratique pour créer un événement utile, mobiliser des bénévoles
            sans contact préalable et documenter les déchets collectés pour mieux
            comprendre les pollutions.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
            Déroulé type
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {animatedSteps.map((step) => (
              <span
                key={step}
                className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
              >
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {CHECKLIST_ITEMS.map((block) => (
          <section
            key={block.stage}
            className="rounded-3xl border border-slate-200 bg-slate-50/60 p-4"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
              {block.stage}
            </p>
            <h4 className="mt-2 text-base font-bold text-slate-900">{block.title}</h4>
            <ul className="mt-3 space-y-2">
              {block.items.map((item) => (
                <li key={item} className="flex gap-2 text-sm leading-relaxed text-slate-600">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.3fr_1fr]">
        <section className="rounded-3xl border border-slate-200 bg-slate-50/70 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
              <FileText size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black tracking-tight text-slate-900">
                {"Fiche pratique et guide d'animation"}
              </h4>
              <p className="text-sm text-slate-500">
                Une version courte pour animer, cadrer et laisser une trace utile.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-emerald-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-600">
                {"Guide d'animation"}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Accueil, consignes, répartition, collecte, tri, bilan. Ce guide sert
                {" d'appui à l'animateur pour garder un déroulé clair et rassurant."}
              </p>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-white p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-sky-600">
                Fiche pratique
              </p>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Une fiche imprimable avec les essentiels: rendez-vous, matériel, sécurité,
                tri, météo, contact et bilan.
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                  Modèle prêt à personnaliser
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Remplacez les champs entre crochets par vos informations et
                  {" partagez l'affiche dans vos canaux."}
                </p>
              </div>
              <CopyTemplateButton label="Copier l'affiche" content={TEMPLATES[0].content} />
            </div>
            <pre className="mt-3 overflow-auto rounded-2xl bg-slate-950 p-4 text-[11px] leading-relaxed text-slate-100">
              {TEMPLATES[0].content}
            </pre>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h4 className="text-lg font-black tracking-tight text-slate-900">
                {"Sécurité, autorisations et météo"}
              </h4>
              <p className="text-sm text-slate-500">
                {"Tout ce qu'il faut pour éviter les oublis et réagir vite sur le terrain."}
              </p>
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div className="rounded-2xl border border-amber-100 bg-amber-50/70 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                <ShieldCheck size={16} />
                Fiche sécurité
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-700">
                {"Rappels gants, pinces, objets dangereux, gestes d'alerte et conduite à tenir en cas d'incident."}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Printer size={16} />
                {"Modèle d'autorisation mairie"}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600">
                {"Texte de demande, périmètre d'action, horaires et contact responsable."}
              </p>
            </div>
            <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-cyan-900">
                <SunMedium size={16} />
                Liste matériel selon météo
              </p>
              <div className="mt-3 grid gap-2 text-xs font-semibold text-cyan-900 sm:grid-cols-2">
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-cyan-200">
                  <ThermometerSun size={14} />
                  <span>Chaleur, soleil et eau</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-cyan-200">
                  <Wind size={14} />
                  <span>Vent, pluie et couche chaude</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {RESOURCE_SECTIONS.map((section) => {
          const Icon = section.icon;

          return (
            <section key={section.title} className={`rounded-3xl border p-5 ${section.accentClass}`}>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
                  <Icon size={18} />
                </div>
                <h4 className="text-base font-black tracking-tight">{section.title}</h4>
              </div>
              <ul className="mt-4 space-y-2">
                {section.items.map((item) => (
                  <li key={item} className="text-sm leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        {TEMPLATES.map((template) => {
          const Icon = template.icon;

          return (
            <article
              key={template.id}
              className={`rounded-3xl border p-5 ${template.accentClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80">
                    <Icon size={18} />
                  </div>
                  <div>
                    <h4 className="text-base font-black tracking-tight">{template.title}</h4>
                    <p className="text-xs leading-relaxed opacity-80">{template.description}</p>
                  </div>
                </div>
                <CopyTemplateButton label="Copier" content={template.content} />
              </div>
              <pre className="mt-4 max-h-60 overflow-auto rounded-2xl bg-white/75 p-4 text-[11px] leading-relaxed text-slate-800">
                {template.content}
              </pre>
            </article>
          );
        })}
      </div>
    </div>
  );
}
