export type Role = "client" | "photographer" | "videographer" | "coordinator" | "admin";

export const PERMISSIONS: Record<Role, string[]> = {
  client: ["booking:create", "wedding:view_own", "payment:make", "message:send", "deliverable:view"],
  photographer: ["availability:manage", "opportunity:accept", "wedding:view_assigned", "upload:create", "payout:view", "license:submit", "message:send", "profile:edit"],
  videographer: ["availability:manage", "opportunity:accept", "wedding:view_assigned", "upload:create", "payout:view", "license:submit", "message:send", "profile:edit"],
  coordinator: ["wedding:manage", "team:assign", "booking:manage", "license:review", "message:send", "handbook:edit", "payout:manage"],
  admin: ["*"],
};

export function can(role: Role, permission: string) {
  const p = PERMISSIONS[role] ?? [];
  return p.includes("*") || p.includes(permission);
}

export const isTeam = (role: Role) => role === "photographer" || role === "videographer";
export const isStaff = (role: Role) => role === "coordinator" || role === "admin";

export function homeFor(role: Role) {
  if (role === "client") return "/client";
  if (isTeam(role)) return "/team";
  return "/admin";
}
