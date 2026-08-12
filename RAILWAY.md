# 🚂 Publicar a BuildForge no Railway (com GitHub) — passo a passo

O Railway hospeda a BuildForge com **URL fixa** e um **PostgreSQL grátis**, tudo integrado ao GitHub.
Dá para fazer **pelo celular**, no navegador. Depois disso, a URL nunca mais muda.

---

## Pré-requisito
Coloque o **código-fonte da BuildForge** num repositório do seu GitHub.
(Baixe o ZIP em Configurações → "Baixar código-fonte", extraia e suba para um repo, ou peça ajuda.)

---

## Passo a passo (pelo celular ou PC)

### 1. Criar a conta
- Acesse **railway.app** → **Login with GitHub**.

### 2. Criar o projeto a partir do GitHub
- Toque em **New Project** → **Deploy from GitHub repo**.
- Autorize o Railway a ver seus repositórios e escolha o repo da **BuildForge**.
- O Railway detecta Next.js e começa o build automaticamente.

> ⚠️ **Node 20+ obrigatório.** O projeto já traz `.nvmrc`, `nixpacks.toml` e `engines` fixando Node 20.
> Se ainda usar Node 18, vá em **Variables** e adicione `NIXPACKS_NODE_VERSION = 20`.

### 3. Adicionar o banco PostgreSQL
- Dentro do projeto, toque em **New** (ou **Create** / **+**) → **Database** → **Add PostgreSQL**.
- O Railway cria o banco e a variável de conexão.

### 4. Ligar o app ao banco
- Toque no serviço da **BuildForge** → aba **Variables**.
- Adicione a variável:
  - **Nome:** `DATABASE_URL`
  - **Valor:** clique em "Add Reference" e escolha `Postgres → DATABASE_URL`
    (ou copie a `DATABASE_URL` do serviço Postgres → aba Variables/Connect).
- Salve. O Railway vai reimplantar sozinho.

### 5. Gerar o domínio (URL fixa)
- No serviço da BuildForge → aba **Settings** → **Networking** → **Generate Domain**.
- Você recebe algo como `buildforge-production.up.railway.app`. **Essa é sua URL fixa!**

### 6. Primeiro acesso
- Abra a URL. No primeiro boot, o app cria o banco (tabelas) e o usuário admin automaticamente.
- Login: `admin@buildforge.dev` / `admin123` → **troque a senha** em Configurações.

---

## Depois do deploy: worker que conecta pra sempre

1. Na sua BuildForge (URL fixa), vá em **Workers**.
2. Baixe o **workflow do GitHub Actions** (aba "GitHub Actions") — agora ele já vem com a URL FIXA.
3. No seu repositório de app (ex.: Maximus), substitua o `.github/workflows/buildforge-worker.yml` pelo novo.
4. Confira o secret `BUILDFORGE_TOKEN` (Settings → Secrets → Actions).
5. Rode em **Actions**. Nunca mais precisa reconfigurar — a URL não muda.

---

## Variáveis de ambiente no Railway

| Variável         | Obrigatória | Descrição                                   |
|------------------|-------------|---------------------------------------------|
| `DATABASE_URL`   | ✅          | Referência ao Postgres do Railway           |
| `ALLOW_PUBLIC_SIGNUP` | ❌     | `true` só se quiser reabrir cadastro público |

O Railway injeta `PORT` automaticamente — o app já usa (`next start -p $PORT`).

---

## Dica
No plano gratuito, o Railway pode "adormecer" o app após inatividade e pode ter um limite mensal de horas.
Para um serviço 24/7 sério (comercial), considere o plano pago (barato) ou um VPS.
