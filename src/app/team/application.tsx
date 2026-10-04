import { CheckCircle2, Circle, Clock, XCircle, ShieldCheck, UserRound, BookOpen } from "lucide-react";
import { Card, CardBody, ButtonLink, Alert } from "@/components/ui";
import { licenses, profileCompletion, REQUIRED_DOCS, type Member } from "@/lib/services/team";
import { fmtDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** What applicants see instead of the team dashboard until a coordinator approves them. */
export async function ApplicationStatus({ member }: { member: Member }) {
  const lic = await licenses(member.id);
  const required = REQUIRED_DOCS.filter((d) => d.required);
  const docsIn = required.filter((d) => lic.some((l) => l.doc_type === d.type && ["verified", "pending_review", "expiring_soon"].includes(l.effective as string))).length;
  const profile = profileCompletion(member, lic.length);
  const rejected = member.status === "rejected";
  const steps = [
    { done: true, title: "Application submitted", detail: member.applied_at ? `Received ${fmtDate(member.applied_at)}` : "Received", icon: CheckCircle2 },
    { done: docsIn === required.length, title: "Upload your documents", detail: `${docsIn} of ${required.length} required: ${required.map((d) => d.label.toLowerCase()).join(", ")}`, href: "/team/licenses", cta: "Upload", icon: ShieldCheck },
    { done: profile.percent >= 80, title: "Finish your profile", detail: `${profile.percent}% complete${profile.missing[0] ? ` — ${profile.missing[0].toLowerCase()}` : ""}`, href: "/team/profile", cta: "Edit profile", icon: UserRound },
    { done: false, title: "Read the Team Handbook", detail: "How we work on wedding days, delivery and pay", href: "/team/handbook", cta: "Open", icon: BookOpen },
  ];
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <p className="text-sm text-muted">{member.discipline === "photo" ? "Photographer" : "Videographer"} application</p>
        <h2 className="text-2xl font-semibold text-ink">{rejected ? "Thanks for applying" : `Welcome, ${member.full_name.split(" ")[0]}.`}</h2>
      </div>
      {rejected ? (
        <Alert tone="warning" icon={XCircle} title="Your application wasn't approved this time">
          {member.decision_note ?? "We don't have a spot that fits right now."} If anything changes, update your profile and contact us — we&apos;re happy to take another look.
        </Alert>
      ) : (
        <Alert tone="blush" icon={Clock} title="Your application is being reviewed">
          A coordinator will review your portfolio and documents, usually within a few business days. You&apos;ll be able to browse and accept weddings as soon as you&apos;re approved — we&apos;ll notify you by email.
        </Alert>
      )}
      {!rejected && (
        <Card>
          <CardBody className="p-0">
            <ol className="divide-y divide-line">
              {steps.map((s) => (
                <li key={s.title} className="flex items-center gap-4 px-6 py-4">
                  {s.done ? <CheckCircle2 className="size-6 shrink-0 text-success-500" /> : <Circle className="size-6 shrink-0 text-midnight-200" />}
                  <div className="min-w-0 flex-1">
                    <p className={cn("font-medium", s.done ? "text-muted" : "text-ink")}>{s.title}</p>
                    <p className="text-[13px] text-muted">{s.detail}</p>
                  </div>
                  {s.href && !s.done && <ButtonLink href={s.href} variant="outline" size="sm">{s.cta}</ButtonLink>}
                </li>
              ))}
            </ol>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
