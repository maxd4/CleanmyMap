import type { ActionBeforeDeclarationFormProps } from "./before/model";

export type ActionDeclarationFormProps = Pick<
  ActionBeforeDeclarationFormProps,
  | "actorNameOptions"
  | "defaultActorName"
  | "isAuthenticated"
  | "countryCode"
  | "userMetadata"
  | "linkedEventId"
  | "initialRecordType"
  | "initialActionId"
  | "signInHref"
  | "signUpHref"
>;
