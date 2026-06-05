"use client";

import { cn } from "@/lib/utils";
import {
  PilotageClusterLinks,
  type PilotageClusterLink,
} from "@/components/pilotage/pilotage-cluster-panels";

type DecisionReadingSectionProps = {
  eyebrow: string;
  title: string;
  description: string;
  links: PilotageClusterLink[];
  activeLinkId?: string;
  className?: string;
  variant?: "pilotage" | "sponsor" | "governance";
};

const SECTION_THEME: Record<
  NonNullable<DecisionReadingSectionProps["variant"]>,
  {
    section: string;
    eyebrow: string;
    title: string;
    description: string;
  }
> = {
  pilotage: {
    section: "border-white/12 bg-white/[0.06]",
    eyebrow: "text-orange-100/70",
    title: "text-white",
    description: "text-white/72",
  },
  sponsor: {
    section: "border-white/5 bg-white/5",
    eyebrow: "text-amber-100/70",
    title: "text-white",
    description: "text-white/72",
  },
  governance: {
    section: "border-white/10 bg-slate-950/35",
    eyebrow: "text-slate-400",
    title: "text-white",
    description: "text-slate-300",
  },
};

export function DecisionReadingSection({
  eyebrow,
  title,
  description,
  links,
  activeLinkId,
  className,
  variant = "pilotage",
}: DecisionReadingSectionProps) {
  const theme = SECTION_THEME[variant];

  return (
    <section
      className={cn(
        "rounded-[3rem] border p-8 backdrop-blur-2xl",
        theme.section,
        className,
      )}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-3">
          <p className={cn("text-[10px] font-black uppercase tracking-[0.3em]", theme.eyebrow)}>
            {eyebrow}
          </p>
          <h3 className={cn("text-2xl font-black tracking-tight", theme.title)}>
            {title}
          </h3>
          <p className={cn("max-w-4xl text-sm leading-relaxed", theme.description)}>
            {description}
          </p>
        </div>
      </div>

      <PilotageClusterLinks
        className="mt-6"
        links={links}
        activeLinkId={activeLinkId}
      />
    </section>
  );
}
