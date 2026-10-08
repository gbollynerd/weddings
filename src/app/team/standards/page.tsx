import { currentMember } from "@/lib/services/me";
import { standardsAcceptance } from "@/lib/services/standards";
import { STANDARDS, STANDARDS_VERSION } from "@/content/standards";
import { StandardsView } from "./view";

export const metadata = { title: "Team Standards" };

export default async function StandardsPage() {
  const { member } = await currentMember();
  const accepted = await standardsAcceptance(member.id);
  return <StandardsView sections={STANDARDS} version={STANDARDS_VERSION} memberName={member.full_name}
    accepted={accepted ? { name: accepted.signerName, at: new Date(accepted.signedAt).toISOString() } : null} />;
}
