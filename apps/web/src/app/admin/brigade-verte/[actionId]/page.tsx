import { checkAdminAccess } from "@/lib/admin/access";
import { PageHeader } from "@/components/ui/page-header";
import { getQualificationWithHistory, isActionEligibleForBrigadeVerte } from "@/lib/brigade-verte/brigade-verte-service";
import Link from "next/link";
import { notFound } from "next/navigation";

export const metadata = {
  title: "Qualification Action Brigade Verte | CleanMyMap",
};

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ actionId: string }>;
}) {
  await checkAdminAccess();

  const { actionId } = await params;
  const { eligible, row } = await isActionEligibleForBrigadeVerte(actionId);

  if (!row) {
    notFound();
  }

  const { qualification, history } = await getQualificationWithHistory(actionId);

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
          <div>Éligible Brigade Verte : <strong className={eligible ? "text-emerald-600" : "text-rose-600"}>{eligible ? "OUI" : "NON"}</strong></div>
          <div>Statut d&apos;approbation : {row.status}</div>
          <div>Phase d&apos;action : {row.actionPhase}</div>
          <div>Visibilité : {row.moderationVisibility}</div>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
        <h2 className="text-base font-semibold mb-3">Qualification actuelle</h2>
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
            <div>URL justificative : <a href={qualification.justificationUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">{qualification.justificationUrl}</a></div>
            <div>Qualifiée par : <span className="font-mono">{qualification.qualifiedBy}</span> le {new Date(qualification.qualifiedAt).toLocaleString("fr-FR")}</div>
            {qualification.revocationReason && (
              <div className="text-rose-600">Motif de révocation : {qualification.revocationReason}</div>
            )}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">Cette action n&apos;est pas encore qualifiée Brigade Verte.</p>
        )}
      </div>

      {history.length > 0 && (
        <div className="mt-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6">
          <h2 className="text-base font-semibold mb-3">Historique des décisions</h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 text-sm">
            {history.map((h) => (
              <div key={h.id} className="py-2">
                <div className="flex justify-between font-medium">
                  <span>Décision : {h.decision.toUpperCase()}</span>
                  <span className="text-xs text-zinc-500">{new Date(h.decidedAt).toLocaleString("fr-FR")}</span>
                </div>
                <div className="text-xs text-zinc-500 mt-1">Par : {h.decidedBy}</div>
                {h.justificationUrl && <div className="text-xs">Preuve : {h.justificationUrl}</div>}
                {h.revocationReason && <div className="text-xs text-rose-600">Motif : {h.revocationReason}</div>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
