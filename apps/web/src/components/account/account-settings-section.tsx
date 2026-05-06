"use client";

import { useState } from "react";
import { Settings, Trash2, Shield, Mail, AlertTriangle } from "lucide-react";

export function AccountSettingsSection() {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
          <Settings size={20} className="text-slate-600 dark:text-slate-400" />
        </div>
        <div>
          <h2 className="text-lg font-semibold cmm-text-primary">
            Paramètres du compte
          </h2>
          <p className="text-sm cmm-text-muted">
            Gérez vos préférences et vos données
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3 mb-2">
            <Shield size={18} className="text-emerald-600" />
            <h3 className="font-semibold cmm-text-primary">Confidentialité</h3>
          </div>
          <p className="text-sm cmm-text-secondary mb-3">
            Gérez comment vos données sont utilisées et partagées.
          </p>
          <a
            href="/politique-confidentialite"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-sm font-medium hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
          >
            <Mail size={14} />
            Politique de confidentialité
          </a>
        </div>

        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800">
          <div className="flex items-center gap-3 mb-2">
            <Trash2 size={18} className="text-rose-600" />
            <h3 className="font-semibold cmm-text-primary">Suppression du compte</h3>
          </div>
          <p className="text-sm cmm-text-secondary mb-3">
            Vous pouvez supprimer votre compte à tout moment. Cette action est irréversible.
          </p>
          
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-rose-300 dark:border-rose-700 text-rose-700 dark:text-rose-300 text-sm font-medium hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors"
            >
              <Trash2 size={14} />
              Supprimer mon compte
            </button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-lg bg-rose-100 dark:bg-rose-900/30">
                <AlertTriangle size={16} className="text-rose-600 shrink-0" />
                <p className="text-sm text-rose-800 dark:text-rose-200">
                  Cette action supprimera définitivement toutes vos données. Vos actions déclarées seront anonymisées.
                </p>
              </div>
              <div className="flex gap-2">
                <a
                  href="mailto:maxence.drm@gmail.com?subject=Demande%20RGPD%20-%20Suppression%20de%20compte"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-600 text-white text-sm font-medium hover:bg-rose-700 transition-colors"
                >
                  Envoyer la demande
                </a>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs cmm-text-muted mt-4">
        Pour toute question sur vos données, contactez : maxence.drm@gmail.com
      </p>
    </section>
  );
}
