/** Team accounts are all "freelancer"; their skills (photo / video / content) live on team_members.skills. */
export type Role = "client" | "freelancer" | "coordinator" | "admin";

export const PERMISSIONS: Record<Role, string[]> = {
  client: ["booking:create", "wedding:view_own", "payment:make", "message:send", "deliverable:view"],
  freelancer: ["availability:manage", "opportunity:accept", "wedding:view_assigned", "upload:create", "payout:view", "license:submit", "message:send", "profile:edit"],
  coordinator: ["wedding:manage", "team:assign", "booking:manage", "license:review", "message:send", "handbook:edit", "payout:manage", "people:manage"],
  admin: ["*"],
};

export function can(role: Role, permission: string) {
  const p = PERMISSIONS[role] ?? [];
  return p.includes("*") || p.includes(permission);
}

export const TEAM_ROLES: Role[] = ["freelancer"];
export const isTeam = (role: Role) => role === "freelancer";
export const isStaff = (role: Role) => role === "coordinator" || role === "admin";

export function homeFor(role: Role) {
  if (role === "client") return "/client";
  if (isTeam(role)) return "/team";
  return "/admin";
}
