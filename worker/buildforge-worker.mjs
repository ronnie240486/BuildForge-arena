#!/usr/bin/env node
/**
 * Agente de referência BuildForge. Execute em uma máquina com Node 20+, Git e
 * os toolchains Android, Flutter ou React Native que pretende disponibilizar.
 * Exemplo: BUILDFORGE_URL=https://seu-dominio MANUS_WORKER_TOKEN=bfw_... node worker/buildforge-worker.mjs
 */
import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, writeFile, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, normalize, relative } from "node:path";
import { promisify } from "node:util";
import { unzipSync } from "fflate";

const exec = promisify(execFile);
const baseUrl = (process.env.BUILDFORGE_URL || "").replace(/\/$/, "");
const token = process.env.MANUS_WORKER_TOKEN || "";
const intervalMs = Number(process.env.BUILDFORGE_POLL_MS || 15_000);
if (!baseUrl || !token) throw new Error("Defina BUILDFORGE_URL e MANUS_WORKER_TOKEN antes de iniciar o agente.");

async function request(path, body = {}) {
  const response = await fetch(`${baseUrl}${path}`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || `Falha HTTP ${response.status}`);
  return payload;
}

async function sendLog(buildId, sequence, level, message, progress) {
  await request("/api/worker/log", { buildId, sequence, level, message: String(message).slice(0, 10_000), progress });
}

function safeEntry(name) {
  const value = normalize(name).replace(/^([/\\])+/, "");
  return value && !value.startsWith("..") && !value.includes("/../") ? value : null;
}

