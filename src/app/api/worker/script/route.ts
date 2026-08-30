export const dynamic = "force-dynamic";

// Serves a self-contained Node.js worker agent. Run it on a machine that has
// git + JDK 17 + Android SDK (and optionally Flutter). It performs REAL builds.
const SCRIPT = String.raw`#!/usr/bin/env node
/**
 * BuildForge Worker — real Android build agent.
 * Requires: git, JDK 17, Android SDK (ANDROID_HOME), and optionally Flutter, on PATH.
 *
 * Usage:
 *   node buildforge-worker.js --server https://YOUR_APP --token bfw_xxx
 */
const { execSync, spawnSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const args = process.argv.slice(2);
const get = (k, d) => { const i = args.indexOf("--" + k); return i >= 0 ? args[i + 1] : d; };
const SERVER = (get("server", process.env.BUILDFORGE_SERVER) || "").replace(/\/$/, "");
const TOKEN = get("token", process.env.BUILDFORGE_TOKEN);
if (!SERVER || !TOKEN) { console.error("Faltam --server e --token"); process.exit(1); }

const H = { "Authorization": "Bearer " + TOKEN, "Content-Type": "application/json" };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(pathname, body) {
  const res = await fetch(SERVER + pathname, { method: "POST", headers: H, body: JSON.stringify(body || {}) });
  if (!res.ok) throw new Error(pathname + " -> " + res.status);
  return res.json();
}

function detectToolchain() {
  const tc = {};
  const ver = (cmd) => { try { return execSync(cmd, { stdio: ["ignore","pipe","ignore"] }).toString().trim().split("\n")[0]; } catch { return null; } };
  tc.java = ver("java -version 2>&1");
  tc.gradle = ver("gradle -v 2>&1 | grep Gradle") || "wrapper";
  tc.flutter = ver("flutter --version 2>&1 | head -1");
  tc.androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || null;
  return tc;
}

// Fila sequencial: garante que os logs cheguem em ordem, sem sobrepor requisicoes.
let logQueue = Promise.resolve();
function pushLog(buildId, log, progress) {
  logQueue = logQueue.then(async () => {
    try { await api("/api/worker/builds/" + buildId + "/log", { log, progress }); } catch {}
  });
  return logQueue;
}

// Extrai um .tar (buffer ja descomprimido) em pure Node. Formato tar e simples.
function extractTar(buf, dest) {
  let off = 0;
  while (off + 512 <= buf.length) {
    const header = buf.subarray(off, off + 512);
    // fim do arquivo: bloco de zeros
    if (header.every((b) => b === 0)) break;
    let name = header.subarray(0, 100).toString("utf8").replace(/\0.*$/, "");
    const prefix = header.subarray(345, 500).toString("utf8").replace(/\0.*$/, "");
    if (prefix) name = prefix + "/" + name;
    const sizeStr = header.subarray(124, 136).toString("utf8").replace(/\0.*$/, "").trim();
    const size = parseInt(sizeStr, 8) || 0;
    const type = String.fromCharCode(header[156]);
    off += 512;
    const data = buf.subarray(off, off + size);
    off += Math.ceil(size / 512) * 512;
    if (!name) continue;
    const full = path.join(dest, name);
    if (type === "5") {
      fs.mkdirSync(full, { recursive: true });
    } else if (type === "0" || type === "\0" || type === "") {
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, data);
    }
  }
}

// Git-free fallback: baixa o tarball publico do GitHub e extrai com Node puro
// (usa zlib nativo — nao depende de git, tar, powershell ou cmd).
function downloadRepoZip(project, work, buildId) {
  return new Promise(async (resolve) => {
    try {
      const m = /github\.com[/:]([^/]+)\/([^/.?#]+)/i.exec(project.repoUrl || "");
      if (!m) return resolve(false);
      const owner = m[1], repo = m[2].replace(/\.git$/, "");
      const branches = [project.branch || "main", "main", "master"];
      const https = require("https");
      const zlib = require("zlib");
      const authHeaders = { "User-Agent": "BuildForge" };
      if (project.githubToken) authHeaders.Authorization = "token " + project.githubToken;
      const fetchBuf = (url, redirects) =>
        new Promise((res) => {
          https.get(url, { headers: authHeaders }, (r) => {
            if ((r.statusCode === 301 || r.statusCode === 302) && r.headers.location && redirects < 5) {
              r.resume(); return res(fetchBuf(r.headers.location, redirects + 1));
            }
            if (r.statusCode !== 200) { r.resume(); return res(null); }
            const chunks = [];
            r.on("data", (c) => chunks.push(c));
            r.on("end", () => res(Buffer.concat(chunks)));
          }).on("error", () => res(null));
        });
      let raw = null;
      for (const b of branches) {
        const url = "https://codeload.github.com/" + owner + "/" + repo + "/tar.gz/refs/heads/" + b;
        await pushLog(buildId, "[worker] Baixando codigo (tar.gz): " + url + "\n");
        const gz = await fetchBuf(url, 0);
        if (gz) { raw = zlib.gunzipSync(gz); break; }
      }
      if (!raw) return resolve(false);
      await pushLog(buildId, "[worker] Extraindo (" + raw.length + " bytes)...\n");
      extractTar(raw, work);
      const dirs = fs.readdirSync(work, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.startsWith(repo + "-"));
      if (!dirs.length) return resolve(false);
      fs.renameSync(path.join(work, dirs[0].name), path.join(work, "src"));
      resolve(true);
    } catch (e) {
      await pushLog(buildId, "[worker] Download fallback erro: " + (e && e.message) + "\n");
      resolve(false);
    }
  });
}

// Empacota um SITE (URL online) num APK usando Capacitor — o app abre o site numa WebView.
async function buildSiteToApk(project, work, buildId) {
  const fs = require("fs");
  const path = require("path");
  await pushLog(buildId, "[worker] === SITE -> APK (Capacitor WebView) ===\n", 20);
  await pushLog(buildId, "[worker] Site: " + project.webUrl + "\n");

  const dir = path.join(work, "siteapp");
  fs.mkdirSync(dir, { recursive: true });
  const appName = project.appName || project.name || "App";
  const appId = project.packageName || "com.buildforge.siteapp";

  // package.json minimo
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "siteapp", version: "1.0.0", private: true }, null, 2));
  // pasta web com um index simples (fallback quando offline)
  const webDir = path.join(dir, "www");
  fs.mkdirSync(webDir, { recursive: true });
  fs.writeFileSync(path.join(webDir, "index.html"), "<!doctype html><meta charset=utf-8><title>" + appName + "</title><body style='font-family:sans-serif;padding:2rem'>Carregando " + appName + "…</body>");

  // capacitor.config: server.url aponta para o site online.
  const cfg = {
    appId,
    appName,
    webDir: "www",
    server: { url: project.webUrl, cleartext: true, androidScheme: "https" },
  };
  fs.writeFileSync(path.join(dir, "capacitor.config.json"), JSON.stringify(cfg, null, 2));

  await pushLog(buildId, "[worker] Instalando Capacitor...\n", 35);
  let ok = await run("npm install @capacitor/core @capacitor/cli @capacitor/android --save --legacy-peer-deps", dir, buildId, 35, 15);
  if (!ok) return false;
  await pushLog(buildId, "[worker] Gerando projeto Android nativo...\n", 55);
  await run("npx cap add android", dir, buildId, 55, 8);
  await run("npx cap sync android", dir, buildId, 63, 4);

  const androidDir = path.join(dir, "android");
  if (!fs.existsSync(path.join(androidDir, "settings.gradle")) && !fs.existsSync(path.join(androidDir, "settings.gradle.kts"))) {
    throw new Error("Capacitor não gerou o projeto android/.");
  }
  // Injeta permissão de internet (necessária para carregar o site) e ícone.
  try {
    const manifest = path.join(androidDir, "app/src/main/AndroidManifest.xml");
    if (fs.existsSync(manifest)) {
      let m = fs.readFileSync(manifest, "utf8");
      if (!m.includes("android.permission.INTERNET")) {
        m = m.replace("<application", '<uses-permission android:name="android.permission.INTERNET"/>\n    <application');
        fs.writeFileSync(manifest, m);
      }
    }
    if (project.iconData) {
      const buf = Buffer.from(String(project.iconData).replace(/^data:image\/\w+;base64,/, ""), "base64");
      for (const dens of ["mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi"]) {
        const d = path.join(androidDir, "app/src/main/res", dens);
        fs.mkdirSync(d, { recursive: true });
        fs.writeFileSync(path.join(d, "ic_launcher.png"), buf);
        fs.writeFileSync(path.join(d, "ic_launcher_round.png"), buf);
      }
    }
  } catch {}

  // Força Java 17 (evita "invalid source release: 21").
  try {
    const gp = path.join(androidDir, "gradle.properties");
    let gpc = fs.existsSync(gp) ? fs.readFileSync(gp, "utf8") : "";
    if (!gpc.includes("BuildForge Java17")) fs.writeFileSync(gp, gpc + "\n# BuildForge Java17\norg.gradle.java.installations.auto-download=false\n");
    const rg = path.join(androidDir, "build.gradle");
    if (fs.existsSync(rg)) {
      const cur = fs.readFileSync(rg, "utf8");
      if (!cur.includes("[BuildForge] forca Java 17")) {
        fs.appendFileSync(rg,
          "\n// [BuildForge] forca Java 17\nallprojects{afterEvaluate{p->def e=p.extensions.findByName('android');if(e!=null){try{e.compileOptions.sourceCompatibility=JavaVersion.VERSION_17;e.compileOptions.targetCompatibility=JavaVersion.VERSION_17}catch(x){}};p.tasks.withType(JavaCompile).configureEach{sourceCompatibility='17';targetCompatibility='17'}}}\n");
      }
    }
  } catch {}

  const isWin = process.platform === "win32";
  if (!isWin && fs.existsSync(path.join(androidDir, "gradlew"))) await run("chmod +x ./gradlew", androidDir, buildId);
  const runner = isWin ? "gradlew.bat" : "./gradlew";
  await pushLog(buildId, "[worker] Compilando APK do site...\n", 72);
  ok = await run(runner + " assembleRelease --no-daemon --console=plain", androidDir, buildId, 72, 22);
  if (!ok) ok = await run(runner + " assembleDebug --no-daemon --console=plain", androidDir, buildId, 90, 6);
  return ok;
}

// Empacota um app WEB num executavel Windows (.exe) usando Electron + electron-builder.
async function buildWebToExe(webDir, buildId) {
  const fs = require("fs");
  const path = require("path");
  await pushLog(buildId, "[worker] === MODO WEB -> EXE (Electron) ===\n", 26);

  // Descobre a saida web (dist/build/out, incluindo subpastas comuns
  // de projetos full-stack como dist/public ou dist/client) ou usa a raiz.
  const findWebOut = () => {
    const candidates = [
      "dist/public", "dist/client", "dist/www", "dist/browser",
      "build/public", "client/dist",
      "dist", "build", "out", "www", "public",
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.join(webDir, c, "index.html"))) return c;
    }
    return fs.existsSync(path.join(webDir, "index.html")) ? "." : null;
  };
  // Se houver script de build e nenhuma saida pronta, tenta buildar.
  let webOut = findWebOut();
  if (!webOut) {
    await pushLog(buildId, "[worker] Instalando deps e buildando o web...\n", 32);
    await run("npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps", webDir, buildId, 32, 12);
    await run("npm run build", webDir, buildId, 44, 10);
    webOut = findWebOut();
  }
  if (!webOut) throw new Error("Nao encontrei a saida web (dist/build/out com index.html) para empacotar no EXE.");
  const webAbs = path.resolve(webDir, webOut);
  await pushLog(buildId, "[worker] Saida web: " + webOut + "\n", 52);

  // Cria um projeto Electron minimo numa pasta separada.
  const el = path.join(webDir, "buildforge-electron");
  fs.mkdirSync(el, { recursive: true });
  const appName = "app";
  const mainJs =
    "const { app, BrowserWindow } = require('electron');\n" +
    "const path = require('path');\n" +
    "function createWindow(){ const w = new BrowserWindow({ width:1200, height:800, webPreferences:{ contextIsolation:true } });\n" +
    "  w.loadFile(path.join(__dirname, 'web', 'index.html')); }\n" +
    "app.whenReady().then(()=>{ createWindow(); app.on('activate',()=>{ if(BrowserWindow.getAllWindows().length===0) createWindow(); }); });\n" +
    "app.on('window-all-closed',()=>{ if(process.platform!=='darwin') app.quit(); });\n";
  fs.writeFileSync(path.join(el, "main.js"), mainJs);
  const elPkg = {
    name: appName,
    version: "1.0.0",
    main: "main.js",
    scripts: { dist: "electron-builder --win --x64" },
    build: {
      appId: "com.buildforge.app",
      productName: "BuildForge App",
      directories: { output: "dist-exe" },
      files: ["main.js", "web/**/*"],
      win: { target: "nsis" },
    },
  };
  fs.writeFileSync(path.join(el, "package.json"), JSON.stringify(elPkg, null, 2));

  // Copia a saida web para electron/web
  const webDest = path.join(el, "web");
  fs.cpSync(webAbs, webDest, { recursive: true });
  await pushLog(buildId, "[worker] Projeto Electron criado. Instalando electron + electron-builder...\n", 60);

  let ok = await run("npm install electron electron-builder --save-dev --no-audit --no-fund", el, buildId, 60, 20);
  if (!ok) return false;
  await pushLog(buildId, "[worker] Empacotando o instalador .exe (electron-builder)...\n", 82);
  ok = await run("npx electron-builder --win --x64", el, buildId, 82, 14);
  return ok;
}

// Empacota um app WEB em APK real usando Capacitor.
// O Capacitor cria um projeto Android nativo (Java/Kotlin) que carrega o web app.
async function buildWebToApk(webDir, srcDir, variant, buildId) {
  const path = require("path");
  const fs = require("fs");
  await pushLog(buildId, "[worker] === MODO WEB -> APK (Capacitor) ===\n", 26);
  await pushLog(buildId, "[worker] Pasta web: " + webDir + "\n");

  const pkgFile = path.join(webDir, "package.json");
  let pkg = {};
  try { pkg = JSON.parse(fs.readFileSync(pkgFile, "utf8")); } catch {}
  const scripts = pkg.scripts || {};

  // 1) Instala dependencias do projeto web (se houver package.json).
  if (fs.existsSync(pkgFile)) {
    await pushLog(buildId, "[worker] Instalando dependencias do app web...\n", 30);
    let ok = await run("npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps", webDir, buildId, 30, 15);
    if (!ok) ok = await run("npm install --ignore-scripts --no-audit --no-fund --force", webDir, buildId, 30, 15);
  }

  // 2) Build do web. Se ja existe uma pasta 'dist/build/out' pronta (commitada),
  // usamos ela e PULAMOS o build (evita erros de build do proprio projeto).
  const findWebOut = () => {
    const candidates = [
      "dist/public", "dist/client", "dist/www", "dist/browser",
      "build/public", "client/dist",
      "dist", "build", "out", "www", "public",
    ];
    for (const cand of candidates) {
      if (fs.existsSync(path.join(webDir, cand, "index.html"))) return cand;
    }
    if (fs.existsSync(path.join(webDir, "index.html"))) return ".";
    return null;
  };
  let webOut = findWebOut();
  if (webOut) {
    await pushLog(buildId, "[worker] Build web ja existe em '" + webOut + "' — usando (pulando npm run build).\n", 50);
  } else if (scripts.build) {
    await pushLog(buildId, "[worker] Rodando build do app web (npm run build)...\n", 46);
    const built = await run("npm run build", webDir, buildId, 46, 10);
    webOut = findWebOut();
    if (!built && !webOut) {
      await pushLog(buildId, "[worker] npm run build falhou e nao ha saida. Tentando 'vite build' direto...\n");
      await run("npx vite build", webDir, buildId, 50, 6);
      webOut = findWebOut();
    }
  }
  if (!webOut) {
    throw new Error("Nao encontrei a saida web (dist/build/out/www com index.html). O build do app web falhou e nao ha pasta pronta.");
  }
  await pushLog(buildId, "[worker] Saida web para o APK: " + webOut + "\n", 58);

  // 3) Instala Capacitor e inicializa.
  const appName = (pkg.name || "WebApp").replace(/[^a-zA-Z0-9 ]/g, "").slice(0, 30) || "WebApp";
  const appId = "com.buildforge." + (pkg.name || "webapp").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 20);
  await pushLog(buildId, "[worker] Instalando Capacitor...\n", 60);
  await run("npm install @capacitor/core @capacitor/cli @capacitor/android --save --legacy-peer-deps", webDir, buildId, 60, 8);

  // capacitor.config.json aponta para a saida web.
  const capCfg = {
    appId,
    appName,
    webDir: webOut,
    server: { androidScheme: "https" },
  };
  fs.writeFileSync(path.join(webDir, "capacitor.config.json"), JSON.stringify(capCfg, null, 2));
  await pushLog(buildId, "[worker] capacitor.config.json criado (appId=" + appId + ").\n", 66);

  // 4) Adiciona a plataforma Android (gera projeto nativo Java/Kotlin) e sincroniza.
  if (!fs.existsSync(path.join(webDir, "android"))) {
    await pushLog(buildId, "[worker] Gerando projeto Android nativo (npx cap add android)...\n", 68);
    await run("npx cap add android", webDir, buildId, 68, 8);
  }
  await pushLog(buildId, "[worker] Sincronizando web -> android (npx cap sync)...\n", 74);
  await run("npx cap sync android", webDir, buildId, 74, 4);

  // 5) Compila o APK com Gradle dentro de android/.
  const androidDir = path.join(webDir, "android");
  if (!fs.existsSync(path.join(androidDir, "settings.gradle")) && !fs.existsSync(path.join(androidDir, "settings.gradle.kts"))) {
    throw new Error("Capacitor nao gerou o projeto android/. Verifique o log de 'cap add android' acima.");
  }
  // Compatibilidade de Java: Capacitor novo pede JDK 21, mas o worker pode ter 17.
  // Forcamos Java 17 via gradle.properties (metodo seguro, sem editar build.gradle).
  await pushLog(buildId, "[worker] Ajustando compatibilidade Java para 17...\n", 76);
  try {
    const gp = path.join(androidDir, "gradle.properties");
    let gpc = fs.existsSync(gp) ? fs.readFileSync(gp, "utf8") : "";
    if (!gpc.includes("BuildForge Java17")) {
      gpc +=
        "\n# BuildForge Java17\n" +
        "android.javaCompile.suppressSourceTargetDeprecationWarning=true\n" +
        "org.gradle.java.installations.auto-download=false\n";
      fs.writeFileSync(gp, gpc);
    }
    // Patch SEGURO no build.gradle: so ajusta compileOptions via allprojects,
    // sem referenciar classes Kotlin (que quebravam com 'unknown property org').
    const rootGradle = path.join(androidDir, "build.gradle");
    const patch =
      "\n\n// [BuildForge] forca Java 17 em todos os modulos Android\n" +
      "allprojects {\n" +
      "  afterEvaluate { p ->\n" +
      "    def ext = p.extensions.findByName('android')\n" +
      "    if (ext != null) {\n" +
      "      try {\n" +
      "        ext.compileOptions.sourceCompatibility = JavaVersion.VERSION_17\n" +
      "        ext.compileOptions.targetCompatibility = JavaVersion.VERSION_17\n" +
      "      } catch (ignored) {}\n" +
      "    }\n" +
      "    p.tasks.withType(JavaCompile).configureEach {\n" +
      "      sourceCompatibility = '17'\n" +
      "      targetCompatibility = '17'\n" +
      "    }\n" +
      "  }\n" +
      "}\n";
    if (fs.existsSync(rootGradle)) {
      const cur = fs.readFileSync(rootGradle, "utf8");
      if (!cur.includes("[BuildForge] forca Java 17")) fs.appendFileSync(rootGradle, patch);
    }
  } catch (e) {
    await pushLog(buildId, "[worker] aviso: patch Java17: " + (e && e.message) + "\n");
  }

  const isWin = process.platform === "win32";
  if (!isWin && fs.existsSync(path.join(androidDir, "gradlew"))) await run("chmod +x ./gradlew", androidDir, buildId);
  const runner = isWin ? "gradlew.bat" : "./gradlew";
  const task = variant === "debug" ? "assembleDebug" : "assembleRelease";
  await pushLog(buildId, "[worker] Compilando APK com Gradle (Capacitor Android)...\n", 78);
  let ok = await run(runner + " " + task + " --no-daemon --console=plain", androidDir, buildId, 78, 16);
  // Se ainda falhar por versao de Java, tenta o debug (menos restritivo).
  if (!ok && variant !== "debug") {
    await pushLog(buildId, "[worker] release falhou; tentando assembleDebug...\n", 90);
    ok = await run(runner + " assembleDebug --no-daemon --console=plain", androidDir, buildId, 90, 8);
  }
  return ok;
}

// Assina um APK para publicacao. Gera (uma vez) um keystore persistente e reutiliza
// nas proximas builds — a Play Store exige que atualizacoes usem a MESMA chave.
async function signApk(apkPath, buildId) {
  const fs = require("fs");
  const path = require("path");
  const os = require("os");
  try {
    const home = os.homedir();
    const bfDir = path.join(home, ".buildforge");
    fs.mkdirSync(bfDir, { recursive: true });
    const ksPath = path.join(bfDir, "release.keystore");
    const ksPass = "buildforge";
    const alias = "buildforge";

    const androidHome = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
    if (!androidHome) {
      await pushLog(buildId, "[worker] ANDROID_HOME ausente; nao consigo localizar apksigner. APK ficara sem assinatura de release.\n");
      return { ok: false, path: apkPath };
    }

    // Localiza build-tools mais recente (contem apksigner/zipalign).
    const btRoot = path.join(androidHome, "build-tools");
    let btDir = null;
    try {
      const vers = fs.readdirSync(btRoot).filter((d) => /^[0-9]/.test(d)).sort().reverse();
      if (vers[0]) btDir = path.join(btRoot, vers[0]);
    } catch {}
    if (!btDir) {
      await pushLog(buildId, "[worker] build-tools nao encontrado; instale via SDK Manager. Sem assinatura.\n");
      return { ok: false, path: apkPath };
    }
    const isWin = process.platform === "win32";
    const exe = (n) => path.join(btDir, isWin ? n + ".bat" : n);
    const apksigner = fs.existsSync(exe("apksigner")) ? exe("apksigner") : "apksigner";
    const zipalign = fs.existsSync(path.join(btDir, "zipalign" + (isWin ? ".exe" : ""))) ? path.join(btDir, "zipalign" + (isWin ? ".exe" : "")) : "zipalign";

    // 1) Gera o keystore se ainda nao existe (chave RSA 2048, validade 27 anos).
    if (!fs.existsSync(ksPath)) {
      await pushLog(buildId, "[worker] Gerando keystore de release (primeira vez)...\n", 93);
      const keytool = process.env.JAVA_HOME ? path.join(process.env.JAVA_HOME, "bin", "keytool") : "keytool";
      const dn = "CN=BuildForge, OU=Mobile, O=BuildForge, C=BR";
      const genCmd =
        '"' + keytool + '" -genkeypair -v -keystore "' + ksPath + '" -alias ' + alias +
        " -keyalg RSA -keysize 2048 -validity 10000" +
        " -storepass " + ksPass + " -keypass " + ksPass + ' -dname "' + dn + '"';
      const gen = await run(genCmd, bfDir, buildId);
      if (!gen || !fs.existsSync(ksPath)) {
        await pushLog(buildId, "[worker] Falha ao gerar keystore. APK sem assinatura de release.\n");
        return { ok: false, path: apkPath };
      }
      await pushLog(buildId, "[worker] Keystore criado em " + ksPath + " (guarde-o! e a chave da sua conta Play).\n");
    } else {
      await pushLog(buildId, "[worker] Usando keystore existente (mesma chave das builds anteriores).\n", 93);
    }

    // 2) zipalign (recomendado antes de assinar).
    const dir = path.dirname(apkPath);
    const aligned = path.join(dir, path.basename(apkPath).replace(/\.apk$/i, "") + "-aligned.apk");
    await run('"' + zipalign + '" -f -p 4 "' + apkPath + '" "' + aligned + '"', dir, buildId);
    const toSign = fs.existsSync(aligned) ? aligned : apkPath;

    // 3) Assina com apksigner (v1+v2+v3).
    await pushLog(buildId, "[worker] Assinando o APK (apksigner)...\n", 95);
    const signCmd =
      '"' + apksigner + '" sign --ks "' + ksPath + '" --ks-key-alias ' + alias +
      " --ks-pass pass:" + ksPass + " --key-pass pass:" + ksPass + ' "' + toSign + '"';
    const signed = await run(signCmd, dir, buildId);
    if (!signed) {
      await pushLog(buildId, "[worker] apksigner falhou. Enviando APK sem assinatura de release.\n");
      return { ok: false, path: apkPath };
    }
    // Renomeia para -release-signed.apk
    const finalPath = path.join(dir, path.basename(apkPath).replace(/(-unsigned|-aligned)?\.apk$/i, "") + "-release-signed.apk");
    try { fs.renameSync(toSign, finalPath); } catch { return { ok: true, path: toSign }; }
    await pushLog(buildId, "[worker] APK assinado: " + path.basename(finalPath) + " (pronto para a Play Store)\n", 97);
    return { ok: true, path: finalPath };
  } catch (e) {
    await pushLog(buildId, "[worker] Erro na assinatura: " + (e && e.message) + "\n");
    return { ok: false, path: apkPath };
  }
}

function buildEnv() {
  const isWin = process.platform === "win32";
  const env = { ...process.env };
  const sep = isWin ? ";" : ":";
  const extra = [];
  if (env.JAVA_HOME) extra.push(env.JAVA_HOME + (isWin ? "\\bin" : "/bin"));
  if (isWin) {
    extra.push("C:\\Program Files\\Git\\cmd", "C:\\Program Files\\Git\\bin", "C:\\Program Files (x86)\\Git\\cmd");
    if (env.LOCALAPPDATA) extra.push(env.LOCALAPPDATA + "\\Programs\\Git\\cmd");
    if (env.ANDROID_HOME) extra.push(env.ANDROID_HOME + "\\platform-tools");
    extra.push("C:\\Program Files\\nodejs");
  }
  if (extra.length) env.PATH = extra.join(sep) + sep + (env.PATH || env.Path || "");
  env.CI = "1";
  env.ADBLOCK = "1";
  env.npm_config_yes = "true";
  env.npm_config_progress = "true";
  env.GRADLE_OPTS = (env.GRADLE_OPTS || "") + " -Dorg.gradle.console=plain";
  return env;
}

// Executa um comando com STREAMING de logs em tempo real (linha a linha).
function run(cmd, cwd, buildId, progressBase, progressSpan, logCmd) {
  return new Promise((resolve) => {
    const { spawn } = require("child_process");
    const env = buildEnv();
    let buf = "";
    let lines = 0;
    let lastFlush = Date.now();
    pushLog(buildId, "$ " + (logCmd || cmd) + "\n");

    const child = spawn(cmd, { cwd, env, shell: true });
    const heartbeat = setInterval(() => {
      pushLog(buildId, "[worker] ...ainda trabalhando (" + new Date().toLocaleTimeString() + ")\n");
    }, 20000);

    const onData = (chunk) => {
      buf += chunk.toString();
      const parts = buf.split(/\r?\n/);
      buf = parts.pop() || "";
      for (const line of parts) {
        if (!line.trim()) continue;
        lines++;
        pushLog(
          buildId,
          line + "\n",
          typeof progressBase === "number" ? Math.min(progressBase + progressSpan - 1, progressBase + (lines % progressSpan)) : undefined,
        );
      }
      void lastFlush;
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);

    const done = (code, errMsg) => {
      clearInterval(heartbeat);
      if (buf.trim()) pushLog(buildId, buf + "\n");
      if (errMsg) pushLog(buildId, "[worker] " + errMsg + "\n");
      resolve(code === 0);
    };
    child.on("close", (code) => done(code));
    child.on("error", (e) => done(1, "erro ao executar: " + (e && e.message)));

    // Timeout de seguranca (25 min por comando).
    setTimeout(() => { try { child.kill(); } catch {} }, 25 * 60 * 1000);
  });
}

async function buildJob(job) {
  const { buildId, target, variant, project } = job;
  let work = fs.mkdtempSync(path.join(os.tmpdir(), "bf-"));
  // Resolve para o caminho canonico (forma longa) para evitar que o Windows
  // misture nomes curtos estilo 8.3 (ex: MEUSDO~1) com a forma longa
  // (ex: Meus Documentos) em pastas de usuario com espacos/acentos.
  // Essa mistura quebra o calculo de caminho relativo do Vite/Rollup ao
  // gerar o index.html, produzindo caminhos absurdos cheios de "../".
  try { work = fs.realpathSync.native(work); } catch { try { work = fs.realpathSync(work); } catch {} }
  const started = Date.now();
  try {
    // SITE -> APK: se o projeto tem uma URL de site, empacota via Capacitor (WebView).
    if (project.webUrl) {
      const okSite = await buildSiteToApk(project, work, buildId);
      if (!okSite) throw new Error("Falha ao empacotar o site em APK. Veja o log acima.");
      // Assina e envia o APK gerado.
      const apks = (function find(dir, out) {
        try { for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory() && !["node_modules", ".git"].includes(e.name)) find(path.join(dir, e.name), out);
          else if (e.isFile() && e.name.endsWith(".apk")) out.push(path.join(dir, e.name));
        } } catch {} return out;
      })(work, []);
      apks.sort((a, b) => (/(release)/.test(b) ? 1 : 0) - (/(release)/.test(a) ? 1 : 0));
      if (!apks[0]) throw new Error("APK do site não foi gerado.");
      let finalPath = apks[0];
      let signed = false;
      const sr = await signApk(finalPath, buildId);
      if (sr.ok) { signed = true; finalPath = sr.path; }
      const data = fs.readFileSync(finalPath);
      await api("/api/worker/builds/" + buildId + "/complete", {
        status: "success",
        durationMs: Date.now() - started,
        log: "[worker] SITE -> APK concluído" + (signed ? " + assinado" : "") + "\n",
        artifact: { name: path.basename(finalPath), type: "apk", signed, dataBase64: data.toString("base64") },
      });
      console.log("✓ site apk " + buildId + " concluído");
      try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
      return;
    }

    const localProject = get("project", process.env.BUILDFORGE_PROJECT);
    let srcDir;
    let ok = true;
    if (project.aiGenerated || project.source === "zip") {
      // Projeto com codigo armazenado no servidor (gerado por IA, criado por
      // template, ou importado por ZIP): baixa os arquivos e escreve localmente.
      await pushLog(buildId, "[worker] Baixando codigo-fonte do servidor...\n", 8);
      const res = await fetch(SERVER + "/api/worker/builds/" + buildId + "/source", {
        headers: { Authorization: "Bearer " + TOKEN },
      });
      if (!res.ok) throw new Error("Nao consegui baixar os arquivos gerados (HTTP " + res.status + ")");
      const data = await res.json();
      srcDir = path.join(work, "src");
      fs.mkdirSync(srcDir, { recursive: true });
      for (const f of data.files || []) {
        const full = path.join(srcDir, f.path);
        fs.mkdirSync(path.dirname(full), { recursive: true });
        fs.writeFileSync(full, f.content);
      }
      await pushLog(buildId, "[worker] " + (data.files || []).length + " arquivos escritos.\n", 14);
      // Se veio icone, grava em res/mipmap como ic_launcher.
      if (data.iconData) {
        try {
          const buf = Buffer.from(String(data.iconData).replace(/^data:image\/\w+;base64,/, ""), "base64");
          for (const dens of ["mipmap-hdpi", "mipmap-mdpi", "mipmap-xhdpi", "mipmap-xxhdpi", "mipmap-xxxhdpi"]) {
            const dir = path.join(srcDir, "app/src/main/res", dens);
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(dir, "ic_launcher.png"), buf);
            fs.writeFileSync(path.join(dir, "ic_launcher_round.png"), buf);
          }
          await pushLog(buildId, "[worker] Ícone do app aplicado.\n");
        } catch {}
      }
    } else if (localProject) {
      // Build the LOCAL folder you already have open on your PC (no git needed).
      srcDir = path.resolve(localProject);
      if (!fs.existsSync(srcDir)) throw new Error("Pasta local não existe: " + srcDir);
      await pushLog(buildId, "[worker] Usando projeto LOCAL: " + srcDir + "\n", 15);
    } else {
      if (!project.repoUrl) {
        throw new Error(
          "Este projeto foi importado por ZIP e nao tem URL de repositorio. " +
          "Rode o worker apontando para a pasta local: --project \"C:\\\\caminho\\\\do\\\\projeto\"",
        );
      }
      // Metodo 1 (preferido): baixa o codigo via HTTPS com Node puro — nao precisa
      // de git, tar, powershell nem cmd. Funciona em qualquer Windows/Mac/Linux.
      await pushLog(buildId, "[worker] Obtendo o codigo de " + project.repoUrl + "\n", 10);
      let gotCode = await downloadRepoZip(project, work, buildId);
      srcDir = path.join(work, "src");
      // Metodo 2 (fallback): git clone, se o download falhar e o git existir.
      if (!gotCode) {
        await pushLog(buildId, "[worker] Download direto falhou; tentando git clone...\n", 12);
        // Se ha um token do GitHub configurado, embute na URL (https://TOKEN@github.com/...)
        // para permitir clonar repositorios privados.
        let cloneUrl = project.repoUrl;
        if (project.githubToken && /^https:\/\/github\.com\//i.test(cloneUrl)) {
          cloneUrl = cloneUrl.replace(/^https:\/\//i, "https://" + project.githubToken + "@");
        }
        ok = await run(
          "git clone --depth 1 \"" + cloneUrl + "\" src",
          work,
          buildId,
          undefined,
          undefined,
          project.githubToken ? "git clone --depth 1 \"https://***@github.com/...\" src" : undefined,
        );
        gotCode = ok && fs.existsSync(srcDir);
      }
      if (!gotCode || !fs.existsSync(srcDir)) {
        throw new Error(
          "Nao consegui obter o codigo. Se for repo PRIVADO, use --project com a pasta local. " +
          "Se for publico, confirme a URL e o branch. URL: " + project.repoUrl,
        );
      }
      ok = true;
    }

    let apkPath = null;

    // --- Auto-detect project layout (robusto a qualquer estrutura de repo) ---
    const isWin = process.platform === "win32";
    const gradlew = isWin ? "gradlew.bat" : "gradlew";

    function findUp(root, filename, maxDepth) {
      // BFS por 'filename' a partir de root, ignorando node_modules/.git/build.
      const skip = new Set(["node_modules", ".git", "build", ".gradle", ".dart_tool"]);
      let queue = [[root, 0]];
      while (queue.length) {
        const [dir, depth] = queue.shift();
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { continue; }
        for (const e of entries) {
          if (e.isFile() && e.name === filename) return path.join(dir, e.name);
        }
        if (depth < maxDepth) {
          for (const e of entries) {
            if (e.isDirectory() && !skip.has(e.name)) queue.push([path.join(dir, e.name), depth + 1]);
          }
        }
      }
      return null;
    }

    // Extensao alvo conforme o build.
    const wantExt = target === "exe" ? [".exe"] : target === "aab" ? [".aab", ".apk"] : [".apk", ".aab"];
    function findApks(root) {
      const out = [];
      const skip = new Set(["node_modules", ".git"]);
      const walk = (dir, depth) => {
        if (depth > 8) return;
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          const full = path.join(dir, e.name);
          if (e.isDirectory() && !skip.has(e.name)) walk(full, depth + 1);
          else if (e.isFile() && wantExt.some((x) => e.name.toLowerCase().endsWith(x))) {
            // ignora executaveis auxiliares do electron-builder (ex.: elevate.exe)
            if (target === "exe" && /elevate\.exe$/i.test(e.name)) continue;
            out.push(full);
          }
        }
      };
      walk(root, 0);
      return out;
    }

    const hasPubspec = fs.existsSync(path.join(srcDir, "pubspec.yaml")) || findUp(srcDir, "pubspec.yaml", 2);
    const isFlutter = project.framework === "flutter" || Boolean(hasPubspec);

    // Detecta package.json com Expo (React Native gerenciado, sem pasta android/).
    // Procura TODOS os package.json e escolhe o que tem 'expo' (pode estar em frontend/ etc.).
    function findAllPkgs(root, maxDepth) {
      const out = [];
      const skip = new Set(["node_modules", ".git", "android", "ios", "build", ".expo"]);
      const walk = (dir, depth) => {
        if (depth > maxDepth) return;
        let entries = [];
        try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const e of entries) {
          if (e.isFile() && e.name === "package.json") out.push(path.join(dir, e.name));
          else if (e.isDirectory() && !skip.has(e.name)) walk(path.join(dir, e.name), depth + 1);
        }
      };
      walk(root, 0);
      return out;
    }

    let isExpo = false;
    let pkgDir = srcDir;
    if (!isFlutter) {
      const pkgs = findAllPkgs(srcDir, 4);
      // Prefere um package.json que declare 'expo' ou tenha app.json ao lado.
      let chosen = null;
      for (const pp of pkgs) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pp, "utf8"));
          const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
          const dir = path.dirname(pp);
          const hasExpoCfg = fs.existsSync(path.join(dir, "app.json")) || fs.existsSync(path.join(dir, "app.config.js"));
          if (deps.expo || (deps["react-native"] && hasExpoCfg) || hasExpoCfg) {
            chosen = { dir, isExpo: Boolean(deps.expo || hasExpoCfg) };
            break;
          }
          if (deps["react-native"]) chosen = chosen || { dir, isExpo: false };
        } catch {}
      }
      if (chosen) { pkgDir = chosen.dir; isExpo = chosen.isExpo; }
      else if (pkgs[0]) pkgDir = path.dirname(pkgs[0]);
    }

    // Verifica se ja existe uma pasta android com settings.gradle (projeto nativo pronto).
    const existingSettings =
      findUp(srcDir, "settings.gradle", 5) || findUp(srcDir, "settings.gradle.kts", 5);
    let wrapper = findUp(srcDir, gradlew, 5);
    const nativeReady = Boolean(existingSettings);
    const fw = isFlutter ? "flutter" : nativeReady ? "android/gradle (nativo)" : isExpo ? "expo (React Native)" : "desconhecido";
    await pushLog(buildId, "[worker] Framework detectado: " + fw + " | pkgDir=" + pkgDir + "\n", 25);

    // Diagnostico: lista a estrutura do projeto (ajuda a entender projetos nao reconhecidos).
    try {
      const top = fs.readdirSync(srcDir, { withFileTypes: true })
        .map((e) => (e.isDirectory() ? e.name + "/" : e.name))
        .slice(0, 40);
      await pushLog(buildId, "[worker] Conteudo da raiz: " + top.join(", ") + "\n");
      const allPkgs = (function collect(dir, depth) {
        if (depth > 3) return [];
        let r = [];
        let ents = [];
        try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return r; }
        for (const e of ents) {
          if (["node_modules", ".git"].includes(e.name)) continue;
          if (e.isFile() && e.name === "package.json") r.push(path.join(dir, e.name));
          else if (e.isDirectory()) r = r.concat(collect(path.join(dir, e.name), depth + 1));
        }
        return r;
      })(srcDir, 0);
      for (const pp of allPkgs.slice(0, 5)) {
        try {
          const pkg = JSON.parse(fs.readFileSync(pp, "utf8"));
          const deps = Object.keys({ ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) });
          const key = deps.filter((d) => /expo|react-native|@react-native|flutter/i.test(d)).join(", ");
          await pushLog(buildId, "[worker] " + pp.replace(srcDir, ".") + " -> deps-chave: " + (key || "nenhuma mobile") + "\n");
        } catch {}
      }
    } catch {}

    // Projeto WEB (Vite/HTML/Node): empacotamos num APK real com Capacitor.
    // O Capacitor gera um projeto Android nativo (Java/Kotlin) que roda o web app.
    const webPkg = findUp(srcDir, "package.json", 3);
    const webDir = webPkg ? path.dirname(webPkg) : srcDir;
    const isWeb =
      !isFlutter && !isExpo && !nativeReady &&
      (fs.existsSync(path.join(webDir, "index.html")) ||
        fs.existsSync(path.join(webDir, "vite.config.js")) ||
        fs.existsSync(path.join(webDir, "vite.config.ts")) ||
        fs.existsSync(path.join(webDir, "next.config.js")) ||
        fs.existsSync(path.join(srcDir, "index.html")) ||
        Boolean(webPkg));

    if (!isFlutter && !isExpo && !nativeReady && !isWeb) {
      throw new Error(
        "Nao encontrei um projeto Android/Flutter/React-Native/Web neste repositorio. " +
        "Nao ha o que empacotar em APK.",
      );
    }

    if (isWeb && target === "exe") {
      ok = await buildWebToExe(webDir, buildId);
    } else if (isWeb) {
      ok = await buildWebToApk(webDir, srcDir, variant, buildId);
      // pula o fluxo mobile normal — o APK ja foi (ou nao) gerado.
      // A busca de APK abaixo cuida do resto.
    } else if (isFlutter) {
      const pubDir = path.dirname(hasPubspec || path.join(srcDir, "pubspec.yaml"));
      await run("flutter pub get", pubDir, buildId, 30, 15);
      ok = await run("flutter build apk --" + (variant === "debug" ? "debug" : "release"), pubDir, buildId, 45, 45);
    } else {
      // Expo sem pasta android/ nativa: instala deps e roda prebuild.
      if (isExpo && !nativeReady) {
        await pushLog(buildId, "[worker] Projeto Expo detectado.\n", 28);
        await pushLog(buildId, "[worker] Instalando dependencias (npm). Progresso linha a linha abaixo:\n", 30);
        // Instala TUDO (inclui o pacote 'expo' que faz o prebuild). --ignore-scripts
        // pula o cmd-guard, mas mantem as dependencias.
        ok = await run("npm install --ignore-scripts --no-audit --no-fund --legacy-peer-deps", pkgDir, buildId, 30, 22);
        if (!ok) {
          await pushLog(buildId, "[worker] Tentando novamente com --force...\n");
          ok = await run("npm install --ignore-scripts --no-audit --no-fund --force", pkgDir, buildId, 30, 22);
        }
        // Confirma que o expo local existe.
        const hasExpoLocal = fs.existsSync(path.join(pkgDir, "node_modules", "expo", "package.json"));
        await pushLog(buildId, "[worker] expo instalado localmente: " + hasExpoLocal + "\n", 52);

        await pushLog(buildId, "[worker] Gerando projeto Android nativo (expo prebuild). Pode demorar...\n", 54);
        // Usa o expo LOCAL do projeto (nao uma versao avulsa). --no-install: nao
        // reinstala deps; usamos as ja instaladas.
        let pre = await run("npx expo prebuild --platform android --no-install", pkgDir, buildId, 54, 14);
        // Se falhou, tenta deixar o expo instalar o que precisa.
        if (!pre) {
          await pushLog(buildId, "[worker] prebuild falhou; tentando novamente permitindo instalacao...\n");
          pre = await run("npx expo prebuild --platform android", pkgDir, buildId, 54, 14);
        }
        // Verifica se a pasta android foi criada.
        const androidDir = path.join(pkgDir, "android");
        if (!fs.existsSync(androidDir)) {
          throw new Error(
            "O 'expo prebuild' nao gerou a pasta android/. Causa provavel: o projeto usa recursos que " +
            "exigem EAS Build (nuvem da Expo) ou uma dependencia nativa incompativel. Veja o log do prebuild acima.",
          );
        }
        await pushLog(buildId, "[worker] Pasta android/ gerada com sucesso.\n", 66);
      }

      // Localiza a RAIZ do projeto Android pelo settings.gradle (nao pelo gradlew).
      // Isso resolve o erro "root directory should contain settings.gradle".
      let androidRoot =
        findUp(pkgDir, "settings.gradle", 5) ||
        findUp(pkgDir, "settings.gradle.kts", 5) ||
        findUp(srcDir, "settings.gradle", 5) ||
        findUp(srcDir, "settings.gradle.kts", 5);
      if (!androidRoot) {
        throw new Error(
          "Nao encontrei settings.gradle (pasta android/). O expo prebuild pode ter falhado " +
          "ou este projeto exige EAS Build. Veja o log acima.",
        );
      }
      const gradleDir = path.dirname(androidRoot);
      await pushLog(buildId, "[worker] Raiz Android: " + gradleDir + "\n", 68);

      // Escolhe o runner: gradlew.bat (Win) / ./gradlew (Unix) se existir; senao gradle global.
      const hasBat = fs.existsSync(path.join(gradleDir, "gradlew.bat"));
      const hasSh = fs.existsSync(path.join(gradleDir, "gradlew"));
      if (!isWin && hasSh) await run("chmod +x ./gradlew", gradleDir, buildId);
      const runner = isWin
        ? (hasBat ? "gradlew.bat" : "gradle")
        : (hasSh ? "./gradlew" : "gradle");
      // target 'aab' -> bundleRelease (formato da Play Store); senao assemble (APK).
      const task =
        target === "aab"
          ? (variant === "debug" ? "bundleDebug" : "bundleRelease")
          : (variant === "debug" ? "assembleDebug" : "assembleRelease");
      await pushLog(buildId, "[worker] Compilando com " + runner + " " + task + " (pode demorar)...\n", 70);
      ok = await run(runner + " " + task + " --no-daemon --console=plain", gradleDir, buildId, 70, 25);
    }

    await pushLog(buildId, "[worker] Procurando o APK gerado...\n", 90);
    // Procura .apk tanto na raiz clonada quanto na pasta do package (Expo).
    const searchRoots = Array.from(new Set([srcDir, pkgDir]));
    const apks = searchRoots.flatMap((r) => findApks(r));
    // Prefere release, senão o maior arquivo.
    apks.sort((a, b) => {
      const ra = /release/.test(a) ? 1 : 0, rb = /release/.test(b) ? 1 : 0;
      if (ra !== rb) return rb - ra;
      try { return fs.statSync(b).size - fs.statSync(a).size; } catch { return 0; }
    });
    apkPath = apks[0] || null;

    if (!ok || !apkPath) {
      throw new Error("Build falhou ou nenhum artefato (.apk/.exe) encontrado. Verifique o log acima.");
    }

    const ext = path.extname(apkPath).slice(1).toLowerCase();
    await pushLog(buildId, "[worker] Artefato gerado: " + apkPath + "\n", 92);

    // === ASSINATURA (apenas para APK release; EXE nao usa keystore Android) ===
    let signed = false;
    let finalPath = apkPath;
    if (ext === "apk") {
      const wantRelease = /release/.test(variant);
      if (wantRelease && !/unsigned/i.test(path.basename(apkPath))) signed = true;
      if ((wantRelease && !signed) || /unsigned/i.test(path.basename(apkPath))) {
        const signedResult = await signApk(apkPath, buildId);
        if (signedResult.ok) { signed = true; finalPath = signedResult.path; }
      }
    }

    const finalExt = path.extname(finalPath).slice(1).toLowerCase();
    const artType = finalExt === "aab" ? "aab" : finalExt === "exe" ? "exe" : "apk";
    const data = fs.readFileSync(finalPath);
    await api("/api/worker/builds/" + buildId + "/complete", {
      status: "success",
      durationMs: Date.now() - started,
      log: "[worker] BUILD SUCCESSFUL (real)" + (signed ? " + assinado" : "") + "\n",
      artifact: { name: path.basename(finalPath), type: artType, signed, dataBase64: data.toString("base64") },
    });
    console.log("✓ build " + buildId + " concluído (" + data.length + " bytes)");
  } catch (e) {
    await api("/api/worker/builds/" + buildId + "/complete", {
      status: "failed", durationMs: Date.now() - started, summary: String(e && e.message || e),
      log: "[worker] ERRO: " + (e && e.message) + "\n",
    }).catch(() => {});
    console.error("✗ build " + buildId + " falhou:", e.message);
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
  }
}

async function main() {
  const toolchain = detectToolchain();
  const once = args.includes("--once");
  console.log("BuildForge Worker conectando a " + SERVER + (once ? " (modo --once)" : ""));
  console.log("Toolchain:", toolchain);
  let idle = 0;
  while (true) {
    try {
      const { job } = await api("/api/worker/claim", { os: os.platform() + " " + os.arch(), toolchain });
      if (job) { console.log("→ job recebido:", job.buildId); await buildJob(job); idle = 0; }
      else { idle++; process.stdout.write("."); }
    } catch (e) { console.error("poll erro:", e.message); idle++; }
    // In --once mode (CI), exit after the queue is drained (a few empty polls).
    if (once && idle >= 3) { console.log("\nFila vazia — encerrando (--once)."); break; }
    await sleep(5000);
  }
}
main();
`;

export async function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Content-Disposition": 'attachment; filename="buildforge-worker.js"',
      "Cache-Control": "no-store",
    },
  });
}
