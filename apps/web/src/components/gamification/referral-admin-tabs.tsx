"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Medal, Users } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import {
  buildReferralLineageLeaderboard,
  buildReferralLineageView,
  type ReferralLineageProfileRow,
} from "@/lib/gamification/referral-lineage";
import { ReferralLineagePanel } from "@/components/gamification/referral-lineage-panel";
import { buildProfileRoute } from "@/lib/accueil-pilotage-routes";

type ReferralAdminTabsProps = {
  profiles: ReferralLineageProfileRow[];
  defaultTab?: "search" | "largest";
  defaultUserId?: string | null;
};

type TabKey = "search" | "largest";

export function ReferralAdminTabs({
  profiles,
  defaultTab = "largest",
  defaultUserId = null,
}: ReferralAdminTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>(defaultTab);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    defaultUserId ?? profiles[0]?.id ?? "",
  );

  const leaderboard = useMemo(
    () => buildReferralLineageLeaderboard(profiles, 10),
    [profiles],
  );

  const selectedView = useMemo(
    () =>
      selectedUserId
        ? buildReferralLineageView(selectedUserId, profiles)
        : null,
    [profiles, selectedUserId],
  );

  const largestView = useMemo(
    () =>
      leaderboard[0]
        ? buildReferralLineageView(leaderboard[0].profile.id, profiles)
        : null,
    [leaderboard, profiles],
  );

  const selectedProfile =
    profiles.find((row) => row.id === selectedUserId) ?? null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 rounded-[1.4rem] border border-amber-200/14 bg-black/15 p-2">
        <CmmButton
          type="button"
          tone={activeTab === "search" ? "primary" : "secondary"}
          variant="pill"
          onClick={() => setActiveTab("search")}
          className="h-10 gap-2 px-4 text-[11px] font-black uppercase tracking-[0.18em]"
        >
          <Users size={14} />
          Recherche d&apos;un compte
        </CmmButton>
        <CmmButton
          type="button"
          tone={activeTab === "largest" ? "primary" : "secondary"}
          variant="pill"
          onClick={() => setActiveTab("largest")}
          className="h-10 gap-2 px-4 text-[11px] font-black uppercase tracking-[0.18em]"
        >
          <Medal size={14} />
          Plus grandes arborescences
        </CmmButton>
      </div>

      {activeTab === "search" ? (
        <div className="space-y-8">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-5">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-400/70">
                  Recherche d&apos;un compte
                </p>
                <h2 className="mt-3 text-4xl font-black tracking-tight text-white">
                  Choisir un utilisateur pour afficher son arbre
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-relaxed text-amber-100/45">
                  Sélectionnez un compte par son nom et visualisez la filiation
                  complète, avec les niveaux et les branches descendantes.
                </p>
              </div>

              <label className="space-y-2 rounded-[2rem] border border-white/8 bg-white/5 p-5">
                <span className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/60">
                  Utilisateur
                </span>
                <select
                  value={selectedUserId}
                  onChange={(event) => setSelectedUserId(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm font-semibold text-white outline-none"
                >
                  {profiles.map((row) => (
                    <option
                      key={row.id}
                      value={row.id}
                      className="bg-stone-950"
                    >
                      {row.display_name?.trim() || row.id}
                    </option>
                  ))}
                </select>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
                      Nom
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-white">
                      {selectedProfile?.display_name?.trim() ||
                        selectedProfile?.id ||
                        "—"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
                      Code
                    </p>
                    <p className="mt-1 truncate text-sm font-bold text-white">
                      {selectedView?.focus.referralCode ?? "Non créé"}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-black/18 px-4 py-3">
                    <p className="text-[9px] font-black uppercase tracking-[0.18em] text-amber-100/55">
                      Niveau max
                    </p>
                    <p className="mt-1 text-sm font-bold text-white">
                      {selectedView?.maxDepth ?? 0}
                    </p>
                  </div>
                </div>
              </label>

              <ul className="grid gap-3 text-sm text-amber-100/60 sm:grid-cols-2">
                {[
                  "Nom d'affichage du profil",
                  "Parrain direct et date de rattachement",
                  "Lignée ascendante avec niveaux",
                  "Branches descendantes et compteurs",
                ].map((item) => (
                  <li
                    key={item}
                    className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-[2.5rem] border border-white/8 bg-black/20 p-6 shadow-[0_24px_70px_-44px_rgba(0,0,0,0.6)]">
              <p className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-100/55">
                Téléchargement
              </p>
              <h3 className="mt-3 text-2xl font-black tracking-tight text-white">
                Exporter le CSV de filiation
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-amber-100/60">
                Ouvre un fichier directement téléchargeable pour explorer la
                filiation hors de l&apos;interface admin.
              </p>
              <div className="mt-6">
                <CmmButton
                  href="/api/admin/referrals.csv"
                  tone="primary"
                  variant="pill"
                  className="w-full justify-between px-5 py-4 text-[10px] font-black uppercase tracking-[0.2em]"
                >
                  <span>Télécharger l&apos;export CSV</span>
                  <span>↘</span>
                </CmmButton>
              </div>
            </div>
          </div>

          <ReferralLineagePanel
            view={selectedView}
            emptyCtaHref={`${buildProfileRoute(selectedUserId)}#parrainage`}
            emptyCtaLabel="Ouvrir le parrainage du compte"
          />
        </div>
      ) : (
        <div className="space-y-8">
          <div className="grid gap-3">
            {leaderboard.map((entry, index) => (
              <article
                key={entry.profile.id}
                className={`rounded-[1.8rem] border px-5 py-4 ${
                  index === 0
                    ? "border-amber-300/30 bg-amber-200/12"
                    : "border-white/8 bg-white/5"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-100/55">
                      #{index + 1} plus grande arborescence
                    </p>
                    <h4 className="mt-1 truncate text-lg font-black text-white">
                      {entry.profile.displayName}
                    </h4>
                    <p className="mt-1 text-sm text-amber-100/68">
                      {entry.descendantsCount} descendants, profondeur max{" "}
                      {entry.maxDepth}, {entry.directInviteesCount} filleuls
                      directs.
                    </p>
                  </div>
                  <CmmButton
                    type="button"
                    tone={index === 0 ? "primary" : "secondary"}
                    variant="pill"
                    onClick={() => {
                      setActiveTab("search");
                      setSelectedUserId(entry.profile.id);
                    }}
                    className="h-11 gap-2 px-4 text-[11px] font-black"
                  >
                    Voir l&apos;arborescence
                    <ArrowRight size={13} />
                  </CmmButton>
                </div>
              </article>
            ))}
          </div>

          {largestView ? (
            <ReferralLineagePanel
              view={largestView}
              emptyCtaHref={`${buildProfileRoute(largestView.focus.id)}#parrainage`}
              emptyCtaLabel="Ouvrir le parrainage du compte"
            />
          ) : null}
        </div>
      )}
    </div>
  );
}
