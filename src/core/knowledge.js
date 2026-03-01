/**
 * NexusNotes Knowledge Engine
 * Handles Bi-directional linking, Backlinks, and Semantic Analysis.
 */

import { db } from '../db/indexeddb.js';

export const KnowledgeEngine = {
    /**
     * Scans a note's content for [[Wiki Links]]
     * @param {string} content 
     * @returns {string[]} array of linked note titles
     */
    extractLinks(content) {
        if (!content) return [];
        const regex = /\[\[(.*?)\]\]/g;
        const matches = [...content.matchAll(regex)];
        return matches.map(m => m[1].trim());
    },

    /**
     * Synchronizes references for a note.
     * Finds/Creates edges based on [[Links]] in content.
     */
    async syncReferences(noteId, content) {
        const linkTitles = this.extractLinks(content);
        const allNotes = await db.getAllNotes();

        // Find existing notes with these titles or prepare to create placeholders?
        // For now, let's just link to existing notes.
        const targetNotes = allNotes.filter(n => linkTitles.includes(n.title));

        // Remove old edges for this note (outgoing)
        const edges = await db.getAll('edges');
        const incomingEdges = edges.filter(e => e.target === noteId); // We keep incoming
        const outgoingEdges = edges.filter(e => e.source === noteId);

        // We could delete old outgoing and add new ones, but better to diff.
        // Simplified for this stage:
        for (const target of targetNotes) {
            const exists = outgoingEdges.some(e => e.target === target.id);
            if (!exists) {
                // Add new edge to storage
                const store = await db._getStore('edges', 'readwrite');
                store.put({
                    source: noteId,
                    target: target.id,
                    type: 'ref',
                    createdAt: Date.now()
                });
            }
        }
    },

    /**
     * Retrieves all notes pointing to the current note.
     */
    async getBacklinks(noteId) {
        const edges = await db.getAll('edges');
        const mentionerIds = edges
            .filter(e => e.target === noteId)
            .map(e => e.source);

        const allNotes = await db.getAllNotes();
        return allNotes.filter(n => mentionerIds.includes(n.id));
    }
};
