import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";
import { PersonalAiDeclarationClient } from "./personal-ai-declaration-client";
import { PersonalAiImportClient } from "./personal-ai-import-client";

export const metadata: Metadata = buildPageMetadata("/learn/empreinte-ia", {
  title: "Mon empreinte IA",
  description: "Estimez les impacts environnementaux de vos usages IA, sans compte, et enregistrez vos déclarations de façon privée si vous le souhaitez.",
  robots: { index: true, follow: true },
});

export default function PersonalAiDeclarationPage() {
  return <div className="grid gap-6"><PersonalAiDeclarationClient /><PersonalAiImportClient /></div>;
}
