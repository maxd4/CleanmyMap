import { ArrowRight, MapPin } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  getEntryTrustState,
  isEditorialAnnuaireEntry,
} from "@/components/sections/rubriques/annuaire/annuaire-helpers";
import type { AnnuaireEntry } from "@/lib/partners/annuaire-types";
import { cn } from "@/lib/utils";
import {
  formatCount,
  getDomainLabel,
  getInitials,
  getKindLabel,
  getKindTone,
  getTerritoryLabel,
  getTrustLabel,
  getTrustTone,
} from "./partners-network-section.model";

type PartnersNetworkResultsProps = {
  filteredEntries: AnnuaireEntry[];
  visibleEntries: AnnuaireEntry[];
  fr: boolean;
  onReset: () => void;
};

export function PartnersNetworkResults({
  filteredEntries,
  visibleEntries,
  fr,
  onReset,
}: PartnersNetworkResultsProps) {
  return (
    <>
      <div className="space-y-1 rounded-2xl border border-pink-100 bg-pink-50/60 px-4 py-3">
        <p className="text-sm font-semibold text-slate-700">
          {fr
            ? `${formatCount(filteredEntries.length)} fiches correspondent aux filtres`
            : `${formatCount(filteredEntries.length)} records match the filters`}
        </p>
        <p className="text-sm leading-relaxed text-slate-800">
          {fr
            ? "Source : registre éditorial de cet onglet. Il ne constitue pas une liste exhaustive et n'indique pas une activité récente."
            : "Source: this tab's editorial register. It is not exhaustive and does not indicate recent activity."}
        </p>
        {filteredEntries.length > visibleEntries.length ? (
          <p className="text-sm text-slate-600">
            {fr
              ? `${formatCount(visibleEntries.length)} premières fiches affichées ici.`
              : `First ${formatCount(visibleEntries.length)} records are shown here.`}
          </p>
        ) : null}
      </div>

      {visibleEntries.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {visibleEntries.map((entry) => {
            const trustState = getEntryTrustState(entry);
            const kindLabel = getKindLabel(entry, fr);
            const trustLabel = getTrustLabel(trustState, fr);
            const trustTone = getTrustTone(trustState);
            const kindTone = getKindTone(entry);

            return (
              <article key={entry.id} className="rounded-2xl border border-pink-100 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border text-sm font-black",
                      kindTone,
                    )}
                  >
                    {getInitials(entry.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 cmm-text-caption font-semibold",
                          kindTone,
                        )}
                      >
                        {kindLabel}
                      </span>
                      <span
                        className={cn(
                          "inline-flex rounded-full border px-2.5 py-1 cmm-text-caption font-semibold",
                          trustTone,
                        )}
                      >
                        {trustLabel}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-black leading-tight text-slate-950">{entry.name}</h3>
                    <p className="mt-1 cmm-text-small font-medium text-slate-500">
                      {getDomainLabel(entry, fr ? "fr" : "en")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 space-y-3">
                  <p className="text-base leading-[1.6] text-slate-800">{entry.description}</p>
                  <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                    <MapPin size={14} className="text-pink-600" />
                    <span>{getTerritoryLabel(entry)}</span>
                  </div>
                  {!isEditorialAnnuaireEntry(entry) && entry.availability ? (
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/60 px-3 py-2 cmm-text-small font-medium text-slate-600">
                      {entry.availability}
                    </div>
                  ) : null}
                </div>

                <div className="mt-4">
                  <CmmButton
                    href="/sections/annuaire"
                    tone="secondary"
                    variant="pill"
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl border border-pink-200 bg-pink-50 px-4 cmm-text-small font-semibold text-pink-800 shadow-none"
                  >
                    {fr ? "Voir le profil" : "View profile"}
                    <ArrowRight size={16} />
                  </CmmButton>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-pink-200 bg-pink-50/40 px-5 py-10 text-center">
          <p className="text-lg font-black text-slate-950">
            {fr ? "Aucun partenaire ne correspond aux filtres." : "No partner matches the filters."}
          </p>
          <p className="mt-2 cmm-text-small leading-relaxed text-slate-600">
            {fr
              ? "Réinitialisez la recherche pour retrouver le réseau complet."
              : "Reset the filters to see the full network again."}
          </p>
          <div className="mt-5 flex justify-center">
            <CmmButton
              type="button"
              tone="secondary"
              variant="pill"
              onClick={onReset}
              className="h-11 rounded-2xl border border-pink-200 bg-white px-5 cmm-text-small font-semibold text-pink-800"
            >
              {fr ? "Réinitialiser" : "Reset filters"}
            </CmmButton>
          </div>
        </div>
      )}

      <div className="flex justify-center pt-2">
        <CmmButton
          href="/sections/annuaire"
          tone="secondary"
          variant="pill"
          className="h-12 rounded-full border border-pink-200 bg-white px-8 cmm-text-small font-semibold text-pink-800"
        >
          {fr ? "Voir tous les partenaires" : "See all partners"}
          <ArrowRight size={16} />
        </CmmButton>
      </div>
    </>
  );
}
