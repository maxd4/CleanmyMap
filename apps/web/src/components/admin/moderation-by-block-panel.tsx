"use client";

import { AdminPillLink, AdminSectionHeader } from "@/components/admin/admin-dashboard-ui";
import { cn } from "@/lib/utils";

export type ModerationBlockSummary = {
  id: "accueil-pilotage" | "agir" | "cartographie-impact" | "reseau-discussions";
  number: number;
  label: string;
  count: number | null;
  availability: "available" | "partial" | "unavailable";
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

function formatBlockCount(
  count: number | null,
  availability: ModerationBlockSummary["availability"],
): string {
  if (count !== null) return `${count} à gérer`;
  return availability === "partial" ? "Partiel" : "Indisponible";
}

const MODERATION_FILE_ORDER: ModerationBlockSummary["id"][] = [
  "agir",
  "cartographie-impact",
  "reseau-discussions",
  "accueil-pilotage",
];

export function ModerationByBlockPanel({
  blocks,
}: {
  blocks: ModerationBlockSummary[];
}) {
  const orderedBlocks = MODERATION_FILE_ORDER.flatMap((id) => {
    const block = blocks.find((candidate) => candidate.id === id);
    return block ? [block] : [];
  });

  return (
    <section className="rounded-[1.75rem] border border-stone-200/80 bg-white/78 p-5 shadow-[0_16px_40px_-32px_rgba(69,45,28,0.24)] backdrop-blur-sm">
      <AdminSectionHeader
        eyebrow="Files de modération"
        title="Files opérationnelles"
        description="Les quatre files prioritaires restent visibles au même endroit, avec leur état réel et leur action dédiée."
      />

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {orderedBlocks.map((block) => (
          <article
            key={block.id}
            className={cn(
              "flex min-h-full flex-col rounded-2xl border p-4 transition-shadow hover:shadow-[0_16px_32px_-28px_rgba(69,45,28,0.22)]",
              ACCENT_CLASSES[block.accent],
            )}
          >
            <div className="flex items-start justify-between gap-4">
              <h3 className="text-lg font-black tracking-tight text-stone-950">
                {block.label}
              </h3>
              <span className="inline-flex shrink-0 rounded-full border border-stone-300/70 bg-white px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-stone-700">
                {formatBlockCount(block.count, block.availability)}
              </span>
            </div>

            <p className="mt-3 text-sm leading-6 text-stone-700">
              {block.description}
            </p>

            {block.details.length > 0 ? (
              <ul className="mt-3 space-y-2 text-sm text-stone-700">
                {block.details.map((detail) => (
                  <li
                    key={`${block.id}-${detail}`}
                    className="rounded-xl border border-white/70 bg-white/80 px-3 py-2"
                  >
                    {detail}
                  </li>
                ))}
              </ul>
            ) : null}

            {block.samples.length > 0 ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {block.samples.slice(0, 2).map((sample) => (
                  <div
                    key={`${block.id}-${sample.label}-${sample.meta}`}
                    className="rounded-xl border border-white/70 bg-white/85 px-3 py-2"
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

            <div className="mt-auto flex flex-wrap gap-2 pt-4">
              <AdminPillLink href={block.href}>{block.ctaLabel}</AdminPillLink>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
