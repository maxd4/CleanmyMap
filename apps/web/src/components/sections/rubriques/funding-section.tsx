"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { HandCoins, Heart, Laptop, PackageCheck, ShieldCheck } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  DEFAULT_FUNDING_AMOUNT_CENTS,
  FUNDING_CATEGORY_DESCRIPTIONS,
  FUNDING_CATEGORY_LABELS,
  FUNDING_PRESET_AMOUNTS_CENTS,
  formatFundingAmount,
  type FundingCategory,
} from "@/lib/funding/config";

type FundingAggregate = { netAmountCents: number; currency: string };
type AggregateResponse = { categories: Record<FundingCategory, FundingAggregate> };
type CheckoutStatus = "idle" | FundingCategory;

const CATEGORY_ICONS = {
  equipment: PackageCheck,
  development: Laptop,
} satisfies Record<FundingCategory, typeof PackageCheck>;

const CATEGORY_BULLETS: Record<FundingCategory, { fr: string[]; en: string[] }> = {
  equipment: {
    fr: ["Équipement partagé et durable", "Logistique des actions terrain", "Prototypes et essais FabLab"],
    en: ["Shared and durable equipment", "Field action logistics", "FabLab prototypes and trials"],
  },
  development: {
    fr: ["Hébergement et domaine", "Services numériques et outils", "Maintenance et développement bénévole"],
    en: ["Hosting and domain", "Digital services and tools", "Maintenance and volunteer development"],
  },
};

function amountLabel(amountCents: number, locale: "fr" | "en") {
  return formatFundingAmount(amountCents, locale);
}

