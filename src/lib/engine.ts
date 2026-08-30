import type { ProjectDetection } from "@/db/schema";

/* -------------------------------------------------------------------------- */
/*  Deterministic pseudo-randomness so the same repo always detects the same   */
/* -------------------------------------------------------------------------- */

function hashString(str: string) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* -------------------------------------------------------------------------- */
/*  Framework detection (Phase 4) — simulated analysis of a repository        */
/* -------------------------------------------------------------------------- */

export function detectFramework(repoUrl: string, name: string): ProjectDetection {
  const seed = hashString(repoUrl || name);
  const rand = mulberry32(seed);
  const url = (repoUrl || "").toLowerCase();

  let framework: ProjectDetection["framework"] = "unknown";
  let language = "Kotlin";
  let buildSystem = "Gradle (Kotlin DSL)";

  if (url.includes("flutter") || name.toLowerCase().includes("flutter")) {
    framework = "flutter";
    language = "Dart";
    buildSystem = "Flutter / Gradle";
  } else if (url.includes("react-native") || url.includes("reactnative") || name.toLowerCase().includes("rn-")) {
    framework = "reactnative";
    language = "TypeScript";
    buildSystem = "Gradle + Metro";
  } else if (url.includes("expo")) {
    framework = "reactnative";
    language = "TypeScript";
    buildSystem = "Expo / EAS";
  } else {
    // default Android (Java/Kotlin). 1 in 4 is pure Java.
    framework = "android";
    language = rand() < 0.25 ? "Java" : "Kotlin";
  }

  const detectedSdk = framework === "android" ? 34 : framework === "flutter" ? 33 : 34;

  const files: ProjectDetection["files"] =
    framework === "flutter"
      ? [
          { path: "pubspec.yaml", role: "Flutter manifest" },
          { path: "lib/main.dart", role: "Entry point" },
          { path: "android/app/build.gradle", role: "Android build config" },
        ]
      : framework === "reactnative"
        ? [
            { path: "package.json", role: "Node manifest" },
            { path: "android/app/build.gradle", role: "Android build config" },
            { path: "index.ts", role: "JS entry point" },
          ]
        : [
            { path: "app/build.gradle.kts", role: "Module build config" },
            { path: "src/main/AndroidManifest.xml", role: "Manifest" },
            { path: "src/main/java/.../MainActivity.kt", role: "Entry activity" },
          ];

  const deps: ProjectDetection["dependencies"] =
    framework === "flutter"
      ? [
          { name: "flutter", version: "^3.19.0" },
          { name: "cupertino_icons", version: "^1.0.6" },
          { name: "http", version: "^1.2.0" },
        ]
      : framework === "reactnative"
        ? [
            { name: "react-native", version: "0.74.0" },
            { name: "react", version: "18.2.0" },
            { name: "@react-navigation/native", version: "^6.1.0" },
          ]
        : [
            { name: "androidx.core:core-ktx", version: "1.13.1" },
            { name: "androidx.appcompat:appcompat", version: "1.6.1" },
            { name: "com.google.android.material:material", version: "1.12.0" },
            { name: "androidx.lifecycle:lifecycle-runtime-ktx", version: "2.7.0" },
          ];

  // 60% of repos are clean, 40% have a deterministically chosen blocking issue.
  const warnings: ProjectDetection["warnings"] = [];
  const missing: ProjectDetection["missing"] = [];

  const issueRoll = rand();
  if (issueRoll < 0.18) {
    const dep =
      framework === "flutter"
        ? { name: "google_fonts", reason: "Importado em lib/ mas ausente do pubspec.yaml" }
        : framework === "reactnative"
          ? { name: "@react-navigation/native-stack", reason: "Importado mas não declarado em package.json" }
          : { name: "androidx.compose.material3:material3", reason: "Referenced in source but not in build.gradle" };
    missing.push(dep);
    warnings.push({ code: "MISSING_DEPENDENCY", message: `Dependência ausente: ${dep.name}`, blocking: true });
  } else if (issueRoll < 0.3) {
    warnings.push({ code: "SDK_MISMATCH", message: "A dependency requires minSdk 24 but project declares minSdk 21", blocking: true });
  } else if (issueRoll < 0.4) {
    warnings.push({ code: "SIGNING_MISSING", message: "Release variant has no signingConfig — APK cannot be published unsigned", blocking: false });
  } else if (issueRoll < 0.45) {
    warnings.push({ code: "JAVA_VERSION", message: "Compiled with Java 17 bytecode but toolchain resolves JDK 11", blocking: true });
  }

  const blocking = warnings.filter((w) => w.blocking).length;
  const healthScore = Math.max(35, 100 - blocking * 35 - warnings.length * 8 - missing.length * 4);

  return {
    framework,
    language,
    buildSystem,
    files,
    dependencies: deps,
    missing,
    warnings,
    detectedSdk,
  };
}

