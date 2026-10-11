import type { ComponentProps } from "react";
import type { LocalDevAuthState } from "@/lib/auth/effective-auth-contract";
import type {
  ActionPreparationContext,
  ActionPreparationPersistenceStatus,
  PreparationSelection,
} from "@/lib/actions/action-preparation-context";
import type {
  ActionCreationPanelId,
  ActionCreationSectionId,
  ActionCreationSpace,
  ActionCreationSubsectionId,
  ActionCreationTab,
} from "@/lib/actions/action-creation-routes";
import type { ActionBeforeDeclarationForm } from "./action-declaration/before/form";
import type { FormState } from "./action-declaration/model";

export type ActionCreationShellProps = Omit<
  ComponentProps<typeof ActionBeforeDeclarationForm>,
  "onPassToComplete" | "onFormChange" | "onActionPersisted"
> & {
  initialPanel: ActionCreationPanelId;
  initialSection?: ActionCreationSectionId;
  initialSubsection?: ActionCreationSubsectionId;
  initialTab?: ActionCreationTab;
  initialSpace?: ActionCreationSpace;
  tabSearchParams?: Record<string, string | string[] | undefined>;
  localDevAuth?: LocalDevAuthState;
  sectionsEnabled?: boolean;
};
export type ActionCreationSectionFormProps = Omit<
  ComponentProps<typeof ActionBeforeDeclarationForm>,
  "onPassToComplete" | "onFormChange" | "onActionPersisted"
>;

type ActionCreationDraftContext = {
  locationLabel?: string;
  actionDate?: string;
  departureTime?: string;
  contextReady?: boolean;
};

type ActionCreationFormalitiesReadiness = "unknown" | "ready" | "blocked";

type ActionCreationCallbacks = {
  onActionPersisted: (actionId: string) => void;
  onFormChange: (form: FormState) => void;
  onFormalitiesReadiness: (readiness: { known: boolean; blocked: boolean }) => void;
  onPassToComplete: (actionId: string) => void | Promise<void>;
  onPreparationValidated: (validated: boolean) => void;
  onPreparationSelection: (
    selection: PreparationSelection,
    decision?: "ask" | "replace" | "preserve",
  ) => {
    status: "applied" | "conflict" | "preserved";
    context: ActionPreparationContext;
    conflicts: Array<"actionDate" | "departureTime">;
  };
  onPreparationContextChange: (
    update: Partial<
      Pick<
        ActionPreparationContext,
        "preparationChecklist" | "suggestedMaterials" | "materialsProvided" | "recommendedMaterials"
      >
    >,
  ) => void;
};

export type ActionCreationSharedViewProps = ActionCreationCallbacks & {
  currentActionId: string | null;
  draftContext: ActionCreationDraftContext;
  preparationContext: ActionPreparationContext;
  formalitiesReadiness: ActionCreationFormalitiesReadiness;
  formProps: ActionCreationSectionFormProps;
  localDevAuth: LocalDevAuthState;
  preparationPersistenceStatus: ActionPreparationPersistenceStatus;
};
