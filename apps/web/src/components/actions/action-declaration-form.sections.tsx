import { useState } from "react";
import { motion } from "framer-motion";
import { computeButtsCount } from "@/lib/actions/data-contract";
import type {
  ActionMegotsCondition,
  ActionPhotoAsset,
  ActionVisionEstimate,
} from "@/lib/actions/types";
import type { FormState } from "./action-declaration-form.model";
import { toRequiredNumber } from "./action-declaration-form.model";
import {
  getBagCountSuspicion,
  getDensitySuspicion,
  getFillLevelSuspicion,
} from "./action-declaration-form.suspicion";

type UpdateField = <K extends keyof FormState>(
  key: K,
  value: FormState[K],
) => void;

function SuspicionBadge({ message }: { message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-800">
      Écart suspect
    </span>
  );
}

type CompleteModeFieldsProps = {
  isQuickMode: boolean;
  form: FormState;
  updateField: UpdateField;
  photoAssets: ActionPhotoAsset[];
  visionEstimate: ActionVisionEstimate | null;
  visionStatus: "idle" | "processing" | "ready" | "error";
  visionMessage: string | null;
  onPhotoUpload: (files: FileList | null) => void;
  onClearPhotos: () => void;
};

export function ActionDeclarationMegotsSection({
  form,
  updateField,
}: {
  form: FormState;
  updateField: UpdateField;
}) {
  return (
    <div className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold text-slate-700">Mégots</p>
        <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          optionnel
        </span>
      </div>
      <p className="mb-4 text-xs text-slate-500">
        Champ facultatif. Sert à compléter l&apos;impact.
      </p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Masse de mégots (kg ou g)
          <input
            type="number"
            step="0.01"
            min="0"
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.wasteMegotsKg}
            onChange={(event) => updateField("wasteMegotsKg", event.target.value)}
            placeholder="Ex: 0.5"
          />
          <p className="text-[10px] italic text-slate-500">
            0.05 = 50 g
          </p>
        </label>

        <label className="flex flex-col gap-2 text-sm text-slate-700">
          Qualité / État des mégots
          <select
            className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
            value={form.wasteMegotsCondition}
            onChange={(event) =>
              updateField(
                "wasteMegotsCondition",
                event.target.value as ActionMegotsCondition,
              )
            }
          >
            <option value="propre">Propre (Sec, facile à recycler)</option>
            <option value="humide">
              Humide / Avec impuretés (Terre, sable)
            </option>
            <option value="mouille">
              Mouillé (Saturé d&apos;eau, après pluie)
            </option>
          </select>
        </label>
      </div>

      {toRequiredNumber(form.wasteMegotsKg, 0) > 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-700 p-[2px] shadow-md"
        >
          <div className="rounded-[14px] bg-white p-3 text-center">
            <h4 className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Impact estimé
            </h4>
            <div className="flex items-center justify-center gap-2 text-lg font-bold text-emerald-700">
              <span aria-hidden="true">💧</span>
              <span>
                {(computeButtsCount(
                  toRequiredNumber(form.wasteMegotsKg, 0),
                  form.wasteMegotsCondition,
                ) * 500).toLocaleString("fr-FR")} L d'eau préservés
              </span>
            </div>
            <p className="mt-1 text-[10px] font-medium text-slate-400">~{computeButtsCount(
                  toRequiredNumber(form.wasteMegotsKg, 0),
                  form.wasteMegotsCondition,
                ).toLocaleString("fr-FR")} mégots</p>
          </div>
        </motion.div>
      ) : null}
    </div>
  );
}