/* -------------------------------------------------------------------------- */
/*  Error scenarios & AI analysis (Phase 5)                                   */
/* -------------------------------------------------------------------------- */

export interface InsightDraft {
  severity: "info" | "warning" | "error";
  title: string;
  errorCode: string;
  explanation: string;
  suggestion: string;
  autoFixable: boolean;
}

export interface BuildScenario {
  code: string;
  failLine: string;
  insight: InsightDraft;
}

export const SCENARIOS: Record<string, BuildScenario> = {
  SDK_MISMATCH: {
    code: "SDK_MISMATCH",
    failLine:
      "> Dependency 'androidx.work:work-runtime:2.9.0' requires minSdkVersion 24 but project is 21.\nBUILD FAILED",
    insight: {
      severity: "error",
      title: "minSdkVersion too low for a dependency",
      errorCode: "SDK_MISMATCH",
      explanation:
        "androidx.work:work-runtime:2.9.0 requires API 24, but the module declares minSdk 21. Gradle refuses to merge the manifest because a transitive requirement is stricter than the project floor.",
      suggestion:
        "Raise minSdk from 21 to 24. This drops support for ~2% of legacy devices but unblocks WorkManager. I can apply this to defaultConfig in build.gradle.kts.",
      autoFixable: true,
    },
  },
  JAVA_VERSION: {
    code: "JAVA_VERSION",
    failLine: "error: invalid class file version 61.0 (expected 55.0)\n> java.lang.IllegalArgumentException: Unsupported class file major version 61",
    insight: {
      severity: "error",
      title: "JDK toolchain mismatch",
      errorCode: "UNSUPPORTED_CLASS_VERSION",
      explanation:
        "Your source is compiled to Java 17 bytecode (major version 61), but the active toolchain resolves to JDK 11. AGP cannot read the newer class files, so desugaring and dexing abort.",
      suggestion:
        "Set the Kotlin/Java compile target and Gradle JVM to JDK 17. I can pin `jvmTarget = \"17\"` and add the Gradle toolchain spec. Alternatively, upgrade the JDK in the Toolchain page.",
      autoFixable: true,
    },
  },
  SIGNING_MISSING: {
    code: "SIGNING_MISSING",
    failLine: "> Variant 'release' output is not signed. Signed APK/AAB generation skipped.",
    insight: {
      severity: "warning",
      title: "Release artifact is unsigned",
      errorCode: "UNSIGNED_RELEASE",
      explanation:
        "The release variant has no signingConfig attached. The APK was packaged but cannot be installed on devices or uploaded to the Play Store without a v2/v3 signature.",
      suggestion:
        "Generate a debug keystore to unblock local installs, or attach your production keystore in the project's Signing settings. Auto-fix will generate a debug keystore and wire it to the release variant.",
      autoFixable: true,
    },
  },
};

