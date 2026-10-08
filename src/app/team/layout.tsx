import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember, opportunities, licenses, REQUIRED_DOCS } from "@/lib/services/team";
import { standardsAcceptance } from "@/lib/services/standards";
import { listNotifications, unreadCounts } from "@/lib/services/notifications";
import { skillsLine } from "@/lib/skills";
import { AppShell, type NavGroup } from "@/components/shell/app-shell";

export default async function TeamLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser(["freelancer"], "/team");
  const member = await getMember(user.id);
  if (!member) redirect("/login");
  const active = member.status === "active";
  const [counts, notes, opps, lic, standards] = await Promise.all([unreadCounts(user.id), listNotifications(user.id, "all", 8), active ? opportunities(member) : Promise.resolve([]), licenses(member.id), standardsAcceptance(member.id)]);
  const standardsBadge = standards ? 0 : 1;
  const openCount = opps.filter((o) => (o.view_status === "available" && o.eligible) || o.view_status === "offered").length;
  const licIssues = REQUIRED_DOCS.filter((d) => d.required).filter((d) => {
    const docs = lic.filter((l) => l.doc_type === d.type);
    return !docs.some((l) => ["verified", "pending_review"].includes(l.effective as string));
  }).length + lic.filter((l) => l.effective === "expiring_soon").length;

  const nav: NavGroup[] = !active ? [
    { items: [{ href: "/team", label: "Application", icon: "ClipboardList" }] },
    { title: "Get ready", items: [
      { href: "/team/standards", label: "Team Standards", icon: "ShieldCheck", badge: standardsBadge, badgeTone: "danger" },
      { href: "/team/licenses", label: "Licenses", icon: "ShieldCheck", badge: licIssues, badgeTone: "danger" },
      { href: "/team/profile", label: "Profile", icon: "UserRound" },
      { href: "/team/handbook", label: "Team Handbook", icon: "BookOpen" },
      { href: "/team/settings", label: "Settings", icon: "Settings" },
      { href: "/team/notifications", label: "Notifications", icon: "Bell", badge: counts.notifications },
    ] },
  ] : [
    { items: [
      { href: "/team", label: "Overview", icon: "LayoutDashboard" },
      { href: "/team/weddings", label: "My Weddings", icon: "Heart" },
      { href: "/team/open", label: "Open Weddings", icon: "Sparkles", badge: openCount },
      { href: "/team/availability", label: "Availability", icon: "CalendarDays" },
      { href: "/team/messages", label: "Messages", icon: "MessageCircle", badge: counts.messages },
      { href: "/team/uploads", label: "Uploads", icon: "UploadCloud", match: ["/team/uploads"] },
      { href: "/team/payments", label: "Payments", icon: "Wallet" },
    ] },
    { title: "Resources", items: [
      { href: "/team/handbook", label: "Team Handbook", icon: "BookOpen" },
      { href: "/team/standards", label: "Team Standards", icon: "ShieldCheck", badge: standardsBadge, badgeTone: "danger" },
      { href: "/team/licenses", label: "Licenses", icon: "ShieldCheck", badge: licIssues, badgeTone: "danger" },
      { href: "/team/profile", label: "Profile", icon: "UserRound" },
      { href: "/team/settings", label: "Settings", icon: "Settings" },
      { href: "/team/notifications", label: "Notifications", icon: "Bell", badge: counts.notifications },
    ] },
  ];
  return (
    <AppShell nav={nav} base="/team" oncall settingsHref="/team/settings" profileHref="/team/profile"
      user={{ name: member.full_name, email: member.email, avatar: member.avatar_url, roleLabel: `${skillsLine(member.skills)}${active ? "" : member.status === "rejected" ? " · not approved" : " · applicant"}` }}
      notifications={notes.map((n) => ({ ...n, created_at: String(n.created_at), read_at: n.read_at ? String(n.read_at) : null })) as never}
      unread={counts.notifications}>
      {children}
    </AppShell>
  );
}
