import { Search } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { listPeople, peopleCounts, type PeopleTab } from "@/lib/services/people";
import { LinkTabs, Input, Button } from "@/components/ui";
import { PeopleList } from "./list";

export const metadata = { title: "People" };
const TABS: Record<PeopleTab, string> = { applicants: "Applicants", team: "Team", clients: "Clients", staff: "Staff" };
const iso = (v: unknown) => (v ? new Date(v as string).toISOString() : null);

export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ tab?: string; q?: string }> }) {
  const me = await requireUser(["coordinator", "admin"]);
  const sp = await searchParams;
  const counts = await peopleCounts();
  const tab: PeopleTab = sp.tab && sp.tab in TABS ? (sp.tab as PeopleTab) : counts.applicants ? "applicants" : "team";
  const q = (sp.q ?? "").trim().slice(0, 80);
  const rows = await listPeople(tab, q);
  const href = (t: PeopleTab) => `/admin/people?tab=${t}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-2xl text-sm text-muted">Review team applications and manage every account: approve, suspend, change roles and reset passwords.</p>
        {
          <form className="relative w-full sm:w-auto" action="/admin/people">
            <input type="hidden" name="tab" value={tab} />
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-midnight-300" />
            <Input name="q" defaultValue={q} placeholder="Name or email" className="h-10 w-full pl-9 sm:w-60" aria-label="Search people" />
            <Button type="submit" className="sr-only">Search</Button>
          </form>
        }
      </div>
      <LinkTabs active={href(tab)} tabs={(Object.keys(TABS) as PeopleTab[]).map((t) => ({ href: href(t), label: TABS[t], count: counts[t] }))} />
      <PeopleList tab={tab} me={{ id: me.id, role: me.role }}
        rows={rows.map((r) => ({ ...r, created_at: iso(r.created_at), last_seen: iso(r.last_seen), applied_at: iso(r.applied_at), decided_at: iso(r.decided_at) })) as never} />
    </div>
  );
}
