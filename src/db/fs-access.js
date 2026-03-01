/**
 * File System Access API integration
 * Used for exporting/importing vaults directly from the native desktop file system.
 */

export class FileSystemLayer {

    /**
     * Prompt user to select a directory to act as a vault.
     * @returns {Promise<FileSystemDirectoryHandle>}
     */
    async openDirectory() {
        try {
            if (!('showDirectoryPicker' in window)) {
                throw new Error("File System Access API is not supported in this browser.");
            }
            const dirHandle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            return dirHandle;
        } catch (err) {
            console.error('[FS] Error opening directory:', err);
            return null;
        }
    }

    /**
     * Save a JSON snapshot of the local DB to the specified directory handle.
     */
    async exportVaultSnapshot(dirHandle, dbData) {
        try {
            // Create or get the file
            const fileHandle = await dirHandle.getFileHandle('stitch-vault-snapshot.json', { create: true });

            // Create a writable stream
            const writable = await fileHandle.createWritable();

            // Write payload
            await writable.write(JSON.stringify(dbData, null, 2));

            // Close the file
            await writable.close();

            return true;
        } catch (err) {
            console.error('[FS] Failed to export snapshot:', err);
            return false;
        }
    }

    /**
     * Save an individual markdown note to the file system.
     */
    async exportNoteToMarkdown(dirHandle, note) {
        try {
            const filename = `${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.md`;
            const fileHandle = await dirHandle.getFileHandle(filename, { create: true });
            const writable = await fileHandle.createWritable();

            // Minimal frontmatter formatting
            const content = `---
id: ${note.id}
tags: [${note.tags ? note.tags.join(', ') : ''}]
---

# ${note.title}

${note.content}
`;
            await writable.write(content);
            await writable.close();
            return true;
        } catch (err) {
            console.error(`[FS] Failed to export ${note.title}:`, err);
            return false;
        }
    }
}

export const fsLayer = new FileSystemLayer();
