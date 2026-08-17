// Busca de metadados de livros: Google Books primeiro, OpenLibrary como fallback.
// Ambas são APIs HTTP GET com JSON e funcionam sem chave; a chave do Google Books
// (VITE_GOOGLE_BOOKS_API_KEY), quando configurada, só aumenta a cota diária.

const OL_COVER = (id, size) =>
  `https://covers.openlibrary.org/b/id/${id}-${size}.jpg`

function mapGoogle(item) {
  const v = item.volumeInfo || {}
  const ids = v.industryIdentifiers || []
  const isbn13 = ids.find((i) => i.type === 'ISBN_13')?.identifier
  const isbn10 = ids.find((i) => i.type === 'ISBN_10')?.identifier
  const img = v.imageLinks || {}
  return {
    source: 'google',
    title: v.title,
    subtitle: v.subtitle,
    authors: v.authors || [],
    publisher: v.publisher,
    publishedDate: v.publishedDate,
    isbn: isbn13 || isbn10 || null,
    pageCount: v.pageCount,
    categories: v.categories || [],
    language: v.language,
    description: v.description || null,
    cover: {
      small: img.smallThumbnail || img.thumbnail || null,
      medium: img.thumbnail || img.smallThumbnail || null,
      large: img.large || null,
    },
  }
}

function mapOpenLibrary(doc) {
  const subjects = Array.isArray(doc.subject) ? doc.subject : []
  return {
    source: 'openlibrary',
    title: doc.title,
    subtitle: doc.subtitle,
    authors: doc.author_name || [],
    publisher: (doc.publisher || [])[0],
    publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : '',
    isbn: (doc.isbn || [])[0] || null,
    pageCount: doc.number_of_pages_median,
    categories: subjects.slice(0, 3),
    language: (doc.language || []).join(', ') || null,
    description: typeof doc.description === 'string' ? doc.description : (doc.description?.value || null),
    cover: doc.cover_i
      ? {
          small: OL_COVER(doc.cover_i, 'S'),
          medium: OL_COVER(doc.cover_i, 'M'),
          large: OL_COVER(doc.cover_i, 'L'),
        }
      : null,
  }
}

function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

const STOPWORDS = new Set([
  'de', 'do', 'da', 'dos', 'das', 'e', 'o', 'a', 'os', 'as',
  'em', 'um', 'uma', 'and', 'the', 'of', 'by', 'to', 'for', 'in', 'on', 'at'
])

function authorMatchesQuery(author, normQ) {
  if (!author) return false
  const normAuthor = normalize(author)
  const qWords = normQ.split(' ').filter(w => w.length > 1 && !STOPWORDS.has(w))
  if (qWords.length === 0) return false
  return qWords.every((word) => normAuthor.includes(word))
}

function parseSearchQuery(query) {
  const trimmed = (query || '').trim()

  // Check for author: / autor: / inauthor:
  const authorMatch = trimmed.match(/^(autor|author|inauthor)\s*:\s*(.+)$/i)
  if (authorMatch) {
    return {
      type: 'author',
      value: authorMatch[2].trim()
    }
  }

  // Check for titulo: / title: / intitle:
  const titleMatch = trimmed.match(/^(titulo|title|intitle)\s*:\s*(.+)$/i)
  if (titleMatch) {
    return {
      type: 'title',
      value: titleMatch[2].trim()
    }
  }

  // Check for isbn:
  const isbnMatch = trimmed.match(/^(isbn)\s*:\s*(.+)$/i)
  if (isbnMatch) {
    return {
      type: 'isbn',
      value: isbnMatch[2].trim()
    }
  }

  // Auto-detect raw ISBN (10 or 13 digits, optionally with hyphens or spaces, optionally ending in X/x)
  const cleanIsbn = trimmed.replace(/[^0-9Xx]/g, '')
  if ((cleanIsbn.length === 10 || cleanIsbn.length === 13) && /^[0-9Xx\s-]+$/.test(trimmed)) {
    return {
      type: 'isbn',
      value: cleanIsbn
    }
  }

  return {
    type: 'general',
    value: trimmed
  }
}

function filterByAuthorHeuristic(items, parsed) {
  if (parsed.type !== 'general') return items

  const normQ = normalize(parsed.value)
  if (!normQ) return items

  const qWords = normQ.split(' ').filter(w => w.length > 1 && !STOPWORDS.has(w))
  if (qWords.length < 2) return items

  // Check if any item has an author that matches the query
  const hasAuthorMatch = items.some((item) =>
    (item.authors || []).some((author) => authorMatchesQuery(author, normQ))
  )

  if (hasAuthorMatch) {
    // Keep only the items that have a matching author
    return items.filter((item) =>
      (item.authors || []).some((author) => authorMatchesQuery(author, normQ))
    )
  }

  return items
}

function isbn13Check(digits) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (sum % 10)) % 10)
}

function isbn10Check(digits) {
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(digits[i])
  const rem = sum % 11
  return rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem)
}

function alternateIsbn(digits) {
  if (digits.length === 10) {
    const core = digits.slice(0, 9)
    return '978' + core + isbn13Check('978' + core)
  }
  if (digits.length === 13 && digits.startsWith('978')) {
    const core = digits.slice(3, 12)
    return core + isbn10Check(core)
  }
  return null
}

async function searchGoogleBooks(parsed) {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY

  let apiQuery = ''
  if (parsed.type === 'author') {
    apiQuery = `inauthor:"${parsed.value}"`
  } else if (parsed.type === 'title') {
    apiQuery = `intitle:"${parsed.value}"`
  } else if (parsed.type === 'isbn') {
    apiQuery = `isbn:${parsed.value}`
  } else {
    apiQuery = parsed.value
  }

  // ISBN é identificador exato: sem country=BR para não filtrar edições
  // sem direitos de venda no Brasil (ex.: edições portuguesas).
  let url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(apiQuery)}&maxResults=10`
  if (parsed.type !== 'isbn') url += '&country=BR'
  if (key) url += `&key=${key}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, reason: `http-${res.status}`, items: [] }
  const data = await res.json()
  return { ok: true, items: (data.items || []).map(mapGoogle) }
}

