import { requireUser } from "@/lib/auth";
import { listNotifications } from "@/lib/services/notifications";
import { NotificationCenter } from "@/components/notifications/notification-center";
export const metadata = { title: "Notifications" };
export default async function ClientNotifications() {
  const user = await requireUser(["client"]);
  const items = await listNotifications(user.id, "all", 100);
  return <NotificationCenter items={items.map((n) => ({ ...n, created_at: new Date(n.created_at).toISOString(), read_at: n.read_at ? new Date(n.read_at).toISOString() : null })) as never} />;
}
