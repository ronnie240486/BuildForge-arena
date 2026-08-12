# Guia de Botões e Menus — BuildForge

Este guia explica, de forma prática, **para que serve cada área e botão importante** da BuildForge. A navegação aparece na barra lateral esquerda; o conteúdo da área escolhida abre no centro da tela.

> **Fluxo principal:** importar ou criar um projeto → registrar um worker e gerar token → iniciar um build → acompanhar os logs → baixar o APK/AAB ou corrigir a falha com IA.

## Barra superior

| Botão ou área | Para que serve | Como usar |
|---|---|---|
| **Ícone de sol/lua** | Alterna entre tema claro e escuro. | Clique uma vez para trocar o tema. A preferência fica salva no navegador. |
| **Admin / seu perfil** | Indica a conta conectada e o nível de acesso. | Use para confirmar que está na conta administradora antes de gerenciar usuários, workers ou chaves. |
| **Importar projeto** | Atalho do painel inicial para cadastrar a primeira fonte. | Escolha GitHub, Git, arquivo ZIP, template ou WebView. |

## Menu lateral

| Menu | O que faz | Botões e ações principais |
|---|---|---|
| **Visão geral** | Mostra projetos ativos, builds em andamento, workers online e entregas concluídas. | **Importar projeto** abre o cadastro; **Ver fila completa** abre os builds. |
| **Projetos** | Central de fontes, repositórios, ZIPs e projetos cadastrados. | **Novo projeto / Importar** cria um projeto; abas **GitHub**, **Git** e **ZIP** selecionam a origem; **Criar build** envia APK/AAB para a fila. |
| **Fila de builds** | Exibe a fila, o progresso e os logs ao vivo. | Selecione um build para ver logs; **Cancelar** interrompe builds que ainda estão em andamento; links de artefato aparecem quando a entrega termina. |
| **Workers** | Conecta computadores e runners que realmente compilam os aplicativos. | **Registrar worker** gera o token; os cartões **Máquina local**, **GitHub Actions** e **Docker** explicam os modos de execução. |
| **Artefatos** | Lista APKs, AABs, ZIPs de fonte, logs e arquivos protegidos. | **Gerar link** cria um download temporário; use-o para baixar sem tornar o arquivo público permanentemente. |
| **Backups** | Exporta e restaura dados operacionais. | **Criar backup** gera um snapshot; **Baixar** cria link temporário; **Restaurar** importa uma cópia sem apagar o que já existe. |
| **Assistente IA** | Ajuda quando um build falha. | **Analisar com IA** lê os logs; **Aprovar** ou **Rejeitar** decide cada patch; **Reexecutar** reenvia o build com correções aprovadas. |
| **Studio IA** | Cria um projeto inicial por descrição ou planeja uma migração. | **Gerar aplicativo** cria um ZIP de fonte inicial; **Planejar migração** produz um roteiro técnico para Android, Flutter ou React Native. |
| **Templates** | Cria projetos pré-configurados. | Escolha **Loja**, **Catálogo**, **IPTV**, **Delivery**, **Agenda** ou **WebView** e use **Criar projeto**. |
| **Releases** | Prepara conversão WebView, ícone, splash e assinatura. | Use o formulário WebView para criar app a partir de site; envie uma **Keystore** para releases assinadas; escolha APK ou AAB ao criar o build. |
| **Toolchain** | Explica quais programas o worker precisa. | **Ir para Workers** leva ao cadastro do token e do agente. Os cartões mostram Node, Git, JDK, Android SDK e Flutter. |
| **Tutorial** | Mostra o passo a passo completo da plataforma. | Não exige preenchimento: leia as cinco etapas e use os atalhos indicados. |
| **Configurações** | Agrupa preferências, modelos de IA, workers, backup e administração. | Clique em cada cartão para seguir para a área correspondente. |
| **Webhooks** | Envia eventos de build para outro sistema. | Preencha nome, URL HTTPS e segredo opcional; marque os eventos e clique em **Salvar webhook**. |
| **Administração** | Área exclusiva de administradores. | Gerencia usuários, papéis, limites, auditoria e controle operacional. |

## Projetos: qual botão usar?

| Origem | Quando usar | O que informar |
|---|---|---|
| **GitHub** | Repositório hospedado no GitHub. | URL HTTPS do repositório e branch, se diferente de `main`. |
| **Git** | GitLab, Bitbucket, servidor próprio ou URL SSH. | URL HTTPS ou SSH compatível com Git. |
| **ZIP** | Código salvo no seu computador. | Selecione o `.zip`; a plataforma procura manifestos Android, Flutter ou React Native. |
| **Template** | Quer começar rapidamente com um modelo pronto. | Escolha o tipo de aplicativo e confirme o nome. |
| **WebView** | Quer transformar um site em aplicativo. | URL, nome, permissões, ícone, splash e configurações de navegação. |

