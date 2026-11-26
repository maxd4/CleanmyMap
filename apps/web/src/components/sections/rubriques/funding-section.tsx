"use client";

import { useSearchParams } from "next/navigation";
import { HandCoins, Heart, Laptop, PackageCheck, ShieldCheck, ArrowRight, Users } from "lucide-react";
import { useSitePreferences } from "@/components/ui/site-preferences-provider";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { SectionShell } from "@/components/sections/rubriques/shared";
import {
  FUNDING_CATEGORIES, FUNDING_CATEGORY_DESCRIPTIONS, FUNDING_CATEGORY_LABELS,
  formatFundingAmount, resolveOnParticipeFundingDestination,
} from "@/lib/funding/config";
import { useFundingPublicSummary } from "./use-funding-public-summary";

type FundingSectionProps = { onParticipeUrl?: string; headingLevel?: "h1" | "h2" };
const ICONS = { equipment: PackageCheck, development: Laptop };
const USES = {
  equipment: { fr: ["Équipement partagé et durable", "Logistique des actions", "Prototypes et essais FabLab"], en: ["Shared durable equipment", "Field action logistics", "FabLab prototypes and trials"] },
  development: { fr: ["Hébergement et domaine", "Services numériques et outils", "Maintenance et développement bénévole"], en: ["Hosting and domain", "Digital services and tools", "Maintenance and volunteer development"] },
};

function PaymentNotice({ status, state, fr }: { status: string | null; state: ReturnType<typeof useFundingPublicSummary>["returnState"]; fr: boolean }) {
  if (status !== "success" && status !== "cancelled") return null;
  const messages = {
    checking: fr ? "Vérification du retour de paiement en cours." : "Checking the payment return.",
    pending: fr ? "Confirmation du paiement en attente. Aucun montant n’est encore confirmé pour cette session." : "Payment confirmation pending. No amount has yet been confirmed for this session.",
    unavailable: fr ? "Retour de paiement non vérifié. La confirmation est indisponible." : "Unverified payment return. Confirmation is unavailable.",
    paid: fr ? "Contribution confirmée par CleanMyMap." : "Contribution confirmed by CleanMyMap.",
    partially_refunded: fr ? "Contribution confirmée, partiellement remboursée." : "Confirmed contribution, partially refunded.",
    refunded: fr ? "Contribution intégralement remboursée." : "Contribution fully refunded.",
  };
  return <p role="status" data-funding-return={status} className="rounded-lg border border-[var(--cmm-surface-border)] p-3 text-sm cmm-text-primary">
    {status === "cancelled" ? (fr ? "Parcours de paiement annulé. Aucun encaissement n’est confirmé par ce retour." : "Payment flow cancelled. This return confirms no payment.") : messages[state]}
  </p>;
}

