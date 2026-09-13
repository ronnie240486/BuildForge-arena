import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const KNOWN_SCHEMES = ["file:", "libsql:", "http:", "https:", "ws:", "wss:"];

/**
 * The app's per-user data folder (%APPDATA%/BuildForge on Windows),
 * auto-created. Zero-setup local persistence for the SQLite database file —
 * works the same whether running via `next dev`/`next start` or packaged
 * inside the Electron desktop app.
 */
export function resolveAppDataDir(): string {
  const appDataDir = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  const dir = path.join(appDataDir, "BuildForge");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Resolves where the local SQLite database file lives. Defaults to
 * `resolveAppDataDir()` so the app works with zero setup — no server, no
 * connection string. `DATABASE_URL` still overrides this for tests/CI or an
 * explicit path — always as a plain filesystem path (a `file:`/`libsql:`
 * prefix, if present, is stripped).
 */
export function resolveDatabasePath(): string {
  const override = process.env.DATABASE_URL;
  if (override) {
    if (override === ":memory:") return override;
    const scheme = KNOWN_SCHEMES.find((known) => override.startsWith(known));
    const resolved = scheme ? override.slice(scheme.length) : override;
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    return resolved;
  }

  return path.join(resolveAppDataDir(), "buildforge.db");
}

/** Same as `resolveDatabasePath()`, but as a libsql client connection URL. */
export function resolveDatabaseUrl(): string {
  const dbPath = resolveDatabasePath();
  return dbPath === ":memory:" ? dbPath : `file:${dbPath}`;
}
