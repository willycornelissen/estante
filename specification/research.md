# Pesquisa — Biblioteca Pessoal (600+ livros físicos)

> Explorado com o skill office-hours (YC office hours). Fonte bruta: `specification/idea.md`.

## Declaração do problema

O usuário possui 600+ livros físicos e não consegue encontrar um título específico
com confiabilidade. Aplicativos existentes (Goodreads, Libib, LibraryThing) e o
Calibre (modelo de referência, mas voltado a ebooks) não resolvem o caso central:
**buscar um livro físico e saber exatamente onde ele está na estante/caixa**.

Restrições confirmadas em entrevista:
- Objetivo primário: **encontrar um livro na estante** (search → localização).
- Usuário único e privado.
- Uso em **desktop** (não em pé na estante); entrada de dados digitando título
  e escolhendo em autocomplete (sem leitor de código de barras).
- **Esquema de localização já existe** na cabeça do usuário — o app deve
  espelhá-lo, não impor uma taxonomia.
- Modelo de UX de referência: **Calibre** (grid de capas, busca no topo, metadados ricos).
- Reservar espaço para crescimento: empréstimos, status de leitura, wishlist, estatísticas.

## Insights-chave

1. **É um "shelf-locator", não um catálogo.** A localização é o dado mais importante;
   o catálogo é o custo de entrada e a busca é o payoff. Toda decisão de design
   deve servir "digite título → veja onde está".

2. **Entrada de dados é o gargalo.** 600 livros digitados à mão é caro. Autocomplete
   vindo de uma API de metadados é obrigatório. O usuário escreve em português →
   a cobertura de livros BR importa (ver abaixo).

3. **A stack é grátis e suficiente.** React + Vite → GitHub Pages (hospedagem
   estática gratuita) + Firebase Firestore/Auth (plano Spark, grátis para sempre:
   50k leituras/dia, 20k escritas/dia, 1 GiB de armazenamento — 600 livros para um
   usuário nunca chegará perto do limite).

4. **Segurança para app 1 usuário é simples.** A API key do Firebase fica no cliente
   (é pública por natureza); a proteção real vem das **Security Rules** do Firestore,
   restringindo tudo a um único UID autenticado. Nada de auth complexa.

5. **Pegadinha conhecida do GitHub Pages:** SPA com rotas quebra no refresh
   (404). Solução mais simples: **HashRouter** (URLs com `#/livro/xyz`) ou, melhor
   ainda, **evitar roteamento** — página única com barra de busca + modal de
   detalhe. Para um app pessoal, menos rotas = menos dor.

6. **Localização existe mas é ad-hoc.** Campo de localização estruturado e livre
   (ex.: `Quarto 1 · Estante B · Prateleira 3` ou `Caixa 14`), editável em dois
   cliques, com atalho para "atribuir mesma localização ao próximo livro" (fluxo
   de catalogação em lote físico).

7. **Modelo de dados deve reservar futuro.** Incluir desde o dia 1 campos como
   `status` (enum: `na_estante`, `emprestado`, `lido`, `wishlist`), timestamps e
   um id de usuário — adicionar empréstimos/estatísticas depois não exigirá migração.

## Abordagens consideradas

### Produto / escopo
- **Catálogo puro (estilo Libib)** — rejeitado: foco é achar, não catalogar.
- **Planilha/CSV** — rejeitado: sem busca boa, sem capas, sem UX; o usuário
  quer um app próprio.
- **App pronto (Goodreads/Libib/LibraryThing)** — descartado por opção do usuário;
  usar apenas como baseline de validação de features.
- **Shelf-locator focado (escolhido):** busca instantânea (título/autor) → detalhe
  com localização. Grid de capas como visão principal, no estilo Calibre.

### Stack
- **Escolhida:** React + Vite, GitHub Pages, Firebase (Firestore + Auth).
- Alternativas avaliadas:
  - **Firebase Hosting** (mesmo fornecedor, resolve o 404 de SPA nativamente) —
    mas o usuário pediu explicitamente GitHub Pages.
  - **Netlify / Cloudflare Pages** — amigáveis a SPA, mas fora do pedido.

