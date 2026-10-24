import type { DataStore, DocData, StoredDoc } from '../../core'

type Listener = (docs: StoredDoc[]) => void

export class MemoryDataStore implements DataStore {
  // Clé : `uid/collection` → documents de la collection.
  private collections = new Map<string, Map<string, DocData>>()
  private listeners = new Map<string, Set<Listener>>()

  async get(uid: string, collection: string, id: string) {
    const doc = this.collection(uid, collection).get(id)
    return doc ? structuredClone(doc) : null
  }

  async set(uid: string, collection: string, id: string, data: DocData) {
    this.collection(uid, collection).set(id, structuredClone(data))
    this.notify(uid, collection)
  }

  async remove(uid: string, collection: string, id: string) {
    this.collection(uid, collection).delete(id)
    this.notify(uid, collection)
  }

  watch(uid: string, collection: string, onChange: Listener) {
    const key = `${uid}/${collection}`
    const set = this.listeners.get(key) ?? new Set()
    this.listeners.set(key, set)
    set.add(onChange)
    onChange(this.snapshot(uid, collection))
    return () => {
      set.delete(onChange)
    }
  }

  private collection(uid: string, collection: string) {
    const key = `${uid}/${collection}`
    let docs = this.collections.get(key)
    if (!docs) {
      docs = new Map()
      this.collections.set(key, docs)
    }
    return docs
  }

  private snapshot(uid: string, collection: string): StoredDoc[] {
    return [...this.collection(uid, collection)].map(([id, data]) => ({
      id,
      data: structuredClone(data),
    }))
  }

  private notify(uid: string, collection: string) {
    const docs = this.snapshot(uid, collection)
    this.listeners.get(`${uid}/${collection}`)?.forEach((listener) => listener(docs))
  }
}
