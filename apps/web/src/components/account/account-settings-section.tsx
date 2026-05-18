"use client";

import { useState } from "react";
import { Settings, Trash2, Shield, Mail, AlertTriangle } from "lucide-react";
import { resolvePublicContactEmail } from "@/lib/email-config";

export function AccountSettingsSection() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10">
      {/* Fond isolé — surface orange pâle chaude */}
      <div className="pointer-events-none absolute inset-0 rounded-3xl bg-amber-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.6),inset_0_-1px_0_rgba(180,83,9,0.08)]" />

      <div className="relative z-10 p-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-amber-200 bg-amber-100">
            <Settings size={20} className="text-amber-800" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Paramètres du compte
            </h2>
            <p className="text-sm text-slate-600">
              Gérez vos préférences et vos données
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Confidentialité */}
          <div className="rounded-2xl border border-amber-300/60 bg-amber-200/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]">
            <div className="flex items-center gap-2.5 mb-2">
              <Shield size={17} className="text-emerald-700 shrink-0" />
              <h3 className="font-bold text-slate-900">Confidentialité</h3>
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              Gérez comment vos données sont utilisées et partagées.
            </p>
            <a
              href="/politique-confidentialite"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1.5 text-sm font-semibold text-emerald-800 transition-colors hover:bg-emerald-200"
            >
              <Mail size={13} />
              Politique de confidentialité
            </a>
          </div>

          {/* Suppression */}
          <div className="rounded-2xl border border-rose-200 bg-rose-100/70 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
            <div className="flex items-center gap-2.5 mb-2">
              <Trash2 size={17} className="text-rose-600 shrink-0" />
              <h3 className="font-bold text-slate-900">Suppression du compte</h3>
            </div>
            <p className="text-sm text-slate-700 mb-3 leading-relaxed">
              Vous pouvez supprimer votre compte à tout moment. Cette action est irréversible.
            </p>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-full border border-rose-300 bg-white px-3 py-1.5 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-100"
              >
                <Trash2 size={13} />
                Supprimer mon compte
              </button>
            ) : (
              <div className="space-y-3">
                <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-100 p-3">
                  <AlertTriangle size={15} className="text-rose-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-900 leading-relaxed">
                    Cette action supprimera définitivement toutes vos données. Vos actions déclarées seront anonymisées.
                  </p>
                </div>
                <div className="flex gap-2">
                  <a
                    href={`mailto:${contactEmail}?subject=Demande%20RGPD%20-%20Suppression%20de%20compte`}
                    className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-rose-700"
                  >
                    Envoyer la demande
                  </a>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-amber-100"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-500 mt-5">
          Pour toute question sur vos données, contactez : {contactEmail}
        </p>
      </div>
    </section>
  );
}
