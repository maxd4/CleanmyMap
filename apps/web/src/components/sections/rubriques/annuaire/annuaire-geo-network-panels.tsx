"use client";

import { PARIS_RELATION_TYPE_META } from "@/lib/partners/paris-cleanwalk-network";
import type {
  GeoNetworkEntity,
  GeoNetworkIncidentRelation,
} from "./annuaire-geo-network.model";

export function AnnuaireIncidentRelationsPanel({
  fr,
  selectedEntity,
  incidentRelations,
  onSelectEntity,
}: {
  fr: boolean;
  selectedEntity: GeoNetworkEntity | null;
  incidentRelations: GeoNetworkIncidentRelation[];
  onSelectEntity: (id: string) => void;
}) {
  if (!selectedEntity) return null;

  return (
    <section
      aria-label={fr ? "Relations documentées de l'acteur" : "Documented actor relationships"}
      className="space-y-3 rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold cmm-text-primary">
          {fr
            ? `Relations documentées dans le registre — ${selectedEntity.name}`
            : `Documented relationships in registry — ${selectedEntity.name}`}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-0.5 font-semibold cmm-text-primary">
            {selectedEntity.indicators.documentedNeighborsCount}{" "}
            {fr ? "structures reliées" : "linked structures"}
          </span>
          {selectedEntity.indicators.provenJointOperationsCount !== null ? (
            <span className="rounded-full border border-[var(--cmm-surface-border)] px-2.5 py-0.5 font-semibold cmm-text-secondary">
              {selectedEntity.indicators.provenJointOperationsCount}{" "}
              {fr ? "opérations communes prouvées" : "proven joint operations"}
            </span>
          ) : null}
          {selectedEntity.addressStatus !== "verified" ? (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 font-semibold cmm-text-warning">
              {selectedEntity.addressStatus === "contradictory"
                ? fr
                  ? "Adresses divergentes"
                  : "Conflicting addresses"
                : selectedEntity.addressStatus === "not_applicable"
                  ? fr
                    ? "Sans lieu physique propre"
                    : "No dedicated physical site"
                  : fr
                    ? "Adresse non établie"
                    : "Address not established"}
            </span>
          ) : null}
        </div>
      </div>
      {selectedEntity.publicAddressLabel ? <p className="text-xs cmm-text-primary">{fr ? "Adresse" : "Address"} : {selectedEntity.publicAddressSource ? <a href={selectedEntity.publicAddressSource} target="_blank" rel="noopener noreferrer" className="underline">{selectedEntity.publicAddressLabel}</a> : selectedEntity.publicAddressLabel}{!selectedEntity.coords ? " · " + (fr ? "Géocodage non établi" : "Geocode not established") : ""}</p> : null}
      {incidentRelations.length === 0 ? (
        <p className="text-xs cmm-text-secondary">
          {fr
            ? "Aucune relation documentée pour cette sélection dans le filtre actif."
            : "No documented relationship for this selection in the active filter."}
        </p>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {incidentRelations.map(({ relation, fromEntity, toEntity, hasPlottableLine, direction }) => {
            const peer = direction === "outgoing" ? toEntity : fromEntity;
            const meta = PARIS_RELATION_TYPE_META[relation.relationType];
            return (
              <li
                key={relation.id}
                className="rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectEntity(peer.id)}
                    className="font-semibold cmm-text-primary underline underline-offset-2 hover:text-violet-400"
                  >
                    {fromEntity.name} → {toEntity.name}
                  </button>
                  <span className="rounded-full border border-[var(--cmm-surface-border)] px-2 py-0.5 font-semibold cmm-text-secondary">
                    {meta.label}
                  </span>
                </div>
                <p className="mt-1 cmm-text-primary">{relation.summary}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 cmm-text-secondary">
                  <span>
                    {relation.relationType === "collaboration_programmee"
                      ? fr
                        ? "Collaboration programmée"
                        : "Scheduled collaboration"
                      : relation.source.certainty === "partiel_ou_incertain"
                        ? fr
                          ? "Partielle ou incertaine"
                          : "Partial or uncertain"
                        : fr
                          ? "Vérifiée"
                          : "Verified"}
                  </span>
                  <span>·</span>
                  <span>
                    {relation.frequencyKnown
                      ? fr
                        ? "Fréquence connue"
                        : "Frequency documented"
                      : fr
                        ? "Fréquence inconnue"
                        : "Frequency unknown"}
                  </span>
                  {!hasPlottableLine ? (
                    <>
                      <span>·</span>
                      <span>{fr ? "Lien sans tracé (position manquante)" : "Unplotted link (missing coordinates)"}</span>
                    </>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function AnnuaireOutsideAndUnknownPanels({
  fr,
  entities,
  selectedId,
  onSelectEntity,
}: {
  fr: boolean;
  entities: GeoNetworkEntity[];
  selectedId: string | null;
  onSelectEntity: (id: string) => void;
}) {
  const outsideParis = entities.filter((e) => e.locationGroup === "outside_paris");
  const unknownLocation = entities.filter((e) => e.locationGroup === "unknown_location");

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <section
        aria-label={fr ? "Hors de Paris" : "Outside Paris"}
        className="space-y-3 rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold cmm-text-primary">
            {fr ? "Hors de Paris" : "Outside Paris"}
          </h3>
          <span className="rounded-full border border-sky-500/20 bg-sky-500/10 px-2.5 py-0.5 text-xs font-semibold cmm-text-info">
            {outsideParis.length}
          </span>
        </div>
        {outsideParis.length === 0 ? (
          <p className="text-xs cmm-text-secondary">
            {fr ? "Aucun acteur hors de Paris dans ce filtre." : "No outside-Paris actor in this filter."}
          </p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0">
            {outsideParis.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className="w-full rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] px-3 py-2 text-left text-xs hover:border-violet-500/50"
                >
                  <span className="block font-semibold cmm-text-primary">{entity.name}</span>
                  <span className="block cmm-text-secondary">
                    {entity.communeLabel}
                    {entity.siteNature ? ` · ${entity.siteNature}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        aria-label={fr ? "Localisation non établie" : "Location not established"}
        className="space-y-3 rounded-2xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background-muted)] p-4"
      >
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold cmm-text-primary">
            {fr ? "Localisation non établie" : "Location not established"}
          </h3>
          <span className="rounded-full border border-[var(--cmm-surface-border)] px-2.5 py-0.5 text-xs font-semibold cmm-text-secondary">
            {unknownLocation.length}
          </span>
        </div>
        {unknownLocation.length === 0 ? (
          <p className="text-xs cmm-text-secondary">
            {fr ? "Toutes les structures filtrées ont une implantation." : "All filtered structures have a location."}
          </p>
        ) : (
          <ul className="m-0 max-h-56 list-none space-y-2 overflow-y-auto p-0">
            {unknownLocation.map((entity) => (
              <li key={entity.id}>
                <button
                  type="button"
                  aria-pressed={selectedId === entity.id}
                  onClick={() => onSelectEntity(entity.id)}
                  className="w-full rounded-xl border border-[var(--cmm-surface-border)] bg-[var(--cmm-surface-background)] px-3 py-2 text-left text-xs hover:border-violet-500/50"
                >
                  <span className="block font-semibold cmm-text-primary">{entity.name}</span>
                  <span className="block cmm-text-secondary">{entity.publicAddressLabel ?? entity.communeLabel}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
