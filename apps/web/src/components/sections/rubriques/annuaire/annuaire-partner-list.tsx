import { AnnuaireActorCard } from "./annuaire-actor-card";
import { CmmButton } from "@/components/ui/cmm-button";
import type { CanonicalPublicEntityRef } from "@/lib/partners/public-entity-projection";
import type { CatalogRow } from "./annuaire-catalog.model";
import { cn } from "@/lib/utils";

interface AnnuairePartnerListProps {
  fr:boolean; rows:CatalogRow[]; currentPage:number; totalPages:number;
  onPageChange:(page:number)=>void; onFocusMap:(id:string)=>void;
  onOpenProfile:(ref:CanonicalPublicEntityRef)=>void; onOpenInstitution:(id:string)=>void;
  layout:"grid"|"list";
}
/** Pagination partagée par la liste en grille et par les résultats compacts de la carte. */
export function AnnuairePagination({
  fr,
  currentPage,
  totalPages,
  onPageChange,
}: Pick<AnnuairePartnerListProps, "fr" | "currentPage" | "totalPages" | "onPageChange">) {
  if (totalPages <= 1) return null;
  return (
    <nav
      aria-label={fr ? "Pagination des résultats" : "Results pagination"}
      className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2 border-t border-[var(--cmm-surface-border)] pt-4"
    >
      <CmmButton
        type="button"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        tone="tertiary"
        variant="pill"
      >
        {fr ? "Précédent" : "Previous"}
      </CmmButton>
      <div className="flex min-w-0 max-w-full flex-wrap items-center justify-center gap-2">
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <CmmButton
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            tone={currentPage === page ? "primary" : "tertiary"}
            variant="pill"
            ariaLabel={fr ? `Page ${page}` : `Page ${page}`}
            className={cn("h-10 w-10 rounded-xl")}
          >
            <span aria-current={currentPage === page ? "page" : undefined}>{page}</span>
          </CmmButton>
        ))}
      </div>
      <CmmButton
        type="button"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        tone="tertiary"
        variant="pill"
      >
        {fr ? "Suivant" : "Next"}
      </CmmButton>
    </nav>
  );
}

export function AnnuairePartnerList({fr,rows,currentPage,totalPages,onPageChange,onFocusMap,onOpenProfile,onOpenInstitution,layout}:AnnuairePartnerListProps) {
  return <div className="space-y-4">
    <ul className={cn("grid min-w-0 list-none gap-3 p-0",layout==="grid"?"grid-cols-1 sm:grid-cols-2 xl:grid-cols-3":"grid-cols-1")}>
      {rows.map(row=><li key={row.key} data-catalog-key={row.key} className="min-w-0"><AnnuaireActorCard row={row} fr={fr} compact={layout==="list"} onOpen={()=>onOpenProfile(row.ref)} onMap={onFocusMap} onInstitution={onOpenInstitution}/></li>)}
    </ul>
    <AnnuairePagination fr={fr} currentPage={currentPage} totalPages={totalPages} onPageChange={onPageChange}/>
  </div>;
}
