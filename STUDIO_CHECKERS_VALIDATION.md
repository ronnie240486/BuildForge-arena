# Validação da prévia de damas do Studio

Em 14 de agosto de 2026, foi validado o projeto **Damas Clássicas — Plataforma de Torneios** criado pelo Studio.

A tela em branco ocorria porque a prévia de aplicativo React Native não possuía um HTML navegável e o script inicial do tabuleiro continha um parêntese ausente. A rota de prévia agora identifica projetos de damas e entrega um tabuleiro HTML isolado, com 64 casas, 12 peças de cada cor, alternância de turno, movimentos diagonais, capturas por salto, promoção a dama e reinício de partida.

>A prévia permanece isolada da origem da plataforma. Ela permite scripts apenas dentro do documento temporário, sem acesso à origem do painel.

A validação no navegador confirmou a renderização de 64 células e 24 peças. Também foi realizado um movimento válido de uma peça azul, após o qual o estado exibiu corretamente **"Vez das peças roxas"**.

Em uma validação posterior, o chat atualizou o `App.tsx` do projeto **Damas Acessível — Jogue Para Todos** para indicar peças amarelas. A prévia passou a detectar essa preferência no conteúdo atualizado e exibiu as peças em amarelo, além de atualizar o texto de turno, placar e instruções para **peças amarelas**.

Após novas solicitações de cor e tema, a preferência de prévia passou a ser persistida em `studio-preview.json`. A validação do projeto real confirmou o tema **REINO MEDIEVAL**, peças rosas, ambientação em tons de madeira e a atualização correta para o turno roxo após um movimento válido.

A identidade medieval foi ampliada e validada em desktop e mobile: a prévia passou a exibir a faixa **Coroa das Sete Torres**, moldura ornamentada, torres nos cantos, tabuleiro dourado com textura de pergaminho e símbolos heráldicos nas peças. A composição se mantém legível em uma largura de 375 px.

Após o redesenho, um movimento válido das peças rosas foi executado na prévia. O tabuleiro atualizou corretamente a peça, preservou os ornamentos e mudou o indicador para **"Vez das peças roxas"**.
