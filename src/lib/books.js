import { auth, db } from './firebase'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

const booksCol = () => collection(db, 'books')

export async function addBook(book) {
  const uid = auth.currentUser.uid
  await addDoc(booksCol(), {
    ...book,
    uid,
    status: 'na_estante',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
}

export function subscribeBooks(cb) {
  const uid = auth.currentUser.uid
  return onSnapshot(
    query(booksCol(), where('uid', '==', uid)),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  )
}

export async function updateLocation(id, location) {
  await updateDoc(doc(db, 'books', id), {
    location,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteBook(id) {
  await deleteDoc(doc(db, 'books', id))
}
