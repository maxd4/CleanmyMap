import { PageHeader } from "@/components/ui/page-header";

export function FeedbackSectionDashboardHeader({
  fr,
}: {
  fr: boolean;
}) {
  return (
    <header>
      <div className="space-y-6">
        <PageHeader
          title={fr ? "Retours & Qualité" : "Feedback & Quality"}
          subtitle={
            fr
              ? "Vos retours nous aident à améliorer CleanMyMap en continu et à garantir des données fiables et utiles pour tous."
              : "Your feedback helps us improve CleanMyMap continuously and keep the data reliable and useful for everyone."
          }
        />
      </div>

    </header>
  );
}
