import { ActionsMapFeed } from "@/components/actions/actions-map-feed";
import { ActionsVisualizationPanel } from "@/components/actions/actions-visualization-panel";
import { SandboxSection } from "@/components/sections/rubriques/sandbox-section";
import { DecisionPageHeader } from "@/components/ui/decision-page-header";
import { PageReadingTemplate } from "@/components/ui/page-reading-template";
import { RubriquePdfExportButton } from "@/components/ui/rubrique-pdf-export-button";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function ActionsMapPage() {
  const pageTemplateV2Enabled = isFeatureEnabled("pageTemplateV2");

  if (pageTemplateV2Enabled) {
    return (
      <PageReadingTemplate
        context="Profil terrain"
        title="Carte opérationnelle terrain"
        objective="Lire l’impact terrain et la fiabilité data simultanément, puis prioriser les zones d’intervention immédiates."
        summary={
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-3">
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Lecture impact
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Faible → critique
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: signal binaire
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Fiabilité data
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Grade A / B / C
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: score front seul
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
              <article className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs uppercase tracking-wide text-slate-500">
                  Filtres combinés
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  Impact + qualité
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  N-1: filtres isolés
                </p>
                <p className="mt-1 text-xs text-slate-600">
                  Delta abs: n/a | Delta %: n/a
                </p>
              </article>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Alerte prioritaire
              </p>
              <p className="mt-1">
                Point critique avec fiabilité C: arbitrer rapidement entre
                intervention et vérification.
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900">
              <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                Action recommandée
              </p>
              <p className="mt-1">
                Filtrer sur impact fort + qualité minimale B pour prioriser les
                actions terrain du jour.
              </p>
            </div>
          </div>
        }
        primaryAction={{ href: "/actions/new", label: "Déclarer une action" }}
        secondaryAction={{
          href: "/actions/history",
          label: "Vérifier qualité",
        }}
        analysis={
          <div className="space-y-6">
            <ActionsMapFeed />
            <ActionsVisualizationPanel />
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-semibold text-slate-900">
                Verification technique integree
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Le bac a sable est fusionne a la cartographie pour verifier les
                endpoints, le runbook et la sante plateforme sans changer de
                rubrique.
              </p>
              <div className="mt-4">
                <SandboxSection />
              </div>
            </section>
          </div>
        }
        trace={
          <div className="space-y-2 text-xs text-slate-600">
            <p>
              Horodatage: {new Date().toLocaleString("fr-FR")} | Fiabilité:
              badge qualité calculé côté API pour chaque point.
            </p>
            <p>
              Sources: endpoint map enrichi (impactLevel, qualityGrade,
              qualityScore).
            </p>
            <p>
              Méthode: double lecture impact/fiabilité + filtres combinables.
              Périmètre: /actions/map.
            </p>
            <div className="pt-1">
              <RubriquePdfExportButton rubriqueTitle="Vue terrain geolocalisee" />
            </div>
          </div>
        }
      />
    );
  }

  return (
    <div data-rubrique-report-root className="space-y-4">
      <DecisionPageHeader
        context="Profil terrain"
        title="Vue terrain geolocalisee"
        objective="Prioriser les zones avec double lecture impact terrain et fiabilite data."
        actions={[
          {
            href: "/actions/new",
            label: "Declarer une action",
            tone: "primary",
          },
          { href: "/actions/history", label: "Verifier qualite" },
        ]}
      />

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
          Tracer
        </p>
        <div className="mt-2">
          <RubriquePdfExportButton rubriqueTitle="Vue terrain geolocalisee" />
        </div>
      </section>

      <ActionsMapFeed />
      <ActionsVisualizationPanel />

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-xl font-semibold text-slate-900">
          Verification technique integree
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Le bac a sable est fusionne a la cartographie pour verifier les
          endpoints, le runbook et la sante plateforme sans changer de
          rubrique.
        </p>
        <div className="mt-4">
          <SandboxSection />
        </div>
      </section>
    </div>
  );
}
