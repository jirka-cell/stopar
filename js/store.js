// IndexedDB: kv (stav, konfigurace), photos (fotky z terénu), osm (cache biotopů)
const DB_NAME = 'stopar';
const DB_VER = 1;
let dbp = null;

function open() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = () => {
      const db = r.result;
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      if (!db.objectStoreNames.contains('photos')) db.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('osm')) db.createObjectStore('osm');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  return dbp;
}

function tx(store, mode, fn) {
  return open().then(db => new Promise((res, rej) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    let out;
    Promise.resolve(fn(s)).then(v => { out = v; });
    t.oncomplete = () => res(out);
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }));
}
const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });

export const store = {
  get: (k, s = 'kv') => tx(s, 'readonly', st => req(st.get(k))),
  set: (k, v, s = 'kv') => tx(s, 'readwrite', st => req(st.put(v, k))),
  del: (k, s = 'kv') => tx(s, 'readwrite', st => req(st.delete(k))),
  clear: s => tx(s, 'readwrite', st => req(st.clear())),
  all: s => tx(s, 'readonly', st => req(st.getAll())),
  keys: s => tx(s, 'readonly', st => req(st.getAllKeys())),
  addPhoto: p => tx('photos', 'readwrite', st => req(st.add(p))),
  putPhoto: p => tx('photos', 'readwrite', st => req(st.put(p))),
  // Obnova zálohy v jedné transakci: buď se zapíše stav i všechny fotky, nebo nic (stará data zůstanou)
  restore: (state, photos) => open().then(db => new Promise((res, rej) => {
    const t = db.transaction(['photos', 'kv'], 'readwrite');
    const ph = t.objectStore('photos');
    ph.clear();
    for (const p of photos) ph.put(p);
    t.objectStore('kv').put(state, 'state');
    t.oncomplete = () => res();
    t.onerror = () => rej(t.error);
    t.onabort = () => rej(t.error);
  }))
};

// Požádá prohlížeč, aby data nemazal při nedostatku místa
export async function persist() {
  try { if (navigator.storage && navigator.storage.persist) return await navigator.storage.persist(); } catch (e) {}
  return false;
}
