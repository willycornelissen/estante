import { useEffect, useMemo, useState } from 'react'
import { searchBooks } from './lib/metadata'
import { auth } from './lib/firebase'
import { onAuthChange, signIn, signOut } from './lib/auth'
import {
  addBook,
  deleteBook,
  subscribeBooks,
  updateLocation,
  updateTags,
} from './lib/books'
import './App.css'

function Cover({ book }) {
  const cleanIsbn = book.isbn ? book.isbn.replace(/[^0-9Xx]/g, '') : null

  // Calcula o ISBN-10 para a Amazon
  const isbn10 = useMemo(() => {
    if (!cleanIsbn) return null
    if (cleanIsbn.length === 10) return cleanIsbn
    if (cleanIsbn.length === 13 && cleanIsbn.startsWith('978')) {
      const core = cleanIsbn.slice(3, 12)
      let sum = 0
      for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i])
      const rem = sum % 11
      const check = rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem)
      return core + check
    }
    return null
  }, [cleanIsbn])

  const amazonUrl = isbn10
    ? `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`
    : null

  const googleUrl = cleanIsbn
    ? `https://books.google.com/books/content?vid=ISBN${cleanIsbn}&printsec=frontcover&img=1&zoom=1`
    : null

  // Estado que armazena a URL ativa da capa
  const [src, setSrc] = useState(book.cover?.medium || book.cover?.small || amazonUrl || googleUrl)

  // Sincroniza o src caso as propriedades mudem
  useEffect(() => {
    setSrc(book.cover?.medium || book.cover?.small || amazonUrl || googleUrl)
  }, [book.cover, amazonUrl, googleUrl])

  // Lida com falhas de carregamento ou imagens vazias
  function handleImageError() {
    if (src === amazonUrl && googleUrl) {
      setSrc(googleUrl)
    } else {
      setSrc(null)
    }
  }

  // Verifica se a imagem carregada da Amazon é o GIF transparente de 1x1 pixel (que tem largura 1 e altura 1)
  function handleImageLoad(e) {
    const img = e.target
    if (src === amazonUrl && img.naturalWidth === 1 && img.naturalHeight === 1) {
      // Se for a imagem padrão transparente de 1x1 da Amazon, muda para o Google Books
      if (googleUrl) {
        setSrc(googleUrl)
      } else {
        setSrc(null)
      }
    }
  }

  return src ? (
    <img
      className="book-cover"
      src={src}
      alt=""
      loading="lazy"
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  ) : (
    <div className="book-cover book-cover-placeholder">Sem capa</div>
  )
}

function Meta({ book }) {
  return (
    <>
      <h3 className="book-title">{book.title}</h3>
      {book.subtitle && <p className="book-subtitle">{book.subtitle}</p>}
      {book.authors.length > 0 && (
        <p className="book-authors">{book.authors.join(', ')}</p>
      )}
      <p className="book-meta">
        {book.publisher && <span>{book.publisher}</span>}
        {book.publishedDate && <span> · {book.publishedDate}</span>}
        {book.language && <span> · {book.language}</span>}
      </p>
      {book.isbn && <p className="book-meta">ISBN {book.isbn}</p>}
    </>
  )
}

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(
        err.code === 'auth/invalid-credential'
          ? 'E-mail ou senha incorretos.'
          : 'Falha na autenticação.'
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="login" onSubmit={handleSubmit}>
      <h2>Entrar</h2>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="E-mail"
        autoComplete="email"
      />
      <input
        type="password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Senha"
        autoComplete="current-password"
      />
      {error && <p className="warning">{error}</p>}
      <button type="submit" disabled={busy}>
        {busy ? 'Aguarde…' : 'Entrar'}
      </button>
    </form>
  )
}

function AddForm({ lastLocation, onSave, onCancel }) {
  const [location, setLocation] = useState(lastLocation || '')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        location,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      onCancel()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="add-form" onSubmit={handleSubmit}>
      <p className="add-hint">Onde ele está fisicamente?</p>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Ex.: Quarto 1 · Estante B · Prateleira 3"
        autoFocus
      />
      <p className="add-hint">Tags (separadas por vírgula)</p>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Ex.: ficção, sci-fi, favorito"
      />
      {error && <p className="warning">{error}</p>}
      <div className="add-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Adicionar à estante'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function ManualForm({ lastLocation, onSave, onCancel }) {
  const [title, setTitle] = useState('')
  const [author, setAuthor] = useState('')
  const [location, setLocation] = useState(lastLocation || '')
  const [tags, setTags] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await onSave({
        title: title.trim(),
        author: author.trim(),
        location,
        tags: tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
      })
      onCancel()
    } catch (err) {
      setError(err.message)
      setBusy(false)
    }
  }

  return (
    <form className="add-form manual-form" onSubmit={handleSubmit}>
      <p className="add-hint">Título *</p>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Título do livro"
        required
        autoFocus
      />
      <p className="add-hint">Autor *</p>
      <input
        value={author}
        onChange={(e) => setAuthor(e.target.value)}
        placeholder="Autor do livro"
        required
      />
      <p className="add-hint">Onde ele está fisicamente?</p>
      <input
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        placeholder="Ex.: Quarto 1 · Estante B · Prateleira 3"
      />
      <p className="add-hint">Tags (separadas por vírgula)</p>
      <input
        value={tags}
        onChange={(e) => setTags(e.target.value)}
        placeholder="Ex.: ficção, sci-fi, favorito"
      />
      {error && <p className="warning">{error}</p>}
      <div className="add-actions">
        <button type="submit" disabled={busy}>
          {busy ? 'Salvando…' : 'Adicionar à estante'}
        </button>
        <button type="button" className="ghost" onClick={onCancel}>
          Cancelar
        </button>
      </div>
    </form>
  )
}

