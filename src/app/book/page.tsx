import type { Metadata } from "next";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { catalog } from "@/lib/services/catalog";
import { BookingWizard } from "./wizard";

export const metadata: Metadata = { title: "Book your wedding" };

export default async function BookPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [sp, cat, session] = await Promise.all([searchParams, catalog(), getSession()]);
  let me = null;
  if (session) {
    const [c] = session.role === "client" ? await sql`select partner_one, partner_two from clients where user_id = ${session.id}` : [null];
    me = { role: session.role, name: session.full_name, email: session.email, phone: session.phone ?? "", partnerOne: c?.partner_one ?? session.full_name, partnerTwo: c?.partner_two ?? "" };
  }
  return <BookingWizard catalog={cat} me={me} initial={{ market: sp.market, date: sp.date, service: sp.service as never, pkg: sp.package }} />;
}
