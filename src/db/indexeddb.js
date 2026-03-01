/**
 * NexusNotes Storage Engine
 * Market-competitive, multi-vault, local-first database on IndexedDB.
 */

import { SecurityEngine } from '../core/security.js';

export class StorageEngine {
    constructor() {
        this.db = null;
        this.currentVault = localStorage.getItem('nexus_current_vault') || 'NexusDefault';
        this.vaultKey = null; // Stored only in memory!
        this.isEncrypted = false;
    }

    /**
     * Initialize/Connect to a specific vault (IndexedDB database).
     * @param {string} vaultName 
     */
    async init(vaultName = this.currentVault) {
        if (this.db && this.currentVault === vaultName) return true;

        console.log(`[Storage] Initializing Vault: ${vaultName}...`);

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(`Nexus_${vaultName}`, 2); // Version 2 for platform upgrade

            request.onerror = (event) => {
                console.error('[Storage] Connection failed:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.currentVault = vaultName;
                localStorage.setItem('nexus_current_vault', vaultName);

                // Track availability in metadata vault
                this._trackVault(vaultName);

                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // CORE TABLES
                if (!db.objectStoreNames.contains('notes')) {
                    const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
                    notesStore.createIndex('title', 'title', { unique: false });
                    notesStore.createIndex('updatedAt', 'updatedAt', { unique: false });
                    notesStore.createIndex('tags', 'tags', { multiEntry: true, unique: false });
                }

                if (!db.objectStoreNames.contains('edges')) {
                    const edgesStore = db.createObjectStore('edges', { keyPath: 'id', autoIncrement: true });
                    edgesStore.createIndex('source', 'source', { unique: false });
                    edgesStore.createIndex('target', 'target', { unique: false });
                }

                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // NEW: HISTORY / SNAPSHOTS
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'hid', autoIncrement: true });
                    historyStore.createIndex('noteId', 'noteId', { unique: false });
                    historyStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // NEW: PLUGINS / EXTENSIONS
                if (!db.objectStoreNames.contains('plugins')) {
                    db.createObjectStore('plugins', { keyPath: 'id' });
                }
            };
        });
    }

    /**
     * Unlock the vault with a password (Security Engine hook)
     */
    async unlock(password) {
        const saltBuffer = await this.getSetting('vault_salt');
        let salt;
        if (!saltBuffer) {
            salt = crypto.getRandomValues(new Uint8Array(16));
            await this.saveSetting('vault_salt', Array.from(salt));
        } else {
            salt = new Uint8Array(saltBuffer);
        }

        this.vaultKey = await SecurityEngine.deriveKey(password, salt);
        this.isEncrypted = true;
        console.log(`[Storage] Vault unlocked successfully.`);
    }

    /**
     * Internal metadata tracking of available vaults
     */
    async _trackVault(name) {
        // We use a global registry in localStorage to list vaults for the switcher.
        const vaultsRaw = localStorage.getItem('nexus_vault_registry') || '[]';
        const vaults = JSON.parse(vaultsRaw);
        if (!vaults.includes(name)) {
            vaults.push(name);
            localStorage.setItem('nexus_vault_registry', JSON.stringify(vaults));
        }
    }

    // --- GENERIC ENGINE OPS ---

    async _getStore(storeName, mode = 'readonly') {
        if (!this.db) await this.init();
        const transaction = this.db.transaction([storeName], mode);
        return transaction.objectStore(storeName);
    }

    async getRaw(storeName, key) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getAllRaw(storeName) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async putRaw(storeName, item) {
        return new Promise(async (resolve, reject) => {
            const store = await this._getStore(storeName, 'readwrite');
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // --- ENCRYPTION WRAPPERS ---

    async saveNote(note) {
        if (!note.id) note.id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
        note.updatedAt = Date.now();
        if (!note.createdAt) note.createdAt = Date.now();

        // 1. Handle Version History (Snapshot before saving new one)
        const oldNote = await this.getRaw('notes', note.id);
        if (oldNote) {
            await this.putRaw('history', {
                noteId: note.id,
                timestamp: oldNote.updatedAt,
                content: oldNote.content,
                title: oldNote.title,
                tags: oldNote.tags
            });
        }

        // 2. Encrypt if key exists
        if (this.isEncrypted && this.vaultKey) {
            const encryptedData = { ...note };
            encryptedData.content = await SecurityEngine.encrypt(note.content, this.vaultKey);
            encryptedData.title = await SecurityEngine.encrypt(note.title, this.vaultKey);
            encryptedData._encrypted = true;
            return this.putRaw('notes', encryptedData);
        }

        return this.putRaw('notes', note);
    }

    async getNote(id) {
        const note = await this.getRaw('notes', id);
        if (!note) return null;

        if (note._encrypted && this.isEncrypted && this.vaultKey) {
            try {
                note.content = await SecurityEngine.decrypt(note.content, this.vaultKey);
                note.title = await SecurityEngine.decrypt(note.title, this.vaultKey);
                note._encrypted = false;
            } catch (e) {
                console.error("[Storage] Decryption failed! Invalid key?", e);
                note.content = "🔒 [CONTENT ENCRYPTED - PLEASE UNLOCK VAULT]";
                note.title = "🔒 [TITLE ENCRYPTED]";
            }
        }
        return note;
    }

    async getAllNotes() {
        const notes = await this.getAllRaw('notes');
        const decryptPromises = notes.map(async (n) => {
            if (n._encrypted && this.isEncrypted && this.vaultKey) {
                try {
                    n.content = await SecurityEngine.decrypt(n.content, this.vaultKey);
                    n.title = await SecurityEngine.decrypt(n.title, this.vaultKey);
                } catch (e) { }
            }
            return n;
        });
        return Promise.all(decryptPromises);
    }

    // Pass throughs
    async deleteNote(id) {
        return new Promise(async (r, rj) => {
            const store = await this._getStore('notes', 'readwrite');
            const req = store.delete(id);
            req.onsuccess = () => r(true);
            req.onerror = () => rj(req.error);
        });
    }

    async getAll(store) { return this.getAllRaw(store); }
    async getSetting(key) {
        const res = await this.getRaw('settings', key);
        return res ? res.value : null;
    }
    async saveSetting(key, value) {
        return this.putRaw('settings', { key, value });
    }
}

// Export singleton engine
export const db = new StorageEngine();
