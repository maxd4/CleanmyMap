import Link from "next/link";
import { Target } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";

export function MapSupervision() {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  return (
    <div className={cn(surfaceCard, "p-10 space-y-8 group hover:border-sky-400/20 transition-colors border-white/5")}>
      <div className="space-y-3">
        <div className="flex items-center gap-3 text-sky-400">
          <Target size={16} />
          <h3 className="text-xs font-black uppercase tracking-widest leading-none">
            Simulation Terrain
          </h3>
        </div>
        <p className="text-sm text-white/30 leading-relaxed font-medium">
          Utilisez la sandbox pour manipuler des données géographiques simulées sans affecter le cockpit de production.
        </p>
      </div>
      <Link
        href="/sections/sandbox"
        className="flex w-full items-center justify-center rounded-[1.5rem] border border-white/5 bg-white/5 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-white/60 transition-all hover:bg-white/10 hover:-translate-y-1 active:scale-95 group-hover:text-white"
      >
        Initialiser Sandbox
      </Link>
    </div>
  );
}
