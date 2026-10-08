import { currentMember } from "@/lib/services/me";
import { profileCompletion, licenses } from "@/lib/services/team";
import { sql } from "@/lib/db";
import { ProfileForm } from "./form";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const { member } = await currentMember();
  const [lic, markets, stats] = await Promise.all([
    licenses(member.id),
    sql`select id, city, state from markets order by state, city`,
    sql`select count(*) filter (where a.status in ('completed') or (a.status='accepted' and w.wedding_date < current_date))::int as done,
               count(*) filter (where a.status = 'accepted' and w.wedding_date >= current_date)::int as upcoming
        from wedding_assignments a join weddings w on w.id = a.wedding_id where a.team_member_id = ${member.id}`,
  ]);
  const completion = profileCompletion(member, lic.length);
  return (
    <ProfileForm
      completion={completion}
      markets={markets.map((m) => ({ id: m.id, label: `${m.city}, ${m.state}` }))}
      stats={{ done: stats[0].done, upcoming: stats[0].upcoming, rating: member.rating }}
      member={{
        full_name: member.full_name, email: member.email, phone: member.phone ?? "", bio: member.bio ?? "", home_market_id: member.home_market_id ?? "",
        service_radius: member.service_radius, specialties: member.specialties, years_experience: member.years_experience, languages: member.languages,
        portfolio_url: member.portfolio_url ?? "", instagram: member.instagram ?? "", website: member.website ?? "", avatar_url: member.avatar_url ?? "",
        skills: member.skills, city: member.city ? `${member.city}, ${member.state}` : "",
        home_address: member.home_address ?? "", equipment: member.equipment ?? "", home_located: member.lat != null,
      }}
    />
  );
}
