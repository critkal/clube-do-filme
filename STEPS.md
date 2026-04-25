# Clube do Filme — Roadmap de Features

## 1. Auth — Login com Google
- Substituir o login atual (busca por primeiro nome, sem senha) por OAuth com Google
- Backend: integrar passport.js com strategy google-oauth20
- Armazenar `google_id` e `email` na tabela `members`
- Manter sessão atual (cookie-based) após autenticação Google
- Fallback: manter login simples para admin enquanto o fluxo Google não estiver pronto

---

## 2. Reformular cadastro do filme + integração com API de dados (TMDB)
- Remover os campos `direção` e `data do filme` do formulário (substituídos pelos dados da API)
- Fazer migration para dropar/renomear as colunas obsoletas do banco
- Integrar API TMDB: ao digitar o título, exibir sugestões e auto-preencher poster, sinopse, ano, gênero, duração, elenco principal
- Armazenar `tmdb_id` no registro para evitar rebusca
- **Filmes não encontrados na API:** permitir cadastro 100% manual, com upload de poster próprio e preenchimento livre dos campos — cobre filmes obscuros, curtas e produções independentes
- Indicar visualmente na tela do filme se os dados vieram da API ou foram inseridos manualmente

---

## 3. Cadastrar categorias base
- Criar seed com as categorias padrão do clube (ex: Melhor Filme, Melhor Direção, etc.)
- Criar rota/tela admin para gerenciar categorias (listar, adicionar, remover)
- Garantir que as categorias base estejam presentes ao criar nova temporada

---


## 5. Melhorar tela do filme
- Redesenhar a página `/movies/:id` com layout mais rico
- Exibir poster em destaque, sinopse, metadados (ano, gênero, duração)
- Mostrar avaliações dos membros de forma visual (estrelas, média)
- Mostrar quem apresentou e em qual temporada/rodada

---

## ~~6. Lista ordenada de membros na temporada~~ ✅
- ~~Na página `/seasons/:id`, exibir lista ordenada dos membros que vão apresentar filme~~
- ~~Cada posição mostra: número da rodada, nome do membro, status (já apresentou / próximo / aguardando)~~
- ~~Armazenar a ordem como `presentation_order` vinculada à temporada~~

---

## ~~7. Geração aleatória da lista ao iniciar temporada~~ ✅
- ~~Ao criar uma nova temporada, gerar automaticamente a ordem de apresentação embaralhando os membros ativos~~
- ~~Admin pode reordenar manualmente se necessário antes da temporada começar~~
- ~~Registrar a lista gerada na tabela `presentation_order` (nova tabela: `season_member_order`)~~

---

## 8. Próximo filme pré-cadastrado automaticamente
- Ao encerrar a enquete de data (item 9), o sistema pré-cadastra automaticamente o próximo filme com o membro seguinte na fila como `presenter`
- O registro é criado com status `pending` — sem título, poster ou qualquer detalhe
- O membro preenche os dados do filme apenas no próprio dia da exibição, mantendo surpresa para os demais
- A tela do filme em status `pending` exibe somente "Próximo filme — [Nome do membro]" para os outros membros

---

## 9. Presença nas sessões
- Qualquer membro autenticado pode registrar a própria presença na sessão do dia
- Cada membro marca apenas a si mesmo (não pode marcar outros)
- Criar tabela `attendances` (movie_id, member_id, created_at)
- Janela de registro: aberta a partir da data da sessão e fechada pelo host quando quiser encerrar (ou automaticamente após X horas)
- Exibir lista de presença na página do filme após a sessão
- Usar o dado de presença no dashboard: ranking de frequência dos membros, total de sessões por membro, % de presença na temporada

---

## 11. Votação do próximo dia de filme
- Criar feature onde o host propõe 2–3 datas possíveis para a próxima sessão
- Membros votam na data preferida
- A data mais votada é definida como a data da próxima rodada
- Exibir resultado da votação em tempo real na página da temporada

---

## 12. Dashboard do host (admin)
- Criar rota `/dashboard` acessível apenas para admin/host
- Métricas da temporada atual:
  - Total de filmes assistidos
  - Média geral de avaliações
  - Membro mais ativo (mais avaliações)
  - Distribuição de notas
  - Próximos filmes agendados
  - Progresso da temporada (rodada atual / total)
- Gráficos simples (bar chart de notas, progresso da temporada)

---

## Ordem sugerida de implementação

| # | Feature | Dependências |
|---|---------|-------------|
| 1 | Reformular cadastro + API TMDB (com fallback manual) | — |
| 2 | Categorias base | — |
| 3 | Melhorar tela do filme | 1 |
| 4 | Lista ordenada de membros | — |
| 5 | Geração aleatória na nova temporada | 4 |
| 6 | Presença nas sessões | — |
| 7 | Votação do próximo dia de filme | 4 |
| 8 | Próximo filme pré-cadastrado automaticamente | 4, 5, 7 |
| 9 | Dashboard do host | 3, 4, 6 |
| 10 | Login com Google | — (pode ser feito a qualquer momento) |
