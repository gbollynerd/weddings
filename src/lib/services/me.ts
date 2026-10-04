import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getMember } from "./team";

/** Current team member (photographer/videographer) for server components. */
export const currentMember = cache(async () => {
  const user = await requireUser(["photographer", "videographer"]);
  const member = await getMember(user.id);
  if (!member) redirect("/login");
  return { user, member };
});

/** Pages only approved team members can use (applicants are sent to their application status). */
export const requireActiveMember = cache(async () => {
  const r = await currentMember();
  if (r.member.status !== "active") redirect("/team");
  return r;
});
