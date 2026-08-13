# Agendamentos internos de build

Os agendamentos são configurados no painel em **Agendamentos**. Cada rotina seleciona um projeto, o formato de entrega (**APK** ou **AAB**) e uma frequência em UTC. A execução usa a mesma fila de builds manual, mantendo as verificações de projeto, permissões, quota e worker.

| Ação | Resultado |
|---|---|
| Criar | Registra uma rotina e prepara sua próxima execução automática. |
| Pausar | Mantém o agendamento salvo, sem enfileirar novas builds. |
| Retomar | Reativa a rotina com a frequência previamente configurada. |
| Remover | Exclui a rotina e encerra a tarefa automática vinculada. |

O formato técnico de frequência utiliza seis campos em UTC: `segundos minutos horas dia-do-mês mês dia-da-semana`. O painel oferece opções prontas para horários diários e semanais, evitando a necessidade de editar a expressão manualmente.

> Uma build agendada não ignora as regras da plataforma. Caso a conta não tenha quota disponível ou o projeto não esteja acessível, a execução falha de forma segura sem expor dados de outros usuários.
