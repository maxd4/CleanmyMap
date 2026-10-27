import {
  BarChart3,
  BookOpen,
  House,
  Map,
  MessageCircle,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { NavigationSpace } from "@/lib/navigation";

export function getNavigationBlockIcon(spaceId: NavigationSpace["id"]): LucideIcon {
  switch (spaceId) {
    case "home":
      return House;
    case "act":
      return Zap;
    case "visualize":
      return Map;
    case "impact":
      return BarChart3;
    case "network":
      return Users;
    case "connect":
      return MessageCircle;
    case "learn":
      return BookOpen;
    default:
      return House;
  }
}
