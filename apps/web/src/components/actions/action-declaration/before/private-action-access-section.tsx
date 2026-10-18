"use client";

import { useState } from "react";
import { Check, Copy, Link2, RefreshCw, Shield, X } from "lucide-react";
import type { ActionAccessMode } from "@/lib/actions/types";
import { CmmButton } from "@/components/ui/cmm-button";
import { FieldShell, SectionLabel } from "./ui";

type InviteLinkState = {
  active: boolean;
  url?: string;
  createdAt?: string | null;
  revokedAt?: string | null;
};

export function PrivateActionAccessSection({
  accessMode,
  actionId,
  onChange,
}: {
  accessMode: ActionAccessMode;
  actionId?: string | null;
  onChange: (mode: ActionAccessMode) => void;
}) {
  const [link, setLink] = useState<InviteLinkState | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateLink() {
    if (!actionId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/invite-link`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const body = await response.json().catch(() => null) as InviteLinkState | null;
      if (!response.ok || !body?.url) throw new Error("Impossible de générer le lien d’invitation.");
      setLink(body);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function revokeLink() {
    if (!actionId) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/actions/${encodeURIComponent(actionId)}/invite-link`, { method: "DELETE" });
      if (!response.ok) throw new Error("Impossible de révoquer le lien d’invitation.");
      setLink({ active: false, revokedAt: new Date().toISOString() });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!link?.url) return;
    await navigator.clipboard.writeText(link.url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section aria-labelledby="before-access-mode-title" className="border-t border-emerald-100/80 pt-5">
      <SectionLabel icon={Shield} title="Visibilité et accès" subtitle="La visibilité métier est indépendante de la modération et de la publication." />
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <FieldShell label="Mode d’accès">
          <label className="flex cursor-pointer gap-3 rounded-2xl border border-emerald-200/70 bg-white/80 p-3 text-sm text-emerald-950">
            <input type="radio" name="before-access-mode" checked={accessMode === "public"} onChange={() => onChange("public")} />
            <span><strong className="block">Publique</strong><span className="text-xs text-emerald-900/65">Le parcours public actuel reste disponible.</span></span>
          </label>
          <label className="mt-2 flex cursor-pointer gap-3 rounded-2xl border border-emerald-200/70 bg-white/80 p-3 text-sm text-emerald-950">
            <input type="radio" name="before-access-mode" checked={accessMode === "invite_link"} onChange={() => onChange("invite_link")} />
            <span><strong className="block">Privée, sur invitation</strong><span className="text-xs text-emerald-900/65">Invisible dans les cartes, recherches, rapports et exports publics.</span></span>
          </label>
        </FieldShell>
        {accessMode === "invite_link" ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-950">
            <div className="flex items-start gap-2"><Link2 size={17} className="mt-0.5 shrink-0" /><p>Le lien donne seulement accès à une projection minimale. Toute inscription reste une demande à examiner par l’organisateur.</p></div>
            {!actionId ? <p className="mt-3 text-xs text-amber-900/75">Enregistrez d’abord la préparation pour générer le lien.</p> : (
              <div className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-2">
                  <CmmButton type="button" tone="primary" variant="pill" size="sm" onClick={() => void generateLink()} disabled={busy}>
                    {busy ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}{link?.active ? "Renouveler le lien" : "Générer le lien"}
                  </CmmButton>
                  {link?.active && link.url ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => void copyLink()}><>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "Copié" : "Copier"}</></CmmButton> : null}
                  {link?.active ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => void revokeLink()} disabled={busy}><X size={14} />Révoquer</CmmButton> : null}
                </div>
                {link?.active && link.url ? <p className="break-all rounded-xl bg-white/70 px-3 py-2 text-xs text-amber-950">{link.url}</p> : null}
              </div>
            )}
            {error ? <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">{error}</p> : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
