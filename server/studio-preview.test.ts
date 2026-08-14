import { describe, expect, it } from "vitest";
import { createStudioPreviewDocument } from "./studio-preview";

describe("prévia do Studio", () => {
  it("gera um tabuleiro de damas interativo para projetos de damas sem index.html", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas Clássicas", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "export default function App() { return null; }" }] });

    expect(html).toContain('id="board"');
    expect(html).toContain("Reiniciar partida");
    expect(html).toContain("board.onclick");
  });

  it("mantém a prévia HTML comum para projetos que não são jogos de damas", () => {
    const html = createStudioPreviewDocument({ project: { name: "Agenda", projectType: "website", framework: "React" }, files: [{ filePath: "index.html", language: "html", content: "<html><head></head><body><div id=\"app\"></div></body></html>" }, { filePath: "src/main.ts", language: "typescript", content: "root.innerHTML = `<main>Agenda</main>`" }] });

    expect(html).toContain("<main>Agenda</main>");
    expect(html).not.toContain('id="board"');
  });
});
