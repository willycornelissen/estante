import { auth, db } from './firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

const booksCol = () => collection(db, 'books')

function normalize(s) {
  return (s || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function isbnDigits(s) {
  return (s || '').replace(/[^0-9Xx]/g, '').toUpperCase()
}

function isbn10Check(digits) {
  let sum = 0
  for (let i = 0; i < 9; i++) sum += (10 - i) * Number(digits[i])
  const rem = sum % 11
  return rem === 0 ? '0' : rem === 1 ? 'X' : String(11 - rem)
}

function isbn13Check(digits) {
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number(digits[i]) * (i % 2 === 0 ? 1 : 3)
  }
  return String((10 - (sum % 10)) % 10)
}

function isbnKeys(isbn) {
  const d = isbnDigits(isbn)
  if (d.length === 10) {
    const core = d.slice(0, 9)
    return [d, '978' + core + isbn13Check('978' + core)]
  }
  if (d.length === 13 && d.startsWith('978')) {
    const core = d.slice(3, 12)
    return [d, core + isbn10Check(core)]
  }
  return d ? [d] : []
}

async function findDuplicate(book) {
  const snap = await getDocs(booksCol())
  const keys = isbnKeys(book.isbn)
  const title = normalize(book.title)
  const author = normalize(book.authors?.[0])
  for (const d of snap.docs) {
    const b = d.data()
    const existingKeys = isbnKeys(b.isbn)

    if (keys.length > 0 && existingKeys.length > 0) {
      if (existingKeys.some((k) => keys.includes(k))) return b
      continue
    }

    if (
      title &&
      author &&
      normalize(b.title) === title &&
      normalize(b.authors?.[0]) === author
    ) {
      return b
    }
  }
  return null
}

export async function addBook(book) {
  const duplicate = await findDuplicate(book)
  if (duplicate) {
    throw new Error(`"${duplicate.title}" já está na estante.`)
  }
  const uid = auth.currentUser.uid
  const data = Object.fromEntries(
    Object.entries(book).filter(([, v]) => v !== undefined)
  )
  await addDoc(booksCol(), {
    ...data,
    uid,
    status: 'na_estante',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeBooks(cb) {
  return onSnapshot(
    query(booksCol(), orderBy('createdAt', 'desc')),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function updateLocation(id, location) {
  await updateDoc(doc(db, 'books', id), {
    location,
    updatedAt: serverTimestamp(),
  })
}

export async function updateTags(id, tags) {
  await updateDoc(doc(db, 'books', id), {
    tags,
    updatedAt: serverTimestamp(),
  })
}

export async function updateCover(id, customCover) {
  await updateDoc(doc(db, 'books', id), {
    customCover,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBook(id) {
  await deleteDoc(doc(db, 'books', id))
}
