import { redirect } from "next/navigation";
import { buildSignInRedirectHref } from "@/lib/auth/redirect-url";

export function safe() {
  redirect(buildSignInRedirectHref("/sections/gamification"));
}
