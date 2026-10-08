import { UploadPage } from "@/components/uploads/upload-page";
export const metadata = { title: "Uploads" };
export default async function Uploads({ searchParams }: { searchParams: Promise<{ wedding?: string }> }) {
  return <UploadPage weddingParam={(await searchParams).wedding} />;
}
