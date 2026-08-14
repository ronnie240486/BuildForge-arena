import { describe, expect, it } from "vitest";
import { strToU8, zipSync } from "fflate";
import { canManageOwnedResource, detectZipFramework, inferFramework, isPlatformAdmin, materialStudioFileChanges, parseStudioEditPayload, studioPreviewPreferenceFile, studioProductStandard, studioStarterFiles } from "./buildforge-db";

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

  it("permite configurar integrações de projeto somente ao proprietário ou administrador", () => {
    expect(canManageOwnedResource({ id: 8, role: "member" }, 8)).toBe(true);
    expect(canManageOwnedResource({ id: 8, role: "member" }, 9)).toBe(false);
    expect(canManageOwnedResource({ id: 1, role: "admin" }, 9)).toBe(true);
  });

  it("detecta Android, Flutter e React Native por manifestos compactados", () => {
    expect(detectZipFramework(Buffer.from(zipSync({ "mobile/pubspec.yaml": strToU8("name: app") })))).toBe("flutter");
    expect(detectZipFramework(Buffer.from(zipSync({ "android/app/src/main/AndroidManifest.xml": strToU8("<manifest />") })))).toBe("android");
    expect(detectZipFramework(Buffer.from(zipSync({ "app/package.json": strToU8(JSON.stringify({ dependencies: { "react-native": "0.77.0" } })) })))).toBe("react_native");
  });

  it("rejeita ZIPs que não contenham uma estrutura móvel reconhecida", () => {
    expect(() => detectZipFramework(Buffer.from(zipSync({ "notes/readme.txt": strToU8("sem projeto") })))).toThrow("não contém um projeto");
  });

	it("cria estruturas iniciais completas e visualizáveis para website e aplicativo", () => {
		const website = studioStarterFiles("website", "Portal de Teste");
		const application = studioStarterFiles("application", "App de Teste");

	    expect(website.map((file) => file.filePath)).toEqual(expect.arrayContaining(["README.md", "package.json", "index.html", "src/main.ts", "src/style.css"]));
	    expect(website.find((file) => file.filePath === "src/main.ts")?.content).toContain("PRODUTO DIGITAL PROFISSIONAL");
	    expect(website.map((file) => file.filePath)).toEqual(expect.arrayContaining(["src/navigation/routes.ts", "src/services/billing.ts", "assets/images/brand-mark.svg"]));
	    expect(application.map((file) => file.filePath)).toEqual(expect.arrayContaining(["README.md", "package.json", "App.tsx", "app.json", "src/navigation/routes.ts", "src/screens/OnboardingScreen.tsx", "res/drawable/product-hero.svg"]));
		expect(application.find((file) => file.filePath === "App.tsx")?.content).toContain("SafeAreaView");
	});

	it("cria uma agenda eletrônica profissional completa a partir de um pedido simples", () => {
		const agenda = studioStarterFiles("application", "Agenda Eletrônica Top");
		const app = agenda.find((file) => file.filePath === "App.tsx")?.content ?? "";

		expect(agenda.map((file) => file.filePath)).toEqual(expect.arrayContaining(["App.tsx", "src/features/agenda.ts", "STUDIO_PRODUCT_STANDARD.md"]));
		expect(app).toContain("Calendário");
		expect(app).toContain("Lembretes ativos");
		expect(app).toContain("Insights de produtividade");
		expect(app).toContain("Configurar lembretes");
	});

  it("persiste a preferência visual do tabuleiro a partir de pedidos do chat", () => {
    const preference = studioPreviewPreferenceFile("Crie um tabuleiro medieval e mude as peças azuis para rosa", []);

    expect(preference?.filePath).toBe("studio-preview.json");
    expect(preference?.content).toContain('"pieceColor": "pink"');
    expect(preference?.content).toContain('"theme": "medieval"');
  });

  it("persiste cores para os dois lados e material do tabuleiro pedidos no chat", () => {
    const preference = studioPreviewPreferenceFile("troque as peças azul para vermelho, adversário verde e tabuleiro de mármore", []);

    expect(preference?.content).toContain('"pieceColor": "red"');
    expect(preference?.content).toContain('"opponentColor": "green"');
    expect(preference?.content).toContain('"board": "marble"');
  });

  it("persiste o modo competitivo para propostas com ranking e torneios", () => {
    const preference = studioPreviewPreferenceFile("crie matchmaking com ELO, torneios e modo espectador", []);

    expect(preference?.content).toContain('"mode": "competitive"');
  });

  it("persiste xadrez 3D medieval como tipo de prévia específico", () => {
    const preference = studioPreviewPreferenceFile("crie um xadrez 3D medieval com peças vermelhas", []);

    expect(preference?.content).toContain('"gameType": "chess"');
    expect(preference?.content).toContain('"dimensionalStyle": "3d"');
    expect(preference?.content).toContain('"theme": "medieval"');
  });

  it("persiste marca e cor para projetos comerciais que não são jogos", () => {
    const preference = studioPreviewPreferenceFile("mude a cor para verde e o nome para Portal Aurora", [{ filePath: "App.tsx", content: "Aplicativo de serviços com conta e planos." }]);

    expect(preference?.content).toContain('"primary": "green"');
    expect(preference?.content).toContain('"brandName": "Portal Aurora"');
  });

  it("recupera uma resposta válida mesmo quando vier dentro de bloco de código", () => {
    const edit = parseStudioEditPayload('```json\n{"reply":"Pronto","files":[{"path":"App.tsx","language":"typescript","content":"export default 1"}]}\n```');

    expect(edit?.reply).toBe("Pronto");
    expect(edit?.files[0]?.path).toBe("App.tsx");
  });

  it("não confirma arquivos idênticos como alterações do Studio", () => {
    const existing = [{ filePath: "App.tsx", language: "typescript", content: "export default function App() { return null; }" }];
    const changes = materialStudioFileChanges(existing, [...existing, { filePath: "README.md", language: "markdown", content: "# Atualizado" }]);

    expect(changes).toEqual([{ filePath: "README.md", language: "markdown", content: "# Atualizado" }]);
  });

  it("define padrões profissionais específicos para jogos e websites", () => {
    expect(studioProductStandard("application").content).toContain("seleção de nível ou modo");
    expect(studioProductStandard("website").content).toContain("proposta de valor clara");
  });
});
