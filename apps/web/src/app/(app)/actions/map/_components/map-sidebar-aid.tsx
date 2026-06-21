import { BookOpen, ChevronDown, Compass, ExternalLink, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";
import { CmmButton } from "@/components/ui/cmm-button";

export function MapSidebarAid() {
  const classes = getBlockClasses("visualize");
  const surfaceCard = cn(
    "rounded-[3rem] border border-sky-200/80 bg-sky-50/90 backdrop-blur-3xl transition-all duration-700 relative overflow-hidden",
    classes.shadow,
  );

  return (
    <section className={cn(surfaceCard, "space-y-4 p-5 sm:space-y-5 sm:p-7")}>
      <div className="space-y-1.5">
        <p className="flex items-center gap-3 cmm-text-caption font-semibold tracking-[0.14em] text-slate-950">
          <span className="h-4 w-4 rounded-full bg-sky-500 shadow-[0_0_18px_rgba(56,189,248,0.45)]" />
          Aide secondaire
        </p>
        <p className="text-sm font-medium leading-relaxed text-slate-600">
          Accès court. Deux repères. Peu de lecture.
        </p>
      </div>

      <div className="space-y-3">
        <details className="group rounded-[1.75rem] border border-sky-200/80 bg-white/75 p-3 sm:p-4" open>
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950">
            <span className="inline-flex items-center gap-2">
              <BookOpen size={15} className="text-sky-700" />
              Lecture rapide
            </span>
            <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Lis la couleur, le compteur et la ligne active.
          </p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-slate-700">
            <li className="flex items-start gap-2">
              <Compass size={14} className="mt-0.5 shrink-0 text-sky-700" />
              <span>Couleur = niveau pollution. Bleu, vert, jaune, violet.</span>
            </li>
            <li className="flex items-start gap-2">
              <Compass size={14} className="mt-0.5 shrink-0 text-sky-700" />
              <span>Compteur = volume visible. Réinitialise si la vue est trop étroite.</span>
            </li>
            <li className="flex items-start gap-2">
              <Compass size={14} className="mt-0.5 shrink-0 text-sky-700" />
              <span>Clic carte ou journal = détail ouvert. Sélection active visible.</span>
            </li>
          </ul>
        </details>

        <details className="group rounded-[1.75rem] border border-sky-200/80 bg-white/75 p-3 sm:p-4">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold text-slate-950">
            <span className="inline-flex items-center gap-2">
              <GraduationCap size={15} className="text-sky-700" />
              Méthodologie
            </span>
            <ChevronDown size={16} className="text-slate-500 transition-transform group-open:rotate-180" />
          </summary>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            Formules, sources et marges d&apos;erreur. À ouvrir seulement si besoin.
          </p>
          <div className="mt-4">
            <CmmButton
              href="/methodologie"
              tone="secondary"
              variant="pill"
              className="w-full justify-center px-5 py-3 text-[10px] font-black uppercase tracking-[0.18em] gap-2"
            >
              Ouvrir la méthodologie
              <ExternalLink size={14} />
            </CmmButton>
          </div>
        </details>

      </div>
    </section>
  );
}
