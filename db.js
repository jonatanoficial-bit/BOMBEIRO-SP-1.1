/* db.js - Bombeiro SP (IndexedDB wrapper simples e robusto) */

const DB_NAME = "bombeiro_sp_db";
const DB_VERSION = 1;
const STORE_VISTORIAS = "vistorias";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_VISTORIAS)) {
        const store = db.createObjectStore(STORE_VISTORIAS, { keyPath: "id" });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
        store.createIndex("status", "status", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, storeName, mode = "readonly") {
  const t = db.transaction(storeName, mode);
  return { store: t.objectStore(storeName), done: new Promise((res, rej) => {
    t.oncomplete = () => res(true);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  })};
}

export async function dbPutVistoria(vistoria) {
  const db = await openDB();
  const { store, done } = tx(db, STORE_VISTORIAS, "readwrite");
  store.put(vistoria);
  await done;
  db.close();
  return true;
}

export async function dbGetVistoria(id) {
  const db = await openDB();
  const { store } = tx(db, STORE_VISTORIAS, "readonly");
  const req = store.get(id);
  const result = await new Promise((res, rej) => {
    req.onsuccess = () => res(req.result || null);
    req.onerror = () => rej(req.error);
  });
  db.close();
  return result;
}

export async function dbListVistorias(limit = 50) {
  const db = await openDB();
  const { store } = tx(db, STORE_VISTORIAS, "readonly");
  const index = store.index("updatedAt");

  const items = [];
  // Cursor reverso (mais recente primeiro)
  const req = index.openCursor(null, "prev");

  await new Promise((resolve, reject) => {
    req.onsuccess = (e) => {
      const cursor = e.target.result;
      if (!cursor || items.length >= limit) return resolve(true);
      items.push(cursor.value);
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
  });

  db.close();
  return items;
}

export async function dbDeleteVistoria(id) {
  const db = await openDB();
  const { store, done } = tx(db, STORE_VISTORIAS, "readwrite");
  store.delete(id);
  await done;
  db.close();
  return true;
}
