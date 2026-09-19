export interface PersistentCacheRecord<T> {
  key: string
  payload: T
  etag: string | null
  savedAt: number
}

const DATABASE_NAME = 'mi-dieta-cache'
const DATABASE_VERSION = 1
const STORE_NAME = 'bootstrap'

function hasIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window && !!window.indexedDB
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!hasIndexedDb()) {
      reject(new Error('INDEXED_DB_UNAVAILABLE'))
      return
    }
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION)
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME, { keyPath: 'key' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('INDEXED_DB_OPEN_FAILED'))
    request.onblocked = () => reject(new Error('INDEXED_DB_BLOCKED'))
  })
}

export async function readPersistentCache<T>(key: string): Promise<PersistentCacheRecord<T> | null> {
  const database = await openDatabase()
  try {
    return await new Promise((resolve, reject) => {
      const request = database.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).get(key)
      request.onsuccess = () => resolve((request.result as PersistentCacheRecord<T> | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('INDEXED_DB_READ_FAILED'))
    })
  } finally {
    database.close()
  }
}

export async function writePersistentCache<T>(record: PersistentCacheRecord<T>) {
  const database = await openDatabase()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readwrite')
      transaction.objectStore(STORE_NAME).put(record)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('INDEXED_DB_WRITE_FAILED'))
      transaction.onabort = () => reject(transaction.error ?? new Error('INDEXED_DB_WRITE_ABORTED'))
    })
  } finally {
    database.close()
  }
}
