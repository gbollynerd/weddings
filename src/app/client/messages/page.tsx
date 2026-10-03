import { currentClient } from "@/lib/services/me-client";
import { MessagesPage } from "@/components/messages/messages-page";
export const metadata = { title: "Messages" };
export default async function ClientMessages({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const { user, booking: b } = await currentClient();
  return <MessagesPage userId={user.id} sp={await searchParams} weddings={b ? [{ id: b.wedding_id, couple: b.couple, date: b.wedding_date }] : []} />;
}
