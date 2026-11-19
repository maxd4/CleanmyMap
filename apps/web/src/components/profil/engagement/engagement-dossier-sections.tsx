"use client";

import type { EngagementProofParticipationItem } from "@/lib/actions/engagement-proof-projection.types";
import { CmmButton } from "@/components/ui/cmm-button";

export type EngagementDossierFormState = {
  holderName: string;
  motivations: string;
  perceivedSkills: string;
  observations: string;
  attestationReferences: string;
  publicLinks: string;
  otherDocuments: string;
};

export function EngagementSelectionSummary({
  selectedItems,
}: {
  selectedItems: readonly EngagementProofParticipationItem[];
}) {
  const attestedMissionCount = selectedItems.reduce(
    (sum, item) => sum + item.attestedMissions.length,
    0,
  );
  const organizationCount = new Set(
    selectedItems
      .map((item) => item.organization.value?.organizationKey ?? null)
      .filter((key): key is string => key !== null),
  ).size;

  return (
    <section
      aria-label="Synthèse de la sélection"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Actions confirmées
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
          {selectedItems.length}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Missions attestées
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
          {attestedMissionCount}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Structures identifiées
        </p>
        <p className="mt-1 text-2xl font-black text-slate-950 dark:text-white">
          {organizationCount}
        </p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/80">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Heures vérifiées
        </p>
        <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-300">
          Non documentées
        </p>
      </div>
    </section>
  );
}

export function EngagementParticipationSelector({
  items,
  selectedIds,
  onToggle,
  onSelectAll,
  onClearAll,
}: {
  items: readonly EngagementProofParticipationItem[];
  selectedIds: ReadonlySet<string>;
  onToggle: (actionId: string) => void;
  onSelectAll: () => void;
  onClearAll: () => void;
}) {
  return (
    <section
      aria-labelledby="engagement-participations-heading"
      className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2
            id="engagement-participations-heading"
            className="text-lg font-black tracking-tight text-slate-950 dark:text-white"
          >
            Participations documentées ({items.length})
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Seules les présences finales confirmées sur actions communicables apparaissent ici.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <CmmButton type="button" tone="secondary" size="sm" onClick={onSelectAll}>
            Tout sélectionner
          </CmmButton>
          <CmmButton type="button" tone="tertiary" size="sm" onClick={onClearAll}>
            Tout désélectionner
          </CmmButton>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
          Aucune participation confirmée ne correspond à la période sélectionnée.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const checked = selectedIds.has(item.actionId);
            const checkboxId = `engagement-action-${item.actionId}`;
            return (
              <li
                key={item.actionId}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition-colors dark:border-slate-800 dark:bg-slate-950/60"
              >
                <label
                  htmlFor={checkboxId}
                  className="flex cursor-pointer items-start gap-3"
                >
                  <input
                    id={checkboxId}
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.actionId)}
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-red-600 focus:ring-2 focus:ring-red-500"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-bold text-slate-950 dark:text-white">
                        {item.actionTitle || item.locationLabel}
                      </span>
                      <time
                        dateTime={item.actionDate}
                        className="text-xs font-semibold text-slate-500 dark:text-slate-400"
                      >
                        {item.actionDate.slice(0, 10)}
                      </time>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Lieu : {item.locationLabel} • Structure :{" "}
                      {item.organization.value
                        ? `${item.organization.value.name} (${item.organization.value.organizerTypeLabel})`
                        : "non documentée"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200">
                        Présence confirmée
                      </span>
                      {item.attestedMissions.length > 0 ? (
                        item.attestedMissions.map((mission) => (
                          <span
                            key={mission.missionId}
                            className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 font-semibold text-sky-800 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-200"
                          >
                            Mission attestée : {mission.roleLabel}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          Aucune mission attestée
                        </span>
                      )}
                      <span className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 font-medium text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                        Réf. {item.communicableReference.referenceCode}
                      </span>
                    </div>
                  </div>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export function EngagementPersonalFieldsForm({
  form,
  onChange,
}: {
  form: EngagementDossierFormState;
  onChange: (patch: Partial<EngagementDossierFormState>) => void;
}) {
  return (
    <section
      aria-labelledby="engagement-personal-fields-heading"
      className="space-y-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="space-y-1">
        <h2
          id="engagement-personal-fields-heading"
          className="text-lg font-black tracking-tight text-slate-950 dark:text-white"
        >
          Informations facultatives du dossier
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Ces champs libres ne sont ni vérifiés ni enregistrés sur les serveurs CleanMyMap : ils
          figurent uniquement dans le fichier Markdown téléchargé comme déclaration du titulaire.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div>
          <label
            htmlFor="dossier-holder-name"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Nom figurant sur le dossier (facultatif)
          </label>
          <input
            id="dossier-holder-name"
            type="text"
            maxLength={120}
            value={form.holderName}
            onChange={(event) => onChange({ holderName: event.target.value })}
            placeholder="Ex. Camille Martin"
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="dossier-motivations"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Motivations ou expériences vécues (facultatif)
          </label>
          <textarea
            id="dossier-motivations"
            rows={3}
            maxLength={2000}
            value={form.motivations}
            onChange={(event) => onChange({ motivations: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="dossier-skills"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Savoir-faire perçus ou développés (facultatif)
          </label>
          <textarea
            id="dossier-skills"
            rows={2}
            maxLength={2000}
            value={form.perceivedSkills}
            onChange={(event) => onChange({ perceivedSkills: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div>
          <label
            htmlFor="dossier-observations"
            className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
          >
            Autres observations personnelles (facultatif)
          </label>
          <textarea
            id="dossier-observations"
            rows={2}
            maxLength={2000}
            value={form.observations}
            onChange={(event) => onChange({ observations: event.target.value })}
            className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label
              htmlFor="dossier-attestations"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Attestation(s) signée(s) (références)
            </label>
            <input
              id="dossier-attestations"
              type="text"
              maxLength={1000}
              value={form.attestationReferences}
              onChange={(event) => onChange({ attestationReferences: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="dossier-links"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Justificatifs / liens publics
            </label>
            <input
              id="dossier-links"
              type="text"
              maxLength={1000}
              value={form.publicLinks}
              onChange={(event) => onChange({ publicLinks: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
          <div>
            <label
              htmlFor="dossier-other-docs"
              className="block text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300"
            >
              Autres documents
            </label>
            <input
              id="dossier-other-docs"
              type="text"
              maxLength={1000}
              value={form.otherDocuments}
              onChange={(event) => onChange({ otherDocuments: event.target.value })}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
