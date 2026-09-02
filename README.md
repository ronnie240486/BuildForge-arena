# BuildForge

BuildForge é uma aplicação web construída com Next.js, React, TypeScript e Tailwind CSS. O frontend está organizado em `src/app` e `src/components`; as rotas e módulos de suporte ao backend permanecem no mesmo projeto para preservar a execução integrada da aplicação.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL para os recursos persistentes da aplicação

## Instalação

```bash
npm install
cp .env.example .env
```

Edite `.env` e informe uma conexão PostgreSQL válida em `DATABASE_URL`.

## Desenvolvimento

```bash
npm run dev
```

A aplicação ficará disponível em `http://localhost:3000`.

## Validação e produção

```bash
npm run typecheck
npm run lint
npm run build
npm run start
```.

Consulte `DEPLOY.md` para as opções de publicação em Vercel, Railway, Render ou VPS.

## Estrutura do frontend

- `src/app`: layout, página principal e estilos globais.
- `src/components`: componentes reutilizáveis, formulários e telas da interface.
- `src/lib`: autenticação, ações de aplicação, integração de build e utilitários.
- `src/db`: esquema e inicialização do banco PostgreSQL.
