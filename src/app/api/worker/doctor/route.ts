export const dynamic = "force-dynamic";

// A cross-platform diagnostic script. Run it on your PC to check whether you can
// build APKs — it auto-detects the Android Studio SDK/JDK and tells you what's missing.
const SCRIPT = String.raw`#!/usr/bin/env node
/**
 * BuildForge Doctor — verifica se sua máquina consegue compilar APKs.
 * Uso:  node buildforge-doctor.js
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const home = os.homedir();
const plat = os.platform();
const ok = (s) => "\x1b[32m✓\x1b[0m " + s;
const bad = (s) => "\x1b[31m✗\x1b[0m " + s;
const warn = (s) => "\x1b[33m!\x1b[0m " + s;

function tryRun(cmd) {
  try { return execSync(cmd, { stdio: ["ignore", "pipe", "pipe"] }).toString().trim(); }
  catch { return null; }
}

// Common Android SDK locations (incl. the one Android Studio installs)
function findAndroidSdk() {
  if (process.env.ANDROID_HOME && fs.existsSync(process.env.ANDROID_HOME)) return process.env.ANDROID_HOME;
  if (process.env.ANDROID_SDK_ROOT && fs.existsSync(process.env.ANDROID_SDK_ROOT)) return process.env.ANDROID_SDK_ROOT;
  const guesses = [
    path.join(home, "Android", "Sdk"),                              // Linux
    path.join(home, "Library", "Android", "sdk"),                   // macOS
    path.join(home, "AppData", "Local", "Android", "Sdk"),          // Windows
  ];
  return guesses.find((g) => fs.existsSync(g)) || null;
}

// Android Studio bundles a JDK (jbr)
function findStudioJdk() {
  const guesses = [
    "/opt/android-studio/jbr",
    "/usr/local/android-studio/jbr",
    path.join(home, "android-studio", "jbr"),
    "/Applications/Android Studio.app/Contents/jbr/Contents/Home",
    "C:\\Program Files\\Android\\Android Studio\\jbr",
  ];
  return guesses.find((g) => fs.existsSync(g)) || null;
}

console.log("\n=== BuildForge Doctor ===");
console.log("SO: " + plat + " " + os.arch() + "\n");

let canBuild = true;

// Node
console.log(ok("Node.js " + process.version));

// git
const git = tryRun("git --version");
if (git) console.log(ok(git)); else { console.log(bad("git não encontrado no PATH")); }

// Android SDK
const sdk = findAndroidSdk();
if (sdk) {
  console.log(ok("Android SDK: " + sdk));
  const buildTools = path.join(sdk, "build-tools");
  if (fs.existsSync(buildTools)) {
    const versions = fs.readdirSync(buildTools);
    console.log(ok("build-tools: " + versions.join(", ")));
    const bt = path.join(buildTools, versions.sort().reverse()[0]);
    for (const tool of ["aapt2", "apksigner", "d8"]) {
      const exe = process.platform === "win32" ? tool + ".bat" : tool;
      const found = fs.existsSync(path.join(bt, exe)) || fs.existsSync(path.join(bt, tool));
      console.log(found ? ok("  " + tool) : warn("  " + tool + " (não localizado, mas o Gradle pode resolver)"));
    }
  } else {
    console.log(warn("build-tools não encontrado — abra o SDK Manager e instale 'Android SDK Build-Tools'"));
  }
  if (!process.env.ANDROID_HOME) {
    console.log(warn("ANDROID_HOME não está definido. Defina para: " + sdk));
  }
} else {
  canBuild = false;
  console.log(bad("Android SDK não encontrado. Abra o Android Studio > SDK Manager e anote o 'Android SDK Location'."));
}

// JDK
let java = tryRun("java -version 2>&1");
if (java) {
  console.log(ok("JDK no PATH: " + java.split("\n")[0]));
} else {
  const jbr = findStudioJdk();
  if (jbr) {
    console.log(warn("JDK não está no PATH, mas o Android Studio tem um em: " + jbr));
    console.log(warn("  Defina JAVA_HOME=" + jbr));
  } else {
    canBuild = false;
    console.log(bad("Nenhum JDK encontrado. O Android Studio inclui um (jbr) — defina JAVA_HOME."));
  }
}

// Flutter (opcional)
const flutter = tryRun("flutter --version 2>&1");
console.log(flutter ? ok("Flutter: " + flutter.split("\n")[0]) : warn("Flutter não instalado (ok se seu projeto não for Flutter)"));

// --- Auto-fix: define ANDROID_HOME/JAVA_HOME automaticamente quando detectados ---
function persistEnv(name, value) {
  try {
    if (plat === "win32") {
      execSync('setx ' + name + ' "' + value + '"', { stdio: "ignore" });
      return true;
    } else {
      const rc = fs.existsSync(path.join(home, ".zshrc")) ? path.join(home, ".zshrc") : path.join(home, ".bashrc");
      const line = '\nexport ' + name + '="' + value + '"\n';
      const cur = fs.existsSync(rc) ? fs.readFileSync(rc, "utf8") : "";
      if (!cur.includes("export " + name + "=")) fs.appendFileSync(rc, line);
      return true;
    }
  } catch { return false; }
}

console.log("\n=== Ajuste automático ===");
if (sdk && !process.env.ANDROID_HOME) {
  console.log(persistEnv("ANDROID_HOME", sdk) ? ok("ANDROID_HOME definido automaticamente para " + sdk) : warn("Não consegui definir ANDROID_HOME (faça manualmente)."));
}
const jbr = !java ? findStudioJdk() : null;
if (jbr && !process.env.JAVA_HOME) {
  console.log(persistEnv("JAVA_HOME", jbr) ? ok("JAVA_HOME definido automaticamente para " + jbr) : warn("Não consegui definir JAVA_HOME (faça manualmente)."));
}

console.log("\n=== Resultado ===");
if (sdk && (java || jbr)) {
  console.log(ok("Sua máquina PODE compilar APKs."));
  console.log("   Use o instalador de 1 clique na pagina Workers — ele conecta sozinho.");
  console.log("   (Reabra o terminal para as variaveis novas valerem.)");
} else {
  console.log(bad("Faltam componentes marcados com ✗ acima. Abra o Android Studio > SDK Manager."));
}
console.log("");
`;

export async function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Content-Disposition": 'attachment; filename="buildforge-doctor.js"',
      "Cache-Control": "no-store",
    },
  });
}
