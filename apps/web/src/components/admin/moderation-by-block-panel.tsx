"use client";

import { ChevronDown } from "lucide-react";
import { AdminPillLink, AdminSectionHeader } from "@/components/admin/admin-dashboard-ui";
import { cn } from "@/lib/utils";

export type ModerationBlockSummary = {
  id: "accueil-pilotage" | "agir" | "cartographie-impact" | "reseau-discussions" | "apprendre";
  number: number;
  label: string;
  count: number;
  description: string;
  href: string;
  ctaLabel: string;
  accent: "emerald" | "sky" | "indigo" | "amber" | "rose" | "stone";
  details: string[];
  samples: Array<{
    label: string;
    meta: string;
  }>;
};

const ACCENT_CLASSES: Record<ModerationBlockSummary["accent"], string> = {
  emerald: "border-emerald-200/70 bg-emerald-50/55",
  sky: "border-sky-200/70 bg-sky-50/55",
  indigo: "border-indigo-200/70 bg-indigo-50/55",
  amber: "border-amber-200/70 bg-amber-50/55",
  rose: "border-rose-200/70 bg-rose-50/55",
  stone: "border-stone-200/70 bg-stone-50/55",
};

function formatBlockNumber(number: number): string {
  return String(number).padStart(2, "0");
}

export function ModerationByBlockPanel({
  blocks,
}: {
  blocks: ModerationBlockSummary[];
}) {
  const orderedBlocks = [...blocks].sort((left, right) => right.number - left.number);

  return (
    <section className="rounded-[2rem] border border-stone-200/80 bg-white/78 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.24)] backdrop-blur-sm">
      <AdminSectionHeader
        eyebrow="Modération par bloc"
        title="Files centralisées"
        description="Les blocs sont rangés du numéro le plus élevé au plus bas. Ouvre un bloc pour voir ce qu’il reste à gérer."
      />

      <div className="mt-4 space-y-3">
        {orderedBlocks.map((block, index) => (
          <details
            key={block.id}
            className={cn(
              "group rounded-[1.5rem] border p-4 transition-shadow hover:shadow-[0_16px_32px_-28px_rgba(69,45,28,0.22)]",
              ACCENT_CLASSES[block.accent],
            )}
            open={index === 0}
          >
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4">
              <div className="space-y-1">
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-stone-700/70">
                  Bloc {formatBlockNumber(block.number)}
                </p>
                <h3 className="flex flex-wrap items-center gap-2 text-lg font-black tracking-tight text-stone-950">
                  {block.label}
                  <span className="inline-flex rounded-full border border-stone-300/70 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-700">
                    {block.count} à gérer
                  </span>
                </h3>
              </div>

              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/80 text-stone-700 transition group-open:rotate-180">
                <ChevronDown size={16} />
              </span>
            </summary>

            <div className="mt-4 space-y-4 border-t border-white/70 pt-4">
              <p className="max-w-3xl text-sm leading-6 text-stone-700">
                {block.description}
              </p>

              {block.details.length > 0 ? (
                <ul className="space-y-2 text-sm text-stone-700">
                  {block.details.map((detail) => (
                    <li
                      key={`${block.id}-${detail}`}
                      className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2"
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              ) : null}

              {block.samples.length > 0 ? (
                <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {block.samples.map((sample) => (
                    <div
                      key={`${block.id}-${sample.label}-${sample.meta}`}
                      className="rounded-2xl border border-white/70 bg-white/85 px-3 py-2"
                    >
                      <p className="text-sm font-semibold text-stone-950">
                        {sample.label}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        {sample.meta}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <AdminPillLink href={block.href}>{block.ctaLabel}</AdminPillLink>
              </div>
            </div>
          </details>
        ))}
      </div>
    </section>
  );
}
