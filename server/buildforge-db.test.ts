import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { detectZipFramework, inferFramework, isPlatformAdmin } from "./buildforge-db";

describe("BuildForge domain rules", () => {
  it("identifica as stacks conhecidas a partir de referências de projeto", () => {
    expect(inferFramework("https://github.com/flutter/samples")).toBe("flutter");
    expect(inferFramework("https://github.com/facebook/react-native")).toBe("react_native");
    expect(inferFramework("https://github.com/android/compose-samples")).toBe("android");
    expect(inferFramework("https://acme.example/webview-shell")).toBe("webview");
    expect(inferFramework("https://example.com/unknown")).toBe("unknown");
  });

  it("restringe a administração ao papel admin", () => {
    expect(isPlatformAdmin({ id: 1, role: "admin" })).toBe(true);
    expect(isPlatformAdmin({ id: 2, role: "member" })).toBe(false);
    expect(isPlatformAdmin({ id: 3, role: "user" })).toBe(false);
  });

  it("detecta Android, Flutter e React Native por manifestos compactados", () => {
    expect(detectZipFramework(Buffer.from(zipSync({ "mobile/pubspec.yaml": strToU8("name: app") })))).toBe("flutter");
    expect(detectZipFramework(Buffer.from(zipSync({ "android/app/src/main/AndroidManifest.xml": strToU8("<manifest />") })))).toBe("android");
    expect(detectZipFramework(Buffer.from(zipSync({ "app/package.json": strToU8(JSON.stringify({ dependencies: { "react-native": "0.77.0" } })) })))).toBe("react_native");
  });

  it("rejeita ZIPs que não contenham uma estrutura móvel reconhecida", () => {
    expect(() => detectZipFramework(Buffer.from(zipSync({ "notes/readme.txt": strToU8("sem projeto") })))).toThrow("não contém um projeto");
  });
});
