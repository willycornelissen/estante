// Busca de metadados de livros: Google Books primeiro, OpenLibrary como fallback.
// Ambas são APIs HTTP GET com JSON; o Google Books exige chave de API gratuita
// (VITE_GOOGLE_BOOKS_API_KEY), o OpenLibrary funciona sem chave.

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
    cover: doc.cover_i
      ? {
          small: OL_COVER(doc.cover_i, 'S'),
          medium: OL_COVER(doc.cover_i, 'M'),
          large: OL_COVER(doc.cover_i, 'L'),
        }
      : null,
  }
}

async function searchGoogleBooks(query) {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
  if (!key) return { ok: false, reason: 'sem chave do Google Books', items: [] }
  const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=10&country=BR&key=${key}`
  const res = await fetch(url)
  if (!res.ok) return { ok: false, reason: `http-${res.status}`, items: [] }
  const data = await res.json()
  return { ok: true, items: (data.items || []).map(mapGoogle) }
}

async function searchOpenLibrary(query) {
  const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=10`
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

async function searchBrasilApi(query) {
  const isbn = query.replace(/[^0-9Xx]/g, '')
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
  const trimmed = (query || '').trim()
  if (!trimmed) return { items: [], warning: null }

  const gb = await searchGoogleBooks(trimmed)
  if (gb.ok && gb.items.length > 0) return { items: gb.items, warning: null }

  const ol = await searchOpenLibrary(trimmed)
  if (ol.ok && ol.items.length > 0) return { items: ol.items, warning: null }

  const isbn = trimmed.replace(/[^0-9Xx]/g, '')
  if (isbn.length === 10 || isbn.length === 13) {
    const br = await searchBrasilApi(trimmed)
    if (br.ok && br.items.length > 0) return { items: br.items, warning: null }

    const issues = [gb.reason, ol.reason, br.reason]
      .filter(Boolean)
      .filter((r) => r !== 'sem resultados' && r !== 'não é um ISBN')
    return {
      items: [],
      warning: issues.length
        ? `Buscas falharam (${issues.join('; ')})`
        : 'Nenhum resultado encontrado.',
    }
  }

  const issues = [gb.reason, ol.reason]
    .filter(Boolean)
    .filter((r) => r !== 'sem resultados')
  return {
    items: [],
    warning: issues.length
      ? `Buscas falharam (${issues.join('; ')})`
      : 'Nenhum resultado encontrado.',
  }
}
