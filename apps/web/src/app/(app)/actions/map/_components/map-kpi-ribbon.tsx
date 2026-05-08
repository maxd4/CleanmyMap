import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";

type MapKpiRibbonProps = {
  stats: {
    actions: number;
    wasteKg: number;
    butts: number;
    volunteers: number;
  };
};

export function MapKpiRibbon({ stats }: MapKpiRibbonProps) {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-white/5 bg-white/5 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow
  );

  return (
    <section className="grid grid-cols-2 md:grid-cols-4 gap-6">
      {[
        { label: "Points Terrain", val: stats.actions, color: "text-sky-400" },
        { label: "Volume Extrait", val: `${stats.wasteKg.toFixed(1)}kg`, color: "text-emerald-400" },
        { label: "Mégots Filtrés", val: Math.round(stats.butts), color: "text-amber-400" },
        { label: "Mobilisation", val: stats.volunteers, color: "text-sky-400" },
      ].map((stat, i) => (
        <div key={i} className={cn(surfaceCard, "p-10 flex flex-col justify-between aspect-[1.4/1]")}>
          <p className="text-[10px] font-black uppercase tracking-widest text-white/20">{stat.label}</p>
          <p className={cn("text-5xl font-black tracking-tighter", stat.color)}>{stat.val}</p>
        </div>
      ))}
    </section>
  );
}
