import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comprendre",
  description:
    "Vulgariser les enjeux environnementaux, les ordres de grandeur et la méthodologie de CleanMyMap.",
  alternates: { canonical: "/learn/comprendre" },
  robots: { index: true, follow: true },
};

export default function LearnUnderstandLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
