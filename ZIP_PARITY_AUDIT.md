# Auditoria de Paridade do ZIP Original

**Data da auditoria:** 13 de agosto de 2026

## Critério adotado

Esta auditoria compara **ações disponíveis ao usuário**, e não uma cópia literal de arquivos do projeto original. O ZIP foi construído com Next.js, PostgreSQL e Server Actions. A BuildForge atual usa React, tRPC, banco gerenciado e armazenamento de objetos; por isso, os mecanismos internos foram adaptados, enquanto os fluxos operacionais equivalentes foram preservados.

| Área do ZIP original | Equivalente atual | Evidência no projeto atual | Situação |
|---|---|---|---|
| Identidade, login e papéis | OAuth Manus, login de cliente por e-mail/senha, sessões revogáveis e Administração | `server/client-auth.ts`, `client/src/pages/ClientAccess.tsx`, `client/src/pages/Admin.tsx` | Concluído |
| Criação e importação de projetos | GitHub, Git, ZIP, templates e WebView | `client/src/pages/Projects.tsx`, `server/routers/buildforge.ts`, `server/buildforge-db.ts` | Concluído |
| Fila e detalhes de builds | Fila, progresso, cancelamento, histórico e logs SSE | `client/src/pages/Builds.tsx`, `server/build-stream.ts`, `server/worker-api.ts` | Concluído |
| Artefatos e downloads | APK/AAB, links temporários, expiração e metadata | `client/src/pages/Artifacts.tsx`, `server/buildforge-db.ts` | Concluído |
| Worker e token | Registro, token, heartbeat, reserva de job e logs | `client/src/pages/Workers.tsx`, `worker/buildforge-worker.mjs` | Concluído |
| Instaladores por sistema | Windows, Linux e macOS | `/api/worker/installer`, `/api/fmd/bootstrap` | Concluído |
| Doctor e toolchain | Node, Git, JDK, Android SDK e Flutter quando aplicável | `worker/buildforge-worker.mjs`, `client/src/pages/Toolchain.tsx`, `client/src/pages/Fmd.tsx` | Concluído |
| Workflow GitHub Actions | Arquivo de workflow distribuível com worker | `/api/worker/github-workflow` | Concluído |
| IA para falhas e patches | Diagnóstico, propostas, aprovação e nova tentativa | `client/src/pages/AiAssistant.tsx`, `server/buildforge-db.ts` | Concluído |
| IA para geração e migração | Geração de starter app e plano de migração | `client/src/pages/Studio.tsx`, `server/routers/buildforge.ts` | Concluído |
| Releases e assinatura | WebView, keystore e preparação APK/AAB | `client/src/pages/Releases.tsx`, `worker/build-strategies.mjs` | Concluído |
| Webhooks | Cadastro, HMAC e eventos de build | `client/src/pages/Webhooks.tsx`, `server/buildforge-db.ts` | Concluído |
| Backups, auditoria e saúde | Exportação, restauração, eventos e painel administrativo | `client/src/pages/Backups.tsx`, `client/src/pages/Admin.tsx` | Concluído |
| Configurações e tutorial | Rotas administrativas restauradas | `client/src/pages/Settings.tsx`, `client/src/pages/Tutorial.tsx` | Concluído |
| Controle de clientes | Quota, ferramentas autorizadas, menu reduzido e bloqueio de API | `server/tool-permissions.test.ts`, `client/src/lib/workspace-access.ts` | Concluído |

## Validações automatizadas disponíveis

A suíte atual cobre autenticação, banco, autenticação local de clientes, permissões de APIs, regras de navegação por papel, agente worker e detecção de framework. A execução de 13 de agosto de 2026 terminou com **7 arquivos de teste e 22 testes aprovados**.

| Validação | Resultado |
|---|---|
| Cliente sem ferramenta liberada não acessa dashboard/build/API | Aprovado |
| Cliente não acessa Administração, Templates e Webhooks pela API | Aprovado |
| Administrador acessa `/settings`, `/admin` e `/webhooks` | Aprovado |
| Detecção Android, Flutter, React Native, Expo e WebView | Aprovado |
| Token FMD ausente, bootstrap bloqueado e token inválido | Comprovado por chamadas seguras; ver `FMD_VALIDATION.md` |

## Limites fora do ambiente atual

O FMD externo literal não existe no ZIP de referência. A BuildForge entrega o fluxo equivalente e seguro de token, instalador, Doctor e worker. A comprovação de um **worker online em máquina dedicada** e a build final do Maximus continuam dependentes de um runner autorizado com memória suficiente para Gradle, NDK e CMake.

> Nenhum instalador remoto foi acionado durante esta auditoria. O bootstrap exige token e só deve ser executado com autorização explícita do administrador na máquina de build escolhida.
