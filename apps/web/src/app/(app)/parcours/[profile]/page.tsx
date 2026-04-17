import { notFound, redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { isAppProfile, toProfile } from "@/lib/profiles";

type ParcoursProfilePageProps = {
  params: Promise<{ profile: string }>;
};

export default async function ParcoursProfilePage({
  params,
}: ParcoursProfilePageProps) {
  const { profile } = await params;
  const normalized = profile.trim().toLowerCase();
  if (!isAppProfile(normalized)) {
    notFound();
  }

  const activeRole = await getCurrentUserRoleLabel();
  const activeProfile = toProfile(activeRole);
  const isAdmin = activeRole === "admin";

  if (!isAdmin && normalized !== activeProfile) {
    redirect(`/parcours/${activeProfile}`);
  }

  redirect(`/profil/${normalized}`);
}
