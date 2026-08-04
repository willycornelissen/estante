# Estante — Descrição da Interface

> Observações para recriar esta interface em outra plataforma (ex.: React).

## Visão geral

Aplicativo **dark, single-user, tipo "galeria de estante"**. Stack atual: Rails servidor-renderizado + Hotwire (Turbo + Stimulus) + **Tailwind CSS**. Toda a UI é construída com utilitários Tailwind — não há CSS custom. Paleta em torno do `stone` (cinza-marfim) com acento **âmbar**. Fonte serifada para títulos (`font-serif`), sans para o resto.

## Identidade visual

- **Cores de fundo**: `bg-stone-950` (quase preto) no corpo; superfícies elevadas `bg-stone-900` e `bg-stone-800`; bordas `border-stone-700`/`border-stone-800`.
- **Texto:** primário `text-stone-100`, secundário `text-stone-300`, terciário/placeholders `text-stone-400`.
- **Acento:** `amber-500` (botões principais, logo, estrelas, label "mais recente"), hover `amber-400`.
- **Erro:** vermelho (`text-red-*`, `bg-red-900/50`). **Sucesso/flash:** `emerald-900/60`.
- **Tipografia:** logotipo e títulos usam serifa (`font-serif`, bold, `tracking-tight`). Tamanhos: hero `text-3xl md:text-5xl`, páginas `text-3xl`, detalhe `text-3xl md:text-4xl`.
- **Cantos:** `rounded-lg` para cards/botões, `rounded-3xl` para o hero, `rounded-full` para badges/pills.
- **Layout:** container centrado `max-w-6xl mx-auto px-4`; páginas de formulário/detalhe usam `max-w-xl`/`max-w-4xl`.

## Estrutura / Layout

**1. Header (sticky, `sticky top-0 z-10`, translúcido `bg-stone-950/70` + `backdrop-blur`, linha inferior `border-b border-stone-800`)**
- Esquerda: logo `Estante.` (com o ponto em `text-amber-500`).
- Direita: botão **"Adicionar livro"** (`bg-amber-500 text-stone-950`).

**2. Flash/notice** — barra fina full-width `bg-emerald-900/60` quando houver notice.

## Página principal (index)

**Hero — livro mais recente** (`min-h-[22rem] rounded-3xl`, `flex items-end`, `mb-10`):
- Fundo tingido pela **cor dominante da capa** (CSS `background-color` + imagem de fundo `opacity-40 blur-3xl scale-110`).
- Camada de gradiente `from-stone-950 via-stone-950/40 to-transparent` de baixo para cima para legibilidade.
- Conteúdo (row no desktop, coluna no mobile):
  - Capa grande (`w-36 md:w-48`, `rounded-xl shadow-2xl`).
  - Label uppercase `Livro mais recente` em `text-amber-400`.
  - Título grande serif + autor.
  - Linha com **badge de status** + **estrelas**.
  - Botões **"Editar"** e **"Remover"** (ghost `bg-white/10 border-white/20`; Remover em `text-red-300`).

**Empty state** (sem livros): centralizado, título `Sua estante está vazia`, texto secundário, CT *Adicionar livro* âmbar.

**Barra de ferramentas** (row quebra em coluna no mobile, `sm:items-center`, `mb-6`):
- **Busca** (input `type=search`, placeholder `"Buscar por título, autor ou ISBN…"` + botão Buscar cinza-claro `bg-stone-200`).
- **Filtros status** como pills: `Todos | Não lidos | Lendo | Lidos`. O ativo = `bg-amber-500 border-amber-500 text-stone-950 font-semibold`; inativos `border-stone-700`.

**Contador:** `pluralize(@total, "livro")` em `text-stone-400`.

**Grade de capas:** `grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-4`. Cada item é um link `group block` na página de detalhe, com capa `rounded-xl shadow-lg` e efeito on-hover `group-hover:scale-103` + `shadow-2xl`.

**Capa sem imagem (placeholder):** div `aspect-[2/3] bg-stone-800` com o título em `text-stone-400`, centralizado, `line-clamp-3`.

**Paginação** (centrada, `gap-4`, só das bordas `border-stone-700`): "← Anteriores" e "Mais livros →" quando houver.

## Componentes de estado (badges/estrelas)

- **Status badge** (pill uppercase `text-xs tracking-wide rounded-full px-3 py-1`):
  - `unread` → `bg-stone-700 text-stone-200`
  - `reading` → `bg-amber-600 text-stone-950`
  - `finished` → `bg-emerald-700 text-stone-100`
- **Avaliação:** `★` repetidas + `☆` até 5 em `text-amber-400`; `Sem nota` quando 0.

## Formulário (nova página "Adicionar livro")

Página `max-w-xl mx-auto`:
- **Busca por ISBN** no topo: input (`bg-stone-800`, `border-stone-700`) + botão Buscar cinza-claro. Placeholder `"978-3-16-148410-0"`.
- **Mensagem** de ISBN inválido (`text-red-400`) ou não encontrado (`text-amber-400`).
- **Formulário** de campos full-width:
  - Inputs: Título, Autor (`bg-stone-800 border-stone-700`, foco `border-amber-500`).
  - Dois selects lado a lado: **Status** e **Rating**.
  - Layout em 2 colunas quando há prévia de capa (`flex gap-6`; capa `w-36`, thumbnail `rounded`).
  - Botão submit full-width âmbar: **"Adicionar à estante"** (ou `Salvar alterações`).
- **Erros:** card `rounded bg-red-900/50 border-red-700` com lista.

## Página de detalhe

`max-w-4xl mx-auto`, link "← Voltar à estante" (`text-stone-400`).
- Row: capa `w-48 md:w-64 rounded-sm shadow-2xl` à esquerda; à direita:
  - Título serif grande + autor.
  - Badge de status + estrelas.
  - `<dl>` com **ISBN**, **Começou**, **Terminou**, **Adicionado em** (`dt text-stone-400`).
  - Botões **Editar** (âmbar sólido) e **Remover** (ghost, `text-red-300`).

## Ações CRUD

- **Editar** e **Remover** existem no hero, na página de detalhe e na edição.
- Remover tem um **treplay de confirmação** (`confirm: "Remover este livro da estante?"`).

## Observações para portar para React

1. A versão atual **não tem login/nav lateral** — é única página-scroll + sub-rotas simples (`/`, `/books/new`, `/books/:id`, `/books/:id/edit`). Em React, use um `<Router>` com 4 rotas e compartilhe o layout (header + container).
2. O "hero" é derivado do primeiro/mais recente item da lista — num componente, puxe `dataset.latest` separado.
3. A cor da capa (`dominant_color`) vem do backend; em React, ou receba do JSON da API ou calcule no client.
4. Todas as classes Tailwind acima migram 1:1 como `className`.
5. Busca + filtros mudam só o query string (`status`, `q`, `page`) e re-renderizam a lista — no React, pondere usar `URLSearchParams` para manter o estado na URL e permitir voltar.