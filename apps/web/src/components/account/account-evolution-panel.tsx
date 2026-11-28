"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSWRConfig } from "swr";
import { CheckCircle2, Clock3, FileClock, ShieldCheck, XCircle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";
import { PromotionRequestForm } from "@/components/sections/rubriques/promotion-request-form";
import {
  getRequestablePromotionRoles,
  type PromotionRequestTargetRole,
} from "@/lib/account/promotion-request-contract";
import { getProfileLabel, type AppProfile } from "@/lib/profiles";

export type AccountEvolutionRequest = {
  createdAt: string;
  requestedRole: PromotionRequestTargetRole;
  status: "pending_owner_review" | "accepted" | "rejected";
  reviewedAt: string | null;
};

type AccountEvolutionPanelProps = {
  userId: string;
  currentRole: AppProfile;
  activeRole: AppProfile;
  initialRequest: AccountEvolutionRequest | null;
  initialStatusAvailable: boolean;
};

type StatusResponse = {
  items?: AccountEvolutionRequest[];
};

const STATUS_COPY: Record<AccountEvolutionRequest["status"], {
  label: string;
  description: string;
  className: string;
}> = {
  pending_owner_review: {
    label: "Demande en cours d’examen",
    description: "L’équipe IMU examine votre demande. Une nouvelle demande n’est pas possible pendant cet examen.",
    className: "border-amber-300/30 bg-amber-300/10 cmm-text-warning",
  },
  accepted: {
    label: "Demande acceptée",
    description: "Votre niveau est mis à jour après synchronisation du compte.",
    className: "border-emerald-300/30 bg-emerald-300/10 cmm-text-success",
  },
  rejected: {
    label: "Demande refusée",
    description: "Vous pouvez déposer une nouvelle demande si votre niveau actuel l’autorise.",
    className: "border-rose-300/30 bg-rose-300/10 cmm-text-danger",
  },
};

function formatDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function StatusIcon({ status }: { status: AccountEvolutionRequest["status"] }) {
  if (status === "pending_owner_review") return <Clock3 className="h-5 w-5" aria-hidden="true" />;
  if (status === "accepted") return <CheckCircle2 className="h-5 w-5" aria-hidden="true" />;
  return <XCircle className="h-5 w-5" aria-hidden="true" />;
}

export function AccountEvolutionPanel({
  userId,
  currentRole,
  activeRole,
  initialRequest,
  initialStatusAvailable,
}: AccountEvolutionPanelProps) {
  const { mutate } = useSWRConfig();
  const [latestRequest, setLatestRequest] = useState<AccountEvolutionRequest | null>(initialRequest);
  const [statusAvailable, setStatusAvailable] = useState(initialStatusAvailable);
  const [isRefreshing, setIsRefreshing] = useState(!initialStatusAvailable);
  const requestVersion = useRef(0);
  const renderedUserId = useRef(userId);
  useEffect(() => {
    if (renderedUserId.current !== userId) {
      renderedUserId.current = userId;
      requestVersion.current += 1;
      setLatestRequest(initialRequest);
      setStatusAvailable(initialStatusAvailable);
    }
  }, [userId, initialRequest, initialStatusAvailable]);

  const refreshStatus = useCallback(async () => {
    const version = ++requestVersion.current;
    const requestUserId = userId;
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/account/promotion-requests", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("status_unavailable");
      const payload = (await response.json()) as StatusResponse;
      const latest = payload.items?.[0] ?? null;
      if (version !== requestVersion.current || requestUserId !== renderedUserId.current) return;
      setLatestRequest(latest);
      setStatusAvailable(true);
      void mutate(
        ["account-promotion-requests", userId],
        latest?.status === "pending_owner_review",
        { revalidate: false },
      );
    } catch {
      if (version === requestVersion.current && requestUserId === renderedUserId.current) setStatusAvailable(false);
    } finally {
      if (version === requestVersion.current && requestUserId === renderedUserId.current) setIsRefreshing(false);
    }
  }, [mutate, userId]);

  useEffect(() => {
    if (!initialStatusAvailable) {
      void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ Promise.resolve().then(() => refreshStatus()).catch(() => undefined);
    }
  }, [initialStatusAvailable, refreshStatus]);

  const statusCopy = latestRequest ? STATUS_COPY[latestRequest.status] : null;
  const canRequest = getRequestablePromotionRoles(currentRole).length > 0;
  const isAcceptedSynchronized =
    latestRequest?.status === "accepted" && latestRequest.requestedRole === currentRole;
  const isAcceptedAwaitingSynchronization =
    latestRequest?.status === "accepted" && !isAcceptedSynchronized;
  const showForm =
    statusAvailable &&
    !isRefreshing &&
    canRequest &&
    (!latestRequest || latestRequest.status === "rejected" || isAcceptedSynchronized);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <CmmCard className="space-y-3">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-400" aria-hidden="true" />
            <div>
              <p className="cmm-text-small font-bold uppercase tracking-[0.14em] cmm-text-secondary">Niveau obtenu</p>
              <p className="mt-1 text-2xl font-black cmm-text-primary">{getProfileLabel(currentRole, "fr")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed cmm-text-primary">
            Ce niveau correspond au rôle accordé au compte. Il détermine les autorisations disponibles.
          </p>
        </CmmCard>

        <CmmCard className="space-y-3">
          <div className="flex items-center gap-3">
            <FileClock className="h-6 w-6 text-orange-300" aria-hidden="true" />
            <div>
              <p className="cmm-text-small font-bold uppercase tracking-[0.14em] cmm-text-secondary">Identité active</p>
              <p className="mt-1 text-2xl font-black cmm-text-primary">{getProfileLabel(activeRole, "fr")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed cmm-text-primary">
            Le rôle utilisé pour votre navigation peut être différent du niveau obtenu ; il ne donne aucun droit supplémentaire.
          </p>
        </CmmCard>
      </div>

      <CmmCard className="space-y-3">
        <h2 className="text-xl font-bold cmm-text-primary">Demande de niveau</h2>
        <div className="space-y-3">
          <p className="text-sm leading-relaxed cmm-text-primary">
            Les personas ouverts sont Bénévole, Coordinateur, Scientifique et Entreprise. Les rôles obtenus sont Élu·e et Administrateur, après examen par IMU. IMU reste hors de ce parcours.
          </p>
          <p className="text-sm leading-relaxed cmm-text-primary">
            Une demande ne modifie jamais votre niveau obtenu. Seule l’acceptation par IMU déclenche la synchronisation du compte.
          </p>
        </div>
        {canRequest && <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Guide des niveaux obtenus">
          {(["elu", "admin"] as const).map((role) => {
            const canRequest = getRequestablePromotionRoles(currentRole).includes(role);
            return (
              <div key={role} className="rounded-2xl border border-current/10 p-4">
                <p className="text-sm font-bold cmm-text-primary">{getProfileLabel(role, "fr")}</p>
                <p className="mt-1 text-sm leading-relaxed cmm-text-primary">
                  {role === "elu"
                    ? "Niveau obtenu après examen pour les besoins de gouvernance territoriale."
                    : "Niveau obtenu après examen pour les besoins de supervision et de modération."}
                </p>
                {canRequest && <p className="mt-2 text-sm font-semibold cmm-text-primary">Demande possible dans le formulaire ci-dessous.</p>}
              </div>
            );
          })}
        </div>}
        {isRefreshing ? (
          <p className="mt-6 rounded-2xl border border-current/10 p-5 text-sm cmm-text-secondary" role="status">
            Vérification de votre demande…
          </p>
        ) : !statusAvailable ? (
          <div className="mt-6 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-5 text-sm cmm-text-danger">
            <p>Le statut de votre demande est indisponible. Le formulaire reste fermé par sécurité.</p>
            <CmmButton type="button" tone="secondary" variant="pill" className="mt-4" onClick={() => { void /* fire-and-forget -- UI event boundary delegates to the existing stateful action. */ refreshStatus(); }}>
              Réessayer
            </CmmButton>
          </div>
        ) : latestRequest?.status === "pending_owner_review" ? (
          <div className={`mt-6 flex items-start gap-3 rounded-2xl border p-5 ${statusCopy?.className ?? ""}`}>
            <StatusIcon status="pending_owner_review" />
            <div>
              <p className="font-bold">{statusCopy?.label}</p>
              <p className="mt-1 text-sm text-current/90">{statusCopy?.description}</p>
            </div>
          </div>
        ) : isAcceptedAwaitingSynchronization ? (
          <div className="mt-6 rounded-2xl border border-amber-300/25 bg-amber-300/10 p-5 text-sm cmm-text-warning">
            Demande acceptée. La synchronisation de votre niveau est encore en cours ; le formulaire reste fermé.
          </div>
        ) : showForm ? (
          <div className="mt-6">
            <PromotionRequestForm currentRole={currentRole} onSubmitted={refreshStatus} />
          </div>
        ) : latestRequest?.status === "accepted" ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-5 text-sm cmm-text-success">
            Le niveau affiché ci-dessus est la source d’autorité du compte après synchronisation.
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-current/10 p-5 text-sm cmm-text-secondary">
            {canRequest
              ? "Le formulaire est momentanément indisponible."
              : "Votre niveau ne nécessite pas de demande de promotion supplémentaire."}
          </div>
        )}
      </CmmCard>

      <CmmCard className="space-y-3"><h2 className="font-bold cmm-text-primary">Changer de rôle actif</h2><p className="text-sm cmm-text-secondary">Le changement de rôle ne modifie pas le niveau obtenu.</p><div className="flex flex-wrap gap-2"><CmmButton href={`${buildProfileRoute(activeRole)}?tab=account`} tone="primary">Rôles disponibles</CmmButton><CmmButton href="/dashboard" tone="secondary">Mon espace</CmmButton></div></CmmCard>
      {latestRequest ? (
        <CmmCard className="space-y-3">
          <div className={`flex items-start gap-3 rounded-2xl border p-5 ${statusCopy?.className ?? ""}`}>
            <StatusIcon status={latestRequest.status} />
            <div className="min-w-0 space-y-3">
              <p className="font-bold">{statusCopy?.label}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="text-current/90">Rôle demandé</dt><dd className="font-semibold">{getProfileLabel(latestRequest.requestedRole, "fr")}</dd></div>
                <div><dt className="text-current/90">Demandée le</dt><dd className="font-semibold">{formatDate(latestRequest.createdAt)}</dd></div>
                <div><dt className="text-current/90">État depuis</dt><dd className="font-semibold">{formatDate(latestRequest.reviewedAt ?? latestRequest.createdAt)}</dd></div>
              </dl>
              <p className="text-sm text-current/90">{statusCopy?.description}</p>
            </div>
          </div>
        </CmmCard>
      ) : null}
    </div>
  );
}
