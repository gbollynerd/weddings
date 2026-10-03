import { currentMember } from "@/lib/services/me";
import { handbookTree } from "@/lib/services/handbook";
import { HandbookIndex } from "./index-view";

export const metadata = { title: "Team Handbook" };

export default async function HandbookPage() {
  const { member } = await currentMember();
  const tree = await handbookTree();
  return <HandbookIndex discipline={member.discipline} tree={tree.map((c) => ({ ...c, articles: c.articles.map((a) => ({ ...a, updated_at: new Date(a.updated_at).toISOString() })) }))} />;
}
