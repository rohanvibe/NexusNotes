import { db } from '../db/indexeddb.js';

export const EditorComponent = {
    async render() {
        // Parse URL params query
        const hash = window.location.hash;
        const queryIndex = hash.indexOf('?');
        const urlParams = new URLSearchParams(queryIndex !== -1 ? hash.substring(queryIndex + 1) : '');
        const noteId = urlParams.get('id');
        const importContent = urlParams.get('import');
        const importName = urlParams.get('name');
        const sharedContent = urlParams.get('content');

        let note = null;

        if (noteId) {
            note = await db.getNote(noteId);
        } else if (importContent) {
            note = { title: importName || 'Imported Note', content: decodeURIComponent(importContent), tags: ['imported'] };
        } else if (sharedContent) {
            note = { title: 'Shared Note', content: decodeURIComponent(sharedContent), tags: ['shared'] };
        }

        if (!note) {
            note = { title: '', content: '', tags: [] };
        }

        return `
        <div class="flex-1 w-full max-w-4xl mx-auto px-4 py-8 flex flex-col h-full fade-in relative" id="editor-container" data-note-id="${note.id || 'new'}">
            
            <header class="flex items-center justify-between mb-4 pb-4 border-b border-slate-200 dark:border-border-custom relative z-10 transition-opacity" id="editor-header">
                <input type="text" id="editor-title" class="text-3xl font-bold bg-transparent border-none outline-none focus:ring-0 w-full placeholder:text-slate-300 dark:placeholder:text-slate-700" placeholder="Note Title Here..." value="${note.title}">
                <div class="flex items-center gap-2 shrink-0">
                     <span class="text-xs font-medium text-slate-400 opacity-0 transition-opacity" id="save-status">Saved</span>
                     
                     <div class="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1 ml-2">
                        <button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors bg-white dark:bg-slate-600 text-slate-900 dark:text-white shadow-sm" id="btn-mode-edit">Edit</button>
                        <button class="px-3 py-1.5 text-xs font-semibold rounded-md transition-colors text-slate-500 hover:text-slate-700 dark:hover:text-slate-300" id="btn-mode-preview">Preview</button>
                     </div>
                     
                     <button class="p-2 ml-2 hover:bg-slate-200 dark:hover:bg-primary/20 rounded-lg transition-colors text-slate-500" id="btn-delete-note" title="Delete Note">
                        <span class="material-symbols-outlined text-[20px] text-red-400">delete</span>
                    </button>
                </div>
            </header>

            <div class="flex gap-2 mb-4 transition-opacity" id="editor-tags-container">
               <span class="material-symbols-outlined text-slate-400 self-center">sell</span>
               <input type="text" id="editor-tags" class="text-sm bg-transparent border-none outline-none focus:ring-0 text-primary font-medium flex-1 placeholder:text-slate-400 dark:placeholder:text-slate-600" placeholder="Add tags separated by comma..." value="${note.tags.join(', ')}">
            </div>

            <div class="relative flex-1 flex flex-col w-full h-full pb-32">
                <textarea id="editor-content" class="absolute inset-0 w-full h-full bg-transparent border-none outline-none focus:ring-0 text-lg leading-relaxed text-slate-700 dark:text-slate-300 resize-none no-scrollbar placeholder:text-slate-300 dark:placeholder:text-slate-700 z-10 transition-opacity">${note.content}</textarea>
                
                <div id="editor-preview" class="absolute inset-0 w-full h-full overflow-y-auto no-scrollbar prose prose-slate dark:prose-invert max-w-none text-lg leading-relaxed opacity-0 pointer-events-none z-0">
                    <!-- Markdown gets compiled here -->
                </div>
            </div>

            <!-- Bottom floating toolbar -->
            <nav class="fixed bottom-24 md:bottom-20 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-40 transition-all duration-300 hover:-translate-y-2 opacity-90 hover:opacity-100" id="editor-toolbar">
                <div class="bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-slate-200 dark:border-primary/30 rounded-full px-4 py-2 flex items-center justify-between shadow-2xl">
                    <div class="flex items-center gap-1">
                        <button class="p-2 hover:bg-slate-100 dark:hover:bg-primary/20 rounded-full transition-colors group" data-format="bold" title="Bold (Ctrl+B)">
                            <span class="material-symbols-outlined block text-slate-600 dark:text-slate-300 group-hover:text-primary">format_bold</span>
                        </button>
                        <button class="p-2 hover:bg-slate-100 dark:hover:bg-primary/20 rounded-full transition-colors group" data-format="italic" title="Italic (Ctrl+I)">
                            <span class="material-symbols-outlined block text-slate-600 dark:text-slate-300 group-hover:text-primary">format_italic</span>
                        </button>
                        <button class="p-2 hover:bg-slate-100 dark:hover:bg-primary/20 rounded-full transition-colors group" data-format="link" title="Link (Ctrl+K)">
                            <span class="material-symbols-outlined block text-slate-600 dark:text-slate-300 group-hover:text-primary">link</span>
                        </button>
                        <button class="p-2 hover:bg-slate-100 dark:hover:bg-primary/20 rounded-full transition-colors group" data-format="list" title="Bulleted List">
                            <span class="material-symbols-outlined block text-slate-600 dark:text-slate-300 group-hover:text-primary">format_list_bulleted</span>
                        </button>
                    </div>
                     <div class="pl-3 border-l border-slate-200 dark:border-primary/20">
                        <button id="btn-focus-mode" class="flex items-center gap-2 bg-primary px-4 py-1.5 rounded-full text-white text-xs font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
                            <span class="material-symbols-outlined text-[16px]">visibility_off</span>
                            <span>FOCUS</span>
                        </button>
                    </div>
                </div>
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

        const btnEdit = container.querySelector('#btn-mode-edit');
        const btnPreview = container.querySelector('#btn-mode-preview');
        const btnDelete = container.querySelector('#btn-delete-note');
        const btnFocus = container.querySelector('#btn-focus-mode');
        const toolbar = container.querySelector('#editor-toolbar');

        let noteIdAttr = container.querySelector('#editor-container').getAttribute('data-note-id');
        let currentNoteId = noteIdAttr === 'new' ? null : noteIdAttr;

        // Undo/Redo History
        let history = [{ title: titleEl.value, content: contentEl.value, tags: tagsEl.value }];
        let historyIndex = 0;
        const MAX_HISTORY = 50;

        const pushHistory = () => {
            const state = { title: titleEl.value, content: contentEl.value, tags: tagsEl.value };
            // Simple string comparison to avoid spam
            if (JSON.stringify(state) === JSON.stringify(history[historyIndex])) return;

            history = history.slice(0, historyIndex + 1);
            history.push(state);
            if (history.length > MAX_HISTORY) history.shift();
            else historyIndex++;
        };

        const undo = () => {
            if (historyIndex > 0) {
                historyIndex--;
                const state = history[historyIndex];
                applyState(state);
                triggerSave(true); // silent
            }
        };

        const redo = () => {
            if (historyIndex < history.length - 1) {
                historyIndex++;
                const state = history[historyIndex];
                applyState(state);
                triggerSave(true);
            }
        };

        const applyState = (state) => {
            titleEl.value = state.title;
            contentEl.value = state.content;
            tagsEl.value = state.tags;
        };

        // Save Logic
        let saveTimeout;
        const triggerSave = (isSilent = false) => {
            statusEl.classList.remove('opacity-0');
            statusEl.textContent = "Saving...";
            clearTimeout(saveTimeout);

            saveTimeout = setTimeout(async () => {
                const title = titleEl.value.trim() || "Untitled Note";
                const content = contentEl.value;
                const tags = tagsEl.value.split(',').map(t => t.trim()).filter(Boolean);

                const noteObj = {
                    id: currentNoteId,
                    title: title,
                    content: content,
                    tags: tags,
                    updatedAt: Date.now()
                };

                const id = await db.saveNote(noteObj);
                const isNew = !currentNoteId;
                currentNoteId = id;

                if (isNew) {
                    window.AppRouter.navigate(`#/editor?id=${id}`, true); // SILENT Navigate
                    container.querySelector('#editor-container').setAttribute('data-note-id', id);
                    noteIdAttr = id;
                }

                statusEl.textContent = "Saved";
                setTimeout(() => { if (statusEl.textContent === "Saved") statusEl.classList.add('opacity-0'); }, 2000);
            }, 800);
        };

        const handleInput = () => {
            pushHistory();
            triggerSave();
        };

        titleEl.addEventListener('input', handleInput);
        contentEl.addEventListener('input', handleInput);
        tagsEl.addEventListener('input', handleInput);

        // Keyboard Shortcuts
        container.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;

            if (isCtrl && e.key === 's') {
                e.preventDefault();
                triggerSave();
            }
            if (isCtrl && e.key === 'z') {
                e.preventDefault();
                undo();
            }
            if (isCtrl && (e.key === 'y' || (e.shiftKey && e.key === 'Z'))) {
                e.preventDefault();
                redo();
            }
            if (isCtrl && e.key === 'b') {
                e.preventDefault();
                applyFormat('bold');
            }
            if (isCtrl && e.key === 'i') {
                e.preventDefault();
                applyFormat('italic');
            }
            if (isCtrl && e.key === 'k') {
                e.preventDefault();
                applyFormat('link');
            }
        });

        const applyFormat = (format) => {
            const start = contentEl.selectionStart;
            const end = contentEl.selectionEnd;
            const text = contentEl.value;
            const selected = text.substring(start, end);
            let replacement = "";

            if (format === 'bold') replacement = `**${selected || 'bold text'}**`;
            if (format === 'italic') replacement = `*${selected || 'italic text'}*`;
            if (format === 'link') replacement = `[${selected || 'link text'}](url)`;
            if (format === 'list') replacement = `\n- ${selected || 'list item'}`;

            contentEl.value = text.substring(0, start) + replacement + text.substring(end);
            contentEl.focus();
            contentEl.selectionStart = start + (selected ? replacement.length : replacement.length - (format === 'list' ? 0 : 2));
            contentEl.selectionEnd = contentEl.selectionStart;
            handleInput();
        };

        // Preview & Edit Toggle Logic
        btnPreview.addEventListener('click', () => {
            btnPreview.classList.add('bg-white', 'dark:bg-slate-600', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnPreview.classList.remove('text-slate-500');

            btnEdit.classList.remove('bg-white', 'dark:bg-slate-600', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnEdit.classList.add('text-slate-500');

            contentEl.classList.add('opacity-0', 'pointer-events-none');
            contentEl.classList.remove('z-10');

            previewEl.classList.remove('opacity-0', 'pointer-events-none', 'z-0');
            previewEl.classList.add('z-10');

            // Compile markdown
            const raw = contentEl.value;
            if (window.marked && window.DOMPurify) {
                previewEl.innerHTML = DOMPurify.sanitize(marked.parse(raw));
            } else {
                previewEl.innerHTML = "<p class='text-red-500'>Markdown rendering failed.</p>";
            }
        });

        btnEdit.addEventListener('click', () => {
            btnEdit.classList.add('bg-white', 'dark:bg-slate-600', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnEdit.classList.remove('text-slate-500');

            btnPreview.classList.remove('bg-white', 'dark:bg-slate-600', 'text-slate-900', 'dark:text-white', 'shadow-sm');
            btnPreview.classList.add('text-slate-500');

            previewEl.classList.add('opacity-0', 'pointer-events-none', 'z-0');
            previewEl.classList.remove('z-10');

            contentEl.classList.remove('opacity-0', 'pointer-events-none');
            contentEl.classList.add('z-10');
            contentEl.focus();
        });

        // Delete Logic
        btnDelete.addEventListener('click', async () => {
            if (confirm("Are you sure you want to delete this note?")) {
                clearTimeout(saveTimeout);
                if (currentNoteId) {
                    await db.deleteNote(currentNoteId);
                }
                window.AppRouter.navigate('#/');
            }
        });

        // Focus Mode Logic
        btnFocus.addEventListener('click', () => {
            document.body.classList.toggle('focus-mode');
            const isFocus = document.body.classList.contains('focus-mode');
            btnFocus.querySelector('span:last-child').textContent = isFocus ? "UNFOCUS" : "FOCUS";
            container.querySelector('#editor-tags-container').classList.toggle('opacity-0');
        });

        // Toolbar formatting logic
        toolbar.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                applyFormat(btn.getAttribute('data-format'));
            });
        });

        // Auto focus content slightly delayed
        setTimeout(() => contentEl.focus(), 100);
    }
}