async function searchOpenLibrary(parsed) {
  let url = ''
  if (parsed.type === 'author') {
    url = `https://openlibrary.org/search.json?author=${encodeURIComponent(parsed.value)}&limit=10`
  } else if (parsed.type === 'title') {
    url = `https://openlibrary.org/search.json?title=${encodeURIComponent(parsed.value)}&limit=10`
  } else if (parsed.type === 'isbn') {
    url = `https://openlibrary.org/search.json?isbn=${encodeURIComponent(parsed.value)}&limit=10`
  } else {
    url = `https://openlibrary.org/search.json?q=${encodeURIComponent(parsed.value)}&limit=10`
  }
  const res = await fetch(url)
  if (!res.ok) return { ok: false, reason: `http-${res.status}`, items: [] }
  const data = await res.json()
  return { ok: true, items: (data.docs || []).map(mapOpenLibrary) }
}

function mapBrasilApi(item) {
  const cleanIsbn = item.isbn ? item.isbn.replace(/[^0-9Xx]/g, '') : null
  
  // Calcula o ISBN-10 para a Amazon
  let isbn10 = null
  if (cleanIsbn) {
    if (cleanIsbn.length === 10) {
      isbn10 = cleanIsbn
    } else if (cleanIsbn.length === 13 && cleanIsbn.startsWith('978')) {
      const core = cleanIsbn.slice(3, 12)
      let sum = 0
      for (let i = 0; i < 9; i++) sum += (10 - i) * Number(core[i])
      const rem = sum % 11
      const check = rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem)
      isbn10 = core + check
    }
  }

  return {
    source: 'brasilapi',
    title: item.title,
    subtitle: item.subtitle || null,
    authors: item.authors || [],
    publisher: item.publisher || null,
    publishedDate: item.year ? String(item.year) : null,
    isbn: item.isbn || null,
    pageCount: item.page_count || null,
    categories: item.subjects || [],
    language: 'pt',
    description: item.synopsis || null,
    cover: item.cover_url
      ? {
          small: item.cover_url,
          medium: item.cover_url,
          large: item.cover_url,
        }
      : (isbn10
          ? {
              small: `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`,
              medium: `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`,
              large: `https://images-na.ssl-images-amazon.com/images/P/${isbn10}.01.LZZZZZZZ.jpg`,
            }
          : (cleanIsbn
              ? {
                  small: `https://books.google.com/books/content?vid=ISBN${cleanIsbn}&printsec=frontcover&img=1&zoom=1`,
                  medium: `https://books.google.com/books/content?vid=ISBN${cleanIsbn}&printsec=frontcover&img=1&zoom=1`,
                  large: `https://books.google.com/books/content?vid=ISBN${cleanIsbn}&printsec=frontcover&img=1&zoom=2`,
                }
              : null)),
  }
}

async function searchBrasilApi(parsed) {
  const isbn = parsed.value.replace(/[^0-9Xx]/g, '')
  if (isbn.length !== 10 && isbn.length !== 13) {
    return { ok: false, reason: 'não é um ISBN', items: [] }
  }
  const url = `https://brasilapi.com.br/api/isbn/v1/${isbn}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, reason: `http-${res.status}`, items: [] }
  const data = await res.json()
  return { ok: true, items: [mapBrasilApi(data)] }
}

export async function searchBooks(query) {
  const parsed = parseSearchQuery(query)
  if (!parsed.value) return { items: [], warning: null }

  const gb = await searchGoogleBooks(parsed)
  if (gb.ok && gb.items.length > 0) {
    const filtered = filterByAuthorHeuristic(gb.items, parsed)
    return { items: filtered, warning: null }
  }

  const ol = await searchOpenLibrary(parsed)
  if (ol.ok && ol.items.length > 0) {
    const filtered = filterByAuthorHeuristic(ol.items, parsed)
    return { items: filtered, warning: null }
  }

  const isbn = parsed.value.replace(/[^0-9Xx]/g, '')
  if (parsed.type === 'isbn' && (isbn.length === 10 || isbn.length === 13)) {
    const alt = alternateIsbn(isbn)

    if (alt && alt !== isbn) {
      const gbAlt = await searchGoogleBooks({ type: 'isbn', value: alt })
      if (gbAlt.ok && gbAlt.items.length > 0) return { items: gbAlt.items, warning: null }

      const olAlt = await searchOpenLibrary({ type: 'isbn', value: alt })
      if (olAlt.ok && olAlt.items.length > 0) return { items: olAlt.items, warning: null }
    }

    // O operador isbn: do Google às vezes não acha o volume, mas a busca
    // geral pelos dígitos encontra; filtra para manter só o ISBN certo.
    const gbLoose = await searchGoogleBooks({ type: 'general', value: isbn })
    if (gbLoose.ok && gbLoose.items.length > 0) {
      const wanted = alt && alt !== isbn ? [isbn, alt] : [isbn]
      const exact = gbLoose.items.filter((b) => {
        const d = (b.isbn || '').replace(/[^0-9Xx]/g, '')
        return wanted.includes(d)
      })
      if (exact.length > 0) return { items: exact, warning: null }
    }

    const br = await searchBrasilApi(parsed)
    if (br.ok && br.items.length > 0) return { items: br.items, warning: null }
  }

  return {
    items: [],
    warning: 'Não foi encontrado nenhum livro.',
  }
}
