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
                    <p className="truncate text-sm font-bold text-white">
                      {item.actor}
                    </p>
                    <p className="flex-shrink-0 text-[11px] uppercase tracking-[0.18em] text-white">
                      {item.timeLabel}
                    </p>
                  </div>
                  <p className="truncate text-sm text-white">
                    {item.action}{" "}
                    <span className="font-semibold text-white">
                      @{item.location}
                    </span>
                  </p>
                </div>
              </div>
            ))}


          </div>
        </div>
      </div>
    </section>
  );
}
