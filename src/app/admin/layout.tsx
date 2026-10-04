import { requireUser } from "@/lib/auth";
import { listNotifications, unreadCounts } from "@/lib/services/notifications";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";
import { sql } from "@/lib/db";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["coordinator", "admin"], "/admin");
  const [counts, notes, [q]] = await Promise.all([unreadCounts(user.id), listNotifications(user.id, "all", 8),
    sql`select (select count(*) from wedding_assignments a join weddings w on w.id = a.wedding_id where a.status = 'pending' and w.wedding_date >= current_date)::int
          + (select count(*) from assignment_cancellations where status = 'pending')::int as staffing,
        (select count(*) from team_members where status = 'applicant')::int as applicants`]);
  const nav: NavGroup[] = [
    { items: [
      { href: "/admin", label: "Operations", icon: "LayoutDashboard" },
      { href: "/admin/weddings", label: "Weddings", icon: "Heart", badge: q.staffing },
      { href: "/admin/people", label: "People", icon: "Users", badge: q.applicants },
      { href: "/admin/messages", label: "Messages", icon: "MessageCircle", badge: counts.messages },
    ] },
    { title: "Account", items: [
      { href: "/admin/contract", label: "Contract terms", icon: "FileText" },
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
