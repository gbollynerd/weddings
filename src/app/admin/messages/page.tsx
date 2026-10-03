import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { MessagesPage } from "@/components/messages/messages-page";
export const metadata = { title: "Messages" };
export default async function AdminMessages({ searchParams }: { searchParams: Promise<{ c?: string; q?: string }> }) {
  const user = await requireUser(["coordinator", "admin"]);
  const w = await sql`select id, couple, wedding_date::text as date from weddings where wedding_date >= current_date - 30 and status <> 'cancelled' order by wedding_date limit 40`;
  return <MessagesPage userId={user.id} sp={await searchParams} weddings={w as never} />;
}
