import type { ReactNode } from "react";
import { AppShellSurface } from "@/components/layout/app-shell-surface";

export default function AppLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return <AppShellSurface>{children}</AppShellSurface>;
}