export function FundingSection({ onParticipeUrl, headingLevel = "h1" }: FundingSectionProps) {
  const { locale } = useSitePreferences();
  const fr = locale === "fr";
  const searchParams = useSearchParams();
  const status = searchParams.get("status");
  const onParticipe = resolveOnParticipeFundingDestination(onParticipeUrl);
  const summary = useFundingPublicSummary(status, searchParams.get("session_id"));
  const aggregate = summary.aggregate;
  const total = aggregate ? FUNDING_CATEGORIES.reduce((sum, category) => sum + aggregate.categories[category].netAmountCents, 0) : null;
  const formattedUpdatedAt = aggregate?.updatedAt
    ? new Intl.DateTimeFormat(fr ? "fr-FR" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(aggregate.updatedAt)) + " UTC"
    : null;

  return (
    <SectionShell id="funding" title={fr ? "Soutenir CleanMyMap" : "Support CleanMyMap"}
      subtitle={fr ? "Aider les collectes citoyennes et maintenir un outil indépendant, accessible à tous." : "Support citizen cleanups and maintain an independent, accessible tool."}
      icon={HandCoins} headingLevel={headingLevel} gradient="from-transparent via-transparent to-transparent">
      <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6" data-funding-page>
        <PaymentNotice status={status} state={summary.returnState} fr={fr} />

        <CmmCard as="section" tone="family" variant="default" size="lg" className="space-y-4" data-funding-campaign>
          <div className="flex items-start gap-3">
            <Heart size={26} className="shrink-0 cmm-text-primary" aria-hidden="true" />
            <div className="space-y-2">
              <h2 className="text-xl font-bold cmm-text-primary">{fr ? "Contribuer au projet" : "Contribute to the project"}</h2>
              <p className="text-sm leading-relaxed cmm-text-primary">{fr ? "Une contribution volontaire aide à financer les besoins de terrain et les coûts réels de fonctionnement. CleanMyMap est un projet étudiant actuellement porté par une personne physique ; son développement repose largement sur le bénévolat." : "A voluntary contribution helps fund field needs and operating costs. CleanMyMap is a student project currently operated by an individual; development relies largely on volunteering."}</p>
            </div>
          </div>
          {onParticipe.configured ? (
            <div className="space-y-2">
              <CmmButton href={onParticipe.url} prefetch={false} tone="primary" width="wide">{fr ? "Soutenir via OnParticipe" : "Support via OnParticipe"} <ArrowRight size={16} aria-hidden="true" /></CmmButton>
              <p className="text-sm cmm-text-primary">{fr ? "Cagnotte commune hébergée par OnParticipe. Le montant est choisi sur le site du fournisseur ; CleanMyMap ne traite pas le paiement." : "Shared campaign hosted by OnParticipe. Choose the amount on the provider’s website; CleanMyMap does not process the payment."}</p>
            </div>
          ) : (
            <div className="space-y-2 rounded-lg border border-[var(--cmm-surface-border)] p-3">
              <p role="status" className="text-sm cmm-text-primary">{fr ? "La cagnotte n’est pas accessible depuis cette page actuellement." : "The campaign is not accessible from this page at present."}</p>
              <CmmButton href="/contact" tone="secondary" size="sm">{fr ? "Nous contacter pour contribuer" : "Contact us to contribute"}</CmmButton>
            </div>
          )}
          <p className="text-sm cmm-text-primary">{fr ? "La cagnotte OnParticipe est commune. Les besoins ci-dessous ne constituent pas une affectation des contributions par catégorie." : "The OnParticipe campaign is shared. The needs below do not constitute earmarked contributions by category."}</p>
        </CmmCard>

        <section aria-labelledby="funding-needs" className="space-y-3">
          <h2 id="funding-needs" className="text-xl font-bold cmm-text-primary">{fr ? "À quoi votre soutien peut servir" : "What your support can help fund"}</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {FUNDING_CATEGORIES.map(category => {
              const Icon = ICONS[category];
              return <CmmCard key={category} as="article" tone="family" variant="default" className="h-full space-y-3" data-funding-card={category}>
                <div className="flex items-start gap-3"><Icon size={22} className="shrink-0 cmm-text-primary" aria-hidden="true" /><h3 className="font-bold cmm-text-primary">{FUNDING_CATEGORY_LABELS[category][locale]}</h3></div>
                <p className="text-sm cmm-text-primary">{FUNDING_CATEGORY_DESCRIPTIONS[category][locale]}</p>
                <ul className="list-disc space-y-1 pl-5 text-sm cmm-text-primary">{USES[category][locale].map(use => <li key={use}>{use}</li>)}</ul>
              </CmmCard>;
            })}
          </div>
          <p className="text-sm cmm-text-primary">{fr ? "Il s’agit de besoins possibles, pas de dépenses déjà effectuées ni d’un budget chiffré." : "These are potential needs, not incurred expenditure or a quantified budget."}</p>
        </section>

        <CmmCard as="section" tone="family" variant="default" className="space-y-4" data-funding-allocation>
          <div className="flex items-start gap-3"><ShieldCheck size={24} className="shrink-0 cmm-text-primary" aria-hidden="true" /><h2 className="text-xl font-bold cmm-text-primary">{fr ? "Transparence financière" : "Financial transparency"}</h2></div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 rounded-lg border border-[var(--cmm-surface-border)] p-3">
              <h3 className="text-sm font-semibold cmm-text-primary">{fr ? "Total net confirmé par Stripe" : "Net total confirmed by Stripe"}</h3>
              {total !== null ? <p className="text-2xl font-bold tabular-nums cmm-text-primary" data-funding-stripe-total>{formatFundingAmount(total, locale)}</p> : <p role="status" className="text-sm cmm-text-primary">{summary.aggregateState === "loading" ? (fr ? "Chargement…" : "Loading…") : (fr ? "Indisponible" : "Unavailable")}</p>}
              <p className="text-sm cmm-text-primary">{fr ? "Montants cumulés depuis le suivi Stripe (pas de période comptable distincte ni de date d’arrêté). Paiements confirmés moins remboursements enregistrés, hors frais de paiement et dépenses : ce montant n’est pas un solde disponible." : "Cumulative totals since Stripe tracking began (no separate accounting period or closing date). Confirmed payments less recorded refunds, excluding payment fees and expenses: this is not an available balance."}</p>
              {aggregate ? <p className="text-sm cmm-text-primary" data-funding-updated-at>{formattedUpdatedAt ? (fr ? `Dernière mise à jour des totaux Stripe : ${formattedUpdatedAt}` : `Stripe totals last updated: ${formattedUpdatedAt}`) : (fr ? "Date de dernière mise à jour des totaux Stripe non renseignée." : "Stripe totals last update timestamp not provided.")}</p> : null}
              {summary.aggregateState === "error" ? <CmmButton type="button" tone="secondary" size="sm" onClick={summary.retry}>{fr ? "Réessayer le chargement" : "Retry loading"}</CmmButton> : null}
            </div>
            <div className="space-y-1 rounded-lg border border-[var(--cmm-surface-border)] p-3">
              <h3 className="text-sm font-semibold cmm-text-primary">{fr ? "Contributions OnParticipe" : "OnParticipe contributions"}</h3>
              <p className="text-sm font-semibold cmm-text-primary">{fr ? "Non intégrées aux totaux" : "Not included in totals"}</p>
              <p className="text-sm cmm-text-primary">{fr ? "Aucun montant OnParticipe n’est importé. Le financement global, les dépenses réalisées et la trésorerie ne sont donc pas calculés sur cette page." : "No OnParticipe amount is imported. Overall funding, actual spending and cash balances are therefore not calculated here."}</p>
            </div>
          </div>
          {aggregate ? <dl className="space-y-2 text-sm cmm-text-primary">
            {FUNDING_CATEGORIES.map(category => <div key={category} className="flex flex-wrap items-baseline justify-between gap-2 border-b border-[var(--cmm-surface-border)] pb-2">
              <dt>{FUNDING_CATEGORY_LABELS[category][locale]} <span className="text-xs cmm-text-primary">(Stripe)</span></dt>
              <dd data-funding-total={category} className="font-semibold tabular-nums">{formatFundingAmount(aggregate.categories[category].netAmountCents, locale)}</dd>
            </div>)}
          </dl> : null}
          <p className="text-sm cmm-text-primary">{fr ? "Aucun objectif financier chiffré ni taux d’avancement n’est établi ici. Ces totaux ne démontrent pas l’affectation ou l’utilisation effective des fonds." : "No quantified funding target or progress rate is established here. These totals do not demonstrate actual allocation or use of funds."}</p>
        </CmmCard>

        <CmmCard as="section" tone="family" variant="default" className="space-y-3">
          <div className="flex items-center gap-3"><Users size={22} aria-hidden="true" /><h2 className="text-xl font-bold cmm-text-primary">{fr ? "Soutenir autrement" : "Support in other ways"}</h2></div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><h3 className="font-semibold cmm-text-primary">{fr ? "Participer sur le terrain" : "Join field actions"}</h3><p className="text-sm cmm-text-primary">{fr ? "Donner du temps et documenter les collectes." : "Give time and document cleanups."}</p><CmmButton href="/sections/rejoindre-une-action" tone="secondary" size="sm">{fr ? "Rejoindre une action" : "Join an action"}</CmmButton></div>
            <div className="space-y-2"><h3 className="font-semibold cmm-text-primary">{fr ? "Matériel et compétences" : "Equipment and skills"}</h3><p className="text-sm cmm-text-primary">{fr ? "Proposer un prêt, une contribution en nature ou des compétences." : "Offer a loan, in-kind support or skills."}</p><CmmButton href="/contact" tone="secondary" size="sm">{fr ? "Proposer une aide" : "Offer support"}</CmmButton></div>
            <div className="space-y-2"><h3 className="font-semibold cmm-text-primary">{fr ? "Coopération avec une structure" : "Work with an organization"}</h3><p className="text-sm cmm-text-primary">{fr ? "Échanger sur un projet commun ou une aide documentée." : "Discuss a shared project or documented support."}</p><CmmButton href="/partners/onboarding" tone="secondary" size="sm">{fr ? "Devenir partenaire" : "Become a partner"}</CmmButton></div>
          </div>
        </CmmCard>

        <CmmCard as="section" tone="family" variant="default" className="space-y-2">
          <h2 className="text-lg font-bold cmm-text-primary">{fr ? "Indépendance et conditions" : "Independence and terms"}</h2>
          <p className="text-sm cmm-text-primary">{fr ? "La contribution ne donne aucun pouvoir sur la modération, les décisions éditoriales, les méthodes scientifiques ou les règles de la plateforme. CleanMyMap ne garantit aucune affectation par catégorie de la cagnotte commune." : "A contribution gives no power over moderation, editorial decisions, scientific methods or platform rules. CleanMyMap does not guarantee category allocation for the shared campaign."}</p>
          <p className="text-sm cmm-text-primary">{fr ? "La confirmation ou le reçu Stripe n’est pas un reçu fiscal. CleanMyMap n’annonce ni réduction fiscale ni mécénat fiscal." : "A Stripe confirmation or receipt is not a tax receipt. CleanMyMap does not advertise tax relief or tax-deductible sponsorship."}</p>
          <CmmButton href="/conditions-generales-utilisation" tone="tertiary" size="sm">{fr ? "Conditions d’utilisation" : "Terms of use"}</CmmButton>
        </CmmCard>
      </div>
    </SectionShell>
  );
}
