import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileEntryPath, toProfile } from "@/lib/profiles";

export default async function ProfilRootPage() {
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  redirect(getProfileEntryPath(profile));
}
