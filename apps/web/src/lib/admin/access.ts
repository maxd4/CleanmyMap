import { redirect } from "next/navigation";
import { requireAdminAccess, requireCreatorAccess } from "@/lib/authz";

export async function checkAdminAccess() {
  const access = await requireAdminAccess();
  if (!access.ok) {
    redirect(access.status === 401 ? "/auth/signin" : "/");
  }
}

export async function checkCreatorAccess() {
  const access = await requireCreatorAccess();
  if (!access.ok) {
    redirect(access.status === 401 ? "/auth/signin" : "/");
  }
}
