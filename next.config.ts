import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Server-only secrets are inlined at build so deployments work even when the hosting
  // dashboard has no environment variables configured. Values set in the dashboard win.
  env: {
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    AUTH_SECRET: process.env.AUTH_SECRET ?? "",
    SUPABASE_URL: process.env.SUPABASE_URL ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  },
  agentRules: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
  experimental: { serverActions: { bodySizeLimit: "4mb" } },
};
export default nextConfig;