function SearchView({ lastLocation, onAdded, actions }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState(null)
  const [searched, setSearched] = useState(false)
  const [addingIsbn, setAddingIsbn] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setWarning(null)
    const result = await searchBooks(query)
    setItems(result.items)
    setWarning(result.warning)
    setSearched(true)
    setLoading(false)
  }

  async function handleSave(book, location, tags) {
    await addBook({
      title: book.title,
      subtitle: book.subtitle,
      authors: book.authors,
      publisher: book.publisher,
      publishedDate: book.publishedDate,
      isbn: book.isbn,
      pageCount: book.pageCount,
      language: book.language,
      cover: book.cover,
      source: book.source,
      location,
      tags,
    })
    onAdded(location)
  }

  async function handleManualSave(book) {
    await addBook({
      title: book.title,
      authors: [book.author],
      location: book.location,
      tags: book.tags,
    })
    onAdded(book.location)
  }

  return (
    <section>
      <div className="find-head">
        <div className="find-actions">{actions}</div>
      </div>
      <form className="search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar livro por título, autor ou ISBN…"
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
        <button
          type="button"
          onClick={() => setManualOpen((v) => !v)}
        >
          {manualOpen ? 'Fechar' : 'Manual'}
        </button>
      </form>

      {manualOpen && (
        <ManualForm
          lastLocation={lastLocation}
          onSave={handleManualSave}
          onCancel={() => setManualOpen(false)}
        />
      )}

      {warning && <p className="warning">{warning}</p>}

      {!searched && !loading && (
        <p className="hint">Digite um título ou autor e busque os metadados.</p>
      )}
      {searched && !loading && items.length === 0 && !warning && (
        <p className="hint">Não foi encontrado nenhum livro.</p>
      )}

      {items.map((book, i) => {
        const key = `${book.source}-${book.isbn || i}`
        const isAdding = addingIsbn === key
        return (
          <article className="book-card" key={key}>
            <Cover book={book} />
            <div className="book-info">
              <Meta book={book} />
              {!isAdding ? (
                <button
                  className="add-btn"
                  onClick={() => setAddingIsbn(key)}
                >
                  + Adicionar à estante
                </button>
              ) : (
                <AddForm
                  lastLocation=""
                  onSave={({ location, tags }) => handleSave(book, location, tags)}
                  onCancel={() => setAddingIsbn(null)}
                />
              )}
            </div>
          </article>
        )
      })}
    </section>
  )
}

function LocationEditor({ book }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(book.location || '')

  async function handleSave(e) {
    e.preventDefault()
    await updateLocation(book.id, value.trim())
    setEditing(false)
  }

  if (!editing) {
    return (
      <p className="book-location">
        📍 <span className="location-value">{book.location || 'Sem localização'}</span>
        <button className="link" onClick={() => setEditing(true)}>
          {book.location ? 'Editar' : 'Definir'}
        </button>
      </p>
    )
  }
  return (
    <form className="location-edit" onSubmit={handleSave}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ex.: Caixa 14"
        autoFocus
      />
      <button type="submit">Salvar</button>
      <button type="button" className="ghost" onClick={() => setEditing(false)}>
        Cancelar
      </button>
    </form>
  )
}

function TagEditor({ book }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState((book.tags || []).join(', '))

  async function handleSave(e) {
    e.preventDefault()
    await updateTags(
      book.id,
      value
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean)
    )
    setEditing(false)
  }

  if (!editing) {
    return (
      <p className="book-location">
        🏷️{' '}
        <span className="location-value">
          {book.tags?.length > 0 ? book.tags.join(', ') : 'Sem tags'}
        </span>
        <button className="link" onClick={() => setEditing(true)}>
          Editar
        </button>
      </p>
    )
  }
  return (
    <form className="location-edit" onSubmit={handleSave}>
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ex.: ficção, sci-fi, favorito"
        autoFocus
      />
      <button type="submit">Salvar</button>
      <button type="button" className="ghost" onClick={() => setEditing(false)}>
        Cancelar
      </button>
    </form>
  )
}

