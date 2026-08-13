export interface TemplateDef {
  id: string;
  label: string;
  description: string;
  framework: "android" | "flutter" | "reactnative";
  category: string;
  // Itens de exemplo mostrados na tela inicial gerada (dá contexto real ao ponto de partida).
  sampleItems: string[];
}

export const TEMPLATES: TemplateDef[] = [
  { id: "loja", label: "Loja", description: "Catálogo de produtos, carrinho e checkout simples.", framework: "android", category: "E-commerce", sampleItems: ["Tênis Esportivo — R$ 199,90", "Mochila Urbana — R$ 149,90", "Fone Bluetooth — R$ 89,90", "Relógio Digital — R$ 129,90"] },
  { id: "catalogo", label: "Catálogo", description: "Vitrine de itens com busca e filtros por categoria.", framework: "android", category: "E-commerce", sampleItems: ["Categoria: Eletrônicos", "Categoria: Casa e Decoração", "Categoria: Moda", "Categoria: Esportes"] },
  { id: "iptv", label: "IPTV", description: "Lista de canais, player de vídeo e favoritos.", framework: "android", category: "Mídia", sampleItems: ["Canal 1 — Notícias 24h", "Canal 2 — Esportes", "Canal 3 — Filmes", "Canal 4 — Documentários"] },
  { id: "delivery", label: "Delivery", description: "Pedidos, cardápio, rastreio e notificações.", framework: "android", category: "Serviços", sampleItems: ["Pizza Margherita — 45 min", "Burger Artesanal — 30 min", "Sushi Combo — 50 min", "Açaí 500ml — 20 min"] },
  { id: "agenda", label: "Agenda", description: "Compromissos, lembretes e sincronização de calendário.", framework: "android", category: "Produtividade", sampleItems: ["09:00 — Reunião de equipe", "12:00 — Almoço com cliente", "15:00 — Revisão de projeto", "18:00 — Academia"] },
  { id: "webview", label: "WebView", description: "Empacota um site existente como aplicativo Android.", framework: "android", category: "Utilitário", sampleItems: ["Use a opção 'Transformar site em APK' em Releases para este caso — ele empacota uma URL de verdade."] },
];
