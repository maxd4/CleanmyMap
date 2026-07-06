"use client";

import {
  type ComponentProps,
  type ElementType,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardList,
  Loader2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { ActionBeforeDeclarationForm } from "./action-before-declaration-form";
import { ActionDeclarationForm } from "./action-declaration-form";
import { updateAction } from "@/lib/actions/http";
import { CmmButton } from "@/components/ui/cmm-button";
import { CmmCard } from "@/components/ui/cmm-card";
import { CmmPill } from "@/components/ui/cmm-pill";
import { cn } from "@/lib/utils";
import { getBlockClasses } from "@/lib/ui/block-accents";

type EntryPath = "before" | "after";
type EntryScreen = "choice" | "loading" | "success" | "error";

type ActionDeclarationEntryFlowProps = ComponentProps<typeof ActionDeclarationForm> & {
  initialActionId?: string | null;
};

function EntryFeature({ children }: { children: string }) {
  return (
    <li className="flex items-start gap-2 text-sm leading-6 text-emerald-950/74">
      <CheckCircle2 size={14} className="mt-1 shrink-0 text-emerald-600" />
      <span>{children}</span>
    </li>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  description,
  features,
  onSelect,
  cta,
}: {
  icon: ElementType<{ size?: number; className?: string }>;
  title: string;
  description: string;
  features: string[];
  onSelect: () => void;
  cta: string;
}) {
  return (
    <CmmCard
      clickable
      onClick={onSelect}
      ariaLabel={title}
      tone="emerald"
      variant="glass"
      size="lg"
      className="group h-full border-emerald-300/50 bg-white/92 transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div className="flex h-full flex-col gap-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-200/80 bg-[#ECF8EF] text-emerald-700 shadow-sm transition group-hover:scale-[1.03]">
            <Icon size={22} />
          </div>
          <div className="space-y-2">
            <CmmPill tone="emerald" size="sm" className="tracking-[0.18em]">
              Parcours
            </CmmPill>
            <h2 className="text-[1.35rem] font-black tracking-tight text-emerald-950">
              {title}
            </h2>
            <p className="text-sm leading-6 text-emerald-900/70">{description}</p>
          </div>
        </div>

        <ul className="space-y-2">
          {features.map((feature) => (
            <EntryFeature key={feature}>{feature}</EntryFeature>
          ))}
        </ul>

        <div className="mt-auto flex items-center gap-2 text-sm font-bold text-emerald-800 transition group-hover:translate-x-0.5">
          <span>{cta}</span>
          <ArrowRight size={16} />
        </div>
      </div>
    </CmmCard>
  );
}

function TransitionPanel({
  path,
  onCancel,
}: {
  path: EntryPath | null;
  onCancel: () => void;
}) {
  const label = path === "before" ? "Déclarer avant l'action" : "Déclarer après l'action";

  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-7xl items-center justify-center px-4 py-8 md:px-6 lg:px-8">
      <CmmCard tone="emerald" variant="glass" size="lg" className="w-full max-w-2xl border-emerald-200/80 bg-white/95">
        <div className="space-y-5 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl border border-emerald-200/80 bg-[#ECF8EF] text-emerald-700 shadow-sm">
            <Loader2 size={22} className="animate-spin" />
          </div>
          <div className="space-y-2">
            <CmmPill tone="emerald" size="sm" className="mx-auto tracking-[0.18em]">
              Chargement
            </CmmPill>
            <h1 className="text-3xl font-black tracking-tight text-emerald-950">
              Préparation du parcours
            </h1>
            <p className="mx-auto max-w-xl text-sm leading-6 text-emerald-900/70">
              Nous préparons {label.toLowerCase()} sans modifier le fonctionnement du formulaire actuel.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/80 bg-[#F3FBF6] px-3 py-1.5 text-xs font-semibold text-emerald-950">
            <Sparkles size={13} className="text-emerald-600" />
            Le bloc Agir reste prioritaire
          </div>
          <div className="flex justify-center">
            <CmmButton tone="tertiary" variant="pill" onClick={onCancel} size="md">
              <ArrowLeft size={14} />
              Retour au choix
            </CmmButton>
          </div>
        </div>
      </CmmCard>
    </div>
  );
}

function ErrorPanel({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="mx-auto flex min-h-[40vh] w-full max-w-7xl items-center justify-center px-4 py-8 md:px-6 lg:px-8">
      <CmmCard tone="rose" variant="glass" size="lg" className="w-full max-w-2xl border-rose-200/70 bg-white/96">
        <div className="space-y-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-rose-200/80 bg-rose-50 text-rose-600 shadow-sm">
            <AlertTriangle size={20} />
          </div>
          <div className="space-y-2">
            <CmmPill tone="amber" size="sm">
              Erreur
            </CmmPill>
            <h1 className="text-2xl font-black tracking-tight text-rose-950">
              Le parcours n&apos;a pas pu être préparé
            </h1>
            <p className="text-sm leading-6 text-rose-900/70">{message}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <CmmButton tone="secondary" variant="pill" onClick={onRetry} size="md">
              <RotateCcw size={14} />
              Réessayer
            </CmmButton>
          </div>
        </div>
      </CmmCard>
    </div>
  );
}

export function ActionDeclarationEntryFlow(props: ActionDeclarationEntryFlowProps) {
  const router = useRouter();
  const [screen, setScreen] = useState<EntryScreen>(
    props.initialActionId ? "success" : "choice",
  );
  const [selection, setSelection] = useState<EntryPath | null>(
    props.initialActionId ? "after" : null,
  );
  const [handoffActionId, setHandoffActionId] = useState<string | null>(
    props.initialActionId ?? null,
  );
  const [loadingMode, setLoadingMode] = useState<"choice" | "handoff" | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const actClasses = getBlockClasses("act");

  useEffect(() => {
    if (screen !== "loading" || loadingMode !== "choice") {
      return;
    }

    const timer = window.setTimeout(() => {
      if (!selection) {
        setErrorMessage("Le parcours demandé n'a pas pu être préparé.");
        setLoadingMode(null);
        setScreen("error");
        return;
      }

      setLoadingMode(null);
      setScreen("success");
    }, 220);

    return () => window.clearTimeout(timer);
  }, [loadingMode, screen, selection]);

  const startChoice = (path: EntryPath) => {
    setErrorMessage(null);
    setHandoffActionId(null);
    setSelection(path);
    setLoadingMode("choice");
    setScreen("loading");
  };

  const transitionToComplete = async (actionId: string) => {
    setErrorMessage(null);
    setSelection("after");
    setLoadingMode("handoff");
    setScreen("loading");
    try {
      await updateAction(actionId, { actionPhase: "post_action_draft" });
      setHandoffActionId(actionId);
      router.replace(`/actions/new?actionId=${encodeURIComponent(actionId)}`);
      setLoadingMode(null);
      setScreen("success");
    } catch (error) {
      setErrorMessage(
        error instanceof Error && error.message
          ? error.message
          : "Impossible de préparer le formulaire complet pour le moment.",
      );
      setSelection(null);
      setLoadingMode(null);
      setScreen("error");
    }
  };

  const backToChoice = () => {
    setErrorMessage(null);
    setSelection(null);
    setHandoffActionId(null);
    setLoadingMode(null);
    setScreen("choice");
    router.replace("/actions/new");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const renderChoice = () => (
    <div className={cn("relative overflow-hidden px-4 py-6 md:px-6 lg:px-8", actClasses.gradientDeep)}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-0 h-72 w-72 rounded-full bg-emerald-200/50 blur-[110px]" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-100/55 blur-[120px]" />
      </div>

      <div className="relative mx-auto w-full max-w-7xl space-y-6">
        <CmmCard tone="emerald" variant="glass" size="lg" className="border-emerald-200/80 bg-white/94">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <CmmPill tone="emerald" size="sm" className="tracking-[0.18em]">
                Agir
              </CmmPill>
              <h1 className="text-[clamp(2rem,4vw,3.4rem)] font-black tracking-tighter text-emerald-950">
                Choisissez votre parcours
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-emerald-900/72 md:text-[0.98rem]">
                La page commence par ce choix. Le parcours après l&apos;action conserve le formulaire actuel. Le parcours avant l&apos;action ouvrira ensuite un formulaire de pré-déclaration de groupe.
              </p>
            </div>

            <div className="max-w-sm rounded-[1.75rem] border border-emerald-200/80 bg-[#F3FBF6] px-4 py-3 text-sm leading-6 text-emerald-900/76 shadow-sm">
              <p className="font-bold text-emerald-950">Point de contrôle</p>
              <p className="mt-1">
                Ce choix n&apos;envoie rien et ne valide aucune collecte incomplète.
              </p>
            </div>
          </div>
        </CmmCard>

        <div className="grid gap-4 md:grid-cols-2">
          <ChoiceCard
            icon={ClipboardList}
            title="Déclarer avant l'action"
            description="Préparer une action de groupe avant le départ. Les données de récolte seront ajoutées plus tard dans le formulaire complet."
            features={[
              "Pensé pour les actions à venir ou à organiser.",
              "Les données de collecte finale restent absentes.",
              "Sert de point d'entrée pour le formulaire de groupe.",
            ]}
            onSelect={() => startChoice("before")}
            cta="Préparer ce parcours"
          />

          <ChoiceCard
            icon={CheckCircle2}
            title="Déclarer après l'action"
            description="Ouvrir le formulaire complet actuel pour déclarer une collecte déjà réalisée."
            features={[
              "Conserve le formulaire bénévole complet.",
              "Garde les validations, erreurs et succès existants.",
              "Permet de continuer immédiatement sans rupture de parcours.",
            ]}
            onSelect={() => startChoice("after")}
            cta="Ouvrir le formulaire actuel"
          />
        </div>
      </div>
    </div>
  );

  if (screen === "loading") {
    return <TransitionPanel path={selection} onCancel={backToChoice} />;
  }

  if (screen === "error") {
    return <ErrorPanel message={errorMessage ?? "Une erreur inattendue est survenue."} onRetry={backToChoice} />;
  }

  if (screen === "success" && selection === "before") {
    return (
      <ActionBeforeDeclarationForm
        actorNameOptions={props.actorNameOptions}
        defaultActorName={props.defaultActorName}
        isAuthenticated={props.isAuthenticated}
        isAutoApprovedSubmission={props.isAutoApprovedSubmission}
        userMetadata={props.userMetadata}
        linkedEventId={props.linkedEventId}
        initialRecordType={props.initialRecordType}
        onReturnToChoice={backToChoice}
        onPassToComplete={(actionId) => transitionToComplete(actionId)}
      />
    );
  }

  if (screen === "success" && selection === "after") {
    return (
      <div className="space-y-4 px-4 py-6 md:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-[2rem] border border-emerald-200/80 bg-white/90 px-5 py-4 shadow-[0_16px_34px_-26px_rgba(34,197,94,0.22)] backdrop-blur-xl">
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CmmPill tone="emerald" size="sm">
                Succès
              </CmmPill>
              <p className="text-sm font-bold text-emerald-950">Déclarer après l&apos;action</p>
            </div>
            <p className="text-sm leading-6 text-emerald-900/70">
              Le formulaire actuel s&apos;ouvre sans changement de fonctionnement.
            </p>
          </div>
          <CmmButton tone="tertiary" variant="pill" onClick={backToChoice} size="md" className="shrink-0">
            <ArrowLeft size={14} />
            Retour au choix
          </CmmButton>
        </div>

        <ActionDeclarationForm
          {...props}
          initialActionId={handoffActionId ?? undefined}
          onReturnToChoice={backToChoice}
        />
      </div>
    );
  }

  return renderChoice();
}
