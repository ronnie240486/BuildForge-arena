# Mapa de Migração — BuildForge Original para Plataforma Unificada

O ZIP original utiliza Next.js, PostgreSQL e Server Actions. A plataforma atual utiliza React, tRPC, banco gerenciado, armazenamento de objetos e OAuth. A migração preservará cada capacidade como fluxo equivalente, sem copiar mecanismos incompatíveis de autenticação, banco ou deploy.

| Grupo original | Módulos do ZIP | Destino na plataforma unificada | Situação |
|---|---|---|---|
| Identidade e sessão | `auth.ts`, `auth-actions.ts`, login, registro, account forms | OAuth Manus, `users`, `DashboardLayout`, Administração | Preservar perfil, papéis e preferências; substituir sessão local por OAuth gerenciado |
| Projetos e importação | `projects/*`, `project-actions.ts`, `engine.ts`, criação por Git/ZIP/site | Projetos, Releases, Templates, `buildforge-db.ts` | Integrar detalhes, health score, detecção e ações que ainda não tenham interface equivalente |
| Builds e artefatos | `builds/*`, `build-runner.ts`, `apk-builder.ts`, `build-console.tsx`, download | Fila de builds, Artefatos, SSE, worker distribuível | Integrar detalhes completos, console, downloads e compatibilidade de artefatos |
| Workers e token | `workers-client.tsx`, `worker-auth.ts`, rotas worker | Workers, `worker-api.ts`, `worker/buildforge-worker.mjs` | Migrar instalador de um clique, diagnóstico, workflow GitHub e script de distribuição |
| Toolchain e SDK | `toolchain.ts`, páginas toolchain/tutorial, doctor | Workers, painel Toolchain a adicionar, diagnóstico de agente | Preservar verificação de JDK, Android SDK, Flutter, Node, Git e variáveis de ambiente |
| IA | rotas `ai/analyze`, `generate-app`, `migrate`, `ai-provider.ts` | Assistente IA, `server/_core/llm.ts`, Templates | Integrar geração de aplicativo e planejador de migração além do diagnóstico e patch já presentes |
| Configurações e identidade visual | settings, ai settings, app identity, theme | Administração, Releases e novas Preferências | Migrar configuração de IA, identidade do aplicativo, tema, conta e distribuição |
| Webhooks e API externa | webhooks page, projects API, SSE API | Webhooks e API pública a adicionar | Reintroduzir cadastro de webhooks, documentação e eventos de build |
| Backup e saúde | backup, bootstrap, health | Backups, Administração, health endpoint a adicionar | Preservar exportação administrativa, bootstrap seguro e diagnóstico de disponibilidade |
| Deploy e ambiente | `package.json`, Drizzle, Railway, Vercel, Nixpacks | Deploy gerenciado BuildForge | Adaptar apenas requisitos funcionais; não migrar segredos, banco PostgreSQL local ou scripts de hospedagem incompatíveis |

> **FMD:** não foi encontrada referência literal a “FMD” no ZIP original. A migração incluirá um ponto de integração de ferramenta externa na área de Toolchain, mas a execução local será feita somente por instalador ou agente autorizado, nunca pelo navegador.

## Ordem de integração

1. Reintroduzir a experiência de token, instalador e diagnóstico de worker, pois ela liga automaticamente a máquina com Android SDK/JDK à fila de builds.
2. Restaurar as telas e ações de projeto, detalhes de build, toolchain, tutorial, settings e webhooks.
3. Integrar os endpoints de geração de aplicativo e de planejamento de migração por IA ao modelo atual.
4. Validar todos os fluxos com a autenticação atual, sem importar usuários, senhas, sessões ou credenciais do ZIP.
