import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Redirection",
  robots: { index: false, follow: false },
};

export default function EnglishLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
