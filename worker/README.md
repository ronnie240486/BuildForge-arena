# BuildForge Worker

O agente de referência executa em uma máquina que tenha o toolchain necessário e mantém uma conexão autenticada com a fila da plataforma. Ele busca um build compatível, baixa a fonte por URL temporária ou faz clone do repositório, aplica somente propostas de IA aprovadas, executa a compilação e envia o APK ou AAB ao armazenamento seguro.

```bash
pnpm install
BUILDFORGE_URL="https://seu-dominio.manus.space" \
MANUS_WORKER_TOKEN="bfw_token_gerado_no_painel" \
node worker/buildforge-worker.mjs
```

Para Android, instale o JDK e SDK Android. Para Flutter ou React Native, instale também os respectivos toolchains antes de registrar as capacidades do worker no painel. O token deve ser tratado como segredo e pode ser revogado registrando um novo worker.
