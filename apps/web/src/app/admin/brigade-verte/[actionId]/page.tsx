import { checkCreatorAccess } from "@/lib/admin/access";
import { PageHeader } from "@/components/ui/page-header";
import { getQualificationWithHistory, isActionEligibleForBrigadeVerte } from "@/lib/brigade-verte/brigade-verte-service";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionDecisionForm } from "./action-decision-form";

export const metadata = {
  title: "Décision Qualification Brigade Verte | CleanMyMap",
};

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  await checkCreatorAccess();

  const { actionId } = await params;
  const { eligible, row } = await isActionEligibleForBrigadeVerte(actionId);

  if (!row) {
    notFound();
  }

  const { qualification, history } = await getQualificationWithHistory(actionId);
  const isCurrentlyActive = qualification?.status === "active";

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-4">
        <Link href="/admin/brigade-verte" className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          ← Retour à la recherche
        </Link>
      </div>

      <PageHeader
        title={`Action : ${row.locationLabel}`}
        subtitle={`Date : ${row.actionDate} • Identifiant : ${row.id}`}
      />

      <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold mb-3">Statut d&apos;éligibilité technique</h2>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            Éligible Brigade Verte :{" "}
            <strong className={eligible ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
              {eligible ? "OUI (conforme)" : "NON (incomplet ou invalide)"}
            </strong>
          </div>
          <div>Statut d&apos;approbation : <span className="font-medium">{row.status}</span></div>
          <div>Phase d&apos;action : <span className="font-medium">{row.actionPhase}</span></div>
          <div>Visibilité : <span className="font-medium">{row.moderationVisibility}</span></div>
          <div>Mode d&apos;accès : <span className="font-medium">{row.accessMode}</span></div>
          <div>Revue administrative : <span className="font-medium">{row.reviewState}</span></div>
          <div>Date d&apos;action : <span className="font-medium">{row.actionDate}</span></div>
          <div>Date de publication : <span className="font-medium">{row.publishedAt ? new Date(row.publishedAt).toLocaleDateString("fr-FR") : "Non publiée"}</span></div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold mb-3">Qualification administrative actuelle</h2>
        {qualification ? (
          <div className="space-y-2 text-sm">
            <div>
              Statut :{" "}
              <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                qualification.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-zinc-100 text-zinc-800"
              }`}>
                {qualification.status.toUpperCase()}
              </span>
            </div>
            <div>URL justificative : <a href={qualification.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline break-all">{qualification.justificationUrl}</a></div>
            <div>Qualifiée par : <span className="font-mono">{qualification.qualifiedBy}</span> le {new Date(qualification.qualifiedAt).toLocaleString("fr-FR")}</div>
            {qualification.requalifiedAt && (
              <div>Dernière requalification le : {new Date(qualification.requalifiedAt).toLocaleString("fr-FR")}</div>
            )}
            {qualification.revokedAt && (
              <div className="text-rose-600">
                Révoquée le {new Date(qualification.revokedAt).toLocaleString("fr-FR")} par <span className="font-mono">{qualification.revokedBy}</span>
                {qualification.revocationReason && ` — Motif : ${qualification.revocationReason}`}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Cette action n&apos;est pas encore qualifiée Brigade Verte.</p>
        )}
      </div>

      {/* Formulaire de décision (Qualification / Révocation) */}
      <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold mb-3">
          {isCurrentlyActive ? "Révocation de la qualification" : qualification ? "Requalification de l'action" : "Qualifier cette action"}
        </h2>
        <ActionDecisionForm
          actionId={row.id}
          isCurrentlyActive={isCurrentlyActive}
          qualificationId={qualification?.id}
          isEligible={eligible}
        />
      </div>

      {history.length > 0 && (
        <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-semibold mb-3">Historique des décisions (Journal immuable)</h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            {history.map((h) => (
              <div key={h.id} className="py-2.5">
                <div className="flex justify-between font-medium">
                  <span className={`font-semibold ${
                    h.decision === "qualified" || h.decision === "requalified" ? "text-emerald-700 dark:text-emerald-400" : "text-rose-700 dark:text-rose-400"
                  }`}>
                    Décision : {h.decision.toUpperCase()}
                  </span>
                  <span className="text-xs text-zinc-500">{new Date(h.decidedAt).toLocaleString("fr-FR")}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Par : <span className="font-mono">{h.decidedBy}</span> {h.operationId && `• Opération : ${h.operationId}`}</div>
                {h.justificationUrl && <div className="text-xs mt-0.5">Preuve : <a href={h.justificationUrl} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 break-all">{h.justificationUrl}</a></div>}
                {h.revocationReason && <div className="text-xs text-rose-600 mt-0.5">Motif : {h.revocationReason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
