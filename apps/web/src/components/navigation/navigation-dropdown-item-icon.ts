import {
  BarChart3,
  BookOpen,
  BookOpenText,
  Building2,
  CloudRainWind,
  Crown,
  Dumbbell,
  Eye,
  FilePenLine,
  HandCoins,
  Heart,
  History,
  Info,
  LayoutGrid,
  List,
  MapPinned,
  Medal,
  MessageCircle,
  MessageSquareText,
  Route,
  ShieldCheck,
  Target,
  Trash2,
  UserPlus,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

const NAVIGATION_DROPDOWN_ITEM_ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  explorer: List,
  profile: UserRound,
  feedback: MessageSquareText,
  pilotage: Target,
  admin: ShieldCheck,
  elus: Crown,
  sponsor: Building2,
  funding: HandCoins,
  new: FilePenLine,
  "rejoindre-une-action": UserPlus,
  signalement: Trash2,
  route: Route,
  weather: CloudRainWind,
  guide: BookOpen,
  "trash-spotter": Trash2,
  map: MapPinned,
  methodologie: Info,
  reports: BarChart3,
  gamification: Medal,
  network: Users,
  community: Heart,
  messagerie: MessageCircle,
  "open-data": Eye,
  annuaire: BookOpenText,
  history: History,
  "learn-comprendre": BookOpen,
  "learn-sentrainer": Dumbbell,
  "learn-bonnes-pratiques": ShieldCheck,
};

export function getNavigationDropdownItemIcon(routeId: string): LucideIcon {
  const icon = NAVIGATION_DROPDOWN_ITEM_ICONS[routeId];

  if (!icon) {
    throw new Error(`Missing navigation dropdown item icon for routeId: ${routeId}`);
  }

  return icon;
}