// Framework-aware scenario for the missing-dependency case.
function missingDepScenario(framework: string): BuildScenario {
  if (framework === "flutter") {
    return {
      code: "MISSING_DEPENDENCY",
      failLine: "Error: Target of URI doesn't exist: 'package:google_fonts/google_fonts.dart'.\n> flutter build apk failed",
      insight: {
        severity: "error",
        title: "Biblioteca Dart ausente: google_fonts",
        errorCode: "MISSING_DEPENDENCY",
        explanation:
          "O pacote google_fonts é importado em 3 arquivos Dart, mas não está declarado em pubspec.yaml — então o analyzer não consegue resolver o URI do pacote e a compilação aborta.",
        suggestion:
          "Rode `flutter pub add google_fonts` para declarar a dependência em pubspec.yaml e regerar pubspec.lock. Posso aplicar isso automaticamente.",
        autoFixable: true,
      },
    };
  }
  if (framework === "reactnative") {
    return {
      code: "MISSING_DEPENDENCY",
      failLine: "error: Cannot find module '@react-navigation/native-stack'.\n> Task :app:bundleReleaseJsAndAssets FAILED",
      insight: {
        severity: "error",
        title: "Módulo npm ausente: @react-navigation/native-stack",
        errorCode: "MISSING_DEPENDENCY",
        explanation:
          "O módulo @react-navigation/native-stack é importado em 4 arquivos, mas não está instalado em node_modules nem declarado em package.json, então o Metro bundler não resolve o import.",
        suggestion:
          "Rode `yarn add @react-navigation/native-stack` (ou npm install). Posso adicionar ao package.json e reinstalar as dependências automaticamente.",
        autoFixable: true,
      },
    };
  }
  return {
    code: "MISSING_DEPENDENCY",
    failLine: "e: Unresolved reference: MaterialTheme\n> Task :app:compileReleaseKotlin FAILED",
    insight: {
      severity: "error",
      title: "Missing dependency: Material3",
      errorCode: "MISSING_DEPENDENCY",
      explanation:
        "The compiler cannot resolve Material3 composables (MaterialTheme, Surface, Text) referenced in 4 Kotlin source files. The androidx.compose.material3 artifact is not declared in app/build.gradle.kts, so the symbols are not on the classpath.",
      suggestion:
        "Add the Material3 dependency and enable Compose. I can insert `implementation(\"androidx.compose.material3:material3:1.2.1\")` and the Compose BOM into your build file automatically.",
      autoFixable: true,
    },
  };
}

function scenarioFor(code: string, framework: string): BuildScenario | undefined {
  if (code === "MISSING_DEPENDENCY") return missingDepScenario(framework);
  return SCENARIOS[code];
}

function resolveScenario(detection: ProjectDetection | null): BuildScenario | undefined {
  if (!detection) return undefined;
  const blocking = detection.warnings.find((w) => w.blocking);
  if (!blocking) return undefined;
  return scenarioFor(blocking.code, detection.framework);
}

export function analyzeDetection(detection: ProjectDetection | null): InsightDraft[] {
  if (!detection) return [];
  return (detection.warnings ?? []).map((w) => {
    const scenario = scenarioFor(w.code, detection.framework);
    if (scenario) return scenario.insight;
    return {
      severity: w.blocking ? "error" : "warning",
      title: w.message,
      errorCode: w.code,
      explanation: `Analysis detected a potential blocker: ${w.message}.`,
      suggestion: "Review the project configuration and address the warning before the next build.",
      autoFixable: false,
    } satisfies InsightDraft;
  });
}

/* -------------------------------------------------------------------------- */
/*  Real build-log analysis (Phase 5) — maps actual worker errors to insights  */
/* -------------------------------------------------------------------------- */

export interface LogInsight {
  severity: "info" | "warning" | "error";
  title: string;
  errorCode: string;
  explanation: string;
  suggestion: string;
  autoFixable: boolean;
}

