import {
  DOCUMENTATION_DOWNLOADS,
  DOCUMENTATION_READS,
  type ReductionAction,
  formatSharePercent,
} from "./environmental-impact-estimator-panel.helpers";

type EnvironmentalImpactEstimatorPanelResourcesProps = {
  topReductionActions: ReductionAction[];
};

export function EnvironmentalImpactEstimatorPanelResources({
  topReductionActions,
}: EnvironmentalImpactEstimatorPanelResourcesProps) {
  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)]">
        <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                Documentation consultable
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                Méthodologie ACV numérique
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-red-100/40">
              Le document s&apos;ouvre dans le lecteur de documentation du site.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-1">
            {DOCUMENTATION_READS.map((doc) => (
              <a
                key={doc.href}
                href={doc.href}
                className="rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-white/20 hover:bg-white/10"
              >
                <p className="text-sm font-black text-white">{doc.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  {doc.description}
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  Consulter {doc.filename}
                </p>
              </a>
            ))}
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
                Documents à télécharger
              </p>
              <h4 className="mt-1 text-lg font-black tracking-tight text-white">
                Méthode, ateliers et journal
              </h4>
            </div>
            <p className="text-xs leading-relaxed text-red-100/40">
              Les fichiers sont servis en téléchargement direct.
            </p>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {DOCUMENTATION_DOWNLOADS.map((doc) => (
              <a
                key={doc.href}
                href={doc.href}
                download={doc.filename}
                className="rounded-2xl border border-white/10 bg-black/10 p-4 transition hover:border-white/20 hover:bg-white/10"
              >
                <p className="text-sm font-black text-white">{doc.title}</p>
                <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                  {doc.description}
                </p>
                <p className="mt-3 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                  Télécharger {doc.filename}
                </p>
              </a>
            ))}
          </div>
        </section>

        <section className="rounded-[1.25rem] border border-white/10 bg-white/5 p-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-100/35">
              Prochaines actions à plus fort impact
            </p>
            <h4 className="mt-1 text-lg font-black tracking-tight text-white">
              3 leviers pour faire baisser le total affiché
            </h4>
          </div>

          <div className="mt-4 space-y-3">
            {topReductionActions.length > 0 ? (
              topReductionActions.map((action, index) => (
                <article
                  key={`${action.serviceLabel}-${index}`}
                  className="rounded-2xl border border-white/10 bg-black/10 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                        Priorité {index + 1}
                      </p>
                      <h5 className="mt-1 text-sm font-black text-white">{action.title}</h5>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-red-100/45">
                      {formatSharePercent(action.sharePercent)}
                    </p>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-red-100/45">
                    {action.detail}
                  </p>
                  <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-red-100/35">
                    Service concerné: {action.serviceLabel}
                  </p>
                </article>
              ))
            ) : (
              <div className="rounded-2xl border border-white/10 bg-black/10 p-4 text-xs leading-relaxed text-red-100/45">
                Aucune action prioritaire n&apos;est encore calculable tant que les services
                restent au niveau de référence.
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
