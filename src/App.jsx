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
  const cover = book.cover?.medium || book.cover?.small
  return cover ? (
    <img className="book-cover" src={cover} alt="" loading="lazy" />
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

function SearchView({ lastLocation, onAdded }) {
  const [query, setQuery] = useState('')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [warning, setWarning] = useState(null)
  const [searched, setSearched] = useState(false)
  const [addingIsbn, setAddingIsbn] = useState(null)

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

  return (
    <section>
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

      {!searched && !loading && (
        <p className="hint">Digite um título ou autor e busque os metadados.</p>
      )}
      {searched && !loading && items.length === 0 && !warning && (
        <p className="hint">Nenhum resultado.</p>
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
                  lastLocation={lastLocation}
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

function FindView({ books, loading, editable }) {
  const [filter, setFilter] = useState('')

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

  if (loading) return <p className="hint">Carregando estante…</p>

  return (
    <section className="find">
      <h2 className="find-title">Onde está o livro?</h2>
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

      {filtered.map((book) => (
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
        <Header />
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

  return (
    <div className="app">
      <Header>
        {user ? (
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
        )}
      </Header>

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
        </nav>
      )}

      {!isAdmin ? (
        <FindView books={shelf} loading={shelfLoading} editable={false} />
      ) : tab === 'encontrar' ? (
        <FindView books={shelf} loading={shelfLoading} editable />
      ) : (
        <SearchView lastLocation={lastLocation} onAdded={setLastLocation} />
      )}
    </div>
  )
}

function Header({ children }) {
  return (
    <header className="header">
      <div>
        <h1>Estante</h1>
        <p className="tagline">Willy Garabini Cornelissen</p>
      </div>
      {children}
    </header>
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
