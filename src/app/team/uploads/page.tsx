import { UploadPage } from "@/components/uploads/upload-page";
export const metadata = { title: "Photo Uploads" };
export default async function PhotoUploads({ searchParams }: { searchParams: Promise<{ wedding?: string }> }) {
  return <UploadPage kind="photo" weddingParam={(await searchParams).wedding} />;
}
