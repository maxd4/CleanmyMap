"use client";

import { FileDown } from "lucide-react";
import type { EngagementProofParticipationItem } from "@/lib/actions/engagement-proof-projection.types";
import { CmmButton } from "@/components/ui/cmm-button";

export const ATTESTATION_PDF_PUBLIC_PATH =
  "/documents/modele-attestation-benevolat-v2.pdf" as const;

type GroupedOrganization = {
  key: string;
  name: string;
  organizerTypeLabel: string;
  items: EngagementProofParticipationItem[];
};

function groupByCommunicableOrganization(
  items: readonly EngagementProofParticipationItem[],
): {
  documented: GroupedOrganization[];
  undocumented: EngagementProofParticipationItem[];
} {
  const documentedMap = new Map<string, GroupedOrganization>();
  const undocumented: EngagementProofParticipationItem[] = [];

  for (const item of items) {
    const org = item.organization.value;
    if (!org) {
      undocumented.push(item);
      continue;
    }
    const existing = documentedMap.get(org.organizationKey);
    if (existing) {
      existing.items.push(item);
    } else {
      documentedMap.set(org.organizationKey, {
        key: org.organizationKey,
        name: org.name,
        organizerTypeLabel: org.organizerTypeLabel,
        items: [item],
      });
    }
  }

  return {
    documented: [...documentedMap.values()],
    undocumented,
  };
}

export function EngagementAttestationPdfSection({
  selectedItems,
}: {
  selectedItems: readonly EngagementProofParticipationItem[];
}) {
  const { documented, undocumented } = groupByCommunicableOrganization(selectedItems);

  return (
    <section
      aria-labelledby="engagement-attestation-pdf-heading"
      className="space-y-5 cmm-card rounded-xl border p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl space-y-1.5">
          <h2
            id="engagement-attestation-pdf-heading"
            className="text-lg font-black tracking-tight cmm-text-primary"
          >
            Attestation associative vierge (PDF à faire signer)
          </h2>
          <p className="text-sm cmm-text-secondary">
            Ce modèle vierge CleanMyMap (formulaire A4 remplissable à 27 champs) doit
            être vérifié, complété et signé séparément par chaque structure organisatrice.
            CleanMyMap n’émet aucune signature électronique ni validation à la place de l’organisme.
          </p>
        </div>

        <CmmButton
          asChild
          tone="secondary"
          size="md"
        >
          <a
            href={ATTESTATION_PDF_PUBLIC_PATH}
            download="modele_attestation_benevolat_v2.pdf"
          >
            <FileDown size={16} />
            Télécharger le modèle PDF vierge
          </a>
        </CmmButton>
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="font-bold uppercase tracking-wider">Consignes d’utilisation</p>
        <ul className="mt-1.5 list-disc space-y-1 pl-4">
          <li>Compléter uniquement les faits personnellement vérifiés par l’organisme.</li>
          <li>Utiliser au maximum trois lignes d’actions par exemplaire imprimé ou enregistré.</li>
          <li>Laisser les heures non vérifiées vides (ne pas recopier la durée d’action).</li>
          <li>Faire contrôler et signer chaque exemplaire par le représentant habilité de la structure.</li>
        </ul>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-black uppercase tracking-wider cmm-text-secondary">
          Regroupement par structure pour vos démarches
        </h3>

        {documented.length === 0 && undocumented.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-300 p-4 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
            Sélectionnez au moins une participation confirmée pour afficher les structures concernées.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {documented.map((group) => (
              <div
                key={group.key}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-bold cmm-text-primary">{group.name}</p>
                  <span className="text-xs font-semibold cmm-text-secondary">
                    {group.organizerTypeLabel}
                  </span>
                </div>
                <p className="mt-1 text-xs cmm-text-secondary">
                  {group.items.length} action{group.items.length > 1 ? "s" : ""} confirmée
                  {group.items.length > 1 ? "s" : ""} — une attestation distincte doit être
                  complétée et signée par cet organisme.
                </p>
                <ul className="mt-2 space-y-1 text-xs cmm-text-secondary">
                  {group.items.map((item) => (
                    <li key={item.actionId}>
                      {item.actionDate.slice(0, 10)} — {item.actionTitle || item.locationLabel} (
                      {item.communicableReference.referenceCode})
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            {undocumented.length > 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-950/40">
                <p className="font-bold text-slate-900 dark:text-slate-100">
                  Structure organisatrice non documentée ({undocumented.length})
                </p>
                <p className="mt-1 text-xs cmm-text-secondary">
                  Aucune structure signataire n’est identifiée pour ces participations : elles ne
                  peuvent pas être attribuées à un organisme signataire sans justificatif externe.
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
