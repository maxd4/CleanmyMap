import type { Metadata } from "next";
import { buildPageMetadata } from "@/lib/metadata";

export const metadata: Metadata = buildPageMetadata("/learn/comprendre", {
  title: "Comprendre",
  description:
    "Vulgariser les enjeux environnementaux, les ordres de grandeur et la méthodologie de CleanMyMap.",
  robots: { index: true, follow: true },
});

export default function LearnUnderstandLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
