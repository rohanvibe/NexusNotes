/**
 * Sync Queue System
 * Handles offline mutations and optimistic UI updates.
 * If peer-to-peer or cloud sync is enabled, it flushes this queue.
 */

import { db } from '../db/indexeddb.js';

export class SyncEngine {
    constructor() {
        this.queue = [];
        this.isOnline = navigator.onLine;

        window.addEventListener('online', () => this.handleOnline());
        window.addEventListener('offline', () => this.handleOffline());
    }

    /**
     * Add operation to sync queue
     * @param {string} action (e.g. 'UPDATE_NOTE')
     * @param {object} payload 
     */
    async enqueue(action, payload) {
        const op = {
            id: Date.now() + Math.random().toString(36).substring(2),
            timestamp: Date.now(),
            action,
            payload
        };

        this.queue.push(op);

        // Save queue locally so it survives reloads (using IndexedDB settings store)
        await db.saveSetting('sync_queue', this.queue);

        console.log(`[Sync] Enqueued operation: ${action}`);

        if (this.isOnline) {
            this.flush();
        }
    }

    async loadQueue() {
        const savedQueue = await db.getSetting('sync_queue');
        if (savedQueue && Array.isArray(savedQueue)) {
            this.queue = savedQueue;
        }
    }

    handleOnline() {
        console.log('[Sync] Device is online. Flushing queue...');
        this.isOnline = true;
        this.flush();
    }

    handleOffline() {
        console.log('[Sync] Device is offline. Mutations will be queued locally.');
        this.isOnline = false;
    }

    async flush() {
        if (this.queue.length === 0) return;

        console.log(`[Sync] Processing ${this.queue.length} operations.`);

        // Process queue in order
        // Note: In an actual P2P system we would push these to WebRTC layer or CRDT engine

        // Mock success
        this.queue = [];
        await db.saveSetting('sync_queue', this.queue);

        console.log('[Sync] Queue flushed successfully.');
    }
}

export const syncEngine = new SyncEngine();
