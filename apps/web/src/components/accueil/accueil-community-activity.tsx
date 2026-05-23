"use client";

import { useRef } from "react";
import { MessageSquare, Share2, Sparkles, Users } from "lucide-react";
import type { HomeCommunityActivitySummary } from "@/lib/accueil/data";
import { useGsapReveal } from "@/lib/animations/use-gsap-reveal";

type HomeCommunityActivityProps = {
  activity: HomeCommunityActivitySummary;
};

const TONE_STYLES: Record<
  HomeCommunityActivitySummary["items"][number]["tone"],
  string
> = {
  amber: "bg-lime-400/14 text-lime-100 ring-lime-200/20",
  blue: "bg-emerald-400/14 text-emerald-100 ring-emerald-200/20",
  cyan: "bg-teal-300/14 text-teal-100 ring-teal-200/20",
  emerald: "bg-green-300/14 text-green-100 ring-green-200/20",
};

function formatCount(value: number): string {
  return value.toLocaleString("fr-FR");
}

export function HomeCommunityActivity({
  activity,
}: HomeCommunityActivityProps) {
  const sectionRef = useRef<HTMLElement | null>(null);

  useGsapReveal(sectionRef, {
    start: "top 78%",
    stagger: 0.08,
    duration: 0.65,
    y: 24,
  });

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-transparent py-12 sm:py-16 lg:py-20"
    >
      <div className="relative mx-auto flex max-w-[1540px] flex-col gap-12 px-4 sm:px-8 lg:flex-row lg:items-center lg:gap-20">
        <div className="flex-1 space-y-6">
          <div
            data-gsap-reveal
            className="inline-flex items-center gap-2 rounded-full border border-emerald-100/18 bg-[rgba(6,40,23,0.9)] px-4 py-2 text-emerald-50 shadow-[0_10px_24px_-16px_rgba(6,44,25,0.48)]"
          >
            <Sparkles size={16} />
            <span className="cmm-text-caption font-bold uppercase tracking-[0.3em]">
              Le pouls du réseau
            </span>
          </div>

          <h2
            data-gsap-reveal
            className="max-w-2xl text-4xl font-bold leading-[1.05] tracking-tight text-emerald-950 sm:text-5xl"
          >
            Une communauté <br />
            <span className="bg-gradient-to-r from-emerald-700 to-lime-500 bg-clip-text text-transparent">
              vivante et engagée
            </span>
          </h2>

          <p
            data-gsap-reveal
            className="max-w-2xl text-lg leading-relaxed text-emerald-900/66"
          >
            Les dernières actions remontent ici depuis les données du terrain.
            Rien d&apos;inventé, seulement des actions vérifiées et récentes.
          </p>

          <div
            data-gsap-reveal
            className="flex flex-wrap gap-3"
          >
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100/18 bg-[rgba(6,40,23,0.9)] px-4 py-3 shadow-[0_14px_30px_-24px_rgba(5,34,20,0.34)]">
              <div className="rounded-xl bg-emerald-400/14 p-2">
                <Users size={18} className="text-emerald-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-50">
                  {formatCount(activity.visibleActions)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/62">
                  Actions visibles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-100/18 bg-[rgba(6,40,23,0.9)] px-4 py-3 shadow-[0_14px_30px_-24px_rgba(5,34,20,0.34)]">
              <div className="rounded-xl bg-lime-400/14 p-2">
                <MessageSquare size={18} className="text-lime-200" />
              </div>
              <div>
                <p className="text-sm font-bold text-emerald-50">
                  {formatCount(activity.distinctLocations)}
                </p>
                <p className="text-[11px] uppercase tracking-[0.18em] text-emerald-100/62">
                  Lieux distincts
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative w-full flex-1 lg:max-w-2xl xl:max-w-3xl">
          <div className="relative space-y-4">
            {activity.items.length === 0 ? (
              <div
                data-gsap-reveal
                className="rounded-[1.5rem] border border-emerald-200/24 bg-[linear-gradient(180deg,rgba(7,39,22,0.94)_0%,rgba(6,31,18,0.96)_100%)] p-5 shadow-[0_18px_36px_-24px_rgba(5,34,20,0.82)]"
              >
                <p className="cmm-text-card-label text-sm font-bold">
                  Aucune action terrain récente vérifiée.
                </p>
                <p className="cmm-text-card-copy mt-1 text-sm">
                  Les prochaines données validées apparaîtront ici.
                </p>
              </div>
            ) : null}

            {activity.items.map((item) => (
              <div
                key={item.id}
                data-gsap-reveal
                className="flex items-center gap-4 rounded-[1.5rem] border border-emerald-200/24 bg-[linear-gradient(180deg,rgba(7,39,22,0.94)_0%,rgba(6,31,18,0.96)_100%)] p-4 shadow-[0_18px_36px_-24px_rgba(5,34,20,0.82)] backdrop-blur-xl transition-transform hover:-translate-y-0.5"
              >
                <div className="relative">
                  <div
                    className={`flex h-12 w-12 items-center justify-center rounded-full text-xs font-bold ring-1 ${TONE_STYLES[item.tone]}`}
                    aria-hidden="true"
                  >
                    {item.initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 rounded-full border border-emerald-200/18 bg-emerald-950 p-1">
                    <Users size={10} className="text-emerald-300" />
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold text-emerald-100">
                      {item.actor}
                    </p>
                    <p className="flex-shrink-0 text-[11px] uppercase tracking-[0.18em] cmm-text-card-copy">
                      {item.timeLabel}
                    </p>
                  </div>
                  <p className="truncate text-sm cmm-text-card-copy">
                    {item.action}{" "}
                    <span className="font-semibold text-emerald-200">
                      @{item.location}
                    </span>
                  </p>
                </div>
              </div>
            ))}

            <div
              data-gsap-reveal
              className="absolute -bottom-6 -left-6 flex items-center gap-3 rounded-2xl border border-emerald-200/24 bg-[linear-gradient(180deg,rgba(7,39,22,0.96)_0%,rgba(6,31,18,0.98)_100%)] px-4 py-3 shadow-[0_18px_36px_-24px_rgba(5,34,20,0.82)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300">
                <Share2 size={18} />
              </div>
              <div>
                <p className="cmm-text-card-label text-xs font-bold">
                  {formatCount(activity.visibleActions)} actions visibles
                </p>
                <p className="cmm-text-card-copy text-[10px] uppercase tracking-[0.18em]">
                  Données terrain
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
