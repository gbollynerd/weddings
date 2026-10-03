import { currentMember } from "@/lib/services/me";
import { opportunities } from "@/lib/services/team";
import { OpenWeddingsBoard } from "./board";

export const metadata = { title: "Open Weddings" };

export default async function OpenWeddingsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { member } = await currentMember();
  const sp = await searchParams;
  const opps = await opportunities(member);
  return (
    <OpenWeddingsBoard
      initialId={sp.id}
      discipline={member.discipline}
      homeCity={member.city ?? ""}
      items={opps.map((o) => ({ ...o, expires_at: o.expires_at ? String(new Date(o.expires_at).toISOString()) : null, accepted_at: null, prep_confirmed_at: null }))}
    />
  );
}
