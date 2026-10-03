import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/services/account";
import { SettingsView } from "@/components/settings/settings-view";
export const metadata = { title: "Settings" };
export default async function ClientSettings() {
  const user = await requireUser(["client"]);
  const { settings, sessions } = await getSettings(user.id);
  return <SettingsView isTeam={false} currentSession={user.session_id} user={{ full_name: user.full_name, email: user.email, phone: user.phone }} settings={settings as never}
    sessions={sessions.map((s) => ({ id: s.id, user_agent: s.user_agent, ip: s.ip, created_at: new Date(s.created_at).toISOString(), last_seen: new Date(s.last_seen).toISOString() }))} />;
}
