import type { ActiveRole } from "@/lib/domain-language";
import type { ActionManualInvitationStatusRecord, ActionRegistrationProjectionRecord } from "@/lib/actions/participation/registration-records";
import type { FormState } from "../model";

export interface ActionStepIdentityProps {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    userId: string;
    activeRole?: ActiveRole;
    handle?: string;
    displayName?: string;
    username?: string;
  };
  recordType: FormState["recordType"];
  hasAttemptedSubmit?: boolean;
  isExistingAction?: boolean;
  manualInvitationStatuses?: readonly ActionManualInvitationStatusRecord[];
  registrationStatuses?: readonly ActionRegistrationProjectionRecord[];
  confirmedParticipantAccounts?: readonly string[];
  mode?:
    | "all"
    | "action"
    | "participants"
    | "duration"
    | "time"
    | "organization"
    | "collection"
    | "details";
}
