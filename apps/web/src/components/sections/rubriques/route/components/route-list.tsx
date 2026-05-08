import { RouteStop } from "../route-types";

interface RouteListProps {
  hasRoute: boolean;
  picks: RouteStop[];
  fr: boolean;
}

export function RouteList({ hasRoute, picks, fr }: RouteListProps) {
  return (
    <section className="rounded-[1.75rem] border border-emerald-300/18 bg-[rgba(13,46,34,0.88)] p-1 shadow-[0_24px_56px_-32px_rgba(52,211,153,0.28)]">
      <ol className="divide-y divide-emerald-200/10">
        {hasRoute ? (
          picks.map((item, index) => (
            <li
              key={item.id}
              className="group flex flex-col justify-between gap-4 p-4 transition hover:bg-[rgba(17,56,41,0.62)] sm:flex-row sm:items-start"
            >
              <div className="space-y-2">
                <p className="flex items-center gap-2 font-bold text-white">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-400/90 text-[11px] font-black text-emerald-950">
                    {index + 1}
                  </span>
                  {item.label}
                </p>
                <p className="inline-flex rounded-full border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] px-2.5 py-1 text-[11px] font-semibold text-emerald-50/86">
                  {item.priorityReason}
                </p>
              </div>
              <div className="shrink-0 space-y-2 sm:text-right">
                <p className="rounded-2xl border border-emerald-200/12 bg-[rgba(17,56,41,0.72)] px-3 py-2 text-sm font-medium text-emerald-100/80">
                  {Number(item.segmentKm || 0).toFixed(2)} km • {item.estimatedMinutes} min
                </p>
                {item.latitude !== null && item.longitude !== null ? (
                  <a
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200/14 bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold text-emerald-50/88 transition hover:border-emerald-200/30 hover:bg-emerald-400/16"
                    href={`https://www.google.com/maps/search/?api=1&query=${item.latitude},${item.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {fr ? "Ouvrir GPS" : "Open GPS"}
                  </a>
                ) : null}
              </div>
            </li>
          ))
        ) : (
          <li className="p-8 text-center text-sm italic text-emerald-100/72">
            {fr
              ? "Aucun point de collecte ne correspond à vos critères actuels."
              : "No collection point matches your current criteria."}
          </li>
        )}
      </ol>
    </section>
  );
}
