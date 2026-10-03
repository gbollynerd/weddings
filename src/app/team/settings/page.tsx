import { currentMember } from "@/lib/services/me";
import { getSettings } from "@/lib/services/account";
import { SettingsView } from "@/components/settings/settings-view";

export const metadata = { title: "Settings" };

export default async function TeamSettings() {
  const { user, member } = await currentMember();
  const { settings, sessions } = await getSettings(user.id);
  return (
    <SettingsView isTeam currentSession={user.session_id}
      user={{ full_name: user.full_name, email: user.email, phone: user.phone }}
      settings={settings as never}
      sessions={sessions.map((s) => ({ id: s.id, user_agent: s.user_agent, ip: s.ip, created_at: new Date(s.created_at).toISOString(), last_seen: new Date(s.last_seen).toISOString() }))}
      payout={{ method: member.payout_method, last4: member.payout_last4 }} />
  );
}
