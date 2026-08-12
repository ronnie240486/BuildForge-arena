import { headers } from "next/headers";

// Resolves the public base URL of the app. Preview/prod hosts must use HTTPS —
// the internal proxy sometimes reports x-forwarded-proto=http, which breaks
// downloads on the client, so we force https for any non-local host.
export async function getAppUrl(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1") || host.startsWith("0.0.0.0");
  const proto = isLocal ? "http" : "https";
  return `${proto}://${host}`;
}