export function analyzeBuildLog(log: string): LogInsight {
  const l = (log || "").toLowerCase();

  if (l.includes("java_home is not set") || l.includes("no 'java' command") || l.includes("could not find java")) {
    return {
      severity: "error",
      title: "JAVA_HOME não configurado no worker",
      errorCode: "JAVA_HOME_MISSING",
      explanation:
        "O Gradle não encontrou o Java. O worker precisa da variável JAVA_HOME apontando para um JDK 17 (o Android Studio inclui um em 'jbr').",
      suggestion:
        "Baixe o instalador do worker novamente (ele agora detecta o JDK do Android Studio automaticamente) ou defina JAVA_HOME manualmente. No Windows: setx JAVA_HOME \"C:\\\\Program Files\\\\Android\\\\Android Studio\\\\jbr\" e reabra o worker.",
      autoFixable: false,
    };
  }
  if (l.includes("gradlew") && (l.includes("no such file") || l.includes("not found") || l.includes("cannot access"))) {
    return {
      severity: "error",
      title: "Gradle wrapper (gradlew) não encontrado",
      errorCode: "GRADLEW_MISSING",
      explanation:
        "O repositório não tem o script gradlew na pasta esperada, ou o projeto Android está numa subpasta. O worker atualizado procura o gradlew recursivamente.",
      suggestion:
        "Atualize o worker (baixe o .bat de novo). Se ainda falhar, confirme que o repositório é um projeto Android/Flutter completo com o Gradle wrapper commitado.",
      autoFixable: false,
    };
  }
  if (l.includes("git clone falhou") || l.includes("nao tem url de repositorio") || l.includes("repository not found") || l.includes("could not read from remote")) {
    return {
      severity: "error",
      title: "Não foi possível obter o código do projeto",
      errorCode: "CLONE_FAILED",
      explanation:
        "O worker não conseguiu clonar o repositório. Isso acontece quando: (1) o projeto foi importado por ZIP e não tem URL; (2) o repositório é privado (precisa de login); ou (3) a URL está incorreta.",
      suggestion:
        "Se o projeto está no seu PC, rode o worker apontando para a pasta local: --project \"C:\\\\caminho\\\\do\\\\projeto\". Se está no GitHub, confirme que o repositório é público e a URL está certa.",
      autoFixable: false,
    };
  }
  if (l.includes("invalid source release") || l.includes("invalid target release")) {
    return {
      severity: "error",
      title: "Versão do JDK incompatível (Capacitor pede 21)",
      errorCode: "JDK_VERSION_MISMATCH",
      explanation:
        "O Capacitor/Android novo tentou compilar com Java 21, mas o worker tem JDK 17 (ou vice-versa). Por isso 'invalid source release'.",
      suggestion:
        "O worker foi atualizado para forçar Java 17 em todos os módulos automaticamente. Baixe o instalador novamente e rode o build. Alternativa: instale o JDK 21 no PC.",
      autoFixable: false,
    };
  }
  if (l.includes("nao e um app android") || l.includes("nao encontrei um projeto android") || l.includes("site web nao vira apk")) {
    return {
      severity: "error",
      title: "Este repositório não é um app mobile",
      errorCode: "NOT_A_MOBILE_APP",
      explanation:
        "O código enviado é um projeto web (HTML/Vite/Node) ou não contém um projeto Android/Flutter/React Native. Não há um app mobile para compilar, então nenhum APK pode ser gerado.",
      suggestion:
        "Para gerar um APK, importe um repositório que seja: (1) Android nativo (pasta android/ + gradlew), (2) Flutter (pubspec.yaml), ou (3) React Native/Expo. Um site web precisaria ser empacotado com Capacitor/Cordova antes de virar APK.",
      autoFixable: false,
    };
  }
  if (l.includes("should contain one of the possible settings") || l.includes("settings.gradle") || l.includes("run gradle init")) {
    return {
      severity: "error",
      title: "Gradle rodou na pasta errada",
      errorCode: "GRADLE_WRONG_DIR",
      explanation:
        "O Gradle foi executado numa pasta sem settings.gradle. Em projetos Expo/React Native, o build precisa rodar dentro da pasta 'android/' gerada pelo prebuild.",
      suggestion:
        "O worker foi atualizado para localizar a raiz Android pelo settings.gradle automaticamente. Baixe o instalador novamente e rode o build outra vez.",
      autoFixable: false,
    };
  }
  if (l.includes("sdk location not found") || l.includes("android_home") || l.includes("sdk.dir")) {
    return {
      severity: "error",
      title: "Android SDK não localizado",
      errorCode: "ANDROID_SDK_MISSING",
      explanation: "O Gradle não achou o Android SDK. Falta ANDROID_HOME ou um arquivo local.properties com sdk.dir.",
      suggestion: "Defina ANDROID_HOME para a pasta do SDK do Android Studio (o instalador do worker faz isso automaticamente).",
      autoFixable: false,
    };
  }
  if (l.includes("could not resolve") || l.includes("could not download") || l.includes("connect timed out")) {
    return {
      severity: "error",
      title: "Falha ao baixar dependências",
      errorCode: "DEPENDENCY_RESOLUTION",
      explanation: "O Gradle não conseguiu baixar dependências (rede, proxy ou repositório indisponível).",
      suggestion: "Verifique a conexão da máquina do worker e tente novamente. Em rede corporativa, configure o proxy do Gradle.",
      autoFixable: false,
    };
  }
  if (l.includes("unresolved reference") || l.includes("cannot find symbol")) {
    return {
      severity: "error",
      title: "Erro de compilação no código-fonte",
      errorCode: "COMPILE_ERROR",
      explanation: "O código do projeto tem um símbolo não resolvido (import faltando ou dependência ausente no build.gradle).",
      suggestion: "Abra o log acima para ver o arquivo/linha. Ajuste o import ou adicione a dependência no build.gradle do projeto.",
      autoFixable: false,
    };
  }
  if (l.includes("keystore") || l.includes("not signed") || l.includes("signingconfig")) {
    return {
      severity: "warning",
      title: "APK de release sem assinatura",
      errorCode: "SIGNING_MISSING",
      explanation: "A variante release não tem signingConfig, então o APK não pode ser publicado.",
      suggestion: "Configure um keystore no projeto ou compile a variante 'debug' para testes locais.",
      autoFixable: false,
    };
  }
  return {
    severity: "error",
    title: "Falha no build",
    errorCode: "BUILD_FAILED",
    explanation: "O build falhou por um motivo não reconhecido automaticamente. O log completo está no console acima.",
    suggestion: "Revise as últimas linhas do log (procure por 'FAILURE', 'error:' ou 'Caused by:'). Cole o trecho no IA Assistant para uma análise detalhada.",
    autoFixable: false,
  };
}

