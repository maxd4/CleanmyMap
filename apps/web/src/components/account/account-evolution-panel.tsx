"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock3, FileClock, ShieldCheck, XCircle } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { FamilyRubriqueCard } from "@/components/ui/family-rubrique-card";
import { PromotionRequestForm } from "@/components/sections/rubriques/promotion-request-form";
import {
  getRequestablePromotionRoles,
  type PromotionRequestTargetRole,
} from "@/lib/account/promotion-request-contract";
import { getProfileLabel, type AppProfile } from "@/lib/profiles";
import { ACCOUNT_EVOLUTION_ROUTE } from "@/lib/accueil-pilotage-routes";

export type AccountEvolutionRequest = {
  createdAt: string;
  requestedRole: PromotionRequestTargetRole;
  status: "pending_owner_review" | "accepted" | "rejected";
  reviewedAt: string | null;
};

type AccountEvolutionPanelProps = {
  currentRole: AppProfile;
  activeProfile: AppProfile;
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
    className: "border-amber-300/30 bg-amber-300/10 text-amber-50",
  },
  accepted: {
    label: "Demande acceptée",
    description: "Votre niveau est mis à jour après synchronisation du compte.",
    className: "border-emerald-300/30 bg-emerald-300/10 text-emerald-50",
  },
  rejected: {
    label: "Demande refusée",
    description: "Vous pouvez déposer une nouvelle demande si votre niveau actuel l’autorise.",
    className: "border-rose-300/30 bg-rose-300/10 text-rose-50",
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
  currentRole,
  activeProfile,
  initialRequest,
  initialStatusAvailable,
}: AccountEvolutionPanelProps) {
  const [latestRequest, setLatestRequest] = useState<AccountEvolutionRequest | null>(initialRequest);
  const [statusAvailable, setStatusAvailable] = useState(initialStatusAvailable);
  const [isRefreshing, setIsRefreshing] = useState(!initialStatusAvailable);

  const refreshStatus = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const response = await fetch("/api/account/promotion-requests", {
        headers: { Accept: "application/json" },
      });
      if (!response.ok) throw new Error("status_unavailable");
      const payload = (await response.json()) as StatusResponse;
      setLatestRequest(payload.items?.[0] ?? null);
      setStatusAvailable(true);
    } catch {
      setStatusAvailable(false);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialStatusAvailable) {
      void Promise.resolve().then(() => refreshStatus());
    }
  }, [initialStatusAvailable, refreshStatus]);

  const statusCopy = latestRequest ? STATUS_COPY[latestRequest.status] : null;
  const canRequest = getRequestablePromotionRoles(currentRole).length > 0;
  const showForm =
    statusAvailable &&
    !isRefreshing &&
    canRequest &&
    (!latestRequest || latestRequest.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <FamilyRubriqueCard withTopBar={true} topBarContent="Mon niveau de compte" className="p-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-6 w-6 text-amber-400" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100/60">Niveau obtenu</p>
              <p className="mt-1 text-2xl font-black text-white">{getProfileLabel(currentRole, "fr")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-amber-50/72">
            Ce niveau correspond au rôle accordé au compte. Il détermine les autorisations disponibles.
          </p>
        </FamilyRubriqueCard>

        <FamilyRubriqueCard withTopBar={true} topBarContent="Rôle actuellement utilisé" className="p-6">
          <div className="flex items-center gap-3">
            <FileClock className="h-6 w-6 text-orange-300" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-100/60">Identité active</p>
              <p className="mt-1 text-2xl font-black text-white">{getProfileLabel(activeProfile, "fr")}</p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-amber-50/72">
            Le rôle utilisé pour votre navigation peut être différent du niveau obtenu ; il ne donne aucun droit supplémentaire.
          </p>
        </FamilyRubriqueCard>
      </div>

      <FamilyRubriqueCard withTopBar={true} topBarContent="Faire évoluer mon compte" className="p-6 sm:p-8">
        <div className="space-y-3">
          <p className="text-sm leading-relaxed text-amber-50/78">
            Les rôles ouverts sont Bénévole, Association, Scientifique et Entreprise. Les rôles obtenus sont Élu·e et Administrateur, après examen par IMU. IMU reste hors de ce parcours.
          </p>
          <p className="text-sm leading-relaxed text-amber-50/60">
            Une demande ne modifie jamais votre niveau obtenu. Seule l’acceptation par IMU déclenche la synchronisation du compte.
          </p>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2" aria-label="Guide des niveaux obtenus">
          {(["elu", "admin"] as const).map((role) => {
            const canRequest = getRequestablePromotionRoles(currentRole).includes(role);
            return (
              <div key={role} className="rounded-2xl border border-amber-200/16 bg-white/[0.05] p-4">
                <p className="text-sm font-bold text-white">{getProfileLabel(role, "fr")}</p>
                <p className="mt-1 text-sm leading-relaxed text-amber-50/65">
                  {role === "elu"
                    ? "Niveau obtenu après examen pour les besoins de gouvernance territoriale."
                    : "Niveau obtenu après examen pour les besoins de supervision et de modération."}
                </p>
                {canRequest ? (
                  <CmmButton
                    href={ACCOUNT_EVOLUTION_ROUTE}
                    tone={role === "elu" ? "secondary" : "tertiary"}
                    variant="pill"
                    className="mt-3 min-h-10 px-3 text-xs"
                  >
                    Demander ce niveau
                  </CmmButton>
                ) : null}
              </div>
            );
          })}
        </div>
        {isRefreshing ? (
          <p className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-amber-50/70" role="status">
            Vérification de votre demande…
          </p>
        ) : !statusAvailable ? (
          <div className="mt-6 rounded-2xl border border-rose-300/25 bg-rose-300/10 p-5 text-sm text-rose-50">
            <p>Le statut de votre demande est indisponible. Le formulaire reste fermé par sécurité.</p>
            <CmmButton type="button" tone="secondary" variant="pill" className="mt-4" onClick={() => void refreshStatus()}>
              Réessayer
            </CmmButton>
          </div>
        ) : latestRequest?.status === "pending_owner_review" ? (
          <div className={`mt-6 flex items-start gap-3 rounded-2xl border p-5 ${statusCopy?.className ?? ""}`}>
            <StatusIcon status="pending_owner_review" />
            <div>
              <p className="font-bold">{statusCopy?.label}</p>
              <p className="mt-1 text-sm opacity-80">{statusCopy?.description}</p>
            </div>
          </div>
        ) : latestRequest?.status === "accepted" ? (
          <div className="mt-6 rounded-2xl border border-emerald-300/25 bg-emerald-300/10 p-5 text-sm text-emerald-50">
            Le niveau affiché ci-dessus est la source d’autorité du compte après synchronisation.
          </div>
        ) : showForm ? (
          <div className="mt-6">
            <PromotionRequestForm currentRole={currentRole} onSubmitted={refreshStatus} />
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-amber-50/70">
            {canRequest
              ? "Le formulaire est momentanément indisponible."
              : "Votre niveau ne nécessite pas de demande de promotion supplémentaire."}
          </div>
        )}
      </FamilyRubriqueCard>

      {latestRequest ? (
        <FamilyRubriqueCard withTopBar={true} topBarContent="Ma demande" className="p-6 sm:p-8">
          <div className={`flex items-start gap-3 rounded-2xl border p-5 ${statusCopy?.className ?? ""}`}>
            <StatusIcon status={latestRequest.status} />
            <div className="min-w-0 space-y-3">
              <p className="font-bold">{statusCopy?.label}</p>
              <dl className="grid gap-3 text-sm sm:grid-cols-3">
                <div><dt className="opacity-70">Rôle demandé</dt><dd className="font-semibold">{getProfileLabel(latestRequest.requestedRole, "fr")}</dd></div>
                <div><dt className="opacity-70">Demandée le</dt><dd className="font-semibold">{formatDate(latestRequest.createdAt)}</dd></div>
                <div><dt className="opacity-70">État depuis</dt><dd className="font-semibold">{formatDate(latestRequest.reviewedAt ?? latestRequest.createdAt)}</dd></div>
              </dl>
              <p className="text-sm opacity-80">{statusCopy?.description}</p>
            </div>
          </div>
        </FamilyRubriqueCard>
      ) : null}
    </div>
  );
}