async function extractSource(url, destination) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Não foi possível obter a fonte enviada (${response.status}).`);
  const archive = new Uint8Array(await response.arrayBuffer());
  const entries = unzipSync(archive);
  for (const [name, data] of Object.entries(entries)) {
    const safe = safeEntry(name);
    if (!safe || safe.endsWith("/")) continue;
    const target = join(destination, safe);
    await mkdir(join(target, ".."), { recursive: true });
    await writeFile(target, data);
  }
}

async function prepareSource(build, workspace) {
  const source = join(workspace, "source");
  await mkdir(source, { recursive: true });
  if (build.repoUrl) {
    const args = ["clone", "--depth", "1", "--branch", build.branch || "main", build.repoUrl, source];
    await exec("git", args, { timeout: 120_000 });
  } else if (build.sourceUrl) {
    await extractSource(build.sourceUrl, source);
  } else {
    throw new Error("O build não possui repositório ou arquivo-fonte disponível.");
  }
  return source;
}

async function applyFixes(source, fixes) {
  const applied = [];
  for (const fix of fixes || []) {
    const validPaths = Array.isArray(fix.affectedFiles) && fix.affectedFiles.every((file) => {
      const checked = safeEntry(file);
      return checked && !checked.startsWith(".git/");
    });
    if (!validPaths || !fix.patch?.trim()) continue;
    const patchFile = join(source, `.buildforge-fix-${fix.id}.patch`);
    await writeFile(patchFile, fix.patch);
    try {
      await exec("git", ["apply", "--whitespace=nowarn", patchFile], { cwd: source, timeout: 30_000 });
      applied.push(fix.id);
    } finally {
      await rm(patchFile, { force: true });
    }
  }
  return applied;
}

async function runCommand(command, args, cwd) {
  const child = execFile(command, args, { cwd, timeout: 20 * 60_000, maxBuffer: 2_000_000 });
  const result = await child;
  return `${result.stdout}\n${result.stderr}`.trim();
}

async function createWebviewSource(build, workspace) {
  const config = build.webviewConfig;
  if (!config?.siteUrl || !config?.appName) throw new Error("A configuração WebView do projeto não está disponível.");
  const source = join(workspace, "source");
  const packageName = "im.buildforge.generated";
  const javaDir = join(source, "app", "src", "main", "java", ...packageName.split("."));
  await mkdir(javaDir, { recursive: true });
  const permissions = new Set(["internet", ...(Array.isArray(config.permissions) ? config.permissions : [])]);
  const permissionNames = { internet: "INTERNET", camera: "CAMERA", location: "ACCESS_FINE_LOCATION", notifications: "POST_NOTIFICATIONS", storage: "READ_MEDIA_IMAGES" };
  const manifestPermissions = [...permissions].filter((permission) => permission in permissionNames).map((permission) => `<uses-permission android:name="android.permission.${permissionNames[permission]}" />`).join("\n    ");
  const siteUrl = JSON.stringify(config.siteUrl);
  const allowedHost = JSON.stringify(new URL(config.siteUrl).hostname);
  const blockNavigation = config.allowNavigation ? "false" : `host == null || !host.equalsIgnoreCase(${allowedHost})`;
  await writeFile(join(source, "settings.gradle"), "pluginManagement { repositories { google(); mavenCentral(); gradlePluginPortal() } }\ndependencyResolutionManagement { repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS); repositories { google(); mavenCentral() } }\nrootProject.name = 'BuildForgeWebView'\ninclude ':app'\n");
  await writeFile(join(source, "build.gradle"), "plugins { id 'com.android.application' version '8.5.2' apply false }\n");
  await writeFile(join(source, "app", "build.gradle"), `plugins { id 'com.android.application' }\n\nandroid { namespace '${packageName}'; compileSdk 35\n  defaultConfig { applicationId '${packageName}'; minSdk 24; targetSdk 35; versionCode 1; versionName '1.0' }\n}\n`);
  await mkdir(join(source, "app", "src", "main", "res", "values"), { recursive: true });
  await writeFile(join(source, "app", "src", "main", "AndroidManifest.xml"), `<manifest xmlns:android="http://schemas.android.com/apk/res/android">\n    ${manifestPermissions}\n    <application android:theme="@style/AppTheme" android:label=${JSON.stringify(config.appName)}>\n        <activity android:name=".MainActivity" android:exported="true"><intent-filter><action android:name="android.intent.action.MAIN"/><category android:name="android.intent.category.LAUNCHER"/></intent-filter></activity>\n    </application>\n</manifest>\n`);
  await writeFile(join(source, "app", "src", "main", "res", "values", "styles.xml"), "<resources><style name=\"AppTheme\" parent=\"android:style/Theme.Material.Light.NoActionBar\" /></resources>\n");
  await writeFile(join(javaDir, "MainActivity.java"), `package ${packageName};\n\nimport android.app.Activity;\nimport android.os.Bundle;\nimport android.webkit.WebResourceRequest;\nimport android.webkit.WebView;\nimport android.webkit.WebViewClient;\n\npublic class MainActivity extends Activity {\n  @Override public void onCreate(Bundle state) { super.onCreate(state); WebView view = new WebView(this); view.getSettings().setJavaScriptEnabled(true); view.getSettings().setDomStorageEnabled(true); view.setWebViewClient(new WebViewClient() { @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest request) { String host = request.getUrl().getHost(); return ${blockNavigation}; } }); view.loadUrl(${siteUrl}); setContentView(view); }\n}\n`);
  return source;
}

async function runBuild(build, source) {
  if (build.framework === "android") return runCommand(process.platform === "win32" ? "gradlew.bat" : "./gradlew", [build.artifact === "aab" ? "bundleRelease" : "assembleRelease"], source);
  if (build.framework === "flutter") return runCommand("flutter", ["build", build.artifact === "aab" ? "appbundle" : "apk", "--release"], source);
  if (build.framework === "react_native") return runCommand("npx", ["react-native", "build-android", "--mode=release"], source);
  if (build.framework === "webview") return runCommand(process.env.GRADLE_COMMAND || "gradle", [build.artifact === "aab" ? "bundleRelease" : "assembleRelease"], source);
  throw new Error(`Framework ${build.framework} não é suportado por este agente.`);
}

async function findArtifact(root, extension) {
  const entries = await readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const file = join(root, entry.name);
    if (entry.isDirectory() && !["node_modules", ".git"].includes(entry.name)) {
      const found = await findArtifact(file, extension);
      if (found) return found;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(extension)) return file;
  }
  return null;
}

async function executeBuild(build) {
  const workspace = await mkdtemp(join(tmpdir(), "buildforge-"));
  let sequence = 10;
  try {
    await sendLog(build.id, sequence++, "info", `Build iniciado pelo agente para ${build.framework}.`, 8);
    const source = build.framework === "webview" ? await createWebviewSource(build, workspace) : await prepareSource(build, workspace);
    await sendLog(build.id, sequence++, "info", "Fonte preparada; aplicando correções aprovadas quando compatíveis.", 18);
    const appliedFixIds = await applyFixes(source, build.approvedFixes);
    if (appliedFixIds.length) await sendLog(build.id, sequence++, "info", `${appliedFixIds.length} correção(ões) de IA aplicadas.`, 28);
    await sendLog(build.id, sequence++, "info", "Executando toolchain de release.", 40);
    const output = await runBuild(build, source);
    if (output) await sendLog(build.id, sequence++, "info", output.slice(-8_000), 84);
    const extension = build.artifact === "aab" ? ".aab" : ".apk";
    const artifact = await findArtifact(source, extension);
    if (!artifact) throw new Error(`Toolchain concluída, mas nenhum arquivo ${extension} foi localizado.`);
    const data = await readFile(artifact);
    const uploaded = await request("/api/worker/artifact", { buildId: build.id, type: build.artifact, filename: `build-${build.id}${extension}`, contentType: "application/vnd.android.package-archive", contentBase64: data.toString("base64") });
    await request("/api/worker/complete", { buildId: build.id, status: "succeeded", summary: `Artefato ${extension} gerado e armazenado com sucesso.`, appliedFixIds, artifactId: uploaded.id });
  } catch (error) {
    await sendLog(build.id, sequence++, "error", error instanceof Error ? error.stack || error.message : String(error), 0).catch(() => undefined);
    await request("/api/worker/complete", { buildId: build.id, status: "failed", summary: error instanceof Error ? error.message : "Falha desconhecida no agente." }).catch(() => undefined);
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function tick() {
  await request("/api/worker/heartbeat", { activeBuilds: 0 });
  const { build } = await request("/api/worker/claim");
  if (build) await executeBuild(build);
}

async function loop() {
  for (;;) {
    try { await tick(); } catch (error) { console.error("[BuildForge worker]", error instanceof Error ? error.message : error); }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
}

loop();
