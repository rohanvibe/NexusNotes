/**
 * Local IndexedDB Abstraction Layer for Stitch
 * Handles storage of Notes, Edges (Graph), and Tags locally.
 */

const DB_NAME = 'StitchDB';
const DB_VERSION = 1;

export class LocalDB {
    constructor() {
        this.db = null;
    }

    /**
     * Initialize the local IndexedDB database
     * @returns {Promise<boolean>} success
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => {
                console.error('[DB] Database error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('[DB] Database opened successfully');
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                console.log('[DB] Upgrading database structure...');

                // 1. Notes Store
                // A note represents an entity in the graph.
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('title', 'title', { unique: false });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    notesStore.createIndex('tags', 'tags', { multiEntry: true, unique: false });
                }

                // 2. Graph Edges Store
                // Represents Bidirectional Links between notes
                if (!db.objectStoreNames.contains('edges')) {
                    const edgesStore = db.createObjectStore('edges', { keyPath: 'id', autoIncrement: true });
                    edgesStore.createIndex('source', 'source', { unique: false });
                    edgesStore.createIndex('target', 'target', { unique: false });
                }

                // 3. Settings Store
                // Key-value store for app configs
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    // --- GENERIC CRUD UTILS ---

    async _getStore(storeName, mode = 'readonly') {
        if (!this.db) await this.init();
        const transaction = this.db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    async get(storeName, key) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAll(storeName) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async put(storeName, item) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName, 'readwrite');
            item.updatedAt = Date.now();
            if (!item.createdAt) item.createdAt = Date.now();

            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async delete(storeName, key) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName, 'readwrite');
            const request = store.delete(key);
            request.onsuccess = () => resolve(true);
            request.onerror = () => reject(request.error);
        });
    }

    // --- DOMAIN SPECIFIC API ---

    // Notes
    async getNote(id) { return this.get('notes', id); }
    async getAllNotes() { return this.getAll('notes'); }
    async saveNote(note) {
        if (!note.id) note.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        return this.put('notes', note);
    }
    async deleteNote(id) { return this.delete('notes', id); }

    // Graph
    async addEdge(sourceId, targetId) {
        const store = await this._getStore('edges', 'readwrite');
        return new Promise((resolve, reject) => {
            const request = store.put({ source: sourceId, target: targetId, createdAt: Date.now() });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getEdgesForNode(nodeId) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['edges'], 'readonly');
            const store = transaction.objectStore('edges');

            // Getting both outgoing and incoming
            const edges = [];

            const sourceIndex = store.index('source');
            const sourceReq = sourceIndex.getAll(nodeId);

            sourceReq.onsuccess = () => {
                edges.push(...sourceReq.result);

                const targetIndex = store.index('target');
                const targetReq = targetIndex.getAll(nodeId);

                targetReq.onsuccess = () => {
                    edges.push(...targetReq.result);
                    resolve(edges);
                };
                targetReq.onerror = () => reject(targetReq.error);
            };
            sourceReq.onerror = () => reject(sourceReq.error);
        });
    }

    // Settings
    async getSetting(key) {
        const res = await this.get('settings', key);
        return res ? res.value : null;
    }
    async saveSetting(key, value) {
        return this.put('settings', { key, value });
    }
}

// Export singleton
export const db = new LocalDB();
