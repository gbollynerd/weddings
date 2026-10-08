import { after } from "next/server";
import { requireActiveMember } from "@/lib/services/me";
import { backfillWeddingCoords } from "@/lib/services/geo";
import { opportunities } from "@/lib/services/team";
import { standardsAcceptance } from "@/lib/services/standards";
import { OpenWeddingsBoard } from "./board";

export const metadata = { title: "Open Weddings" };

export default async function OpenWeddingsPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { member } = await requireActiveMember();
  const sp = await searchParams;
  const [opps, standards] = await Promise.all([opportunities(member), standardsAcceptance(member.id)]);
  // Geocode older venues in the background so the next visit shows exact distances
  after(() => backfillWeddingCoords().catch(() => {}));
  return (
    <OpenWeddingsBoard
      initialId={sp.id}
      skills={member.skills}
      homeCity={member.city ?? ""}
      homeLabel={member.lat != null ? "your home base" : member.city ? `${member.city} (add your home address in Profile for exact distances)` : "your home market"}
      memberName={member.full_name}
      standardsAccepted={!!standards}
      items={opps.map((o) => ({ ...o, expires_at: o.expires_at ? String(new Date(o.expires_at).toISOString()) : null, accepted_at: null, prep_confirmed_at: null }))}
    />
  );
}
