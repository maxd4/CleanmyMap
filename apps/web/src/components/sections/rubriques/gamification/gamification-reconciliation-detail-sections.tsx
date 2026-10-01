import type { ReactNode } from "react";
import { CmmButton } from "@/components/ui/cmm-button";
import type { ReconciliationDetailCopy, ReconciliationDetailMilestone, ReconciliationDetailProgression } from "./gamification-reconciliation-detail.model";

function DetailRow({ children, targetId, onFocusTarget, label }: { children: ReactNode; targetId: string | null; onFocusTarget: (targetId: string) => void; label: string }) {
  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-[#f0e3de] bg-[#fffaf9] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 text-sm text-[#5f4843]">{children}</div>
      {targetId ? <CmmButton type="button" tone="secondary" variant="pill" size="sm" onClick={() => onFocusTarget(targetId)}>{label}</CmmButton> : null}
    </li>
  );
}

function ProgressionRow({ item, fr, onFocusTarget }: { item: ReconciliationDetailProgression; fr: boolean; onFocusTarget: (targetId: string) => void }) {
  const status = item.kind === "added" ? (fr ? "Ajoutée" : "Added") : item.kind === "removed" ? (fr ? "Retirée" : "Removed") : (fr ? "Modifiée" : "Changed");
  return (
    <DetailRow targetId={item.targetId} onFocusTarget={onFocusTarget} label={fr ? "Voir cette progression" : "View this progression"}>
      <p className="font-black text-[#2c1a17]">{item.label} <span className="font-semibold text-[#a48d86]">· {status}</span></p>
      {item.beforeBadge || item.afterBadge ? <p className="mt-1">{fr ? "Palier" : "Tier"} : {item.beforeBadge ?? "—"} → {item.afterBadge ?? "—"}</p> : null}
      {item.afterValue ? <p className="mt-1">{fr ? "Valeur après" : "Value after"} : {item.afterValue}</p> : null}
      {item.xpImpact ? <p className="mt-1 font-semibold text-[#b4362e]">{item.xpImpact}</p> : null}
    </DetailRow>
  );
}

function MilestoneRow({ item, fr, onFocusTarget }: { item: ReconciliationDetailMilestone; fr: boolean; onFocusTarget: (targetId: string) => void }) {
  return (
    <DetailRow targetId={item.targetId} onFocusTarget={onFocusTarget} label={fr ? "Voir ce jalon" : "View this milestone"}>
      <p className="font-black text-[#2c1a17]">{item.label}</p>
      <p className="mt-1 text-[#765f59]">{item.reward}</p>
    </DetailRow>
  );
}

