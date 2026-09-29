import type { LucideIcon } from "lucide-react";

export type ConnectTab = "discussions" | "dm";

export interface ConnectTabItem {
  id: ConnectTab;
  label: { fr: string; en: string };
  icon: LucideIcon;
  desc: { fr: string; en: string };
}
