/*
 * One-time Dropbox connection. Gets the long-lived refresh token the app uses to upload footage.
 *
 *   1. DROPBOX_APP_KEY=… DROPBOX_APP_SECRET=… npx tsx scripts/dropbox-auth.ts
 *      → open the printed link while signed in to the COMPANY Dropbox account and click Allow.
 *   2. DROPBOX_APP_KEY=… DROPBOX_APP_SECRET=… npx tsx scripts/dropbox-auth.ts <code shown by Dropbox>
 *      → prints DROPBOX_REFRESH_TOKEN. Add all three values to Vercel → Settings → Environment Variables.
 *
 * The token is only printed to your terminal; never commit it.
 */
import { loadEnv } from "./env";

loadEnv();
const key = process.env.DROPBOX_APP_KEY;
const secret = process.env.DROPBOX_APP_SECRET;
if (!key || !secret) {
  console.error("Set DROPBOX_APP_KEY and DROPBOX_APP_SECRET first (from dropbox.com/developers/apps → your app → Settings).");
  process.exit(1);
}
const code = process.argv[2];

async function main() {
  if (!code) {
    const url = new URL("https://www.dropbox.com/oauth2/authorize");
    url.searchParams.set("client_id", key!);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("token_access_type", "offline");
    console.log("\n1. Sign in to the company Dropbox account, then open:\n\n   " + url.toString());
    console.log("\n2. Click Allow, copy the code, and run this script again with the code as the last argument.\n");
    return;
  }
  const res = await fetch("https://api.dropboxapi.com/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ code, grant_type: "authorization_code", client_id: key!, client_secret: secret! }),
  });
  const json = (await res.json()) as { refresh_token?: string; scope?: string; error_description?: string };
  if (!res.ok || !json.refresh_token) {
    console.error("Dropbox said:", json.error_description ?? res.status, "— codes expire after a few minutes; get a fresh one.");
    process.exit(1);
  }
  const scopes = (json.scope ?? "").split(" ");
  const missing = ["files.content.write", "files.content.read", "files.metadata.read", "files.metadata.write"].filter((s) => !scopes.includes(s));
  console.log("\nDROPBOX_REFRESH_TOKEN=" + json.refresh_token + "\n");
  if (missing.length) console.warn("⚠ The app is missing these permissions: " + missing.join(", ") + ". Enable them under Permissions, then repeat both steps.");
  else console.log("✓ Permissions look right. Add DROPBOX_APP_KEY, DROPBOX_APP_SECRET and DROPBOX_REFRESH_TOKEN to Vercel, then redeploy.");
}
main();
