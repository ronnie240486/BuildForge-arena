export interface TemplateDef {
  id: string;
  label: string;
  description: string;
  framework: "android" | "flutter" | "reactnative";
  category: string;
}

export const TEMPLATES: TemplateDef[] = [
  { id: "loja", label: "Loja", description: "Catálogo de produtos, carrinho e checkout simples.", framework: "flutter", category: "E-commerce" },
  { id: "catalogo", label: "Catálogo", description: "Vitrine de itens com busca e filtros por categoria.", framework: "android", category: "E-commerce" },
  { id: "iptv", label: "IPTV", description: "Lista de canais, player de vídeo e favoritos.", framework: "android", category: "Mídia" },
  { id: "delivery", label: "Delivery", description: "Pedidos, cardápio, rastreio e notificações.", framework: "reactnative", category: "Serviços" },
  { id: "agenda", label: "Agenda", description: "Compromissos, lembretes e sincronização de calendário.", framework: "flutter", category: "Produtividade" },
  { id: "webview", label: "WebView", description: "Empacota um site existente como aplicativo Android.", framework: "android", category: "Utilitário" },
];
