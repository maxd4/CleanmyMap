import { ShieldCheck, Sparkles } from "lucide-react";
import type { GamificationSummary } from "@/lib/gamification/gamification-summary";

function formatXp(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
}

export function TerrainSpecializationsPanel({
  specializations,
  locale,
}: {
  specializations: NonNullable<GamificationSummary["terrainSpecializations"]>;
  locale: string;
}) {
  const fr = locale === "fr";
  return (
    <section id="gamification-terrain-specializations" className="scroll-mt-6 rounded-[1.5rem] border border-[#ead8d2] bg-[#fffdfc] p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f5e7e2] text-[#b4362e]">
          <ShieldCheck size={18} aria-hidden="true" />
        </div>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-black text-[#2c1a17]"><Sparkles size={17} className="text-[#c51f1f]" aria-hidden="true" /> {fr ? "Spécialisations terrain" : "Field specializations"}</h2>
          <p className="mt-1 text-xs leading-5 text-[#806b65]">
            {fr
              ? "Seules les missions attestées après une participation finale confirmée font progresser ces sous-progressions. Un badge ne donne aucune permission."
              : "Only missions attested after confirmed final participation advance these sub-progressions. A badge grants no permission."}
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {specializations.map((specialization) => (
          <article key={specialization.id} className={`rounded-2xl border p-4 ${specialization.started ? "border-[#f1c18c] bg-[#fffaf3]" : "border-[#eadfd9] bg-white"}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-[#2c1a17]">{specialization.label}</h3>
                <p className="mt-1 text-xs leading-5 text-[#806b65]">{specialization.description}</p>
              </div>
              <span className="shrink-0 rounded-full border border-[#ead8d2] bg-white px-2 py-1 text-xs font-black text-[#806b65]">
                {specialization.started ? (fr ? "En cours" : "Started") : (fr ? "À commencer" : "Not started")}
              </span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
              <div><dt className="font-black uppercase tracking-[0.12em] text-[#a48d86]">{fr ? "Palier" : "Tier"}</dt><dd className="mt-1 font-black text-[#c51f1f]">{specialization.currentTier || "—"}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.12em] text-[#a48d86]">{fr ? "Actions vérifiées" : "Verified actions"}</dt><dd className="mt-1 font-black text-[#2c1a17]">{specialization.verifiedActionCount}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.12em] text-[#a48d86]">{fr ? "Prochain seuil" : "Next threshold"}</dt><dd className="mt-1 font-black text-[#2c1a17]">{specialization.nextThreshold}</dd></div>
              <div><dt className="font-black uppercase tracking-[0.12em] text-[#a48d86]">{fr ? "Effort restant" : "Remaining effort"}</dt><dd className="mt-1 font-black text-[#2c1a17]">{specialization.actionsRemaining}</dd></div>
            </dl>
            <p className="mt-3 border-t border-[#f1dfd8] pt-3 text-xs font-semibold text-[#806b65]">
              {fr ? "XP réellement obtenue : " : "XP actually obtained: "}<span className="font-black text-[#b4362e]">{formatXp(specialization.xpObtained)} XP</span>
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
