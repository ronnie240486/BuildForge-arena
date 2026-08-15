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

  it("renderiza um protótipo específico de xadrez 3D medieval", () => {
    const html = createStudioPreviewDocument({ project: { name: "Xadrez dos Reinos", projectType: "application", framework: "React Native" }, files: [{ filePath: "studio-preview.json", language: "json", content: '{"checkers":{"gameType":"chess","dimensionalStyle":"3d","theme":"medieval","pieceColor":"red","opponentColor":"green"}}' }] });

    expect(html).toContain("XADREZ 3D");
    expect(html).toContain("COROA DAS SETE TORRES");
    expect(html).toContain("Ranking ELO");
    expect(html).toContain("♚");
  });

  it("renderiza uma Agenda editável em vez do fallback móvel genérico", () => {
    const html = createStudioPreviewDocument({ project: { name: "Agenda Estudo+ — Planejamento e Memória", projectType: "application", framework: "react_native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Aplicativo de agenda com lembretes e planejamento." }] });

    expect(html).toContain("Seu tempo, sob controle");
    expect(html).toContain("Novo compromisso");
    expect(html).toContain("Calendário mensal");
    expect(html).toContain("Insights de produtividade");
    expect(html).toContain("Configurações");
    expect(html).not.toContain("Esta prévia será atualizada quando o Studio gerar uma tela compatível");
  });

  it("aplica marca e cores configuradas pelo chat à Agenda", () => {
    const html = createStudioPreviewDocument({ project: { name: "Agenda", projectType: "application", framework: "react_native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Agenda com calendário e lembretes." }, { filePath: "studio-preview.json", language: "json", content: '{"agenda":{"primary":"green","brandName":"Agenda Aurora"}}' }] });

    expect(html).toContain("Agenda Aurora");
    expect(html).toContain("--agenda-primary:#22c55e");
    expect(html).toContain("var(--agenda-primary)");
  });

  it("entrega uma prévia comercial navegável para websites que não são jogos", () => {
    const html = createStudioPreviewDocument({ project: { name: "Agenda", projectType: "website", framework: "React" }, files: [{ filePath: "index.html", language: "html", content: "<html><head></head><body><div id=\"app\"></div></body></html>" }, { filePath: "src/main.ts", language: "typescript", content: "root.innerHTML = `<main>Agenda</main>`" }] });

    expect(html).toContain("Pronto para transformar sua ideia em negócio.");
    expect(html).toContain("Marca personalizável");
    expect(html).not.toContain('id="board"');
  });

  it("aplica marca e cor à prévia comercial universal", () => {
    const html = createStudioPreviewDocument({ project: { name: "Portal", projectType: "application", framework: "react_native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Aplicativo comercial com conta e planos." }, { filePath: "studio-preview.json", language: "json", content: '{"product":{"primary":"green","brandName":"Portal Aurora"}}' }] });

    expect(html).toContain("Portal Aurora");
    expect(html).toContain("--p:#22c55e");
    expect(html).toContain("Marca personalizável");
  });

  it("renderiza uma calculadora funcional com botões e histórico", () => {
    const html = createStudioPreviewDocument({ project: { name: "Calculadora Científica", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Calculadora com operações básicas e científicas." }] });

    expect(html).toContain("MODO CIENTÍFICO");
    expect(html).toContain("Científica ativa");
    expect(html).toContain("function press(k)");
    expect(html).toContain("function show()");
    expect(html).not.toContain("value.textContent=Number(current)");
    expect(html).toContain('"sin"');
    expect(html).toContain("Memória limpa");
  });

  it("renderiza calculadora de corrida quando o chat persiste Hot Wheels, pista e chamas", () => {
    const html = createStudioPreviewDocument({ project: { name: "Calculadora Turbo", projectType: "application", framework: "React Native" }, files: [
      { filePath: "App.tsx", language: "typescript", content: "Calculadora com histórico." },
      { filePath: "studio-preview.json", language: "json", content: JSON.stringify({ calculator: { scientific: true, racing: true }, universal: { style: "racing", objects: ["car", "track", "flames"], features: ["scientific"] } }) },
    ] });

    expect(html).toContain("RACE EDITION");
    expect(html).toContain("TURBO MATH");
    expect(html).toContain("Pista · chamas · velocidade");
    expect(html).toContain("CORRIDA APLICADA");
  });

  it("substitui a paleta fixa de corrida pela cor solicitada no chat", () => {
    const html = createStudioPreviewDocument({ project: { name: "Calculadora Verde", projectType: "application", framework: "React Native" }, files: [
      { filePath: "App.tsx", language: "typescript", content: "Calculadora científica" },
      { filePath: "studio-preview.json", language: "json", content: JSON.stringify({ calculator: { scientific: true, racing: true }, universal: { primary: "green", style: "racing", objects: ["track", "car"] } }) },
    ] });

    expect(html).toContain("#16a34a");
    expect(html).toContain("#117c38");
    expect(html).toContain("#06140b");
  });

  it("renderiza uma loja com catálogo, carrinho e checkout em vez do painel comercial genérico", () => {
    const html = createStudioPreviewDocument({ project: { name: "Loja Casa Aurora", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Loja completa com catálogo, produto e checkout." }] });

    expect(html).toContain("COMÉRCIO MOBILE");
    expect(html).toContain("Seu carrinho");
    expect(html).toContain("Ir para pagamento");
  });

  it("renderiza cenas interativas próprias para carrinho e avião decolando", () => {
    const car = createStudioPreviewDocument({ project: { name: "Carrinho Vermelho", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Um carro em movimento na pista." }] });
    const plane = createStudioPreviewDocument({ project: { name: "Avião decolando na pista", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Cena de aeronave e decolagem." }] });

    expect(car).toContain("CARRO EM MOVIMENTO");
    expect(car).toContain("Acelerar carro");
    expect(plane).toContain("AVIÃO DECOLANDO");
    expect(plane).toContain("Iniciar decolagem");
  });

  it("renderiza delivery com pedido e formulário com validação", () => {
    const delivery = createStudioPreviewDocument({ project: { name: "Delivery Sabor da Vila", projectType: "application", framework: "React Native" }, files: [{ filePath: "App.tsx", language: "typescript", content: "Cardápio, pedidos e entregas." }] });
    const form = createStudioPreviewDocument({ project: { name: "Cadastro de clientes", projectType: "website", framework: "React" }, files: [{ filePath: "src/main.ts", language: "typescript", content: "Formulário de inscrição com e-mail e validação." }] });

    expect(delivery).toContain("DELIVERY EM TEMPO REAL");
    expect(delivery).toContain("Enviar para preparo");
    expect(form).toContain("FLUXO DE CADASTRO");
    expect(form).toContain("Enviar cadastro");
  });
});
