import { redirect } from "next/navigation";

export function unsafe(request: Request & { nextUrl: { searchParams: URLSearchParams } }) {
  redirect(request.nextUrl.searchParams.get("redirect_url"));
}
