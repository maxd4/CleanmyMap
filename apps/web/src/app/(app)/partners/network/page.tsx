import { permanentRedirect } from "next/navigation";

export default function PartnersNetworkPage() {
  permanentRedirect("/sections/community?tab=partners");
}