const PAGE_SIZE = 20

function FindView({ books, loading, editable, actions }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return books
    return books.filter(
      (b) =>
        b.title?.toLowerCase().includes(q) ||
        b.authors?.some((a) => a.toLowerCase().includes(q)) ||
        (b.isbn || '').toLowerCase().includes(q) ||
        b.tags?.some((t) => t.toLowerCase().includes(q)) ||
        b.location?.toLowerCase().includes(q)
    )
  }, [books, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)

  useEffect(() => {
    setPage(1)
  }, [filter])

  function resetFilter() {
    setFilter('')
  }

  if (loading) return <p className="hint">Carregando estante…</p>

  const pageItems = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  )

  return (
    <section className="find">
      <div className="find-head">
        <h2 className="find-title">Onde está o livro?</h2>
        <div className="find-actions">{actions}</div>
      </div>
      <form className="search search-big" onSubmit={(e) => e.preventDefault()}>
        <input
          type="search"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por título, autor, ISBN, tag ou localização…"
          autoFocus
        />
      </form>
      {books.length > 0 && (
        <p className="find-count">
          {filtered.length === books.length
            ? `${books.length} livros`
            : `${filtered.length} de ${books.length} livros`}
        </p>
      )}

      {books.length === 0 && (
        <p className="hint">
          {editable ? (
            <>
              Estante vazia. Vá na aba <strong>Adicionar</strong> para catalogar
              os primeiros livros.
            </>
          ) : (
            'Estante vazia.'
          )}
        </p>
      )}

      {filter.trim() && (
        <button className="link" onClick={resetFilter}>
          Limpar busca
        </button>
      )}

      {pageItems.map((book) => (
        <article className="book-card" key={book.id}>
          <Cover book={book} />
          <div className="book-info">
            <Meta book={book} />
            {editable ? (
              <TagEditor book={book} />
            ) : (
              book.tags?.length > 0 && (
                <p className="book-tags">
                  {book.tags.map((tag) => (
                    <span className="tag" key={tag}>
                      {tag}
                    </span>
                  ))}
                </p>
              )
            )}
            {editable ? (
              <LocationEditor book={book} />
            ) : (
              book.location && (
                <p className="book-location">
                  📍 <span className="location-value">{book.location}</span>
                </p>
              )
            )}
            {editable && (
              <button className="ghost danger" onClick={() => deleteBook(book.id)}>
                Remover
              </button>
            )}
          </div>
        </article>
      ))}

      {totalPages > 1 && (
        <nav className="pagination">
          <button
            className="ghost"
            onClick={() => setPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            ← Anterior
          </button>
          <span className="pagination-page">
            Página {currentPage} de {totalPages}
          </span>
          <button
            className="ghost"
            onClick={() => setPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Próxima →
          </button>
        </nav>
      )}
    </section>
  )
}

function csvCell(value) {
  const s = Array.isArray(value) ? value.join('; ') : value
  if (s == null) return ''
  const str = String(s)
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function buildCsv(books) {
  const headers = [
    'titulo',
    'subtitulo',
    'autores',
    'editora',
    'data_publicacao',
    'isbn',
    'paginas',
    'idioma',
    'fonte',
    'localizacao',
    'tags',
    'status',
  ]
  const rows = books.map((b) =>
    headers
      .map((h) => {
        switch (h) {
          case 'titulo':
            return csvCell(b.title)
          case 'subtitulo':
            return csvCell(b.subtitle)
          case 'autores':
            return csvCell(b.authors)
          case 'editora':
            return csvCell(b.publisher)
          case 'data_publicacao':
            return csvCell(b.publishedDate)
          case 'isbn':
            return csvCell(b.isbn)
          case 'paginas':
            return csvCell(b.pageCount)
          case 'idioma':
            return csvCell(b.language)
          case 'fonte':
            return csvCell(b.source)
          case 'localizacao':
            return csvCell(b.location)
          case 'tags':
            return csvCell(b.tags)
          case 'status':
            return csvCell(b.status)
          default:
            return ''
        }
      })
      .join(',')
  )
  return [headers.join(','), ...rows]
    .join('\n')
    .replace(/^\uFEFF/, '')
}

function ExportView({ books, loading }) {
  const [done, setDone] = useState(false)

  function handleDownload() {
    const csv = buildCsv(books)
    const blob = new Blob(['\uFEFF' + csv], {
      type: 'text/csv;charset=utf-8;',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `estante-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    setDone(true)
  }

  if (loading) return <p className="hint">Carregando estante…</p>

  return (
    <section className="export">
      <h2 className="find-title">Exportar estante</h2>
      <p className="add-hint">
        Gera um arquivo CSV com todos os {books.length}
        {books.length === 1 ? ' livro ' : ' livros '}
        catalogados.
      </p>
      <button
        className="add-btn"
        onClick={handleDownload}
        disabled={books.length === 0}
      >
        Baixar CSV
      </button>
      {books.length > 0 && done && (
        <p className="hint done">Arquivo CSV gerado e baixado.</p>
      )}
    </section>
  )
}

const ADMIN_EMAIL =
  import.meta.env.VITE_ADMIN_EMAIL || 'willy.cornelissen@gmail.com'

function App() {
  const [firebaseReady, setFirebaseReady] = useState(false)
  const [user, setUser] = useState(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [showLogin, setShowLogin] = useState(false)
  const [tab, setTab] = useState('encontrar')
  const [shelf, setShelf] = useState([])
  const [shelfLoading, setShelfLoading] = useState(false)
  const [lastLocation, setLastLocation] = useState('')

  useEffect(() => {
    setFirebaseReady(!!auth)
  }, [])

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false)
      return
    }
    const unsub = onAuthChange((u) => {
      setUser(u)
      setShowLogin(false)
      setAuthLoading(false)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!firebaseReady) {
      setShelf([])
      return
    }
    setShelfLoading(true)
    const unsub = subscribeBooks((books) => {
      setShelf(books)
      setShelfLoading(false)
    })
    return unsub
  }, [firebaseReady])

  if (!firebaseReady) {
    return (
      <div className="app">
        <Hero />
        <p className="warning">
          Firebase não configurado: a busca de metadados funciona, mas salvar
          livros requer o `.env` preenchido.
        </p>
        <SearchOnly />
      </div>
    )
  }

  if (authLoading) return <p className="hint">Carregando…</p>

  const isAdmin = !!user && user.email === ADMIN_EMAIL

  const authActions = user ? (
    <>
      <span className="header-user">{user.email}</span>
      <button className="ghost" onClick={signOut}>
        Sair
      </button>
    </>
  ) : (
    <button className="ghost" onClick={() => setShowLogin((v) => !v)}>
      {showLogin ? 'Fechar' : 'Entrar'}
    </button>
  )

  return (
    <div className="app">
      <Hero />

      {!user && showLogin && <LoginForm />}

      {isAdmin && (
        <nav className="tabs">
          <button
            className={tab === 'encontrar' ? 'tab active' : 'tab'}
            onClick={() => setTab('encontrar')}
          >
            Encontrar
          </button>
          <button
            className={tab === 'adicionar' ? 'tab active' : 'tab'}
            onClick={() => setTab('adicionar')}
          >
            Adicionar
          </button>
          <button
            className={tab === 'exportar' ? 'tab active' : 'tab'}
            onClick={() => setTab('exportar')}
          >
            Exportar
          </button>
        </nav>
      )}

      {!isAdmin ? (
        <FindView
          books={shelf}
          loading={shelfLoading}
          editable={false}
          actions={authActions}
        />
      ) : tab === 'encontrar' ? (
        <FindView
          books={shelf}
          loading={shelfLoading}
          editable
          actions={authActions}
        />
      ) : tab === 'exportar' ? (
        <ExportView books={shelf} loading={shelfLoading} />
      ) : (
        <SearchView
          lastLocation={lastLocation}
          onAdded={setLastLocation}
          actions={authActions}
        />
      )}
    </div>
  )
}

function Hero() {
  return (
    <section className="hero">
      <img
        className="hero-bg"
        src={`${import.meta.env.BASE_URL}hero-shelf.svg`}
        alt=""
      />
      <div className="hero-content">
        <p className="hero-label">Biblioteca pessoal</p>
        <h2 className="hero-title">
          Estante<span className="hero-dot">.</span>
        </h2>
        <p className="hero-tagline">
          A biblioteca pessoal de{' '}
          <strong>Willy Garabini Cornelissen</strong>
        </p>
      </div>
    </section>
  )
}

function SearchOnly() {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setWarning(null)
    const result = await searchBooks(query)
    setItems(result.items)
    setWarning(result.warning)
    setLoading(false)
  }

  return (
    <>
      <form className="search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar livro por título, autor ou ISBN…"
          autoFocus
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando…' : 'Buscar'}
        </button>
      </form>
      {warning && <p className="warning">{warning}</p>}
      {items.map((book, i) => (
        <article className="book-card" key={`${book.source}-${i}`}>
          <Cover book={book} />
          <div className="book-info">
            <Meta book={book} />
          </div>
        </article>
      ))}
    </>
  )
}

export default App
