import { checkAdminAccess } from "@/lib/admin/access";
import { PageHeader } from "@/components/ui/page-header";
import { searchEligibleActions } from "@/lib/brigade-verte/brigade-verte-service";
import Link from "next/link";

export const metadata = {
  title: "Administration Brigade Verte | CleanMyMap",
  description: "Qualification administrative des actions Quartier Propre Brigade Verte Paris.",
};

type SearchParams = {
  query?: string;
  date?: string;
};

export default async function Page({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  await checkAdminAccess();

  const resolved = searchParams ? await searchParams : undefined;
  const query = resolved?.query ?? "";
  const date = resolved?.date ?? "";

  const actions = await searchEligibleActions({
    query: query || undefined,
    date: date || undefined,
  });

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <PageHeader
        title="Administration Brigade Verte Paris"
        subtitle="Gestion et qualification des opérations Quartier Propre éligibles au Parcours Éco-Citoyen."
      />

      <div className="mt-8 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
          Recherche d&apos;actions éligibles
        </h2>
        <form method="GET" className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="query" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Mot-clé ou ID d&apos;action
            </label>
            <input
              type="text"
              id="query"
              name="query"
              defaultValue={query}
              placeholder="Ex: République ou UUID"
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">
              Date exacte
            </label>
            <input
              type="date"
              id="date"
              name="date"
              defaultValue={date}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-md transition-colors"
            >
              Filtrer
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h3 className="text-md font-semibold text-zinc-800 dark:text-zinc-200 mb-3">
          Actions éligibles trouvées ({actions.length})
        </h3>
        {actions.length === 0 ? (
          <p className="text-sm text-zinc-500 py-4">
            Aucune action éligible ne correspond aux critères de recherche.
          </p>
        ) : (
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-white dark:bg-zinc-900">
            {actions.map((act) => (
              <div key={act.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                <div>
                  <div className="font-medium text-zinc-900 dark:text-zinc-100">
                    {act.locationLabel}
                  </div>
                  <div className="text-xs text-zinc-500 mt-1 space-x-2">
                    <span>Date : {act.actionDate}</span>
                    <span>•</span>
                    <span className="font-mono">{act.id}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/brigade-verte/${act.id}`}
                    className="px-3 py-1.5 text-xs font-medium border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-800 dark:text-zinc-200"
                  >
                    Examiner &amp; Décider
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
