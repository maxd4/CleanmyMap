import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { toProfile } from "@/lib/profiles";

export default async function ParcoursRootPage() {
  const role = await getCurrentUserRoleLabel();
  const profile = toProfile(role);
  redirect(`/parcours/${profile}`);
}
