import { requireActiveMember } from "@/lib/services/me";
import { myAssignments } from "@/lib/services/team";
import { MessagesPage } from "@/components/messages/messages-page";

export const metadata = { title: "Messages" };

export default async function TeamMessages({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { user, member } = await requireActiveMember();
  const assignments = await myAssignments(member.id, "all");
  const weddings = [...new Map(assignments.filter((a) => a.status !== "cancelled").map((a) => [a.wedding_id, { id: a.wedding_id, couple: a.couple, date: a.wedding_date }])).values()];
  return <MessagesPage userId={user.id} sp={await searchParams} weddings={weddings} />;
}
