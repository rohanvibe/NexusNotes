import { fsLayer } from '../db/fs-access.js';
import { db } from '../db/indexeddb.js';

export const VaultManagerComponent = {
    async render() {
        const notes = await db.getAllNotes();
        const totalSize = encodeURIComponent(JSON.stringify(notes)).length;
        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        return `
        <div class="w-full max-w-4xl mx-auto px-4 py-8 space-y-6 fade-in pb-24">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-slate-300 dark:border-border-custom pb-4 text-slate-900 dark:text-slate-100">
                <div class="flex items-center gap-3">
                    <div class="text-primary flex size-10 shrink-0 items-center justify-center">
                        <span class="material-symbols-outlined text-3xl">shield_lock</span>
                    </div>
                    <h2 class="text-2xl font-bold leading-tight tracking-tight">Vault & Storage</h2>
                </div>
                <button class="flex size-10 items-center justify-center rounded-lg bg-slate-200 dark:bg-slate-custom hover:bg-slate-300 dark:hover:bg-primary/20 transition-colors">
                    <span class="material-symbols-outlined">settings</span>
                </button>
            </div>

            <!-- Local Storage Section -->
            <div class="space-y-4">
                <h2 class="text-xl font-bold leading-tight tracking-tight">Local Storage</h2>
                <div class="flex flex-col gap-3 p-5 rounded-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom shadow-sm">
                    <div class="flex gap-6 justify-between items-end">
                        <p class="text-slate-700 dark:text-slate-300 text-base font-medium">Used Space</p>
                        <p class="text-slate-900 dark:text-white text-sm font-bold">${formatBytes(totalSize)} / 50 MB</p>
                    </div>
                    <div class="h-3 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div class="h-full rounded-full bg-primary" style="width: ${Math.min((totalSize / (50 * 1024 * 1024)) * 100, 100)}%;"></div>
                    </div>
                    <div class="flex justify-between">
                        <p class="text-slate-500 dark:text-slate-400 text-sm">${((totalSize / (50 * 1024 * 1024)) * 100).toFixed(1)}% capacity utilized</p>
                    </div>
                </div>
            </div>

            <!-- Data Management -->
            <div class="space-y-4">
                <h2 class="text-xl font-bold leading-tight tracking-tight">Data Backup & Export</h2>
                <p class="text-sm text-slate-500 mb-2">Create a single JSON export of your entire IndexedDB instance or export to your local File System.</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="fs-status-container">
                    <button id="btn-export-json" class="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-primary/5 transition-all shadow-sm">
                        <span class="material-symbols-outlined text-3xl text-orange-500">download</span>
                        <span class="text-sm font-semibold">Export JSON Backup</span>
                    </button>
                    
                    <button id="btn-export-folder" class="flex flex-col items-center justify-center gap-2 p-6 rounded-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom text-slate-700 dark:text-slate-300 hover:border-primary/50 hover:bg-slate-50 dark:hover:bg-primary/5 transition-all shadow-sm">
                        <span class="material-symbols-outlined text-3xl text-primary">drive_folder_upload</span>
                        <span class="text-sm font-semibold">Sync to Native Folder</span>
                    </button>
                    
                    <div class="col-span-1 sm:col-span-2 mt-2">
                        <label for="import-json" class="flex items-center justify-center w-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium py-3 rounded-xl hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer border border-slate-300 dark:border-border-custom">
                            <span class="material-symbols-outlined mr-2">upload</span> Restore from JSON Backup
                        </label>
                        <input type="file" id="import-json" accept=".json" class="hidden">
                    </div>
                    <p class="text-xs text-center text-slate-500 w-full col-span-1 sm:col-span-2" id="fs-status-text">Folder export requires Chromium-based browser (Chrome, Edge)</p>
                </div>
            </div>
            
        </div>
        `;
    },

    onRender(container) {

        // 1. JSON Export
        container.querySelector('#btn-export-json').addEventListener('click', async () => {
            const btn = container.querySelector('#btn-export-json');
            btn.querySelector('span:last-child').textContent = "Exporting...";

            try {
                const notes = await db.getAllNotes();
                const edges = await db.getAll('edges');
                const dump = JSON.stringify({ notes, edges }, null, 2);

                const blob = new Blob([dump], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `nexusnotes-backup-${new Date().toISOString().split('T')[0]}.json`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);

                btn.querySelector('span:last-child').textContent = "Export Complete!";
                setTimeout(() => btn.querySelector('span:last-child').textContent = "Export JSON Backup", 2000);
            } catch (e) {
                btn.querySelector('span:last-child').textContent = "Export Failed";
                console.error(e);
            }
        });

        // 2. JSON Import (Restore)
        container.querySelector('#import-json').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (confirm("WARNING: This will overwrite all your current notes. Are you sure you want to restore from this backup?")) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        if (data.notes && Array.isArray(data.notes)) {
                            // Wipe current
                            const current = await db.getAllNotes();
                            for (let n of current) await db.deleteNote(n.id);

                            // Insert new
                            for (let n of data.notes) await db.saveNote(n);

                            alert("Database restored successfully!");
                            window.AppRouter.navigate('#/');
                        }
                    } catch (err) {
                        alert("Invalid JSON backup file.");
                    }
                };
                reader.readAsText(file);
            }
        });

        // 3. File System Access API Export
        const btnFs = container.querySelector('#btn-export-folder');
        const statusFs = container.querySelector('#fs-status-text');

        btnFs.addEventListener('click', async () => {
            const notes = await db.getAllNotes();
            if (notes.length === 0) {
                statusFs.textContent = "Your database is empty.";
                return;
            }

            statusFs.textContent = "Awaiting folder permission...";
            btnFs.disabled = true;

            let success = false;
            try {
                const dirHandle = await fsLayer.openDirectory();
                if (dirHandle) {
                    success = true;
                    for (const note of notes) {
                        const saved = await fsLayer.exportNoteToMarkdown(dirHandle, note);
                        if (!saved) success = false;
                    }
                }
            } catch (err) {
                console.error("Folder export failed", err);
            }
            if (success) {
                statusFs.textContent = `Successfully exported ${notes.length} notes!`;
                statusFs.classList.replace('text-slate-500', 'text-green-500');
            } else {
                statusFs.textContent = "Export cancelled or failed.";
            }

            btnFs.disabled = false;
        });
    }
}
