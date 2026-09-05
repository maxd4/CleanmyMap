import { MASTER_PACK_GLOSSARY } from "@/lib/reports/master-pack/constants";
import { generateRadarChartSvg } from "@/lib/reports/master-pack/components/radar-chart";
import type { ExecutiveNarrative } from "@/lib/reports/master-pack/analytics/executive";
import {
  toFrNumber,
  toFrInt,
  toFrDate,
  toFrOptionalInt,
  toFrOptionalNumber,
} from "@/lib/reports/report-model/formatters";
import type { ChapterDef, ReportModel } from "@/lib/reports/report-model/types";
import { buildPdfChapterHeader } from "./generate-pdf-html.templates";

export function buildPdfChapterContent(
  chapter: ChapterDef,
  reportData: ReportModel,
  executive: ExecutiveNarrative | null,
): string {
  let content = buildPdfChapterHeader(chapter.kicker, chapter.title, chapter.subtitle);

  if (chapter.id === "executif" && reportData) {
    const radarSvg = generateRadarChartSvg([
      { label: "Couverture", value: reportData.map.geoCoverage },
      {
        label: "Engagement",
        value:
          reportData.moderation.conversion === null
            ? 0
            : reportData.moderation.conversion * 100,
      },
      { label: "Qualité", value: reportData.quality.completenessScore },
      { label: "Volume", value: Math.min(100, (reportData.totals.kg / 100) * 100) },
      { label: "Récurrence", value: reportData.quality.coherenceScore },
    ]);
    content += `
        <div style="display: grid; grid-template-columns: 300px 1fr; gap: 40px; background: #f8fafc; padding: 32px; border-radius: 24px; border: 1px solid #e2e8f0; margin-bottom: 40px;">
          <div>${radarSvg}</div>
          <div>
            <h3 style="font-family: 'Outfit'; font-size: 20px; color: #1e293b; margin-bottom: 12px;">Indice de Readiness: <span style="color: #10b981;">${executive?.readinessScore}%</span></h3>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin-bottom: 20px;">${executive?.summary}</p>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              ${executive?.evidence.slice(0, 4).map(e => `
                <div style="background: white; padding: 12px; border-radius: 12px; border: 1px solid #f1f5f9; font-size: 12px; font-weight: 600; color: #1e293b;">✓ ${e}</div>
              `).join('')}
            </div>
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;">
           <div style="background: #f0fdf4; padding: 20px; border-radius: 16px; border: 1px solid #dcfce7; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #166534;">${toFrInt(reportData.totals.actions)}</div>
              <div style="font-size: 10px; font-weight: 700; color: #15803d; text-transform: uppercase; margin-top: 4px;">Actions</div>
           </div>
           <div style="background: #f0f9ff; padding: 20px; border-radius: 16px; border: 1px solid #e0f2fe; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #075985;">${toFrNumber(reportData.totals.kg)}kg</div>
              <div style="font-size: 10px; font-weight: 700; color: #0369a1; text-transform: uppercase; margin-top: 4px;">Masse</div>
           </div>
           <div style="background: #fff7ed; padding: 20px; border-radius: 16px; border: 1px solid #ffedd5; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #c2410c;">${toFrInt(reportData.totals.butts)}</div>
              <div style="font-size: 10px; font-weight: 700; color: #ea580c; text-transform: uppercase; margin-top: 4px;">Mégots</div>
           </div>
           <div style="background: #fdf4ff; padding: 20px; border-radius: 16px; border: 1px solid #fae8ff; text-align: center;">
              <div style="font-size: 24px; font-weight: 700; color: #a21caf;">${toFrInt(reportData.totals.volunteers)}</div>
              <div style="font-size: 10px; font-weight: 700; color: #c026d3; text-transform: uppercase; margin-top: 4px;">Bénévoles</div>
          </div>
        </div>
      `;
  } else if (chapter.id === "pilotage") {
    content += `
        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 30px;">
          <div>
            <h3 style="font-family: 'Outfit'; font-size: 18px; color: #1e293b; margin-bottom: 20px;">Tunnel de Modération & Qualité</h3>
            <div style="background: #f8fafc; padding: 24px; border-radius: 20px; border: 1px solid #e2e8f0;">
              <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 14px; color: #64748b;">Flux de validation</span>
                <span style="font-weight: 700; color: #10b981;">${reportData.moderation.approved} Approuvés</span>
              </div>
              <div style="display: flex; height: 12px; background: #e2e8f0; border-radius: 6px; overflow: hidden; margin-bottom: 24px;">
                ${reportData.moderation.availability === "available" ? `<div style="width: ${reportData.moderation.conversion ?? 0}%; background: #10b981;"></div>
                <div style="width: ${((reportData.moderation.rejected ?? 0) / (reportData.moderation.approved + (reportData.moderation.rejected ?? 0) + (reportData.moderation.pending ?? 0) || 1)) * 100}%; background: #ef4444;"></div>` : `<div style="width: 100%; background: #cbd5e1;"></div>`}
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Taux de conversion</div>
                  <div style="font-size: 24px; font-weight: 700; color: #1e293b;">${reportData.moderation.conversion === null ? "Indisponible" : `${reportData.moderation.conversion.toFixed(1)}%`}</div>
                </div>
                <div>
                  <div style="font-size: 11px; color: #64748b; text-transform: uppercase;">Délai moyen</div>
                  <div style="font-size: 24px; font-weight: 700; color: #1e293b;">${reportData.moderation.delayDays === null ? "Indisponible" : `${toFrOptionalNumber(reportData.moderation.delayDays)}j`}</div>
                </div>
              </div>
            </div>
            <div style="margin-top: 24px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px;">
              <div style="text-align: center; padding: 12px; border: 1px solid #f1f5f9; border-radius: 12px;">
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">En attente</div>
                <div style="font-size: 18px; font-weight: 700; color: #f59e0b;">${toFrOptionalInt(reportData.moderation.pending)}</div>
              </div>
              <div style="text-align: center; padding: 12px; border: 1px solid #f1f5f9; border-radius: 12px;">
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Rejetés</div>
                <div style="font-size: 18px; font-weight: 700; color: #ef4444;">${toFrOptionalInt(reportData.moderation.rejected)}</div>
              </div>
              <div style="text-align: center; padding: 12px; border: 1px solid #f1f5f9; border-radius: 12px;">
                <div style="font-size: 10px; color: #64748b; text-transform: uppercase;">Fraîcheur</div>
                <div style="font-size: 18px; font-weight: 700; color: #6366f1;">${reportData.quality.freshnessDays.toFixed(0)}j</div>
              </div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="padding: 24px; background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 20px;">
              <div style="font-size: 12px; color: #0369a1; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Fiabilité Data</div>
              <div style="font-size: 36px; font-weight: 700; color: #0c4a6e;">${reportData.quality.completenessScore.toFixed(0)}%</div>
              <div style="font-size: 12px; color: #075985; margin-top: 4px;">Score de complétude moyen</div>
            </div>
            <div style="padding: 24px; background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 20px;">
              <div style="font-size: 12px; color: #15803d; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">Cohérence</div>
              <div style="font-size: 36px; font-weight: 700; color: #064e3b;">${reportData.quality.coherenceScore.toFixed(0)}%</div>
              <div style="font-size: 12px; color: #166534; margin-top: 4px;">Validation algorithmique</div>
            </div>
          </div>
        </div>
      `;
  } else if (chapter.id === "terrain") {
    content += `
        <div style="display: grid; grid-template-columns: 1fr 1.5fr; gap: 30px;">
          <div style="display: flex; flex-direction: column; gap: 15px;">
            <div style="padding: 24px; background: #f8fafc; border-radius: 20px; border: 1px solid #e2e8f0;">
              <div style="font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 12px;">Trace Cartographique</div>
              <div style="font-size: 32px; font-weight: 700; color: #1e293b;">${reportData.map.traceCoverage.toFixed(1)}%</div>
              <div style="font-size: 12px; color: #10b981; font-weight: 600; margin-top: 4px;">${toFrNumber(reportData.routeDistance)} km tracés</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
              <div style="padding: 15px; border: 1px solid #f1f5f9; border-radius: 12px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700;">${reportData.map.polylines}</div>
                <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Itinéraires</div>
              </div>
              <div style="padding: 15px; border: 1px solid #f1f5f9; border-radius: 12px; text-align: center;">
                <div style="font-size: 18px; font-weight: 700;">${reportData.map.polygons}</div>
                <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">Surfaces</div>
              </div>
            </div>
            <div style="padding: 20px; background: #1e293b; color: #FFFFFF; border-radius: 16px;">
              <h5 style="font-size: 11px; text-transform: uppercase; color: #94a3b8; margin: 0 0 12px 0;">Performance Itinéraire</h5>
              <div style="font-size: 13px; line-height: 1.5; color: #cbd5e1;">
                Vitesse moyenne de collecte: <span style="color: #38bdf8; font-weight: 700;">${toFrNumber(reportData.totals.kg / (reportData.totals.hours || 1))} kg/h</span>
              </div>
            </div>
          </div>
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 15px;">Évidences Photos (Avant/Après)</h4>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px;">
              ${reportData.highlightPhotos.length > 0
                ? reportData.highlightPhotos.map(p => `
                    <div style="border-radius: 12px; overflow: hidden; border: 1px solid #f1f5f9; position: relative; height: 140px;">
                      <img src="${p.url}" style="width: 100%; height: 100%; object-fit: cover;" />
                      <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 10px; background: linear-gradient(transparent, rgba(0,0,0,0.8)); color: #FFFFFF; font-size: 10px;">
                        <div style="font-weight: 700;">${p.label}</div>
                        <div style="opacity: 0.8;">${toFrDate(p.date)}</div>
                      </div>
                    </div>
                  `).join('')
                : `<div style="grid-column: span 2; padding: 40px; text-align: center; color: #94a3b8; border: 2px dashed #f1f5f9; border-radius: 20px;">Aucune photo certifiée disponible pour ce périmètre.</div>`
              }
            </div>
          </div>
        </div>
      `;
  } else if (chapter.id === "contexte") {
    content += `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
          <div style="display: flex; flex-direction: column; gap: 24px;">
            <div style="background: #0f172a; color: #FFFFFF; padding: 32px; border-radius: 24px; flex-grow: 1;">
              <h4 style="font-size: 11px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 0.1em; margin-bottom: 24px;">Pollution Évitée</h4>
              <div style="display: grid; gap: 24px;">
                <div>
                  <div style="font-size: 42px; font-weight: 700; color: #38bdf8;">${toFrInt(reportData.climate.waterProtectedLiters)} L</div>
                  <div style="font-size: 12px; color: #94a3b8;">Eau douce protégée</div>
                </div>
                <div>
                  <div style="font-size: 42px; font-weight: 700; color: #4ade80;">${toFrNumber(reportData.climate.co2AvoidedKg)} kg</div>
                  <div style="font-size: 12px; color: #94a3b8;">Équivalent CO2 évité</div>
                </div>
              </div>
            </div>
            <div style="background: #f8fafc; padding: 24px; border-radius: 24px; border: 1px solid #e2e8f0;">
              <h4 style="font-size: 11px; font-weight: 700; color: #1e293b; text-transform: uppercase; margin-bottom: 12px;">Potentiel Recyclage</h4>
              <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;">
                <span style="font-size: 13px; color: #64748b;">Matières Valorisables</span>
                <span style="font-weight: 700; color: #1e293b;">${toFrNumber(reportData.recycling.recyclableKg)} kg</span>
              </div>
              <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                <div style="width: ${reportData.recycling.triIndex}%; height: 100%; background: #6366f1;"></div>
              </div>
              <div style="font-size: 11px; color: #64748b; margin-top: 8px;">Indice de triabilité: <span style="font-weight: 700; color: #1e293b;">${reportData.recycling.triIndex.toFixed(0)}%</span></div>
            </div>
          </div>
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Tendance & Météo</h4>
            <div style="height: 160px; display: flex; align-items: flex-end; gap: 10px; padding-bottom: 15px; border-bottom: 1px solid #e2e8f0;">
              ${reportData.monthRows6.map(m => {
                const maxKg = Math.max(...reportData.monthRows6.map(x => x.kg)) || 1;
                const h = Math.max(10, (m.kg / maxKg) * 140);
                return `<div style="flex: 1; height: ${h}px; background: #e2e8f0; border-radius: 4px 4px 0 0;"></div>`;
              }).join('')}
            </div>
            <div style="margin-top: 24px; padding: 20px; background: #f0f9ff; border-radius: 20px; border: 1px solid #bae6fd;">
              <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                <svg style="width: 20px; height: 20px; color: #0369a1;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l1.41 1.41"/></svg>
                <span style="font-size: 13px; font-weight: 700; color: #0369a1; text-transform: uppercase;">Avis Opérationnel</span>
              </div>
              <p style="font-size: 12px; color: #075985; line-height: 1.6; margin: 0;">
                Fenêtre climatique favorable observée sur la période. Conseil: Maintenir le rythme actuel de collecte pour optimiser le CO2 évité avant la saison humide.
              </p>
            </div>
          </div>
        </div>
      `;
  } else if (chapter.id === "communaute") {
    content += `
        <div style="display: grid; grid-template-columns: 1.2fr 1fr; gap: 40px;">
          <div>
            <div style="background: linear-gradient(135deg, #ec4899, #d946ef); color: #FFFFFF; padding: 32px; border-radius: 24px; margin-bottom: 30px;">
              <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; opacity: 0.8; margin-bottom: 12px;">ROI Social & Citoyen</div>
              <div style="font-size: 48px; font-weight: 700;">${toFrInt(reportData.totals.hours * 15.5)} €</div>
              <div style="font-size: 14px; opacity: 0.9; margin-top: 8px;">Valeur économique du temps citoyen (SMIC chargé)</div>
            </div>
            <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">Top Contributeurs</h4>
            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${reportData.community.topLeaderboard.slice(0, 5).map((user, i) => `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; background: #f8fafc; border-radius: 12px; border: 1px solid #f1f5f9;">
                  <div style="display: flex; align-items: center; gap: 10px;">
                    <span style="font-weight: 800; color: #cbd5e1; font-size: 14px;">#${i + 1}</span>
                    <span style="font-weight: 600; color: #1e293b; font-size: 13px;">${user.name}</span>
                  </div>
                  <div style="font-weight: 700; color: #10b981; font-size: 13px;">${toFrNumber(user.kg)} kg</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 20px;">
            <div style="padding: 24px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 20px;">
              <h5 style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 15px 0;">Profil des Signalements</h5>
              <div style="display: flex; flex-direction: column; gap: 15px;">
                ${Object.entries(reportData.community.sourceBuckets).map(([k, v]) => {
                  const total = Object.values(reportData.community.sourceBuckets).reduce((a, b) => a + b, 0) || 1;
                  const pct = (v / total) * 100;
                  return `
                    <div>
                      <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px;">
                        <span style="text-transform: capitalize;">${k}</span>
                        <span style="font-weight: 700;">${v}</span>
                      </div>
                      <div style="height: 6px; background: #e2e8f0; border-radius: 3px; overflow: hidden;">
                        <div style="width: ${pct}%; height: 100%; background: ${k === 'citoyen' ? '#10b981' : k === 'associatif' ? '#3b82f6' : '#6366f1'};"></div>
                      </div>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
            <div style="padding: 24px; background: #ecfdf5; border: 1px solid #d1fae5; border-radius: 20px; text-align: center;">
              <div style="font-size: 32px; font-weight: 700; color: #059669;">${reportData.totals.volunteers}</div>
              <div style="font-size: 11px; font-weight: 700; color: #065f46; text-transform: uppercase;">Membres Engagés</div>
            </div>
          </div>
        </div>
      `;
  } else if (chapter.id === "gouvernance") {
    const exec = executive;
    content += `
        <div style="display: grid; grid-template-columns: 1fr 1.2fr; gap: 50px;">
          <div>
            <h4 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 24px; border-left: 3px solid #6366f1; padding-left: 12px;">Glossaire des Indicateurs</h4>
            <div style="display: flex; flex-direction: column; gap: 20px;">
              ${MASTER_PACK_GLOSSARY.map(([k, v]) => `
                <div>
                  <div style="font-size: 13px; font-weight: 700; color: #1e293b; font-family: 'Outfit';">${k}</div>
                  <div style="font-size: 12px; color: #64748b; margin-top: 4px; line-height: 1.5;">${v}</div>
                </div>
              `).join('')}
            </div>
          </div>
          <div style="background: #f8fafc; padding: 32px; border-radius: 24px; border: 1px solid #e2e8f0;">
            <h4 style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 16px;">Certification d'Audit</h4>
            <p style="font-size: 13px; color: #475569; line-height: 1.7; margin-bottom: 24px;">
              CleanmyMap certifie que les données présentées dans ce Master Pack sont issues de processus de collecte vérifiés numériquement.${" "}
              L'intégrité de la base de données est scellée par un système de logs immuables.
            </p>
            <div style="padding: 20px; background: white; border-radius: 16px; border: 1px solid #f1f5f9; margin-bottom: 24px;">
              <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 12px;">Indice de Fiabilité (Readiness)</div>
              <div style="display: flex; align-items: center; gap: 15px;">
                <div style="font-size: 32px; font-weight: 700; color: #1e293b;">${exec?.readinessScore ?? 0}%</div>
                <div style="font-size: 12px; color: #10b981; font-weight: 600; background: #ecfdf5; padding: 4px 10px; border-radius: 20px;">CERTIFIÉ</div>
              </div>
            </div>
            <div style="display: flex; flex-direction: column; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: #1e293b;">
                <svg style="width: 16px; height: 16px; color: #10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Validation GPS (${reportData.quality.geolocRate.toFixed(1)}%)</span>
              </div>
              <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: #1e293b;">
                <svg style="width: 16px; height: 16px; color: #10b981;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
                <span>Cohérence Sémantique (${reportData.quality.coherenceScore.toFixed(0)}%)</span>
              </div>
            </div>
          </div>
        </div>
      `;
  } else if (chapter.id === "annexes") {
    content += `
        <div style="display: flex; flex-direction: column; gap: 30px;">
          <div>
            <h4 style="font-size: 14px; font-weight: 700; color: #1e293b; margin-bottom: 20px;">Détail Analytique par Zone</h4>
            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f1f5f9; text-align: left; color: #475569;">
                  <th style="padding: 10px; border-radius: 8px 0 0 8px;">Secteur / Zone</th>
                  <th style="padding: 10px; text-align: center;">Actions</th>
                  <th style="padding: 10px; text-align: center;">Masse (kg)</th>
                  <th style="padding: 10px; text-align: center;">Mégots</th>
                  <th style="padding: 10px; text-align: center;">Recurrence</th>
                </tr>
              </thead>
              <tbody>
                ${reportData.areas.slice(0, 12).map(a => `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td style="padding: 12px 10px; font-weight: 600; color: #1e293b;">${a.area}</td>
                    <td style="padding: 12px 10px; text-align: center;">${toFrInt(a.actions)}</td>
                    <td style="padding: 12px 10px; font-weight: 700; text-align: center;">${toFrNumber(a.kg)}</td>
                    <td style="padding: 12px 10px; text-align: center;">${toFrInt(a.butts)}</td>
                    <td style="padding: 12px 10px; text-align: center; color: ${a.recurrence > 1 ? '#ef4444' : '#10b981'}; font-weight: 700;">${a.recurrence.toFixed(1)}x</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
            <div style="padding: 24px; border: 1px solid #e2e8f0; border-radius: 20px;">
              <h5 style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin: 0 0 12px 0;">Cycle de Vie des Données</h5>
              <div style="font-size: 12px; color: #475569; line-height: 1.6;">
                L'extraction des données a été réalisée le <span style="font-weight: 700;">${reportData.generatedAt}</span>.${" "}
                Prochaine synchronisation prévue dans 30 jours.
              </div>
            </div>
            <div style="padding: 24px; background: #f1f5f9; border-radius: 20px; display: flex; align-items: center; justify-content: center; text-align: center;">
              <div style="font-size: 11px; color: #64748b; font-style: italic;">
                Fin du rapport Master Pack.<br/>Document confidentiel destiné à l'usage exclusif de la collectivité.
              </div>
            </div>
          </div>
        </div>
      `;
  }

  return content;
}