/* -------------------------------------------------------------------------- */
/*  Build planning (Phase 4 + 5)                                              */
/* -------------------------------------------------------------------------- */

export type LogLevel = "cmd" | "info" | "warn" | "error" | "success";

export interface Frame {
  line: string;
  progress: number;
  level: LogLevel;
  delayMs: number;
}

export interface BuildPlan {
  frames: Frame[];
  outcome: "success" | "failed";
  scenario?: BuildScenario;
  artifacts: { name: string; type: "apk" | "aab" | "exe" | "appbundle"; sizeBytes: number; signed: boolean }[];
  summary: string;
  durationMs: number;
}

function leadingScenario(detection: ProjectDetection | null): BuildScenario | undefined {
  return resolveScenario(detection);
}

export function planBuild(opts: {
  framework: string;
  target: string;
  variant: string;
  language: string;
  detection: ProjectDetection | null;
  signingConfigured: boolean;
  cacheHit: boolean;
}): BuildPlan {
  const { framework, target, variant, detection, signingConfigured, cacheHit } = opts;
  const scenario = leadingScenario(detection);
  const failAt = scenario ? scenario.code : null;
  const frames: Frame[] = [];
  const rand = mulberry32(hashString(JSON.stringify(detection) + target + variant));

  const push = (line: string, progress: number, level: LogLevel = "info", delayMs = 420) =>
    frames.push({ line, progress, level, delayMs });

  push(`$ buildforge build --target ${target} --variant ${variant}`, 2, "cmd", 300);
  push(`[buildforge] Resolving environment for framework=${framework} target=${target}`, 5, "info", 380);
  if (cacheHit) push("[cache] Dependency layer restored from cache (warm build)", 9, "info", 360);

  if (framework === "flutter") {
    push("> flutter clean", 11, "cmd", 500);
    push("> flutter pub get", 16, "cmd", 700);
    push("Running \"flutter pub get\" in project...", 19, "info", 500);
    push("Got dependencies!", 22, "success", 400);
    push("> flutter build apk --release", 27, "cmd", 600);
    push("Building with sound null safety ✔", 33, "info", 600);
  } else if (framework === "reactnative") {
    push("> yarn install --frozen-lockfile", 11, "cmd", 800);
    push("success Saved lockfile.", 16, "success", 500);
    push("> cd android && ./gradlew assembleRelease", 22, "cmd", 700);
    push("info Running jetifier to migrate libraries to AndroidX.", 27, "info", 600);
  } else {
    push("> ./gradlew :app:assembleRelease", 11, "cmd", 700);
    push("Calculating task graph as no cached configuration...", 15, "info", 500);
    push("Type-safe project accessors enabled.", 18, "info", 420);
    push("> Task :app:preBuild UP-TO-DATE", 22, "info", 380);
    push("> Task :app:compileReleaseKotlin", 30, "cmd", 700);
  }

  // Failure injection point
  if (failAt && scenario) {
    if (failAt === "SDK_MISMATCH") push("> Task :app:checkReleaseDuplicateClasses", 46, "info", 400);
    else if (failAt === "JAVA_VERSION") push("> Task :app:compileReleaseJavaWithJavac", 42, "info", 420);
    push("FAILURE: Build completed with 1 error.", 58, "error", 500);
    push(scenario.failLine, 62, "error", 500);
    push("Run with --stacktrace for details. Exit code 1.", 64, "error", 400);
    return {
      frames,
      outcome: "failed",
      scenario,
      artifacts: [],
      summary: `Build failed: ${scenario.insight.title}.`,
      durationMs: frames.reduce((a, f) => a + f.delayMs, 0),
    };
  }

  // Success path
  if (framework === "flutter") {
    push("💪 Building with sound null safety 💪", 55, "info", 600);
    push("Built build/app/outputs/flutter-apk/app-release.apk", 70, "success", 700);
  } else {
    push("> Task :app:compileReleaseKotlin SUCCESS", 52, "success", 600);
    push("> Task :app:bundleReleaseResources", 58, "info", 500);
    push("> Task :app:processReleaseManifest", 63, "info", 450);
    push("> Task :app:mergeReleaseResources", 68, "info", 450);
    push("> Task :app:packageRelease", 76, "info", 600);
    push("> Task :app:signRelease" + (signingConfigured ? " SUCCESS" : " SKIPPED (unsigned)"), 84, signingConfigured ? "success" : "warn", 500);
    push("> Task :app:assembleRelease SUCCESS", 90, "success", 600);
  }

  // Produce artifacts
  const baseSize = 11_000_000 + Math.floor(rand() * 28_000_000);
  const artifacts: BuildPlan["artifacts"] = [];
  if (target === "apk" || target === "appbundle") {
    artifacts.push({ name: `app-${variant}.apk`, type: "apk", sizeBytes: baseSize, signed: signingConfigured });
  }
  if (target === "aab") {
    artifacts.push({ name: `app-${variant}.aab`, type: "aab", sizeBytes: Math.floor(baseSize * 0.78), signed: signingConfigured });
  }
  if (target === "exe" && framework === "reactnative") {
    artifacts.push({ name: `${variant}-setup.exe`, type: "exe", sizeBytes: baseSize + 9_000_000, signed: signingConfigured });
  }
  if (target === "appbundle") {
    artifacts.push({ name: `app-${variant}.aab`, type: "appbundle", sizeBytes: Math.floor(baseSize * 0.8), signed: signingConfigured });
  }

  const artList = artifacts.map((a) => a.name).join(", ");
  push(`[buildforge] Artifacts generated: ${artList}`, 97, "success", 500);
  push("BUILD SUCCESSFUL in 47s ✔", 100, "success", 400);

  return {
    frames,
    outcome: "success",
    artifacts,
    summary: `Build succeeded — ${artifacts.length} artifact(s) produced.`,
    durationMs: frames.reduce((a, f) => a + f.delayMs, 0),
  };
}

