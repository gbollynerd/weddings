import { requireUser } from "@/lib/auth";
import { listNotifications, unreadCounts } from "@/lib/services/notifications";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["coordinator", "admin"], "/admin");
  const [counts, notes] = await Promise.all([unreadCounts(user.id), listNotifications(user.id, "all", 8)]);
  const nav: NavGroup[] = [
    { items: [
      { href: "/admin", label: "Operations", icon: "LayoutDashboard" },
      { href: "/admin/messages", label: "Messages", icon: "MessageCircle", badge: counts.messages },
    ] },
    { title: "Account", items: [
      { href: "/admin/notifications", label: "Notifications", icon: "Bell", badge: counts.notifications },
      { href: "/admin/settings", label: "Settings", icon: "Settings" },
    ] },
  ];
  return (
    <AppShell nav={nav} base="/admin" settingsHref="/admin/settings" profileHref="/admin/settings" oncall
      user={{ name: user.full_name, email: user.email, avatar: user.avatar_url, roleLabel: user.role === "admin" ? "Administrator" : "Coordinator" }}
      notifications={notes.map((n) => ({ ...n, created_at: new Date(n.created_at).toISOString(), read_at: n.read_at ? new Date(n.read_at).toISOString() : null })) as never}
      unread={counts.notifications}>{children}</AppShell>
  );
}
