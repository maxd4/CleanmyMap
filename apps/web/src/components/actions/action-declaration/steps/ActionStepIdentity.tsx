"use client";

import type { FormState } from "../model";
import { ActionCollectionSection } from "./action-step-identity.collection";
import { ActionOrganizerSection } from "./action-step-identity.organizer";
import { ActionParticipantSection } from "./action-step-identity.participants";
import { ActionTimeSection } from "./action-step-identity.time";
import { SectionTitle } from "./action-step-identity.ui";

interface Props {
  form: FormState;
  updateField: <K extends keyof FormState>(key: K, value: FormState[K]) => void;
  updateFields: (updates: Partial<FormState>) => void;
  userMetadata: {
    userId: string;
    handle?: string;
    displayName?: string;
    username?: string;
  };
  recordType: FormState["recordType"];
  hasAttemptedSubmit?: boolean;
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

export function ActionStepIdentity({
  form,
  updateField,
  updateFields,
  userMetadata,
  recordType,
  hasAttemptedSubmit,
  mode = "all",
}: Props) {
  const isActionMode = recordType === "action";

  if (mode === "all") {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
          <div className="space-y-6">
            <div>
              <ActionOrganizerSection
                form={form}
                updateField={updateField}
                updateFields={updateFields}
                userMetadata={userMetadata}
                isActionMode={isActionMode}
                hasAttemptedSubmit={hasAttemptedSubmit}
                variant="full"
              />

              {isActionMode ? (
                <ActionParticipantSection
                    form={form}
                    updateField={updateField}
                  userId={userMetadata.userId}
                  variant="supporting"
                  isActionMode={isActionMode}
                  supportingFull
                />
              ) : null}

              {isActionMode ? (
                <div className="space-y-6 pt-2">
                  <div>
                    <SectionTitle color="bg-sky-500">Participants &amp; temps d’action</SectionTitle>
                    <ActionParticipantSection
                      form={form}
                      updateField={updateField}
                      userId={userMetadata.userId}
                      variant="counts"
                      isActionMode={isActionMode}
                    />
                    <ActionTimeSection
                      form={form}
                      updateField={updateField}
                      variant="full"
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {isActionMode ? (
            <aside className="space-y-6 self-start xl:sticky xl:top-6">
              <ActionCollectionSection
                form={form}
                updateField={updateField}
                variant="full"
              />
            </aside>
          ) : null}
        </div>
      </div>
    );
  }

  if (mode === "action") {
    return (
      <ActionOrganizerSection
        form={form}
        updateField={updateField}
        updateFields={updateFields}
        userMetadata={userMetadata}
        isActionMode={isActionMode}
        hasAttemptedSubmit={hasAttemptedSubmit}
        variant="compact"
      />
    );
  }

  if (mode === "participants") {
    return (
      <ActionParticipantSection
        form={form}
        updateField={updateField}
        userId={userMetadata.userId}
        variant="compact"
        isActionMode={isActionMode}
      />
    );
  }

  if (mode === "duration") {
    return (
      <ActionTimeSection
        form={form}
        updateField={updateField}
        variant="duration"
      />
    );
  }

  if (mode === "time") {
    return (
      <ActionTimeSection
        form={form}
        updateField={updateField}
        variant="time"
      />
    );
  }

  return (
    <div className="space-y-4">
      {mode !== "collection" && isActionMode ? (
        <ActionParticipantSection
          form={form}
          updateField={updateField}
          userId={userMetadata.userId}
          variant="supporting"
          isActionMode={isActionMode}
        />
      ) : null}

      {mode !== "organization" && isActionMode ? (
        <ActionCollectionSection
          form={form}
          updateField={updateField}
          variant="compact"
        />
      ) : null}

    </div>
  );
}
