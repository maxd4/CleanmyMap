import type { LucideIcon } from "lucide-react";

export type ConnectTab = "discussions" | "dm";

export type CommunityAnnouncementTemplateKey =
  | "relais_associatif"
  | "benevoles"
  | "diffusion";

export interface ChannelStat {
  label: { fr: string; en: string };
  icon: LucideIcon;
  count: string;
  color: string;
}

export interface ConnectTabItem {
  id: ConnectTab;
  label: { fr: string; en: string };
  icon: LucideIcon;
  desc: { fr: string; en: string };
}
