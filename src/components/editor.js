import { db } from '../db/indexeddb.js';
import { KnowledgeEngine } from '../core/knowledge.js';

export const EditorComponent = {
    async render() {
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const noteId = urlParams.get('id');
        let note = null;
        let backlinks = [];

        if (noteId && noteId !== 'new') {
            note = await db.getNote(noteId);
            backlinks = await KnowledgeEngine.getBacklinks(noteId);
        }

        if (!note) {
            note = { title: '', content: '', tags: [] };
        }

        const isLocked = db.isEncrypted && !db.vaultKey;

        return `
        <div class="flex-1 w-full flex h-full fade-in relative overflow-hidden" id="editor-page">
            
            <!-- Left Sidebar: Backlinks & Metadata (Desktop only) -->
            <aside class="hidden lg:flex w-72 flex-col border-r border-slate-200 dark:border-border-custom bg-slate-50 dark:bg-slate-900 overflow-y-auto no-scrollbar" id="editor-aside">
                <div class="p-6 space-y-8">
                    <div>
                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Semantic References</h4>
                        <div class="space-y-2">
                            ${backlinks.length === 0 ? `
                                <p class="text-xs text-slate-500 italic">No incoming synapses detected.</p>
                            ` : backlinks.map(b => `
                                <a href="#/editor?id=${b.id}" data-route="#/editor?id=${b.id}" class="block p-3 bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl hover:border-primary/50 transition-all group">
                                    <p class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-primary truncate">${b.title || 'Untitled'}</p>
                                    <p class="text-[10px] text-slate-400 mt-1 line-clamp-1">${b.content.substring(0, 40)}...</p>
                                </a>
                            `).join('')}
                        </div>
                    </div>

                    <div>
                        <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Vault Status</h4>
                        <div class="p-3 rounded-xl ${db.isEncrypted ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-green-500/10 border border-green-500/20'}">
                            <div class="flex items-center gap-2 mb-1">
                                <span class="material-symbols-outlined text-sm ${db.isEncrypted ? 'text-amber-500' : 'text-green-500'}">${db.isEncrypted ? 'lock' : 'lock_open'}</span>
                                <span class="text-[10px] font-bold uppercase ${db.isEncrypted ? 'text-amber-500' : 'text-green-500'}">${db.isEncrypted ? 'Zero-Knowledge Active' : 'Transparent Layer'}</span>
                            </div>
                            <p class="text-[9px] text-slate-500">${db.isEncrypted ? 'Data is encrypted locally using AES-256.' : 'Implicit data storage in local database.'}</p>
                        </div>
                    </div>
                </div>
            </aside>

            <!-- Main Editor Area -->
            <div class="flex-1 flex flex-col h-full bg-white dark:bg-background-dark overflow-hidden relative" id="editor-main">
                <header class="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-border-custom">
                    <div class="flex items-center gap-4 flex-1">
                         <a href="#/" class="lg:hidden p-2 text-slate-400 hover:text-primary"><span class="material-symbols-outlined">arrow_back</span></a>
                         <input type="text" id="editor-title" class="text-xl font-black bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-slate-200 dark:placeholder:text-slate-800" placeholder="Heuristic Identifier..." value="${note.title}">
                    </div>
                    <div class="flex items-center gap-3">
                         <span class="text-[10px] font-bold text-slate-400 opacity-0 transition-opacity uppercase tracking-widest" id="save-status">Synced</span>
                         <div class="flex items-center bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl">
                            <button id="btn-mode-edit" class="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm">Write</button>
                            <button id="btn-mode-preview" class="px-4 py-1.5 text-[10px] font-black uppercase rounded-lg transition-all text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">View</button>
                         </div>
                         <button id="btn-delete-note" class="p-2 text-slate-400 hover:text-red-500 transition-colors"><span class="material-symbols-outlined text-xl">delete</span></button>
                    </div>
                </header>

                <div class="px-6 py-2 flex items-center gap-2 border-b border-slate-100 dark:border-border-custom/50">
                    <span class="material-symbols-outlined text-sm text-slate-300">sell</span>
                    <input type="text" id="editor-tags" class="text-[10px] font-bold uppercase tracking-widest text-primary bg-transparent border-none outline-none focus:ring-0 flex-1 placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="ADD HEURISTIC TAGS..." value="${note.tags.join(', ')}">
                </div>

                <div class="flex-1 relative flex overflow-hidden">
                    <textarea id="editor-content" class="absolute inset-0 w-full h-full p-8 bg-transparent border-none outline-none focus:ring-0 text-lg leading-relaxed text-slate-700 dark:text-slate-300 resize-none no-scrollbar placeholder:text-slate-200 dark:placeholder:text-slate-800 z-10 font-mono transition-opacity" placeholder="Commence knowledge synthesis...">${note.content}</textarea>
                    
                    <div id="editor-preview" class="absolute inset-0 w-full h-full p-8 overflow-y-auto no-scrollbar prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed opacity-0 pointer-events-none z-0">
                        <!-- Markdown Output -->
                    </div>
                </div>

                <!-- Footer Stats -->
                <footer class="px-6 py-2 border-t border-slate-200 dark:border-border-custom bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                    <div class="flex items-center gap-4">
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest" id="word-count">0 Semantic Units</span>
                        <span class="text-[9px] font-bold text-slate-400 uppercase tracking-widest" id="char-count">0 Bytes</span>
                    </div>
                    <div class="flex items-center gap-2">
                         <span class="text-[9px] font-black text-slate-500 uppercase">CTRL + S TO SYNC</span>
                    </div>
                </footer>
            </div>

            <!-- Floating Toolbar -->
            <nav class="fixed bottom-24 left-1/2 -translate-x-1/2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-slate-200 dark:border-primary/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl z-50 transition-all hover:-translate-y-1" id="editor-toolbar">
                <button class="p-2 hover:bg-primary/10 rounded-xl transition-all group" data-format="bold" title="Bold"><span class="material-symbols-outlined text-slate-500 group-hover:text-primary">format_bold</span></button>
                <button class="p-2 hover:bg-primary/10 rounded-xl transition-all group" data-format="italic" title="Italic"><span class="material-symbols-outlined text-slate-500 group-hover:text-primary">format_italic</span></button>
                <button class="p-2 hover:bg-primary/10 rounded-xl transition-all group" data-format="link" title="Link"><span class="material-symbols-outlined text-slate-500 group-hover:text-primary">link</span></button>
                <button class="p-2 hover:bg-primary/10 rounded-xl transition-all group" data-format="wikilink" title="Wiki Link"><span class="material-symbols-outlined text-slate-500 group-hover:text-primary">link_off</span></button>
                <div class="w-px h-6 bg-slate-200 dark:bg-slate-700 mx-1"></div>
                <button class="p-2 hover:bg-primary/10 rounded-xl transition-all group" id="btn-focus-mode" title="Focus Mode"><span class="material-symbols-outlined text-slate-500 group-hover:text-primary">visibility_off</span></button>
            </nav>
        </div>
        `;
    },

    onRender(container) {
        const titleEl = container.querySelector('#editor-title');
        const contentEl = container.querySelector('#editor-content');
        const tagsEl = container.querySelector('#editor-tags');
        const statusEl = container.querySelector('#save-status');
        const previewEl = container.querySelector('#editor-preview');
        const wordCountEl = container.querySelector('#word-count');
        const charCountEl = container.querySelector('#char-count');

        const btnEdit = container.querySelector('#btn-mode-edit');
        const btnPreview = container.querySelector('#btn-mode-preview');
        const btnDelete = container.querySelector('#btn-delete-note');
        const btnFocus = container.querySelector('#btn-focus-mode');
        const toolbar = container.querySelector('#editor-toolbar');

        let noteIdAttr = container.querySelector('#editor-page').getAttribute('data-note-id');
        let currentNoteId = (new URLSearchParams(window.location.hash.split('?')[1])).get('id');
        if (currentNoteId === 'new') currentNoteId = null;

        // Stats Update
        const updateStats = () => {
            const text = contentEl.value.trim();
            const words = text ? text.split(/\s+/).length : 0;
            const chars = new TextEncoder().encode(text).length;
            wordCountEl.textContent = `${words} Semantic Units`;
            charCountEl.textContent = `${chars} Bytes`;
        };
        updateStats();

        // Save Logic (Platform Grade)
        let saveTimeout;
        const triggerSave = (isSilent = false) => {
            if (!isSilent) {
                statusEl.classList.remove('opacity-0');
                statusEl.textContent = "SYNCHRONIZING...";
            }
            clearTimeout(saveTimeout);

            saveTimeout = setTimeout(async () => {
                const title = titleEl.value.trim() || "Untitled Entity";
                const content = contentEl.value;
                const tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean);

                const noteObj = {
                    id: currentNoteId,
                    title: title,
                    content: content,
                    tags: tags
                };

                const id = await db.saveNote(noteObj);
                const isNew = !currentNoteId;
                currentNoteId = id;

                // Sync References for Bi-directional linking
                await KnowledgeEngine.syncReferences(id, content);

                if (isNew) {
                    window.AppRouter.navigate(`#/editor?id=${id}`, true);
                }

                if (!isSilent) {
                    statusEl.textContent = "STABLE";
                    setTimeout(() => { if (statusEl.textContent === "STABLE") statusEl.classList.add('opacity-0'); }, 2000);
                }
            }, 1000);
        };

        const handleInput = () => {
            updateStats();
            triggerSave();
        };

        titleEl.addEventListener('input', handleInput);
        contentEl.addEventListener('input', handleInput);
        tagsEl.addEventListener('input', handleInput);

        // Preview Rendering (Advanced)
        const renderPreview = () => {
            let html = marked.parse(contentEl.value);

            // Render Wiki Links: [[Link]] -> <a href="#/editor?tag=Link">Link</a>
            // Actually, better to link to existing note by title if possible.
            html = html.replace(/\[\[(.*?)\]\]/g, (match, title) => {
                return `<a href="#/search?q=${encodeURIComponent(title)}" class="text-primary font-bold hover:underline decoration-2">[[${title}]]</a>`;
            });

            previewEl.innerHTML = DOMPurify.sanitize(html);
        };

        btnPreview.addEventListener('click', () => {
            btnPreview.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnPreview.classList.remove('text-slate-400');
            btnEdit.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnEdit.classList.add('text-slate-400');

            contentEl.classList.add('opacity-0', 'pointer-events-none');
            previewEl.classList.remove('opacity-0', 'pointer-events-none', 'z-0');
            previewEl.classList.add('z-10');
            renderPreview();
        });

        btnEdit.addEventListener('click', () => {
            btnEdit.classList.add('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnEdit.classList.remove('text-slate-400');
            btnPreview.classList.remove('bg-white', 'dark:bg-slate-700', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnPreview.classList.add('text-slate-400');

            previewEl.classList.add('opacity-0', 'pointer-events-none', 'z-0');
            contentEl.classList.remove('opacity-0', 'pointer-events-none');
            contentEl.focus();
        });

        // Shortcuts
        container.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key === 's') { e.preventDefault(); triggerSave(); }
        });

        // Toolbar
        toolbar.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.getAttribute('data-format');
                const start = contentEl.selectionStart;
                const end = contentEl.selectionEnd;
                const text = contentEl.value;
                const selected = text.substring(start, end);

                let replacement = "";
                if (format === 'bold') replacement = `**${selected || 'text'}**`;
                if (format === 'italic') replacement = `*${selected || 'text'}*`;
                if (format === 'link') replacement = `[${selected || 'text'}](URL)`;
                if (format === 'wikilink') replacement = `[[${selected || 'Note Title'}]]`;

                contentEl.value = text.substring(0, start) + replacement + text.substring(end);
                contentEl.focus();
                handleInput();
            });
        });

        btnDelete.addEventListener('click', async () => {
            if (confirm("Terminate this cognitive entity perpetually?")) {
                clearTimeout(saveTimeout);
                if (currentNoteId) await db.deleteNote(currentNoteId);
                window.AppRouter.navigate('#/');
            }
        });

        btnFocus.addEventListener('click', () => {
            document.body.classList.toggle('focus-mode');
            const isFocus = document.body.classList.contains('focus-mode');
            btnFocus.querySelector('span').textContent = isFocus ? "visibility" : "visibility_off";
        });

        setTimeout(() => contentEl.focus(), 100);
    }
}
