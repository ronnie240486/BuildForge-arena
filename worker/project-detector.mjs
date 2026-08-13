import { access, readFile, readdir } from "node:fs/promises";
import { join, relative, resolve, sep } from "node:path";

const IGNORED = new Set([".git", ".gradle", ".expo", ".next", "build", "dist", "node_modules", "vendor", "Pods"]);
const MARKERS = new Set(["package.json", "pubspec.yaml", "app.json", "app.config.js", "app.config.ts", "eas.json", "settings.gradle", "settings.gradle.kts", "build.gradle", "build.gradle.kts", "gradlew", "gradlew.bat", "pnpm-lock.yaml", "yarn.lock", "package-lock.json", "bun.lockb"]);

async function exists(path) { try { await access(path); return true; } catch { return false; } }
async function json(path) { try { return JSON.parse(await readFile(path, "utf8")); } catch { return null; } }
const dep = (manifest, name) => manifest?.dependencies?.[name] ?? manifest?.devDependencies?.[name] ?? null;
function packageManager(files) { if (files.has("pnpm-lock.yaml")) return "pnpm"; if (files.has("yarn.lock")) return "yarn"; if (files.has("bun.lockb")) return "bun"; return "npm"; }
function lockfile(files) { return files.has("pnpm-lock.yaml") ? "pnpm-lock.yaml" : files.has("yarn.lock") ? "yarn.lock" : files.has("bun.lockb") ? "bun.lockb" : files.has("package-lock.json") ? "package-lock.json" : null; }

async function candidates(source, maxDepth = 8) {
  const root = resolve(source); const list = [];
  async function visit(path, depth) {
    if (depth > maxDepth) return;
    if (relative(root, path).startsWith("..")) throw new Error("A inspeção tentou escapar do workspace permitido.");
    const entries = await readdir(path, { withFileTypes: true }).catch(() => []);
    const files = new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name));
    const dirs = new Set(entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name));
    if ([...files].some((name) => MARKERS.has(name)) || dirs.has("android") || dirs.has("app")) list.push({ path, files, dirs, depth });
    for (const entry of entries) if (entry.isDirectory() && !IGNORED.has(entry.name)) await visit(join(path, entry.name), depth + 1);
  }
  await visit(root, 0); return { root, list };
}

async function classify(candidate, root) {
  const { path, files, dirs, depth } = candidate;
  const manifest = files.has("package.json") ? await json(join(path, "package.json")) : null;
  const expo = dep(manifest, "expo"), reactNative = dep(manifest, "react-native");
  const appConfig = files.has("app.json") || files.has("app.config.js") || files.has("app.config.ts"), eas = files.has("eas.json"), androidDir = dirs.has("android");
  const androidWrapper = androidDir && (await exists(join(path, "android", "gradlew")) || await exists(join(path, "android", "gradlew.bat")));
  const rootWrapper = files.has("gradlew") || files.has("gradlew.bat"), settings = files.has("settings.gradle") || files.has("settings.gradle.kts"), build = files.has("build.gradle") || files.has("build.gradle.kts");
  let framework = "unknown", score = 0; const evidence = [];
  if (expo && (appConfig || eas || reactNative)) { framework = "expo"; score = 130; evidence.push(`dependência expo ${expo}`, ...(reactNative ? [`react-native ${reactNative}`] : []), ...(appConfig ? ["configuração Expo"] : []), ...(eas ? ["eas.json"] : []), ...(androidDir ? ["pasta android existente"] : ["sem pasta android"])); }
  else if (reactNative && androidDir && androidWrapper) { framework = "react_native"; score = 120; evidence.push(`dependência react-native ${reactNative}`, "pasta android", "Gradle wrapper Android"); }
  else if (files.has("pubspec.yaml")) { framework = "flutter"; score = dirs.has("android") ? 118 : 108; evidence.push("pubspec.yaml", ...(dirs.has("android") ? ["pasta android Flutter"] : [])); }
  else if (rootWrapper && settings && (build || dirs.has("app"))) { framework = "android"; score = 125; evidence.push("Gradle wrapper", "settings.gradle", ...(build ? ["build.gradle"] : []), ...(dirs.has("app") ? ["módulo app"] : [])); }
  else if (manifest && (dep(manifest, "vite") || dep(manifest, "next") || dep(manifest, "react") || manifest.scripts?.build)) { framework = "web"; score = 70; evidence.push("package.json web", ...(dep(manifest, "vite") ? ["Vite"] : []), ...(dep(manifest, "next") ? ["Next.js"] : []), ...(dep(manifest, "react") ? ["React"] : [])); }
  if (framework === "unknown") return null;
  return { framework, projectRoot: path, relativeRoot: relative(root, path) || ".", packageManager: packageManager(files), lockfile: lockfile(files), confidence: Math.max(.5, Math.min(.99, (score - Math.min(depth * .5, 4)) / 135)), evidence, versions: { expo, reactNative }, markers: { appConfig, eas, androidDir, androidWrapper, rootWrapper, settings, build }, score };
}

export async function detectProject(source) {
  const { root, list } = await candidates(source); const all = (await Promise.all(list.map((candidate) => classify(candidate, root)))).filter(Boolean);
  for (const item of all) if (item.framework === "android") { const parent = all.find((candidate) => ["expo", "react_native", "flutter"].includes(candidate.framework) && item.projectRoot.startsWith(`${candidate.projectRoot}${sep}`)); if (parent) { item.score -= 25; item.evidence.push(`módulo Android embutido em ${parent.framework}`); } }
  all.sort((a, b) => b.score - a.score || a.relativeRoot.split(/[\\/]/).length - b.relativeRoot.split(/[\\/]/).length || a.relativeRoot.localeCompare(b.relativeRoot));
  const best = all[0];
  return best ? { ...best, strategy: null, artifact: "apk", candidates: all } : { framework: "unknown", projectRoot: root, relativeRoot: ".", strategy: "unsupported", packageManager: "npm", lockfile: null, artifact: "apk", confidence: 0, evidence: ["Nenhum manifesto compatível localizado"], candidates: [] };
}

export function safeLogValue(value) { if (typeof value === "string") return value; if (value instanceof Error) return value.stack || value.message; try { return JSON.stringify(value); } catch { return String(value); } }