export function FundingSection() {
  const { locale } = useSitePreferences();
  const searchParams = useSearchParams();
  const fr = locale === "fr";
  const [aggregates, setAggregates] = useState<AggregateResponse | null>(null);
  const [aggregateState, setAggregateState] = useState<"loading" | "ready" | "error">("loading");
  const [checkoutStatus, setCheckoutStatus] = useState<CheckoutStatus>("idle");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [amounts, setAmounts] = useState<Record<FundingCategory, number>>({
    equipment: DEFAULT_FUNDING_AMOUNT_CENTS,
    development: DEFAULT_FUNDING_AMOUNT_CENTS,
  });
  const [confirmation, setConfirmation] = useState<"pending" | "confirmed" | null>(null);

  const status = searchParams.get("status");
  const sessionId = searchParams.get("session_id");

  async function loadAggregates() {
    setAggregateState("loading");
    try {
      const response = await fetch("/api/funding/aggregate", { cache: "no-store" });
      if (!response.ok) throw new Error("aggregate_unavailable");
      setAggregates((await response.json()) as AggregateResponse);
      setAggregateState("ready");
    } catch {
      setAggregateState("error");
    }
  }

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/funding/aggregate", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("aggregate_unavailable");
        return response.json() as Promise<AggregateResponse>;
      })
      .then((payload) => {
        if (!cancelled) {
          setAggregates(payload);
          setAggregateState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setAggregateState("error");
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (status !== "success") {
      return;
    }

    let cancelled = false;
    if (!sessionId) return () => { cancelled = true; };

    void fetch(`/api/funding/checkout-status?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { confirmed?: boolean } | null) => {
        if (!cancelled && payload?.confirmed) {
          setConfirmation("confirmed");
          void loadAggregates();
        }
      })
      .catch(() => undefined);

    return () => { cancelled = true; };
  }, [sessionId, status]);

  async function startCheckout(category: FundingCategory) {
    setCheckoutStatus(category);
    setCheckoutError(null);
    try {
      const response = await fetch("/api/funding/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, amountCents: amounts[category] }),
      });
      const payload = (await response.json().catch(() => null)) as { url?: string; error?: string } | null;
      if (!response.ok || !payload?.url) {
        throw new Error(payload?.error ?? "Le paiement Stripe est temporairement indisponible.");
      }
      const checkoutUrl = new URL(payload.url);
      if (checkoutUrl.protocol !== "https:" || checkoutUrl.hostname !== "checkout.stripe.com") {
        throw new Error("La redirection Stripe est invalide.");
      }
      window.location.assign(checkoutUrl.toString());
    } catch (error) {
      setCheckoutError(error instanceof Error ? error.message : "Le paiement Stripe est temporairement indisponible.");
      setCheckoutStatus("idle");
    }
  }

  const notice = useMemo(() => {
    if (status === "cancelled") {
      return { text: fr ? "Paiement annulé. Aucun montant n’a été confirmé." : "Payment cancelled. No amount was confirmed." };
    }
    if (status === "success" && confirmation === "confirmed") {
      return { text: fr ? "Contribution confirmée par CleanMyMap." : "Contribution confirmed by CleanMyMap." };
    }
    if (status === "success") {
      return { text: fr ? "Paiement reçu par Stripe · confirmation en cours." : "Payment received by Stripe · confirmation in progress." };
    }
    return null;
  }, [confirmation, fr, status]);

  return (
    <SectionShell
      id="funding"
      title={fr ? "Soutenir CleanMyMap" : "Support CleanMyMap"}
      subtitle={fr
        ? "Des contributions volontaires pour les actions terrain et le développement d’un outil indépendant."
        : "Voluntary contributions for field actions and the development of an independent tool."}
      icon={HandCoins}
      gradient="from-pink-500/20 via-indigo-500/10 to-transparent"
    >
      <div className="space-y-8" data-funding-page>
        {notice ? (
          <div className="rounded-2xl border border-pink-200/70 bg-white/80 px-5 py-4 text-sm font-semibold text-slate-800 shadow-sm" role="status" data-funding-return={status}>
            {notice.text}
          </div>
        ) : null}

        {checkoutError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-900" role="alert">
            {checkoutError}
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          {(Object.keys(FUNDING_CATEGORY_LABELS) as FundingCategory[]).map((category) => {
            const Icon = CATEGORY_ICONS[category];
            const aggregate = aggregates?.categories?.[category];
            const isLoading = checkoutStatus === category;
            return (
              <CmmCard key={category} as="article" tone={category === "equipment" ? "pink" : "indigo"} variant="elevated" size="lg" className="flex h-full flex-col gap-6" data-funding-card={category}>
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-2xl border border-pink-200/70 bg-white/80 p-3 text-pink-700">
                    <Icon size={24} aria-hidden="true" />
                  </div>
                  <div className="text-right">
                    <p className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-slate-500">{fr ? "Total collecté" : "Collected total"}</p>
                    {aggregateState === "loading" ? (
                      <p className="mt-2 text-sm font-semibold text-slate-500" aria-live="polite">{fr ? "Chargement…" : "Loading…"}</p>
                    ) : aggregateState === "error" ? (
                      <p className="mt-2 text-sm font-semibold text-red-700">{fr ? "Indisponible" : "Unavailable"}</p>
                    ) : (
                      <p className="mt-2 text-2xl font-black text-slate-950" data-funding-total={category}>
                        {formatFundingAmount(aggregate?.netAmountCents ?? 0, locale)}
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <h2 className="text-2xl font-black tracking-tight text-slate-950">{FUNDING_CATEGORY_LABELS[category][locale]}</h2>
                  <p className="text-sm leading-6 text-slate-800">{FUNDING_CATEGORY_DESCRIPTIONS[category][locale]}</p>
                </div>

                <ul className="space-y-2 text-sm font-medium text-slate-700">
                  {CATEGORY_BULLETS[category][locale].map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-pink-500" aria-hidden="true" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto space-y-4 border-t border-slate-200 pt-5">
                  <fieldset>
                    <legend className="cmm-text-caption font-semibold uppercase tracking-[0.18em] text-slate-500">{fr ? "Choisir un montant" : "Choose an amount"}</legend>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {FUNDING_PRESET_AMOUNTS_CENTS.map((amountCents) => (
                        <CmmButton
                          key={amountCents}
                          type="button"
                          tone={amounts[category] === amountCents ? "important" : "secondary"}
                          variant="pill"
                          size="sm"
                          ariaLabel={`${amountLabel(amountCents, locale)} — ${FUNDING_CATEGORY_LABELS[category][locale]}`}
                          ariaSelected={amounts[category] === amountCents}
                          onClick={() => setAmounts((current) => ({ ...current, [category]: amountCents }))}
                        >
                          {amountLabel(amountCents, locale)}
                        </CmmButton>
                      ))}
                    </div>
                  </fieldset>
                  <CmmButton
                    type="button"
                    tone="primary"
                    variant="pill"
                    width="wide"
                    loading={isLoading}
                    disabled={aggregateState === "error"}
                    onClick={() => void startCheckout(category)}
                    ariaLabel={fr ? `Soutenir ${FUNDING_CATEGORY_LABELS[category].fr}` : `Support ${FUNDING_CATEGORY_LABELS[category].en}`}
                  >
                    {isLoading
                      ? (fr ? "Redirection vers Stripe…" : "Redirecting to Stripe…")
                      : category === "equipment"
                        ? (fr ? "Soutenir le matériel" : "Support equipment")
                        : (fr ? "Soutenir le développement" : "Support development")}
                  </CmmButton>
                  {aggregateState === "error" ? (
                    <CmmButton type="button" tone="secondary" variant="ghost" width="wide" onClick={() => void loadAggregates()}>
                      {fr ? "Réessayer le chargement" : "Retry loading"}
                    </CmmButton>
                  ) : null}
                </div>
              </CmmCard>
            );
          })}
        </div>

        <CmmCard as="section" tone="slate" variant="outlined" size="lg" className="space-y-5" data-funding-allocation>
          <div className="flex items-start gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 text-slate-700">
              <ShieldCheck size={22} aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-950">{fr ? "Où va l’argent ?" : "Where does the money go?"}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-800">
                {fr
                  ? "Les contributions sont affectées à la catégorie choisie : matériel et logistique pour les actions terrain, ou hébergement, outils et dépenses nécessaires au fonctionnement et au développement. Les totaux publiés proviennent des paiements confirmés par Stripe, diminués des remboursements enregistrés."
                  : "Contributions are allocated to the selected category: equipment and logistics for field actions, or hosting, tools and expenses needed for operations and development. Published totals come from Stripe-confirmed payments, less recorded refunds."}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-2xl bg-pink-50 px-4 py-3 text-sm font-semibold text-slate-800">
            <Heart size={18} className="mt-0.5 shrink-0 text-pink-600" aria-hidden="true" />
            <p>{fr ? "La contribution soutient le projet mais ne donne aucun pouvoir sur la modération, les décisions éditoriales ou les règles de la plateforme." : "A contribution supports the project but gives no power over moderation, editorial decisions or platform rules."}</p>
          </div>
        </CmmCard>
      </div>
    </SectionShell>
  );
}