export function ActionDeclarationCompleteModeFields({
  isQuickMode,
  form,
  updateField,
  photoAssets,
  visionEstimate,
  visionStatus,
  visionMessage,
  onPhotoUpload,
  onClearPhotos,
}: CompleteModeFieldsProps) {
  const [showTrainingPrecisionFields, setShowTrainingPrecisionFields] =
    useState(false);
  const bagCountSuspicion = getBagCountSuspicion(
    form.visionBagsCount,
    visionEstimate,
  );
  const fillLevelSuspicion = getFillLevelSuspicion(
    form.visionFillLevel,
    visionEstimate,
  );
  const densitySuspicion = getDensitySuspicion(
    form.visionDensity,
    visionEstimate,
  );

  if (isQuickMode) {
    return null;
  }
  return (
    <details className="md:col-span-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <summary className="cursor-pointer list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Options avancées
            </p>
            <p className="text-sm text-slate-600">
              Photos, détails complémentaires et tri fin.
            </p>
          </div>
          <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
            Ouvrir
          </span>
        </div>
      </summary>

      <div className="mt-4 space-y-4">
        <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Photos
              </p>
              <p className="text-sm text-slate-600">
                Aide à estimer le poids, sans bloquer l&apos;envoi.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Optionnel
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label className="inline-flex cursor-pointer items-center rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-100">
              Ajouter des photos
              <input
                type="file"
                accept="image/*"
                multiple
                capture="environment"
                className="hidden"
                onChange={(event) => onPhotoUpload(event.target.files)}
              />
            </label>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>{photoAssets.length} photo(s) prêtes</span>
              <button
                type="button"
                onClick={onClearPhotos}
                className="rounded-full border border-slate-200 px-2 py-1 font-semibold text-slate-600 hover:bg-slate-50"
              >
                Vider
              </button>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-semibold text-slate-600">
                {visionStatus === "processing"
                  ? "Analyse..."
                  : visionStatus === "ready"
                    ? "Estimation prête"
                    : visionStatus === "error"
                      ? "Estimation simple"
                      : "En attente"}
              </span>
            </div>
          </div>

          {visionEstimate ? (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs uppercase tracking-wide text-slate-500">
                Poids suggéré
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">
                {visionEstimate.wasteKg.value.toFixed(1)} kg
              </p>
              <p className="text-xs text-slate-500">
                {visionEstimate.wasteKg.interval?.[0].toFixed(1) ?? "?"} -
                {visionEstimate.wasteKg.interval?.[1].toFixed(1) ?? "?"} kg
              </p>
              <p className="text-xs text-slate-500">
                {(visionEstimate.wasteKg.confidence * 100).toFixed(0)} %
              </p>
              <p className="mt-1 text-xs text-amber-700">
                {visionEstimate.provisional
                  ? "À vérifier à la main."
                  : "À comparer au poids saisi."}
              </p>
            </div>
          ) : null}

          <div className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
            Rien à ajouter si tu n&apos;as pas de photo.
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Détails complémentaires
              </p>
              <p className="text-sm text-slate-600">
                Facultatif. Le poids saisi reste la référence.
              </p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
              Optionnel
            </span>
          </div>

          <label className="mt-4 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={showTrainingPrecisionFields}
              onChange={(event) =>
                setShowTrainingPrecisionFields(event.target.checked)
              }
              className="mt-1 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span>
              <span className="block font-semibold text-slate-900">
                Ajouter des détails
              </span>
              <span className="block text-xs text-slate-500">
                Champs facultatifs.
              </span>
            </span>
          </label>

          {showTrainingPrecisionFields ? (
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <span>Nombre de sacs</span>
                  <SuspicionBadge message={bagCountSuspicion.message} />
                </span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                  value={form.visionBagsCount}
                  onChange={(event) =>
                    updateField("visionBagsCount", event.target.value)
                  }
                  placeholder="Conseillé"
                />
                {visionEstimate ? (
                  <span className="text-[10px] text-slate-500">
                    Conseil: {visionEstimate.bagsCount.value} sac(s)
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <span>Remplissage</span>
                  <SuspicionBadge message={fillLevelSuspicion.message} />
                </span>
                <select
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                  value={form.visionFillLevel}
                  onChange={(event) =>
                    updateField(
                      "visionFillLevel",
                      event.target.value as FormState["visionFillLevel"],
                    )
                  }
                >
                  <option value="">Conseillé</option>
                  <option value="25">25 %</option>
                  <option value="50">50 %</option>
                  <option value="75">75 %</option>
                  <option value="100">100 %</option>
                </select>
                {visionEstimate ? (
                  <span className="text-[10px] text-slate-500">
                    Conseil: {visionEstimate.fillLevel.value} %
                  </span>
                ) : null}
              </label>
              <label className="flex flex-col gap-2 text-sm text-slate-700">
                <span className="flex items-center gap-2">
                  <span>Densité</span>
                  <SuspicionBadge message={densitySuspicion.message} />
                </span>
                <select
                  className="rounded-xl border border-slate-300 bg-slate-100 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                  value={form.visionDensity}
                  onChange={(event) =>
                    updateField(
                      "visionDensity",
                      event.target.value as FormState["visionDensity"],
                    )
                  }
                >
                  <option value="">Conseillé</option>
                  <option value="sec">Sec</option>
                  <option value="humide_dense">Humide / dense</option>
                  <option value="mouille">Mouillé</option>
                </select>
                {visionEstimate ? (
                  <span className="text-[10px] text-slate-500">
                    Conseil:{" "}
                    {visionEstimate.density.value === "humide_dense"
                      ? "Humide / dense"
                      : visionEstimate.density.value === "mouille"
                        ? "Mouillé"
                        : "Sec"}
                  </span>
                ) : null}
              </label>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Ces détails restent cachés tant que tu n&apos;en as pas besoin.
            </div>
          )}

          {visionMessage ? (
            <p className="mt-3 text-xs text-slate-500">{visionMessage}</p>
          ) : null}
        </section>

        <details className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Autres détails
                </p>
                <p className="text-sm text-slate-600">
                  Durée, commentaire, tri par filière.
                </p>
              </div>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                Ouvrir
              </span>
            </div>
          </summary>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm text-slate-700">
              Durée (min)
              <input
                type="number"
                min="0"
                className="rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.durationMinutes}
                onChange={(event) =>
                  updateField("durationMinutes", event.target.value)
                }
              />
            </label>

            <label className="md:col-span-2 flex flex-col gap-2 text-sm text-slate-700">
              Commentaire
              <textarea
                className="min-h-[110px] rounded-xl border border-slate-300 px-3 py-2 text-slate-900 outline-none transition focus:border-emerald-500"
                value={form.notes}
                onChange={(event) => updateField("notes", event.target.value)}
                maxLength={1000}
                placeholder="Ex: présence de nombreux mégots près des bouches de métro."
              />
            </label>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Tri par filière (optionnel)
              </p>
              <div className="mt-2 grid gap-2 md:grid-cols-3">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.wastePlastiqueKg}
                  onChange={(event) =>
                    updateField("wastePlastiqueKg", event.target.value)
                  }
                  placeholder="Plastique kg"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.wasteVerreKg}
                  onChange={(event) =>
                    updateField("wasteVerreKg", event.target.value)
                  }
                  placeholder="Verre kg"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.wasteMetalKg}
                  onChange={(event) =>
                    updateField("wasteMetalKg", event.target.value)
                  }
                  placeholder="Métal kg"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                />
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={form.wasteMixteKg}
                  onChange={(event) =>
                    updateField("wasteMixteKg", event.target.value)
                  }
                  placeholder="Mixte kg"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                />
                <select
                  value={form.triQuality}
                  onChange={(event) =>
                    updateField(
                      "triQuality",
                      event.target.value as "faible" | "moyenne" | "elevee",
                    )
                  }
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-500"
                >
                  <option value="faible">Tri faible</option>
                  <option value="moyenne">Tri moyen</option>
                  <option value="elevee">Tri élevé</option>
                </select>
              </div>
            </div>
          </div>
        </details>
      </div>
    </details>
  );
}
