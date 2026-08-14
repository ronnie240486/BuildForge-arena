import { describe, expect, it } from "vitest";
import { createStudioPreviewDocument } from "./studio-preview";

describe("prévia do Studio", () => {
  it("gera um tabuleiro de damas interativo para projetos de damas sem index.html", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas Clássicas", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "export default function App() { return null; }" }] });

    expect(html).toContain('id="board"');
    expect(html).toContain("Reiniciar partida");
    expect(html).toContain("board.onclick");
  });

  it("reflete na prévia a cor solicitada e salva pelo chat no arquivo do projeto", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas Acessível", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "// Peças amarelas em alto contraste: #FFD60A" }] });

    expect(html).toContain("peças amarelas");
    expect(html).toContain("#fde047");
  });

  it("prioriza a preferência explícita de prévia sobre referências antigas no código", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas Medieval", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Peças amarelas em uma versão anterior" }, { filePath: "studio-preview.json", language: "json", content: '{"checkers":{"pieceColor":"pink","theme":"medieval"}}' }] });

    expect(html).toContain("peças rosas");
    expect(html).toContain("#f9a8d4");
    expect(html).toContain("REINO MEDIEVAL");
    expect(html).toContain("Coroa das Sete Torres");
  });

  it("aplica duas paletas de peças e um material de tabuleiro definidos pelo chat", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas Arena", projectType: "application", framework: "React Native" }, files: [{ filePath: "studio-preview.json", language: "json", content: '{"checkers":{"pieceColor":"red","opponentColor":"green","board":"marble"}}' }] });

    expect(html).toContain("#fb7185");
    expect(html).toContain("#4ade80");
    expect(html).toContain("#e5e7eb");
  });

  it("mostra os modos competitivos quando a proposta inclui ELO, torneio e espectador", () => {
    const html = createStudioPreviewDocument({ project: { name: "Damas dos Reinos", projectType: "application", framework: "React Native" }, files: [{ filePath: "studio-preview.json", language: "json", content: '{"checkers":{"mode":"competitive","theme":"medieval"}}' }] });

    expect(html).toContain("Ranking ELO");
    expect(html).toContain("Copa dos Reinos");
    expect(html).toContain("Arena ao vivo");
  });

  it("mantém a prévia HTML comum para projetos que não são jogos de damas", () => {
    const html = createStudioPreviewDocument({ project: { name: "Agenda", projectType: "website", framework: "React" }, files: [{ filePath: "index.html", language: "html", content: "<html><head></head><body><div id=\"app\"></div></body></html>" }, { filePath: "src/main.ts", language: "typescript", content: "root.innerHTML = `<main>Agenda</main>`" }] });

    expect(html).toContain("<main>Agenda</main>");
    expect(html).not.toContain('id="board"');
  });
});
