import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "English - CleanMyMap",
  description: "English version of CleanMyMap - Urban cleanup and environmental action platform.",
  alternates: {
    canonical: "/en",
    languages: {
      "fr-FR": "/",
      "en-US": "/en",
    },
  },
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}