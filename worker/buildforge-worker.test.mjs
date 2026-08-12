import { describe, expect, it } from "vitest";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { detectFrameworkFromSource } from "./buildforge-worker.mjs";

async function withTree(files, assertion) {
  const root = await mkdtemp(join(tmpdir(), "buildforge-worker-test-"));
  try {
    for (const [name, content] of Object.entries(files)) {
      const file = join(root, name);
      await mkdir(join(file, ".."), { recursive: true });
      await writeFile(file, content);
    }
    await assertion(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

describe("detecção de fontes pelo agente", () => {
  it("identifica manifestos de Android, Flutter e React Native antes do build", async () => {
    await withTree({ "android/app/src/main/AndroidManifest.xml": "<manifest />" }, async (root) => expect(await detectFrameworkFromSource(root)).toBe("android"));
    await withTree({ "mobile/pubspec.yaml": "name: app" }, async (root) => expect(await detectFrameworkFromSource(root)).toBe("flutter"));
    await withTree({ "app/package.json": JSON.stringify({ dependencies: { "react-native": "0.77.0" } }) }, async (root) => expect(await detectFrameworkFromSource(root)).toBe("react_native"));
  });

  it("recusa uma árvore que não contenha framework suportado", async () => {
    await withTree({ "notes/readme.md": "sem manifestos" }, async (root) => expect(await detectFrameworkFromSource(root)).toBeNull());
  });
});
