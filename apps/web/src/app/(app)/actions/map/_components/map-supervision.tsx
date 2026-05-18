import Link from "next/link";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";

export function MapSupervision() {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-cyan-200/80 bg-cyan-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  return (
    <div className={cn(surfaceCard, "p-10 space-y-8 group hover:border-cyan-300 transition-colors border-cyan-200/80")}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-cyan-700">
          <Target size={16} />
          <h3 className="cmm-text-caption font-semibold tracking-[0.12em] leading-none">
            Simulation Terrain
          </h3>
        </div>
        <p className="text-sm text-slate-700 leading-relaxed font-medium">
          Utilisez la sandbox pour manipuler des données géographiques simulées sans affecter le cockpit de production.
        </p>
      </div>
      <Link
        href="/sections/sandbox"
        className="flex w-full items-center justify-center rounded-[1.5rem] border border-cyan-200/80 bg-cyan-100 py-5 cmm-text-caption font-semibold tracking-[0.12em] text-slate-950 transition-all hover:bg-cyan-200 hover:-translate-y-1 active:scale-95 group-hover:text-slate-950"
      >
        Initialiser Sandbox
      </Link>
    </div>
  );
}
