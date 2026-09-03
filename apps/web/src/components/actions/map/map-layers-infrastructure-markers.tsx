"use client";

import { useEffect, useRef } from "react";
import { Marker, Popup } from "react-leaflet";
import { divIcon } from "leaflet";
import { Info } from "lucide-react";
import {
  INFRASTRUCTURE_ALERT_THRESHOLD,
  resolveInfrastructureEmoji,
} from "@/components/actions/map-marker-categories";
import { useActionPollutionScoreReferences } from "./action-pollution-score-references-context";
import {
  formatNumber,
  formatThresholdScore,
  getInfrastructureReading,
} from "./map-layers.helpers";
import { resolveInfrastructureAnchor } from "./actions-map-geometry.utils";
import type { InfrastructureLayerProps } from "./map-layers.shared";

export function InfrastructureMarkers({
  items,
  visible = true,
  selectedActionId = null,
  onSelectAction,
}: InfrastructureLayerProps) {
  const { references } = useActionPollutionScoreReferences();
  const layerRefs = useRef<Record<string, { openPopup?: () => void; closePopup?: () => void }>>({});

  useEffect(() => {
    if (!selectedActionId) {
      return;
    }

    const layer = layerRefs.current[selectedActionId];
    layer?.openPopup?.();
  }, [selectedActionId]);

  if (!visible) {
    return null;
  }

  return (
    <>
      {items.map((item) => {
        const emoji = resolveInfrastructureEmoji(item, references);
        if (!emoji) {
          return null;
        }

        const anchor = resolveInfrastructureAnchor(item);
        if (!anchor) {
          return null;
        }
        const isSelected = selectedActionId === item.id;
        const infra = getInfrastructureReading(item, references);

        return (
          <Marker
            key={`infrastructure-${item.id}`}
            ref={(layer) => {
              if (layer) {
                layerRefs.current[item.id] = layer;
              } else {
                delete layerRefs.current[item.id];
              }
            }}
            position={anchor}
            interactive={true}
            eventHandlers={{
              click: () => {
                onSelectAction?.(item.id);
              },
            }}
            icon={divIcon({
              className: "cmm-infrastructure-marker",
              html: `
                <div class="cmm-infrastructure-marker__outer group">
                  <div class="cmm-infrastructure-marker__glow"></div>
                  <div class="cmm-infrastructure-marker__inner${isSelected ? " cmm-infrastructure-marker__inner--selected" : ""}">
                    <span class="cmm-infrastructure-marker__emoji">${emoji}</span>
                  </div>
                </div>
              `,
              iconSize: [40, 40],
              iconAnchor: [20, 20],
            })}
          >
            <Popup className="glass-popup custom-popup">
              <div className="p-5 space-y-4 min-w-[280px]">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/50 flex items-center justify-center text-2xl shadow-inner border border-violet-200/50 ${isSelected ? "ring-4 ring-violet-400/40" : ""}`}>
                    {emoji}
                  </div>
                  <div>
                    <h3 className="cmm-text-body font-bold cmm-text-primary">Besoin détecté</h3>
                    <p className="cmm-text-caption text-violet-600 font-bold uppercase tracking-wider">Infrastructure</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="cmm-text-caption cmm-text-muted">Type suggéré</span>
                    <span className="text-xs font-bold cmm-text-primary">
                      {infra.needLabel}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="cmm-text-caption cmm-text-muted">Priorité</span>
                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 text-[9px] font-black uppercase tracking-widest">
                      {infra.priorityLabel}
                    </span>
                  </div>
                  <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <span className="cmm-text-caption cmm-text-muted">Seuil infra</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-600">
                        {formatThresholdScore(INFRASTRUCTURE_ALERT_THRESHOLD)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Déchets</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatNumber(infra.wasteKg, " kg")}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contribution</p>
                        <p className={infra.needsBin ? "text-xs font-black text-rose-700" : "text-xs font-semibold text-slate-700"}>
                          {formatThresholdScore(infra.wasteScore)}
                        </p>
                      </div>
                      <span className={infra.needsBin ? "rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600"}>
                        {infra.needsBin ? "Atteint" : "Sous seuil"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-950/70">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Mégots</p>
                        <p className="text-xs font-semibold text-slate-700">
                          {formatNumber(infra.butts)}
                        </p>
                      </div>
                      <div className="text-right space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Contribution</p>
                        <p className={infra.needsAshtray ? "text-xs font-black text-rose-700" : "text-xs font-semibold text-slate-700"}>
                          {formatThresholdScore(infra.buttsScore)}
                        </p>
                      </div>
                      <span className={infra.needsAshtray ? "rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-rose-700" : "rounded-full bg-slate-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-widest text-slate-600"}>
                        {infra.needsAshtray ? "Atteint" : "Sous seuil"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-200">
                    <div className="mt-0.5"><Info size={14} className="text-violet-500" /></div>
                    <p className="text-[10px] leading-relaxed italic">
                      <strong>Lecture seuil :</strong> besoin déclenché quand la contribution déchets ou mégots atteint {formatThresholdScore(INFRASTRUCTURE_ALERT_THRESHOLD)}. Le marqueur peut être bac, cendrier ou combiné selon le signal atteint.
                    </p>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
}
