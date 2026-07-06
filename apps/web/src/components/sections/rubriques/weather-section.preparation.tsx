"use client";

import type { ReactNode } from "react";
import { ArrowRight, CalendarDays, CheckCircle2, Download, Droplets, Heart, Leaf, Lightbulb, MapPin, Mountain, Package, Recycle, Share2, ShieldCheck, Sprout, Truck, TriangleAlert, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { GuideOperationalPanel } from "./guide-section";
import type { useWeatherData } from "./use-weather-data";
import { formatDateTimeShort } from "@/components/sections/rubriques/helpers";
import { cn } from "@/lib/utils";

function LightCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[2.15rem] border border-slate-200/80 bg-white/90 shadow-[0_28px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

function getDurationLabel(level: "vert" | "orange" | "rouge"): string {
  if (level === "rouge") return "45 min max";
  if (level === "orange") return "60-90 min";
  return "90-120 min";
}

function getCurrentWindowLabel(
  from?: string,
  to?: string,
  locale: "fr" | "en" = "fr",
): string {
  if (!from || !to) {
    return locale === "fr" ? "Pas de fenêtre horaire claire" : "No clear time window";
  }

  const start = formatDateTimeShort(from);
  const end = formatDateTimeShort(to);
  return `${start} → ${end}`;
}

export function PreparationPanel({
  currentRisk,
  weatherStatus,
  selectedLocationLabel,
  selectedLocationSubtitle,
  recommendedWindow,
  prepProgress,
  packItems,
  fr,
}: {
  currentRisk: ReturnType<typeof useWeatherData>["currentRisk"];
  weatherStatus: ReturnType<typeof useWeatherData>["weatherStatus"];
  selectedLocationLabel: string;
  selectedLocationSubtitle: string;
  recommendedWindow: { from: string; to: string } | null;
  prepProgress: number;
  packItems: string[];
  fr: boolean;
}) {
  const isWeatherReady = weatherStatus === "ready" && currentRisk !== null;
  const durationLabel = isWeatherReady
    ? getDurationLabel(currentRisk.level)
    : fr
      ? "1 h à 2 h"
      : "1h to 2h";
  const effortLabel = isWeatherReady
    ? currentRisk.level === "rouge"
      ? fr
        ? "Fort"
        : "High"
      : fr
        ? "Modéré"
        : "Moderate"
    : fr
      ? "Modéré"
      : "Moderate";
  const gearPreview = isWeatherReady
    ? currentRisk.equipment.slice(0, 2).join(" • ")
    : packItems.slice(0, 2).join(" • ");

  const heroStats = [
    {
      icon: CalendarDays,
      label: fr ? "Durée indicative" : "Indicative duration",
      value: durationLabel,
      note: fr ? "1h à 2h selon le site" : "1h to 2h depending on the site",
    },
    {
      icon: Package,
      label: fr ? "Kit recommandé" : "Recommended kit",
      value: gearPreview,
      note: fr ? "léger et pratique" : "light and practical",
    },
    {
      icon: Heart,
      label: fr ? "Niveau d'effort" : "Effort level",
      value: effortLabel,
      note: fr ? "adapté à tous" : "suitable for most teams",
    },
    {
      icon: Mountain,
      label: fr ? "Accessibilité / terrain" : "Accessibility / terrain",
      value: fr ? "Urbain ou naturel" : "Urban or natural",
      note: fr ? "varié selon la zone" : "varies by area",
    },
  ] as const;

  const kitSections = [
    {
      icon: ShieldCheck,
      title: fr ? "Protection" : "Protection",
      tone: "emerald",
      items: [
        { label: fr ? "Gants de protection" : "Protective gloves", qty: "x1 paire" },
        { label: fr ? "Gilet haute visibilité" : "High-vis vest", qty: "x1" },
        { label: fr ? "Gel hydroalcoolique" : "Hand sanitizer", qty: "x1" },
        { label: fr ? "Masque (si besoin)" : "Mask (if needed)", qty: "x1" },
      ],
    },
    {
      icon: Package,
      title: fr ? "Collecte" : "Collection",
      tone: "blue",
      items: [
        { label: fr ? "Sacs résistants" : "Strong bags", qty: "x2" },
        { label: fr ? "Pinces de ramassage" : "Grabbers", qty: "x1" },
        { label: fr ? "Seau / bac (optionnel)" : "Bucket / bin (optional)", qty: "x1" },
      ],
    },
    {
      icon: Leaf,
      title: fr ? "Confort" : "Comfort",
      tone: "amber",
      items: [
        { label: fr ? "Eau" : "Water", qty: "x1 L+" },
        { label: fr ? "Casquette / chapeau" : "Cap / hat", qty: "x1" },
        { label: fr ? "Crème solaire" : "Sunscreen", qty: "x1" },
      ],
    },
    {
      icon: Recycle,
      title: fr ? "Tri / signalement" : "Sorting / reporting",
      tone: "violet",
      items: [
        { label: fr ? "Guide du tri (mémo)" : "Sorting memo", qty: "x1" },
        { label: fr ? "Sac dédié aux recyclables" : "Separate recyclables bag", qty: "x1" },
        { label: fr ? "Application ou carnet photos" : "App or photo notebook", qty: "x1" },
      ],
    },
  ] as const;

  const prepSteps = [
    {
      icon: CalendarDays,
      label: fr ? "Avant" : "Before",
      title: fr ? "Préparer le départ" : "Prepare to leave",
      tone: "emerald",
      points: [
        fr ? "Vérifiez la météo et adaptez votre tenue." : "Check the weather and adapt your clothes.",
        fr ? "Préparez un kit léger et complet." : "Prepare a light, complete kit.",
        fr ? "Informez un proche de votre sortie." : "Tell someone where you are going.",
        fr ? "Repérez les accès et stationnements." : "Identify access points and parking.",
      ],
    },
    {
      icon: Users,
      label: fr ? "Pendant" : "During",
      title: fr ? "Rester attentif sur le terrain" : "Stay attentive in the field",
      tone: "sky",
      points: [
        fr ? "Restez en groupe et attentifs aux autres." : "Stay together and watch out for each other.",
        fr ? "Respectez le lieu et la faune locale." : "Respect the site and local wildlife.",
        fr ? "Ramassez uniquement les déchets sûrs." : "Pick up only safe waste.",
        fr ? "Faites le tri au fur et à mesure." : "Sort as you go.",
      ],
    },
    {
      icon: Leaf,
      label: fr ? "Après" : "After",
      title: fr ? "Clore et valoriser l’action" : "Close and share the action",
      tone: "emerald",
      points: [
        fr ? "Triez les déchets selon les consignes locales." : "Sort waste according to local instructions.",
        fr ? "Prenez quelques photos pour valoriser l’action." : "Take a few photos to highlight the action.",
        fr ? "Nettoyez et rangez le matériel." : "Clean and store the gear.",
        fr ? "Partagez votre expérience et inspirez d’autres personnes !" : "Share your experience and inspire others!",
      ],
    },
  ] as const;

  const usefulBlocks = [
    {
      icon: Leaf,
      title: fr ? "Bonnes pratiques" : "Good practices",
      tone: "emerald",
      points: [
        fr ? "Ramasser sans déplacer les éléments naturels." : "Pick up litter without moving natural elements.",
        fr ? "Ne pas déranger la faune et la flore." : "Do not disturb fauna and flora.",
        fr ? "Respecter la tranquillité des lieux et des usagers." : "Respect the quiet of the area and its users.",
      ],
    },
    {
      icon: TriangleAlert,
      title: fr ? "À éviter / à ne pas ramasser" : "Avoid / do not pick up",
      tone: "rose",
      points: [
        fr ? "Déchets dangereux (aiguilles, amiante, produits chimiques)." : "Hazardous waste (needles, asbestos, chemicals).",
        fr ? "Objets suspects ou non identifiables." : "Suspicious or unidentified objects.",
        fr ? "Déchets enfouis ou collés à la terre." : "Buried waste or waste stuck to the ground.",
      ],
    },
    {
      icon: Recycle,
      title: fr ? "Déchets fréquents" : "Common waste",
      tone: "sky",
      chips: [
        fr ? "Mégots" : "Cigarette butts",
        fr ? "Plastiques" : "Plastics",
        fr ? "Canettes" : "Cans",
        fr ? "Emballages" : "Packaging",
        fr ? "Verre" : "Glass",
        fr ? "Papiers" : "Paper",
      ],
    },
    {
      icon: Lightbulb,
      title: fr ? "Petits réflexes utiles" : "Useful reflexes",
      tone: "amber",
      reflexes: [
        { icon: Droplets, label: fr ? "Utilisez l'eau avec parcimonie" : "Use water sparingly" },
        { icon: Recycle, label: fr ? "Préférez des matériaux réutilisables" : "Prefer reusable materials" },
        { icon: Leaf, label: fr ? "Ne laissez aucun déchet sur place" : "Leave no litter behind" },
        { icon: Heart, label: fr ? "Merci la nature vous dit merci !" : "Nature says thank you!" },
      ],
    },
  ] as const;

  const quickActions = [
    {
      icon: Download,
      tone: "emerald",
      title: fr ? "Télécharger la checklist" : "Download the checklist",
      description: fr
        ? "La fiche récapitulative à imprimer ou à garder sous la main."
        : "A concise sheet to print or keep close by.",
      href: "/sections/reports",
    },
    {
      icon: Package,
      tone: "sky",
      title: fr ? "Voir le matériel conseillé" : "See the recommended gear",
      description: fr
        ? "Une sélection d'équipements pratiques et responsables."
        : "A selection of practical, responsible gear.",
      href: "/sections/weather",
    },
    {
      icon: Recycle,
      tone: "violet",
      title: fr ? "Comprendre le tri" : "Understand sorting",
      description: fr
        ? "Mieux trier pour mieux valoriser chaque déchet collecté."
        : "Sort better to value every collected item.",
      href: "/sections/recycling",
    },
    {
      icon: Share2,
      tone: "amber",
      title: fr ? "Partager la fiche" : "Share the sheet",
      description: fr
        ? "Diffuser cette fiche à vos amis et à votre équipe."
        : "Share this sheet with your friends and team.",
      href: "/sections/community",
    },
  ] as const;

  return (
    <div className="space-y-6">
      <LightCard className="relative overflow-hidden border-emerald-100 bg-[linear-gradient(180deg,rgba(239,251,244,0.98)_0%,rgba(255,255,255,0.99)_100%)] p-7 lg:p-8">
        <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[42%] lg:block">
          <div className="absolute right-8 top-6 h-24 w-24 rounded-full bg-[#f7f4d9]/80" />
          <div className="absolute right-6 top-20 h-40 w-40 rounded-full bg-emerald-200/30 blur-xl" />
          <div className="absolute bottom-0 right-0 h-48 w-48 rounded-[60%_40%_0_0] bg-emerald-400/25" />
          <Leaf className="absolute right-20 top-16 h-28 w-28 text-emerald-500/30" />
          <Leaf className="absolute right-10 top-24 h-20 w-20 rotate-12 text-emerald-700/25" />
          <Mountain className="absolute bottom-5 right-24 h-20 w-20 text-emerald-600/18" />
        </div>

        <div className="relative z-10 grid gap-6 lg:grid-cols-[1.1fr_0.95fr]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-2 text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700 shadow-sm">
              <Sprout size={14} />
              {fr ? "Préparation terrain" : "Field preparation"}
            </div>
            <h3 className="text-3xl font-black tracking-tight text-emerald-950 lg:text-[3.35rem] lg:leading-[0.95]">
              {fr ? "Bien préparer sa cleanwalk" : "Prepare your cleanwalk well"}
            </h3>
            <p className="max-w-2xl text-sm leading-relaxed text-slate-600 lg:text-base">
              {fr
                ? "Une bonne préparation rend l’action plus sûre, plus agréable et plus efficace pour la nature. Anticipez, équipez-vous, respectez le lieu et repartez avec le sourire !"
                : "Good preparation makes the action safer, more enjoyable and more effective for nature. Plan ahead, equip yourself, respect the site and leave with a smile!"}
            </p>
            <div className="flex flex-wrap gap-2">
              {packItems.map((item) => (
                <span
                  key={item}
                  className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-3 py-2 text-[12px] font-semibold text-slate-700 shadow-sm"
                >
                  <CheckCircle2 size={12} className="text-emerald-600" />
                  {item}
                </span>
              ))}
            </div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 text-[11px] font-semibold text-emerald-900 shadow-sm">
              <MapPin size={12} className="text-emerald-700" />
              {selectedLocationLabel}
              {selectedLocationSubtitle ? ` · ${selectedLocationSubtitle}` : ""}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {heroStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <div
                  key={stat.label}
                  className="rounded-[1.35rem] border border-white/70 bg-white/80 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] backdrop-blur-sm"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
                      <Icon size={18} />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-slate-500">
                        {stat.label}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-700">
                        {stat.value}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs font-medium text-slate-500">{stat.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      </LightCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[0.92fr_1.05fr_1fr]">
        <LightCard className="border-emerald-100 bg-white/95 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Package size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Kit recommandé" : "Recommended kit"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Essentiel léger et pratique" : "Lightweight, practical essentials"}
              </h3>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-slate-500">
                {fr ? "Progression du kit" : "Kit progress"}
              </p>
              <p className="text-3xl font-black tracking-tight text-emerald-700">{prepProgress}%</p>
            </div>
            <div className="h-2 w-32 overflow-hidden rounded-full bg-emerald-100">
              <div className="h-full rounded-full bg-emerald-600" style={{ width: `${prepProgress}%` }} />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {kitSections.map((section) => {
              const SectionIcon = section.icon;
              const toneStyles =
                section.tone === "emerald"
                  ? "border-emerald-100 bg-emerald-50/60 text-emerald-700"
                  : section.tone === "blue"
                    ? "border-sky-100 bg-sky-50/60 text-sky-700"
                    : section.tone === "amber"
                      ? "border-amber-100 bg-amber-50/60 text-amber-700"
                      : "border-violet-100 bg-violet-50/60 text-violet-700";

              return (
                <div key={section.title} className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn("flex h-10 w-10 items-center justify-center rounded-2xl border", toneStyles)}>
                      <SectionIcon size={16} />
                    </span>
                    <div>
                      <p className="text-sm font-black tracking-tight text-slate-900">
                        {section.title}
                      </p>
                      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">
                        {fr ? "À glisser dans le sac" : "Pack it in your bag"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5">
                    {section.items.map((item) => (
                      <div key={item.label} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-3 py-2.5">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-400">
                            <CheckCircle2 size={11} />
                          </span>
                          <span className="truncate text-sm font-medium text-slate-700">
                            {item.label}
                          </span>
                        </div>
                        <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                          {item.qty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </LightCard>

        <LightCard className="border-emerald-100 bg-white/95 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <CalendarDays size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Se préparer avant de partir" : "Prepare before leaving"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Avant / pendant / après" : "Before / during / after"}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {prepSteps.map((step, index) => {
              const StepIcon = step.icon;
              const stepTone =
                step.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-sky-200 bg-sky-50 text-sky-700";

              return (
                <div key={step.label} className="grid grid-cols-[auto_1fr] gap-4">
                  <div className="flex flex-col items-center">
                    <div className={cn("flex h-14 w-14 items-center justify-center rounded-2xl border", stepTone)}>
                      <StepIcon size={20} />
                    </div>
                    {index < prepSteps.length - 1 ? (
                      <div className="mt-2 h-full w-px flex-1 bg-slate-200" />
                    ) : null}
                  </div>

                  <div className="rounded-[1.35rem] border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-[0.28em] text-slate-500">
                          {step.label}
                        </p>
                        <h4 className="mt-1 text-base font-black tracking-tight text-slate-900">
                          {step.title}
                        </h4>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-emerald-700">
                        {index === 0
                          ? fr
                            ? "Avant"
                            : "Before"
                          : index === 1
                            ? fr
                              ? "Pendant"
                              : "During"
                            : fr
                              ? "Après"
                              : "After"}
                      </span>
                    </div>

                    {index === 0 && recommendedWindow ? (
                      <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs font-medium text-emerald-900">
                        {fr ? "Créneau conseillé" : "Suggested slot"}:{" "}
                        {getCurrentWindowLabel(recommendedWindow.from, recommendedWindow.to, fr ? "fr" : "en")}
                      </div>
                    ) : null}

                    <ul className="mt-3 space-y-2">
                      {step.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-slate-600">
                          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                            <CheckCircle2 size={11} />
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </LightCard>

        <LightCard className="border-emerald-100 bg-white/95 p-6">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700">
              <Truck size={18} />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-700">
                {fr ? "Repères utiles" : "Useful references"}
              </p>
              <h3 className="mt-1 text-xl font-black tracking-tight text-slate-900">
                {fr ? "Bien cadrer la cleanwalk" : "Frame the cleanwalk well"}
              </h3>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {usefulBlocks.map((block) => {
              const BlockIcon = block.icon;
              const toneStyles =
                block.tone === "emerald"
                  ? "border-emerald-200 bg-emerald-50/70 text-emerald-700"
                  : block.tone === "rose"
                    ? "border-rose-200 bg-rose-50/70 text-rose-700"
                    : block.tone === "sky"
                      ? "border-sky-200 bg-sky-50/70 text-sky-700"
                      : "border-amber-200 bg-amber-50/70 text-amber-700";

              return (
                <div key={block.title} className={cn("rounded-[1.35rem] border p-4", toneStyles)}>
                  <div className="flex items-center gap-2">
                    <BlockIcon size={18} />
                    <p className="text-sm font-black tracking-tight">
                      {block.title}
                    </p>
                  </div>

                  {"points" in block ? (
                    <ul className="mt-3 space-y-2">
                      {block.points.map((point) => (
                        <li key={point} className="flex items-start gap-2 text-sm text-slate-700">
                          <span className="mt-1 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/70 text-current">
                            <CheckCircle2 size={11} />
                          </span>
                          <span className="leading-relaxed">{point}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {"chips" in block ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {block.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1 rounded-full border border-current/20 bg-white/80 px-3 py-1 text-[11px] font-semibold"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  {"reflexes" in block ? (
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {block.reflexes.map((reflex) => {
                        const ReflexIcon = reflex.icon;

                        return (
                          <div key={reflex.label} className="rounded-2xl border border-white/60 bg-white/75 p-3 text-center shadow-sm">
                            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full border border-current/20 bg-white/90">
                              <ReflexIcon size={15} />
                            </div>
                            <p className="mt-2 text-[11px] font-semibold leading-relaxed text-slate-700">
                              {reflex.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </LightCard>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {quickActions.map((action) => {
          const ActionIcon = action.icon;
          const toneStyles =
            action.tone === "emerald"
              ? "border-emerald-200 bg-emerald-50/80 text-emerald-700"
              : action.tone === "sky"
                ? "border-sky-200 bg-sky-50/80 text-sky-700"
                : action.tone === "violet"
                  ? "border-violet-200 bg-violet-50/80 text-violet-700"
                  : "border-amber-200 bg-amber-50/80 text-amber-700";

          return (
            <CmmButton
              key={action.title}
              href={action.href}
              tone="secondary"
              variant="pill"
              className="h-full w-full rounded-[1.35rem] border border-slate-200 bg-white/95 p-4 shadow-[0_16px_40px_rgba(15,23,42,0.06)] transition-transform hover:-translate-y-0.5"
            >
              <div className="flex w-full items-center gap-3 text-left">
                <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border", toneStyles)}>
                  <ActionIcon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black tracking-tight text-slate-900">
                    {action.title}
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500">
                    {action.description}
                  </span>
                </span>
                <ArrowRight size={16} className="shrink-0 text-slate-400" />
              </div>
            </CmmButton>
          );
        })}
      </div>

      <div className="pt-2">
        <GuideOperationalPanel />
      </div>
    </div>
  );
}
