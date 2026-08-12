// Runs once when the Node.js server boots (production runtime only).
// Guarantees the database schema and demo data exist, so the app works
// even against a freshly provisioned database.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureReady } = await import("./lib/db-init");
    await ensureReady();
  }
}
