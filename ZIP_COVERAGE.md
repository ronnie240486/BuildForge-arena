# Cobertura Funcional do ZIP Original

Esta matriz registra a migração de capacidades, não uma cópia literal de arquivos Next.js. Sessão local, PostgreSQL e Server Actions do ZIP foram substituídos por OAuth Manus, tRPC, banco gerenciado e armazenamento seguro.

| Capacidade do ZIP original | Equivalente na plataforma unificada | Estado |
|---|---|---|
| Login, registro, conta e papéis | OAuth Manus, perfil persistente, admin/membro, Administração | Adaptado |
| Criação por GitHub, Git, ZIP e site | Projetos, Releases, Templates, uploads seguros e detecção de stack | Migrado |
| Projeto e detalhes de build | Projetos, Fila de builds, Artefatos, Releases e logs SSE | Migrado; detalhes secundários em revisão |
| Fila, cancelamento, progresso e console | Builds, SSE, cancelamento, logs do worker e histórico | Migrado |
| Agente local e token | Workers, token único, heartbeat, claim, logs, artefatos e assinatura | Migrado |
| Instalador Windows/macOS/Linux | `/api/worker/installer` e tela Workers pós-token | Migrado |
| Diagnóstico de SDK | `/api/worker/doctor` e Toolchain | Migrado |
| Workflow GitHub Actions | `/api/worker/github-workflow` | Migrado |
| Toolchain, tutorial e configurações | Rotas `/toolchain`, `/tutorial`, `/settings` | Migrado |
| IA para falha e patch | Assistente IA, aprovação, reexecução e auditoria | Migrado |
| IA para geração e migração | Studio IA, ZIP inicial e plano técnico revisável | Migrado |
| Webhooks | CRUD, HMAC SHA-256 e dispatch de eventos de build | Migrado |
| Backup, auditoria e health operacional | Backups, Administração e logs de auditoria | Migrado / adaptado |
| FMD | Não existe referência funcional no ZIP; fluxo equivalente é instalador → doctor → worker → SDK | Requer origem externa para integração literal |

> **Fluxo automático restaurado:** após gerar um token em **Workers**, a pessoa baixa o instalador adequado. O instalador baixa o agente, verifica o ambiente com o Doctor, conecta à URL da plataforma e passa a consultar a fila. O agente usa Node, Git, JDK, Android SDK e Flutter conforme a stack do build.
