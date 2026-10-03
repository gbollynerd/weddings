import { UploadPage } from "@/components/uploads/upload-page";
export const metadata = { title: "Video Uploads" };
export default async function VideoUploads({ searchParams }: { searchParams: Promise<{ wedding?: string }> }) {
  return <UploadPage kind="video" weddingParam={(await searchParams).wedding} />;
}
