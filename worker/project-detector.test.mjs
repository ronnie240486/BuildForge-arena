import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { tmpdir } from "node:os";
import { detectProject, safeLogValue } from "./project-detector.mjs";
import { resolveBuildStrategy } from "./build-strategies.mjs";

async function tree(files, test) { const root = await mkdtemp(join(tmpdir(), "bf-detect-")); try { for (const [name, value] of Object.entries(files)) { const file = join(root, name); await mkdir(join(file, ".."), { recursive: true }); await writeFile(file, value); } await test(root); } finally { await rm(root, { recursive: true, force: true }); } }

describe("detector universal do BuildForge", () => {
  it("detecta Android Gradle", () => tree({ "settings.gradle": "", "build.gradle": "", "gradlew": "", "app/build.gradle": "" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("android"); expect(resolveBuildStrategy(p).id).toBe("android-gradle"); }));
  it("diferencia React Native CLI", () => tree({ "package.json": JSON.stringify({ dependencies: { "react-native": "0.81.0" } }), "android/gradlew": "", "android/settings.gradle": "", "android/app/build.gradle": "" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("react_native"); expect(resolveBuildStrategy(p).id).toBe("react-native-gradle"); }));
  it("prioriza Expo", () => tree({ "package.json": JSON.stringify({ dependencies: { expo: "54", "react-native": "0.81" } }), "app.json": "{}", "eas.json": "{}", "yarn.lock": "" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("expo"); expect(resolveBuildStrategy(p).id).toBe("expo-prebuild-gradle"); }));
  it("encontra Expo em frontend de monorepo", () => tree({ "package.json": JSON.stringify({ dependencies: { react: "19" } }), "frontend/package.json": JSON.stringify({ dependencies: { expo: "54", "react-native": "0.81" } }), "frontend/app.json": "{}", "frontend/eas.json": "{}" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("expo"); expect(relative(root, p.projectRoot)).toBe("frontend"); }));
  it("detecta Flutter", () => tree({ "mobile/pubspec.yaml": "name: app", "mobile/android/settings.gradle": "" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("flutter"); expect(resolveBuildStrategy(p).id).toBe("flutter"); }));
  it("exige conversão WebView para projeto web", () => tree({ "client/package.json": JSON.stringify({ dependencies: { react: "19", vite: "6" } }) }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("web"); expect(resolveBuildStrategy(p).unsupportedReason).toContain("WebView"); }));
  it("reporta projeto desconhecido sem falso positivo", () => tree({ "docs/readme.md": "sem manifestos" }, async (root) => { const p = await detectProject(root); expect(p.framework).toBe("unknown"); expect(p.confidence).toBe(0); }));
  it("serializa logs estruturados", () => expect(safeLogValue({ framework: "expo", root: "frontend" })).toBe('{"framework":"expo","root":"frontend"}'));
});
