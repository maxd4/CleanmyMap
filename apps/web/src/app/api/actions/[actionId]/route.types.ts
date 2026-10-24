import { loadActionById } from "@/lib/actions/store";

export type EditableAction = NonNullable<Awaited<ReturnType<typeof loadActionById>>>;
