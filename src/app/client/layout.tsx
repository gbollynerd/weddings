import { requireUser } from "@/lib/auth";
import { listNotifications, unreadCounts } from "@/lib/services/notifications";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["client"], "/client");
  const [counts, notes] = await Promise.all([unreadCounts(user.id), listNotifications(user.id, "all", 8)]);
  const nav: NavGroup[] = [
    { items: [
      { href: "/client", label: "My Wedding", icon: "Heart" },
      { href: "/client/questionnaire", label: "Questionnaire", icon: "ClipboardList" },
      { href: "/client/payments", label: "Payments", icon: "CreditCard" },
      { href: "/client/messages", label: "Messages", icon: "MessageCircle", badge: counts.messages },
      { href: "/client/documents", label: "Documents & Gallery", icon: "Images" },
    ] },
    { title: "Account", items: [
      { href: "/client/notifications", label: "Notifications", icon: "Bell", badge: counts.notifications },
      { href: "/client/settings", label: "Settings", icon: "Settings" },
    ] },
  ];
  return (
    <AppShell nav={nav} base="/client" settingsHref="/client/settings" profileHref="/client/settings"
      user={{ name: user.full_name, email: user.email, avatar: user.avatar_url, roleLabel: "Client" }}
      notifications={notes.map((n) => ({ ...n, created_at: new Date(n.created_at).toISOString(), read_at: n.read_at ? new Date(n.read_at).toISOString() : null })) as never}
      unread={counts.notifications}>
      {children}
    </AppShell>
  );
}
