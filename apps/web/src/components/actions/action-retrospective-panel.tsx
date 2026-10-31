"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import {
  ACTION_RETROSPECTIVE_LIMITS,
  type ActionRetrospectiveDraftInput,
  type ActionRetrospectiveEditor,
} from "@/lib/actions/action-retrospective-contract";
import {
  fetchActionRetrospective,
  publishActionRetrospectiveDraft,
  saveActionRetrospectiveDraft,
} from "@/lib/actions/action-retrospective-http";

type ActionRetrospectivePanelProps = {
  actionId: string;
  actionPhase?: string | null;
  status?: string | null;
  fr: boolean;
};

type DraftField = keyof ActionRetrospectiveDraftInput;

const FIELDS: ReadonlyArray<{
  key: DraftField;
  label: string;
  limit: number;
  optional?: boolean;
}> = [
  { key: "workedWell", label: "Ce qui a bien fonctionné", limit: ACTION_RETROSPECTIVE_LIMITS.workedWell },
  { key: "blockers", label: "Ce qui nous a freinés", limit: ACTION_RETROSPECTIVE_LIMITS.blockers },
  { key: "improveNextTime", label: "À améliorer la prochaine fois", limit: ACTION_RETROSPECTIVE_LIMITS.improveNextTime },
  { key: "thanksMessage", label: "Message de remerciement", limit: ACTION_RETROSPECTIVE_LIMITS.thanksMessage, optional: true },
];

const EMPTY_DRAFT: ActionRetrospectiveDraftInput = {
  thanksMessage: null,
  workedWell: null,
  blockers: null,
  improveNextTime: null,
};

function draftFromEditor(editor: ActionRetrospectiveEditor | null): ActionRetrospectiveDraftInput {
  if (!editor) return EMPTY_DRAFT;
  return {
    thanksMessage: editor.thanksMessage,
    workedWell: editor.workedWell,
    blockers: editor.blockers,
    improveNextTime: editor.improveNextTime,
  };
}

function displayError(reason: unknown, fallback: string): string {
  return reason instanceof Error && reason.message.trim().length > 0 ? reason.message : fallback;
}

