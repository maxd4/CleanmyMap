import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/authz";

export async function checkAdminAccess() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    redirect(access.status === 401 ? "/auth/signin" : "/");
  }
}