### Fonte de metadados
- **Google Books API (primária):** chave de API gratuita, **CORS liberado**
  (funciona 100% client-side), melhor cobertura de títulos em português.
- **OpenLibrary API (fallback):** sem chave, gratuita, mas a comunidade reporta
  **cobertura fina de livros em português** (issue oficial de importação de
  catálogo BR aberta em 2026) — não confiar como fonte única.
- Fluxo: busca no Google Books → se vazio, OpenLibrary → se ambos vazios,
  cadastro manual mínimo.
- Futuro: importar `metadata.db` do Calibre (o usuário o usa como modelo) como
  rota de importação em massa.

### Busca/texto
- Firestore não tem full-text nativo. Com 600 livros (~200–400 KB no total),
  a melhor abordagem é **carregar tudo uma vez e filtrar em memória** no cliente:
  busca instantânea, sem custo de leitura por tecla.
- Algolia/Typesense seriam over-engineering para este volume.

### Roteamento (GitHub Pages)
1. **Sem roteamento + modal de detalhe** (mais simples, recomendado para MVP).
2. **HashRouter** se um link fixo por livro for desejado.
3. Truque `404.html` copiando `index.html` — hacky, evita-se.

## Próximos passos

1. **Confirmar a stack:** Vite + React, criar projeto Firebase (Spark) e repositório
   GitHub Pages. Testar o pipeline de deploy (GitHub Actions → `gh-pages`) com um
   "hello world".
2. **Validar a API de metadados:** pegar uma amostra de ~20 livros reais (títulos BR)
   e medir taxa de acerto Google Books vs OpenLibrary antes de codar a integração.
3. **Definir o modelo de dados:** coleção `books` (título, autores[], isbn, editora,
   ano, capa, `location`, `status`, timestamps); regras de segurança com UID único.
4. **Projetar o fluxo de entrada:** digitar título → autocomplete → pick →
   atribuir localização → próximo. Atalho "repetir localização do livro anterior"
   para catalogação física em lote.
5. **MVP (fatia mais estreita):** busca + adicionar livro + atribuir localização +
   tela de detalhe. Nada mais.
6. **Validar com o usuário** cadastrando 20–30 livros reais; medir tempo por livro.
   Só então massificar os 600.
7. **Depois do MVP:** importação do Calibre, empréstimos, status de leitura,
   wishlist, estatísticas da coleção.

## Validação das APIs de metadados (testada em 04/08/2026)

### Google Books API
- **Sem chave de API → HTTP 429** ("Quota exceeded", quota anônima compartilhada já esgotada).
  Ou seja: **chave gratuita é obrigatória** (Google Cloud Console, custa R$ 0).
- Com chave: endpoint `volumes` funciona client-side (CORS liberado), rápido e estável.
- Decisão: **fonte primária**, com chave de API própria.

### OpenLibrary API
- Funciona **sem chave**, mas com ressalvas medidas na prática:
  - **Busca** (`search.json`) nem sempre traz ISBN no doc retornado; precisa de uma
    **segunda chamada** para metadados ricos.
  - **Latência alta e variável**: respostas levaram até 30s+ nesta rede, com falhas
    intermitentes e respostas HTML de erro. Em produção (rede do usuário) tende a
    melhorar, mas continua sendo o endpoint menos confiável.
  - Fluxo validado: `search.json` → `cover_edition_key` → `/books/{key}.json` →
    `isbn_13`, editora, ano e capa (`https://covers.openlibrary.org/b/id/{id}-M.jpg`).
- Decisão: **fallback** quando o Google Books não achar o título (livros BR menos
  comuns ou capas alternativas).

### Conclusão prática
- Arquitetura de busca: **Google Books primeiro → OpenLibrary como fallback →
  cadastro manual mínimo** se ambos falharem.
- Custo de implementação baixo: as duas são APIs HTTP GET com JSON; a chave do
  Google fica em `VITE_` env (client-side, sem segredo real — limites controlam uso).

## Decisões abertas
- Localização granular por "prateleira" ou só por "estante/caixa"? (usuário disse
  que tem esquema próprio — definir o formato do campo junto com ele).
- A busca acontece no desktop (resposta dada), mas o celular deve funcionar
  minimamente para consulta na estante? (responsividade barata com React — fazer).