/* -------------------------------------------------------------------------- */
/*  Auto-fix (Phase 5)                                                         */
/* -------------------------------------------------------------------------- */

export function applyAutoFix(detection: ProjectDetection | null, code: string): { detection: ProjectDetection; note: string } | null {
  if (!detection) return null;
  const fw = detection.framework;
  const note =
    code === "MISSING_DEPENDENCY"
      ? fw === "flutter"
        ? "Adicionei google_fonts ao pubspec.yaml e executei flutter pub get."
        : fw === "reactnative"
          ? "Adicionei @react-navigation/native-stack ao package.json e reinstalei as dependências."
          : "Inserted androidx.compose.material3:material3:1.2.1 and enabled Compose build features."
      : code === "SDK_MISMATCH"
        ? "Raised minSdkVersion 21 → 24 in defaultConfig and re-synced Gradle."
        : code === "JAVA_VERSION"
          ? "Pinned Kotlin jvmTarget and Gradle JVM to JDK 17."
          : code === "SIGNING_MISSING"
            ? "Generated a debug keystore and attached it to the release signingConfig."
            : "Applied a configuration patch.";

  const updated: ProjectDetection = {
    ...detection,
    warnings: (detection.warnings ?? []).map((w) => (w.code === code ? { ...w, blocking: false, message: `${w.message} (resolved by BuildForge AI)` } : w)),
    missing: code === "MISSING_DEPENDENCY" ? [] : (detection.missing ?? []),
  };
  return { detection: updated, note };
}

export function healthFromDetection(detection: ProjectDetection | null) {
  if (!detection) return 100;
  const warnings = detection.warnings ?? [];
  const missing = detection.missing ?? [];
  const blocking = warnings.filter((w) => w.blocking).length;
  return Math.max(35, 100 - blocking * 35 - warnings.length * 6 - missing.length * 4);
}
