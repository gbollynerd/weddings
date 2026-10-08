/**
 * Freelancer skills. One account (one email) can hold any mix of these and request any job that matches.
 * Each wedding slot needs exactly one skill; a person works at most one slot per wedding.
 */
export type Skill = "photo" | "video" | "content";
export const SKILLS: { value: Skill; label: string; person: string; plural: string }[] = [
  { value: "photo", label: "Photography", person: "Photographer", plural: "Photographers" },
  { value: "video", label: "Videography", person: "Videographer", plural: "Videographers" },
  { value: "content", label: "Content creation", person: "Content creator", plural: "Content creators" },
];
export const SKILL_VALUES = SKILLS.map((s) => s.value);
export const isSkill = (v: unknown): v is Skill => typeof v === "string" && (SKILL_VALUES as string[]).includes(v);
export const skillPerson = (s: string) => SKILLS.find((x) => x.value === s)?.person ?? s;
export const skillLabel = (s: string) => SKILLS.find((x) => x.value === s)?.label ?? s;

/** Slot roles on a wedding, grouped by the skill they need. */
export const SLOT_ROLES: Record<Skill, string[]> = {
  photo: ["lead_photo", "second_photo"],
  video: ["lead_video", "second_video"],
  content: ["lead_content"],
};
export const ALL_SLOT_ROLES = Object.values(SLOT_ROLES).flat();
export function skillForRole(role: string): Skill {
  if (role.endsWith("photo")) return "photo";
  if (role.endsWith("content")) return "content";
  return "video";
}
/** Default requirements shown on a new open slot. */
export function requirementsFor(role: string): string[] {
  if (role === "lead_content") return ["Recent phone that shoots 4K", "Gimbal or stabiliser", "Social-first portfolio", "Black attire"];
  return role.startsWith("lead") ? ["Lead experience", "Two camera bodies", "Black attire"] : ["Second-shooter experience", "Black attire"];
}

/** Slot roles a person with these skills can take. */
export const rolesForSkills = (skills: readonly string[]) => skills.filter(isSkill).flatMap((s) => SLOT_ROLES[s]);
/** "Photographer · Content creator" */
export const skillsLine = (skills: readonly string[] | null | undefined) => (skills ?? []).filter(isSkill).map(skillPerson).join(" · ") || "Freelancer";
