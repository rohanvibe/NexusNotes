/**
 * Search Indexing Web Worker
 * Keeps main thread fast by offloading full text search indexing and querying
 */

// Simple in-memory inverted index memory for demonstration
let searchIndex = {};
let documents = {};

self.onmessage = async (e) => {
    const { type, payload, id } = e.data;

    switch (type) {
        case 'BUILD_INDEX':
            console.log('[Search Worker] Building index from local database...');
            const notes = payload.notes || [];

            // Very naive indexing
            searchIndex = {};
            documents = {};

            notes.forEach(note => {
                documents[note.id] = note;
                const terms = (note.title + " " + note.content).toLowerCase().split(/\s+/);
                terms.forEach(term => {
                    if (!searchIndex[term]) searchIndex[term] = new Set();
                    searchIndex[term].add(note.id);
                });
            });

            self.postMessage({ id, status: 'success', data: { indexedCount: notes.length } });
            break;

        case 'SEARCH':
            console.log(`[Search Worker] Querying: "${payload.query}"`);
            const terms = payload.query.toLowerCase().split(/\s+/);

            // Simple intersection search
            let results = null;
            terms.forEach(term => {
                const hits = searchIndex[term] || new Set();
                if (results === null) {
                    results = new Set(hits);
                } else {
                    results = new Set([...results].filter(x => hits.has(x)));
                }
            });

            if (results === null) results = new Set();

            const resultDocs = Array.from(results).map(docId => ({
                id: docId,
                title: documents[docId].title,
                snippet: documents[docId].content.substring(0, 100) + '...'
            }));

            self.postMessage({ id, status: 'success', data: { results: resultDocs } });
            break;

        default:
            self.postMessage({ id, status: 'error', error: 'Unknown command' });
    }
};
