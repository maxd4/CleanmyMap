export { GET } from "@/lib/spogomi/observer-route";

export const runtime = "nodejs";
// Justification force-dynamic: scoped operational access and current event state are mutable.
export const dynamic = "force-dynamic";
