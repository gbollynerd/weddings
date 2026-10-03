import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/interactive";

export const metadata: Metadata = {
  title: { default: "Visual Weddings — Wedding photography & film", template: "%s · Visual Weddings" },
  description: "Modern wedding photography and videography. Check availability, compare packages and book your team in minutes.",
  icons: { icon: "/icon.svg" },
};
export const viewport: Viewport = { themeColor: "#1b2140" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
