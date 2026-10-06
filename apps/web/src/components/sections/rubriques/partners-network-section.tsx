"use client";

import { ArrowRight, Handshake } from "lucide-react";
import { CmmButton } from "@/components/ui/cmm-button";
import { PageHeader } from "@/components/ui/page-header";
import { resolvePublicContactEmail } from "@/lib/email-config";
import { PartnersNetworkAside } from "./partners-network-aside";
import { PartnersNetworkDirectory } from "./partners-network-directory";

export function PartnersNetworkSection({ fr, showHeader = true }: { fr: boolean; showHeader?: boolean }) {
  const contactEmail = resolvePublicContactEmail() ?? "contact@cleanmymap.fr";

  return (
    <div className="space-y-6 text-slate-950">
      {showHeader ? <section className="space-y-4">
        <PageHeader
          title={
            <span className="inline-flex items-center gap-3">
              <Handshake className="h-6 w-6" aria-hidden="true" />
              <span>{fr ? "Partenaires" : "Partners"}</span>
            </span>
          }
          subtitle={
            fr
              ? "Consultez les fiches du référentiel partenaire."
              : "Browse the partner directory records."
          }
        />
        <p className="max-w-3xl text-base leading-[1.7] text-slate-800">
          {fr
            ? "Recherchez une structure par type, domaine ou niveau territorial, puis ouvrez l’annuaire pour consulter l’ensemble de ses sources."
            : "Search by type, field or territorial level, then open the directory to consult its full set of sources."}
        </p>
      </section> : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)]">
        <PartnersNetworkDirectory fr={fr} />
        <PartnersNetworkAside fr={fr} />
      </section>

      <section className="rounded-3xl border border-pink-200 bg-pink-50/70 p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-pink-700">
              <Handshake size={22} aria-hidden="true" />
            </div>
            <div className="max-w-2xl space-y-2">
              <h2 className="text-lg font-black leading-tight text-slate-950">
                {fr ? "Vous représentez une structure engagée ?" : "Do you represent an engaged organization?"}
              </h2>
              <p className="text-base leading-[1.7] text-slate-800">
                {fr
                  ? "Consultez l'annuaire, puis utilisez le parcours partenaire si vous souhaitez proposer une fiche."
                  : "Browse the directory, then use the partner path if you want to submit a record."}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <CmmButton
              href={`mailto:${contactEmail}`}
              tone="secondary"
              variant="pill"
              className="h-11 rounded-full border border-pink-200 bg-white px-5 cmm-text-small font-semibold text-pink-800 shadow-none"
            >
              {fr ? "Nous contacter" : "Contact us"}
              <ArrowRight size={16} />
            </CmmButton>

            <CmmButton
              href="/partners/onboarding"
              tone="primary"
              variant="pill"
              className="h-11 rounded-full bg-pink-600 px-5 cmm-text-small font-semibold text-white shadow-sm"
            >
              {fr ? "Devenir partenaire" : "Become a partner"}
            </CmmButton>
          </div>
        </div>
      </section>
    </div>
  );
}
