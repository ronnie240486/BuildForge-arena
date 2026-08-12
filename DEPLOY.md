# 🚀 Publicar a BuildForge com URL FIXA (produção)

O preview atual (`*.e2b.app`) é **temporário** — expira e muda de endereço.
Para ter uma **URL permanente** (e um worker que conecta pra sempre), publique em produção.
Abaixo, o passo a passo das 3 opções, da mais fácil à mais avançada.

---

## 🥇 Opção 1 — Vercel (grátis, recomendada)

A Vercel hospeda Next.js de graça com URL fixa (ex.: `buildforge.vercel.app`).

### Passo a passo
1. Suba este projeto para um repositório no **GitHub**.
2. Crie conta em **https://vercel.com** (login com GitHub).
3. Clique em **Add New → Project** e selecione o repositório.
4. Você precisa de um **banco PostgreSQL** (a Vercel oferece gratuito):
   - No painel do projeto: **Storage → Create Database → Postgres**.
   - A Vercel cria a variável `DATABASE_URL` automaticamente.
   - (Alternativas grátis: Neon.tech, Supabase — copie a connection string.)
5. Em **Settings → Environment Variables**, confirme que existe:
   - `DATABASE_URL = postgres://...`
6. Clique em **Deploy**. Em ~2 min você recebe a URL fixa.
7. Acesse a URL, o app cria o schema e o admin automaticamente no primeiro boot.

**Pronto.** Essa URL nunca muda. Baixe o instalador do worker nela e conecte 1 vez.

---

## 🥈 Opção 2 — Railway ou Render (grátis com limites)

Ambos hospedam Next.js + PostgreSQL juntos.

### Railway (https://railway.app)
1. **New Project → Deploy from GitHub repo**.
2. **Add → Database → PostgreSQL** (gera `DATABASE_URL`).
3. No serviço web, adicione a variável `DATABASE_URL` (referência ao banco).
4. Deploy → URL fixa gerada.

### Render (https://render.com)
1. **New → Web Service** (aponta pro repo). Build: `npm run build`. Start: `npm run start`.
2. **New → PostgreSQL** → copie a Internal Database URL para `DATABASE_URL`.
3. Deploy → URL fixa.

---

## 🥉 Opção 3 — VPS próprio (controle total, URL/domínio seu)

Numa máquina Linux (DigitalOcean, Hetzner, Contabo...):

```bash
# 1. Instale Node 20+ e PostgreSQL
sudo apt update && sudo apt install -y postgresql

# 2. Clone o projeto e instale
git clone <seu-repo> buildforge && cd buildforge
npm install

# 3. Configure o banco
sudo -u postgres psql -c "CREATE DATABASE app_db;"
echo 'DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:5432/app_db' > .env

# 4. Build e start
npm run build
npm run start   # sobe na porta 3000

# 5. (Recomendado) rode com PM2 para ficar 24h no ar
npm i -g pm2
pm2 start "npm run start" --name buildforge
pm2 save && pm2 startup
```

Depois aponte um domínio (ex.: `build.seusite.com`) para o IP do VPS via Nginx + HTTPS (Let's Encrypt).

---

## ✅ Depois do deploy (qualquer opção)

1. Acesse sua **URL fixa**.
2. Login: `admin@buildforge.dev` / `admin123` (troque a senha depois em Configurações).
3. **Workers → Registrar → Baixar Instalador** (agora com a URL fixa embutida).
4. Rode o worker **uma vez** — ele fica conectado pra sempre, sem precisar reconfigurar.

> 💡 Com URL fixa, acabam os problemas de "sandbox não encontrado" e "worker offline".

---

## Variáveis de ambiente

| Variável         | Onde        | Obrigatória | Descrição                                  |
|------------------|-------------|-------------|--------------------------------------------|
| `DATABASE_URL`   | servidor    | ✅          | Connection string do PostgreSQL            |

O worker (no seu PC) usa `--server` e `--token` por linha de comando — não precisa de env no servidor.
