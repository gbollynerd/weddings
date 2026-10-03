import { ClipboardList } from "lucide-react";
import { currentClient } from "@/lib/services/me-client";
import { Card, EmptyState, ButtonLink } from "@/components/ui";
import { QuestionnaireForm } from "./form";

export const metadata = { title: "Questionnaire" };

export default async function QuestionnairePage() {
  const { booking: b } = await currentClient();
  if (!b) return <Card><EmptyState icon={ClipboardList} title="Book first" description="Your questionnaire unlocks after booking." action={<ButtonLink href="/book">Book your wedding</ButtonLink>} /></Card>;
  return <QuestionnaireForm weddingId={b.wedding_id} couple={b.couple} status={b.questionnaire?.status ?? "not_started"} answers={(b.questionnaire?.answers ?? {}) as Record<string, string>} submittedAt={b.questionnaire?.submitted_at ? new Date(b.questionnaire.submitted_at).toISOString() : null} />;
}