export function ActionRetrospectivePanel({
  actionId,
  actionPhase,
  status,
  fr,
}: ActionRetrospectivePanelProps) {
  const [draft, setDraft] = useState<ActionRetrospectiveDraftInput>(EMPTY_DRAFT);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [readStatus, setReadStatus] = useState<"loading" | "ready" | "error">("loading");
  const [readActionId, setReadActionId] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "publish" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const readRequestRef = useRef(0);

  const load = useCallback(async () => {
    const requestId = ++readRequestRef.current;
    setReadStatus("loading");
    setReadActionId(null);
    setDraft(EMPTY_DRAFT);
    setPublishedAt(null);
    setEditing(false);
    setBusy(null);
    setError(null);
    setNotice(null);
    try {
      const result = await fetchActionRetrospective(actionId);
      if (requestId !== readRequestRef.current) return;
      setDraft(draftFromEditor(result.retrospective));
      setPublishedAt(result.retrospective?.publishedAt ?? null);
      setEditing(!result.retrospective?.publishedAt);
      setReadActionId(actionId);
      setReadStatus("ready");
      setError(null);
    } catch (reason) {
      if (requestId !== readRequestRef.current) return;
      setReadActionId(actionId);
      setReadStatus("error");
      setError(displayError(reason, "Le retour d'expérience est indisponible."));
    }
  }, [actionId]);

  useEffect(() => {
    // The effect starts the authenticated read; the state updates represent its response/error lifecycle.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch((reason: unknown) => {
      setReadStatus("error");
      setReadActionId(actionId);
      setError(displayError(reason, "Le retour d'expérience est indisponible."));
    });
    return () => {
      readRequestRef.current += 1;
    };
  }, [actionId, load]);

  if (actionPhase !== "post_action_complete" || status === "rejected" || status === "cancelled") {
    return null;
  }

  const readReady = readStatus === "ready" && readActionId === actionId;
  const readFailed = readStatus === "error" && readActionId === actionId;

  const updateField = (key: DraftField, value: string) => {
    if (!readReady) return;
    setDraft((current) => ({ ...current, [key]: value.length > 0 ? value : null }));
    setNotice(null);
  };

  const saveDraft = async () => {
    if (!readReady) return;
    const requestId = readRequestRef.current;
    setBusy("save");
    setNotice(null);
    try {
      const saved = await saveActionRetrospectiveDraft(actionId, draft);
      if (requestId !== readRequestRef.current) return;
      setDraft(draftFromEditor(saved));
      setPublishedAt(saved.publishedAt);
      setEditing(Boolean(saved.publishedAt));
      setError(null);
      setNotice("Brouillon enregistré.");
    } catch (reason) {
      if (requestId !== readRequestRef.current) return;
      setError(displayError(reason, "Le brouillon n'a pas pu être enregistré."));
    } finally {
      if (requestId === readRequestRef.current) setBusy(null);
    }
  };

  const publishDraft = async () => {
    if (!readReady) return;
    const requestId = readRequestRef.current;
    setBusy("publish");
    setNotice(null);
    try {
      const published = await publishActionRetrospectiveDraft(actionId);
      if (requestId !== readRequestRef.current) return;
      setDraft(draftFromEditor(published));
      setPublishedAt(published.publishedAt);
      setEditing(false);
      setError(null);
      setNotice("Retour d'expérience publié.");
    } catch (reason) {
      if (requestId !== readRequestRef.current) return;
      setError(displayError(reason, "Le retour d'expérience n'a pas pu être publié."));
    } finally {
      if (requestId === readRequestRef.current) setBusy(null);
    }
  };

  return (
    <CmmCard tone="emerald" variant="outlined" size="md" data-testid="action-retrospective-panel">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-black text-emerald-950">Retour d&apos;expérience</h3>
          <p className="mt-1 text-sm text-emerald-800">
            {fr
              ? "Un retour déclaratif pour garder la mémoire de l'action. Il ne produit ni score ni classement."
              : "A declarative record of the action. It produces no score or ranking."}
          </p>
        </div>
        {!readReady && !readFailed ? <p role="status" className="text-sm text-emerald-800">Chargement du brouillon…</p> : null}
        {readFailed ? (
          <div className="space-y-3">
            <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error ?? "Le retour d'expérience est indisponible."}</p>
            <CmmButton type="button" tone="secondary" variant="pill" onClick={() => { void load(); }}>
              Réessayer
            </CmmButton>
          </div>
        ) : null}
        {readReady ? (
          <>
            <div className="space-y-3">
              {FIELDS.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-sm font-semibold text-slate-900">
                    {field.label}{field.optional ? " (facultatif)" : ""}
                  </span>
                  <textarea
                    value={draft[field.key] ?? ""}
                    maxLength={field.limit}
                    disabled={Boolean(publishedAt) && !editing}
                    onChange={(event) => updateField(field.key, event.target.value)}
                    rows={3}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                    aria-label={field.label}
                  />
                  <span className="mt-1 block text-right text-xs text-slate-500">
                    {(draft[field.key] ?? "").length}/{field.limit}
                  </span>
                </label>
              ))}
            </div>
            <div className="flex flex-wrap gap-2">
              {!publishedAt || editing ? (
                <CmmButton type="button" tone="secondary" variant="pill" disabled={!readReady || busy !== null} onClick={() => { saveDraft().catch((reason: unknown) => setError(displayError(reason, "Le brouillon n'a pas pu être enregistré."))); }}>
                  {busy === "save" ? "Enregistrement…" : "Enregistrer le brouillon"}
                </CmmButton>
              ) : (
                <CmmButton type="button" tone="secondary" variant="pill" onClick={() => setEditing(true)}>
                  Modifier
                </CmmButton>
              )}
              {!publishedAt ? (
                <CmmButton type="button" tone="primary" variant="pill" disabled={!readReady || busy !== null} onClick={() => { publishDraft().catch((reason: unknown) => setError(displayError(reason, "Le retour d'expérience n'a pas pu être publié."))); }}>
                  {busy === "publish" ? "Publication…" : "Publier"}
                </CmmButton>
              ) : (
                <span className="self-center text-sm font-semibold text-emerald-800">Publié — vous pouvez modifier puis enregistrer.</span>
              )}
            </div>
          </>
        ) : null}
        {notice ? <p role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900">{notice}</p> : null}
        {error && !readFailed ? <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">{error}</p> : null}
      </div>
    </CmmCard>
  );
}
