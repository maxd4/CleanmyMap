import type { Metadata } from "next";
import DashboardPage from "../dashboard/page";
import { DASHBOARD_ROUTE } from "@/lib/accueil-pilotage-routes";

export const metadata: Metadata = {
  title: "Profil - CleanMyMap",
  description:
    "Alias de Mon espace personnel. Accédez à votre espace centralisé, à vos statistiques et à vos réglages depuis cette page.",
  alternates: {
    canonical: DASHBOARD_ROUTE,
  },
};

export default function ProfilRootPage() {
  return <DashboardPage />;
}
