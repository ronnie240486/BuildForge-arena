# Pesquisa de Integração — GitHub Webhooks

## Referências verificadas

O GitHub suporta webhooks para notificar um servidor externo quando eventos configurados ocorrem em um repositório. A BuildForge deverá assinar somente os eventos que realmente tratar, inicialmente `push`, para disparar builds por branch.

O endpoint deverá validar o cabeçalho `X-Hub-Signature-256` utilizando HMAC-SHA256 sobre o corpo bruto da requisição, comparar em tempo constante e manter o segredo exclusivamente no servidor. O GitHub recomenda esse cabeçalho em vez do mecanismo legado baseado em SHA-1.

| Tema | Decisão de implementação |
|---|---|
| Evento inicial | `push`, filtrado pela branch configurada no projeto |
| Autenticação | Segredo por integração, armazenado como configuração segura do servidor |
| Validação | HMAC-SHA256, `X-Hub-Signature-256` e comparação em tempo constante |
| Reentregas | Registrar o identificador `X-GitHub-Delivery` para tornar o processamento idempotente |
| Escopo | Receber somente eventos escolhidos na configuração da integração |

## Fontes

1. [GitHub — Webhooks](https://docs.github.com/en/webhooks)
2. [GitHub — Validating webhook deliveries](https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries)
3. [GitHub — Webhook events and payloads](https://docs.github.com/en/webhooks/webhook-events-and-payloads)

## Provedores de IA

| Provedor | Endpoint e autenticação verificados | Decisão de implementação |
|---|---|---|
| OpenAI | A documentação recomenda a Responses API para geração de texto e usa chave Bearer no servidor. | Usar resposta estruturada somente no backend, com chave criptografada. |
| Anthropic | `POST /v1/messages`, cabeçalhos `x-api-key`, `anthropic-version` e `content-type`. | Usar o campo `system` de nível superior e mensagens de usuário. |
| Gemini | `POST /v1beta/{model=models/*}:generateContent`; a API aceita `x-goog-api-key`, conteúdo e instrução de sistema. | Usar o endpoint de geração no backend e exigir chave restrita ao Gemini. |

As respostas externas devem ser tratadas como dados não confiáveis, limitadas em tamanho e analisadas em formato JSON antes de alimentar o Studio. As chaves jamais devem ser enviadas ao navegador ou gravadas no código-fonte.

4. [OpenAI — Text generation](https://developers.openai.com/api/docs/guides/text)
5. [Anthropic — API overview](https://platform.claude.com/docs/en/api/overview)
6. [Anthropic — Create a Message](https://platform.claude.com/docs/en/api/messages/create)
7. [Google — Gemini generateContent](https://ai.google.dev/api/generate-content)
8. [Google — Gemini API key security](https://ai.google.dev/gemini-api/docs/api-key)
