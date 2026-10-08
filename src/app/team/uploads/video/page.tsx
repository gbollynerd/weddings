import { redirect } from "next/navigation";
/** Old link: photo and video uploads now share one page. */
export default async function VideoUploads({ searchParams }: { searchParams: Promise<{ wedding?: string }> }) {
  const w = (await searchParams).wedding;
  redirect(w ? `/team/uploads?wedding=${encodeURIComponent(w)}` : "/team/uploads");
}
