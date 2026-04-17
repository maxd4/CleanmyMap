import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getCurrentUserRoleLabel } from "@/lib/authz";
import { getProfileEntryPath, toProfile } from "@/lib/profiles";

export default async function HomePage() {
  const { userId } = await auth();
  if (userId) {
    const role = await getCurrentUserRoleLabel();
    const profile = toProfile(role);
    redirect(getProfileEntryPath(profile));
  }
  redirect("/sign-in");
}