function ReasonSection({ copy, fr }: { copy: ReconciliationDetailCopy; fr: boolean }) {
  return (
    <section aria-labelledby="reconciliation-detail-reason">
      <h3 id="reconciliation-detail-reason" className="text-sm font-black text-[#2c1a17]">{copy.reasonTitle}</h3>
      <p className="mt-1 text-sm leading-6 text-[#765f59]">{copy.reasonDescription}</p>
      <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl bg-[#fff8f6] p-3"><dt className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Anciennes règles" : "Previous rules"}</dt><dd className="mt-1 font-bold text-[#5f4843]">{copy.previousRulesVersion}</dd></div>
        <div className="rounded-2xl bg-[#fff8f6] p-3"><dt className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Nouvelles règles" : "New rules"}</dt><dd className="mt-1 font-bold text-[#5f4843]">{copy.currentRulesVersion}</dd></div>
      </dl>
    </section>
  );
}

function XpSection({ copy, fr }: { copy: ReconciliationDetailCopy; fr: boolean }) {
  return (
    <section aria-labelledby="reconciliation-detail-xp">
      <h3 id="reconciliation-detail-xp" className="text-sm font-black text-[#2c1a17]">XP</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-[#ead8d2] p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Avant" : "Before"}</p><p className="mt-1 text-lg font-black text-[#2c1a17]">{copy.xpBefore}</p></div>
        <div className="rounded-2xl border border-[#ead8d2] p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Après" : "After"}</p><p className="mt-1 text-lg font-black text-[#2c1a17]">{copy.xpAfter}</p></div>
        <div className="rounded-2xl border border-[#f1c1b7] bg-[#fff5f2] p-3"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#b4362e]">{fr ? "Différence" : "Difference"}</p><p className="mt-1 text-lg font-black text-[#c51f1f]">{copy.xpDelta}</p></div>
      </div>
      <p className="mt-3 text-sm leading-6 text-[#765f59]">{copy.xpExplanation}</p>
    </section>
  );
}

function LevelSection({ copy, fr }: { copy: ReconciliationDetailCopy; fr: boolean }) {
  return (
    <section aria-labelledby="reconciliation-detail-level">
      <h3 id="reconciliation-detail-level" className="text-sm font-black text-[#2c1a17]">{fr ? "Niveau" : "Level"}</h3>
      <p className="mt-2 text-sm text-[#765f59]">{fr ? "Avant" : "Before"} : <strong>{copy.levelBefore}</strong> · {fr ? "Après" : "After"} : <strong>{copy.levelAfter}</strong></p>
      {copy.levelDownExplanation ? <p className="mt-2 rounded-2xl bg-[#fff8f6] p-3 text-sm leading-6 text-[#765f59]">{copy.levelDownExplanation}</p> : null}
    </section>
  );
}

function ProgressionsSection({ copy, fr, onFocusTarget }: { copy: ReconciliationDetailCopy; fr: boolean; onFocusTarget: (targetId: string) => void }) {
  const hasProgressions = copy.progressions.length > 0;
  return (
    <section aria-labelledby="reconciliation-detail-progressions">
      <h3 id="reconciliation-detail-progressions" className="text-sm font-black text-[#2c1a17]">{fr ? "Progressions modifiées" : "Changed progressions"}</h3>
      {hasProgressions ? <ul className="mt-3 space-y-2">{copy.progressions.map((item, index) => <ProgressionRow key={`${item.label}-${item.kind}-${index}`} item={item} fr={fr} onFocusTarget={onFocusTarget} />)}</ul> : <p className="mt-2 text-sm text-[#806b65]">{fr ? "Aucune progression n’a été modifiée." : "No progression was changed."}</p>}
    </section>
  );
}

function BadgesSection({ copy, fr }: { copy: ReconciliationDetailCopy; fr: boolean }) {
  const hasBadges = copy.badges.obtained.length > 0 || copy.badges.gradeChanges.length > 0 || copy.badges.removed.length > 0;
  return (
    <section aria-labelledby="reconciliation-detail-badges">
      <h3 id="reconciliation-detail-badges" className="text-sm font-black text-[#2c1a17]">Badges</h3>
      {hasBadges ? <div className="mt-3 space-y-3 text-sm text-[#5f4843]">
        {copy.badges.obtained.length > 0 ? <p><strong>{fr ? "Obtenus" : "Obtained"} :</strong> {copy.badges.obtained.join(" · ")}</p> : null}
        {copy.badges.gradeChanges.length > 0 ? <p><strong>{fr ? "Changements de grade" : "Grade changes"} :</strong> {copy.badges.gradeChanges.map((item) => `${item.from} → ${item.to}`).join(" · ")}</p> : null}
        {copy.badges.removed.length > 0 ? <p><strong>{fr ? "Retirés selon les règles CURRENT" : "Removed under CURRENT rules"} :</strong> {copy.badges.removed.join(" · ")}</p> : null}
      </div> : <p className="mt-2 text-sm text-[#806b65]">{fr ? "Aucun badge modifié." : "No badge changed."}</p>}
    </section>
  );
}

function MilestonesSection({ copy, fr, onFocusTarget }: { copy: ReconciliationDetailCopy; fr: boolean; onFocusTarget: (targetId: string) => void }) {
  const hasMilestones = copy.milestones.withXp.length > 0 || copy.milestones.recognition.length > 0 || copy.milestones.removed.length > 0;
  return (
    <section aria-labelledby="reconciliation-detail-milestones">
      <h3 id="reconciliation-detail-milestones" className="text-sm font-black text-[#2c1a17]">{fr ? "Jalons" : "Milestones"}</h3>
      {hasMilestones ? <div className="mt-3 space-y-4">
        {copy.milestones.withXp.length > 0 ? <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Nouveaux jalons avec XP" : "New milestones with XP"}</p><ul className="mt-2 space-y-2">{copy.milestones.withXp.map((item) => <MilestoneRow key={item.label} item={item} fr={fr} onFocusTarget={onFocusTarget} />)}</ul></div> : null}
        {copy.milestones.recognition.length > 0 ? <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#a48d86]">{fr ? "Nouveaux jalons de reconnaissance" : "New recognition milestones"}</p><ul className="mt-2 space-y-2">{copy.milestones.recognition.map((item) => <MilestoneRow key={item.label} item={item} fr={fr} onFocusTarget={onFocusTarget} />)}</ul></div> : null}
        {copy.milestones.removed.length > 0 ? <p className="text-sm text-[#5f4843]"><strong>{fr ? "Jalons retirés" : "Removed milestones"} :</strong> {copy.milestones.removed.join(" · ")}</p> : null}
      </div> : <p className="mt-2 text-sm text-[#806b65]">{fr ? "Aucun jalon modifié." : "No milestone changed."}</p>}
    </section>
  );
}

export function ReconciliationDetailSections({ copy, fr, onFocusTarget }: { copy: ReconciliationDetailCopy; fr: boolean; onFocusTarget: (targetId: string) => void }) {
  return (
    <div className="mt-5 space-y-6">
      <ReasonSection copy={copy} fr={fr} />
      <XpSection copy={copy} fr={fr} />
      <LevelSection copy={copy} fr={fr} />
      <ProgressionsSection copy={copy} fr={fr} onFocusTarget={onFocusTarget} />
      <BadgesSection copy={copy} fr={fr} />
      <MilestonesSection copy={copy} fr={fr} onFocusTarget={onFocusTarget} />
    </div>
  );
}