Depois de criar o projeto, use o botão de **criar build** e selecione **APK** para instalar diretamente ou **AAB** para publicação na Google Play.

## Workers: token, instalador e SDK automático

O botão mais importante desta tela é **Registrar worker**. Ele cria uma máquina autorizada a buscar builds.

1. Clique em **Registrar worker**.
2. Dê um nome para o computador e escolha as capacidades, como Android, Flutter ou React Native.
3. Copie o **token** exibido. Ele é a senha temporária de conexão do agente.
4. Escolha o download adequado: **Windows**, **Linux/macOS**, **Doctor** ou **GitHub Actions**.
5. Execute o instalador no computador que fará os builds.

> O instalador restaurado baixa o agente, passa o token, executa o diagnóstico e verifica Node, Git, JDK, Android SDK e Flutter. Depois disso, o worker aparece como **online** e começa a consultar a fila automaticamente.

O botão ou arquivo **Doctor** não compila nada: ele apenas verifica se o ambiente tem as ferramentas necessárias. O arquivo de **GitHub Actions** é um workflow para colocar no repositório e usar runners do GitHub.

## Fila de builds e logs

Ao criar um build, ele pode aparecer como **na fila**, **em execução**, **concluído**, **falhou** ou **cancelado**.

| Botão ou status | Significado |
|---|---|
| **Cancelar** | Pede ao sistema para não continuar aquele build. Use quando enviou a versão errada ou quer mudar configurações. |
| **Selecionar build** | Abre os logs em tempo real. Os logs chegam pelo canal ao vivo enquanto o worker trabalha. |
| **Baixar APK/AAB** | Aparece quando o worker envia um artefato concluído. Cria um link temporário e protegido. |
| **Analisar com IA** | Aparece ou é usado quando o build falha. Leva a falha para o Assistente IA. |

## Assistente IA: o que cada decisão faz

O assistente não aplica código escondido. Ele sempre mostra a explicação, os arquivos afetados e o patch antes de reenviar o build.

| Botão | Resultado |
|---|---|
| **Analisar com IA** | Lê os últimos logs e cria diagnóstico e propostas de correção. |
| **Aprovar** | Autoriza aquela proposta específica para o próximo build. |
| **Rejeitar** | Mantém a proposta apenas no histórico, sem enviar para o worker. |
| **Reexecutar com correções** | Cria um novo build e entrega somente patches aprovados ao worker. |

## Releases, ícone, splash e keystore

Use **Releases** quando quiser montar um aplicativo WebView ou assinar uma entrega.

| Campo ou botão | Função |
|---|---|
| **URL do site** | Endereço que será aberto pelo aplicativo WebView. |
| **Ícone** | Imagem usada como ícone do APK. |
| **Splash screen** | Imagem exibida ao abrir o app. |
| **Permissões** | Define acessos solicitados pelo aplicativo. Escolha só o necessário. |
| **Enviar keystore** | Guarda a chave de assinatura de forma criptografada. |
| **Versão** | A plataforma incrementa a versão a cada release para evitar conflitos de publicação. |

As senhas da keystore são entregues apenas ao worker que reservou o build. Elas não são exibidas novamente no navegador.

## Webhooks e integrações

Para receber avisos no Discord, automações próprias ou outro sistema, use **Webhooks**.

1. Informe um **nome** para identificar a integração.
2. Informe uma **URL HTTPS** pública.
3. Defina um **segredo** se o sistema de destino validar assinaturas.
4. Marque os eventos: build entrou na fila, build concluído e/ou build falhou.
5. Clique em **Salvar webhook**.

A plataforma envia um payload com evento, projeto, build e data. Quando existe segredo, a assinatura HMAC SHA-256 é enviada no cabeçalho `x-buildforge-signature`.

## Sobre o FMD

> O ZIP original não contém um arquivo, rota, script ou referência funcional chamada **FMD**. O mecanismo que ele contém e que foi recuperado é o fluxo automático de token, instalador, diagnóstico, worker e SDK Android. Para abrir ou integrar um programa externo chamado FMD, será necessário fornecer o instalador, endereço oficial ou comando desse programa.

## Ordem recomendada para começar

1. Entre em **Workers** e registre uma máquina.
2. Baixe o instalador correspondente e execute o **Doctor**.
3. Vá em **Projetos** e importe um GitHub, Git ou ZIP; se preferir, use **Studio IA** ou **Templates**.
4. Crie uma release APK/AAB.
5. Acompanhe a execução em **Fila de builds**.
6. Baixe o resultado em **Artefatos**; se falhar, use o **Assistente IA**.
