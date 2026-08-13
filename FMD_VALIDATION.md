# Validação operacional do FMD

**Data da validação:** 13 de agosto de 2026

## Escopo

O FMD da BuildForge prepara uma máquina de build no fluxo **token → Doctor → dependências aprovadas → worker conectado**. A tela não executa instalações por conta própria: ela apenas entrega o script de bootstrap ou um comando copiado para execução explícita na máquina escolhida.

## Comportamentos comprovados localmente

| Situação avaliada | Requisição segura | Resultado observado | Conclusão |
|---|---|---|---|
| Bootstrap sem token | `GET /api/fmd/bootstrap?os=windows` | HTTP 400, com mensagem para informar token válido | O download/início é bloqueado antes de gerar um instalador. |
| Consulta sem token | `POST /api/fmd/status` com corpo vazio | HTTP 400, com mensagem para informar o token | A interface pode explicar claramente que o token é obrigatório. |
| Consulta com token inválido | `POST /api/fmd/status` com token de validação | HTTP 401 | Um token que não corresponde a worker cadastrado é rejeitado. |
| Interface inicial do FMD | Rota `/fmd` autenticada como administrador | Campo de token, seleção de sistema, Doctor, comando e consulta de status visíveis | O fluxo administrativo está disponível sem bloqueios indevidos. |

## Controles de segurança verificados

O endpoint de bootstrap exige ao menos 24 caracteres no token. O script distribuído verifica Node.js antes de baixar o worker; em seguida, executa o Doctor. Caso o Doctor reporte falha, o script é encerrado e o worker não é iniciado. Em caso de aprovação, o worker é iniciado com o token atribuído.

| Sistema | Arquivo entregue | Ordem do script |
|---|---|---|
| Windows | `BuildForge-FMD.bat` | Verifica Node.js, baixa o agente, executa `--doctor-only`, bloqueia em caso de falha e inicia o worker somente depois da aprovação. |
| Linux | `BuildForge-FMD.sh` | Verifica Node.js, baixa o agente, executa `--doctor-only`, bloqueia em caso de falha e inicia o worker somente depois da aprovação. |
| macOS | `BuildForge-FMD.command` | Executa o mesmo fluxo seguro de Linux com extensão apropriada. |

## Limites da validação atual

Não foi utilizado um token de worker real nesta validação para evitar criar ou alterar uma máquina remota sem ação explícita do administrador. Por isso, ainda é necessário validar, em uma máquina dedicada, os estados de **token válido**, **Doctor reportado** e **worker online**. O mesmo runner, com memória suficiente, também deve ser usado para concluir a build real do projeto Maximus.

## Procedimento recomendado para a validação externa

1. No painel administrativo, abra **Workers** e gere um token exclusivo para a máquina de build.
2. Abra **FMD**, cole o token e escolha Windows, Linux ou macOS.
3. Baixe o bootstrap ou copie o comando e execute-o conscientemente na máquina preparada.
4. Confirme o relatório do Doctor e corrija qualquer dependência marcada como ausente.
5. Retorne ao FMD e use **Consultar status do FMD** para confirmar o worker online e o ambiente aprovado.
6. Execute uma build de teste em um projeto autorizado; para o Maximus, use uma máquina com memória suficiente para Gradle, NDK e CMake.
