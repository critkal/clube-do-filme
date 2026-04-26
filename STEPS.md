# Clube do Filme — Roadmap de Features

## 1. Auth — Login com Google *(pendente)*
- Substituir o login atual por OAuth com Google
- Backend: integrar passport.js com strategy google-oauth20
- Armazenar `google_id` e `email` na tabela `members`
- Manter sessão atual (cookie-based) após autenticação Google

> **Interim:** admins têm senha bcrypt como proteção temporária (Admin → Membros → "senha"). Fix Safari/iOS já implementado via `Authorization: Bearer` header.

---

## ~~2. Reformular cadastro do filme + integração com API de dados (TMDB)~~ ✅
- ~~Remover os campos `direção` e `data do filme` do formulário~~ — removidos
- ~~Integrar API TMDB~~ — busca debounced com dropdown de sugestões (poster + título + ano)
- ~~Armazenar `tmdb_id`~~ — armazenado; campos `synopsis`, `genre`, `runtime` adicionados ao banco
- ~~Filmes não encontrados na API~~ — modo manual completo com upload de poster
- Proxy `/api/tmdb/search` e `/api/tmdb/movie/:id` no backend (chave em `.env`)

---

## 3. Cadastrar categorias base
- Criar seed com as categorias padrão do clube (ex: Melhor Filme, Melhor Direção, etc.)
- A UI de gerenciamento já existe no Admin → Categorias; falta popular com as categorias padrão

---

## ~~4. Melhorar tela do filme~~ ✅
- ~~Redesenhar a página `/movies/:id` com layout mais rico~~ — hero cinematográfico com poster desfocado como bg
- ~~Exibir poster em destaque, sinopse, metadados (ano, gênero, duração)~~ — implementados
- ~~Mostrar avaliações dos membros de forma visual (estrelas, média)~~ — implementados
- ~~Mostrar quem apresentou e em qual temporada/rodada~~ — implementado

---

## ~~5. Estados da temporada + visibilidade de notas~~ ✅ *(não estava no roadmap original)*
- Novo estado `presented` (apresentada) após `completed` (encerrada)
- Notas (`average_rating`, `rating_count`) ocultas na API para todos exceto o host até `presented`
- `your_score` sempre visível para o votante
- Tela do filme mostra 🔒 para não-hosts em temporadas não apresentadas
- Admin cria temporada com seleção de host; botão "🎬 Apresentar" libera as notas
- Status pills: `active` (azul) · `completed` (cinza) · `presented` (âmbar)

---

## ~~6. Lista ordenada de membros na temporada~~ ✅
- ~~Na página `/seasons/:id`, exibir lista ordenada dos membros que vão apresentar filme~~
- ~~Cada posição mostra: número da rodada, nome do membro, status (já apresentou / próximo / aguardando)~~

---

## ~~7. Geração aleatória da lista ao iniciar temporada~~ ✅
- ~~Ao criar uma nova temporada, gerar automaticamente a ordem de apresentação embaralhando os membros ativos~~
- Admin pode reordenar manualmente via painel Admin → Temporadas → "fila"

---

## 8. Presença nas sessões
- Qualquer membro autenticado pode registrar a própria presença na sessão do dia
- Cada membro marca apenas a si mesmo (não pode marcar outros)
- Criar tabela `attendances` (movie_id, member_id, created_at)
- Janela de registro aberta a partir da data da sessão; fechada pelo host ou automaticamente após X horas
- Exibir lista de presença na página do filme após a sessão
- Usar no dashboard: ranking de frequência, % de presença na temporada

---

## 9. Votação do próximo dia de filme
- Host propõe 2–3 datas possíveis para a próxima sessão
- Membros votam na data preferida
- A data mais votada é definida como data da próxima rodada
- Exibir resultado da votação em tempo real na página da temporada

---

## 10. Próximo filme pré-cadastrado automaticamente
- Ao encerrar a enquete de data (item 9), o sistema pré-cadastra automaticamente o próximo filme com o membro seguinte na fila como `presenter`
- O registro fica com status `pending` — sem título, poster ou detalhes
- O membro preenche os dados apenas no dia da exibição, mantendo surpresa
- Tela do filme em `pending` exibe somente "Próximo filme — [Nome]" para os outros membros

---

## 11. Dashboard do host (admin)
- Rota `/dashboard` acessível apenas para admin/host
- Métricas da temporada atual: filmes assistidos, média geral, membro mais ativo, distribuição de notas, progresso da temporada
- Depende de: tela do filme (✅), lista de membros (✅), presença nas sessões (item 8)

---

## Ordem sugerida de implementação

| # | Feature | Status |
|---|---------|--------|
| 1 | Reformular cadastro + API TMDB | ✅ |
| 2 | Auth admin com senha (interim) + fix Safari | ✅ |
| 3 | Estados da temporada + visibilidade de notas | ✅ |
| 4 | Lista ordenada de membros | ✅ |
| 5 | Geração aleatória na nova temporada | ✅ |
| 6 | Melhorar tela do filme | ✅ |
| 7 | Categorias base (seed) | pendente |
| 8 | Presença nas sessões | pendente |
| 9 | Votação do próximo dia de filme | pendente |
| 10 | Próximo filme pré-cadastrado automaticamente | pendente |
| 11 | Dashboard do host | pendente |
