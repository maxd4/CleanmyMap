"use client";

import { ArrowRight, GitBranch, UserPlus, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import type {
  ReferralLineageNode,
  ReferralLineageView,
} from "@/lib/gamification/referral-lineage";
import { formatReferralLevel } from "@/lib/gamification/referral-lineage";

type ReferralLineagePanelProps = {
  title?: string;
  subtitle?: string;
  view: ReferralLineageView | null;
  errorMessage?: string | null;
  emptyCtaHref: string;
  emptyCtaLabel: string;
};

function ReferralLineageTreeNode({ node }: { node: ReferralLineageNode }) {
  return (
    <div className="space-y-3">
      <article className="rounded-[1.35rem] border border-white/8 bg-white/5 px-4 py-4 shadow-[0_14px_32px_-26px_rgba(0,0,0,0.45)]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/18 bg-amber-100/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-amber-100">
                <GitBranch size={11} />
                {formatReferralLevel(node.level)}
              </span>
              <h4 className="truncate text-sm font-black text-white">
                {node.displayName}
              </h4>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-amber-50/72">
              {node.referredByProfileId
                ? `Rattaché à ${node.referredByDisplayName ?? node.referredByProfileId}.`
                : "Racine de l'arborescence."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50/80">
              Directs {node.directInviteesCount}
            </span>
            <span className="rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.16em] text-amber-50/80">
              Descendants {node.descendantsCount}
            </span>
          </div>
        </div>
      </article>

      {node.children.length > 0 ? (
        <div className="space-y-3 pl-4 border-l border-amber-200/10">
          {node.children.map((child) => (
            <ReferralLineageTreeNode key={child.id} node={child} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ReferralLineagePanel({
  title = "Arborescence de parrainage",
  subtitle = "Visualisez le compte observé, ses ancêtres, puis les branches descendantes qui en dépendent.",
  view,
  errorMessage,
  emptyCtaHref,
  emptyCtaLabel,
}: ReferralLineagePanelProps) {
  if (errorMessage) {
    return (
      <section className="rounded-[2rem] border border-red-300/18 bg-[linear-gradient(180deg,rgba(52,17,17,0.96)_0%,rgba(22,8,8,0.98)_100%)] px-5 py-5 shadow-[0_22px_54px_-34px_rgba(0,0,0,0.45)]">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.24em] text-red-100/60">
            {title}
          </p>
          <h3 className="text-2xl font-black tracking-tight text-white">
            Impossible de charger la filiation pour le moment
          </h3>
          <p className="max-w-2xl text-sm leading-relaxed text-red-50/76">
            {errorMessage}
          </p>
          <CmmButton
            href={emptyCtaHref}
            tone="secondary"
            variant="pill"
            className="h-11 px-5 text-[11px] font-black gap-2"
          >
            <UserPlus size={14} />
            Revenir au parrainage
          </CmmButton>
        </div>
      </section>
    );
  }

  const shouldShowEmptyState =
    !view ||
    (!view.hasReferralCode &&
      !view.hasInvitedBy &&
      view.descendantsCount === 0);

  if (shouldShowEmptyState) {
    return (
      <section className="rounded-[2rem] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(40,20,4,0.92)_0%,rgba(21,12,6,0.96)_100%)] px-5 py-5 shadow-[0_22px_54px_-34px_rgba(0,0,0,0.45)]">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-amber-200/18 bg-amber-100/10 text-amber-100">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/60">
                {title}
              </p>
              <h3 className="mt-1 text-2xl font-black tracking-tight text-white">
                Aucun parrainage visible pour le moment
              </h3>
            </div>
          </div>

          <p className="max-w-2xl text-sm leading-relaxed text-amber-50/74">
            Le compte n&apos;a pas encore de lien ascendant ou descendant à
            afficher. Créez votre lien pour commencer la chaîne et faire
            apparaître l&apos;arborescence ici.
          </p>

          <CmmButton
            href={emptyCtaHref}
            tone="primary"
            variant="pill"
            className="h-11 px-5 text-[11px] font-black gap-2"
          >
            <UserPlus size={14} />
            {emptyCtaLabel}
            <ArrowRight size={13} />
          </CmmButton>
        </div>
      </section>
    );
  }

  const focusLevel = formatReferralLevel(0);

  return (
    <section className="rounded-[2rem] border border-amber-200/14 bg-[linear-gradient(180deg,rgba(40,20,4,0.92)_0%,rgba(21,12,6,0.96)_100%)] px-5 py-5 shadow-[0_22px_54px_-34px_rgba(0,0,0,0.45)]">
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-amber-100/60">
              {title}
            </p>
            <p className="mt-1 max-w-3xl text-sm leading-relaxed text-amber-50/72">
              {subtitle}
            </p>
            <h3 className="mt-1 text-2xl font-black tracking-tight text-white">
              Chaîne explicite et niveaux visibles
            </h3>
            <p className="mt-2 max-w-3xl text-sm leading-relaxed text-amber-50/72">
              Le compte observé reste au centre. En haut, les parrains
              successifs. En bas, les branches créées à partir de ce compte.
            </p>
          </div>
          <div className="grid gap-2 sm:min-w-[220px]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
                Connexions
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {view.totalConnectedCount} comptes liés
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
                Profondeur
              </p>
              <p className="mt-1 text-sm font-bold text-white">
                {view.maxDepth === 0
                  ? "Aucun niveau descendant"
                  : `${view.maxDepth} niveau${view.maxDepth > 1 ? "x" : ""}`}
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-5">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
              Niveau observé
            </p>
            <p className="mt-1 text-sm font-bold text-white">{focusLevel}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
              Parrain direct
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {view.focus.referredByDisplayName ?? "Aucun"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
              Filleuls directs
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {view.directInviteesCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
              Descendants
            </p>
            <p className="mt-1 text-sm font-bold text-white">
              {view.descendantsCount}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
              Code
            </p>
            <p className="mt-1 truncate text-sm font-bold text-white">
              {view.focus.referralCode ?? "Non créé"}
            </p>
          </div>
        </div>

        <div className="space-y-3 rounded-[1.6rem] border border-white/8 bg-black/18 px-4 py-4">
          <div className="flex items-center gap-2">
            <GitBranch size={15} className="text-amber-100/70" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-amber-100/70">
              Lignée ascendante
            </h4>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {view.ancestorChain.map((item, index) => (
              <div key={item.id} className="flex items-center gap-2">
                {index > 0 ? (
                  <ArrowRight size={13} className="text-amber-100/35" />
                ) : null}
                <div
                  className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${
                    item.level === 0
                      ? "border-amber-300/40 bg-amber-300/15 text-white"
                      : "border-white/10 bg-white/5 text-amber-50/82"
                  }`}
                >
                  {formatReferralLevel(item.level)} · {item.displayName}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[1.6rem] border border-white/8 bg-black/18 px-4 py-4">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-amber-100/70" />
            <h4 className="text-sm font-black uppercase tracking-[0.2em] text-amber-100/70">
              Arborescence descendante
            </h4>
          </div>

          {view.descendantTree.length === 0 ? (
            <div className="flex flex-col gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-4">
              <p className="text-sm font-semibold text-white">
                Aucun filleul encore pour ce compte.
              </p>
              <p className="text-sm leading-relaxed text-amber-50/72">
                Le lien existe, mais il n&apos;a pas encore permis de faire
                apparaître une branche descendante.
              </p>
              <CmmButton
                href={emptyCtaHref}
                tone="secondary"
                variant="pill"
                className="h-11 px-4 text-[11px] font-black gap-2"
              >
                <UserPlus size={14} />
                {emptyCtaLabel}
              </CmmButton>
            </div>
          ) : (
            <div className="space-y-4">
              {view.descendantTree.map((node) => (
                <ReferralLineageTreeNode key={node.id} node={node} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
