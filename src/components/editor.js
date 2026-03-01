import { db } from '../db/indexeddb.js';

export const EditorComponent = {
    async render() {
        // Parse URL params query
        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const noteId = urlParams.get('id');
        let note = null;

        if (noteId) {
            note = await db.getNote(noteId);
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

        // Save Logic
        let saveTimeout;
        const triggerSave = () => {
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
                currentNoteId = id;

                if (noteIdAttr === 'new') {
                    window.location.hash = `#/editor?id=${id}`;
                    container.querySelector('#editor-container').setAttribute('data-note-id', id);
                    noteIdAttr = id;
                }

                statusEl.textContent = "Saved";
                setTimeout(() => { statusEl.classList.add('opacity-0'); }, 2000);
            }, 800);
        };

        titleEl.addEventListener('input', triggerSave);
        contentEl.addEventListener('input', triggerSave);
        tagsEl.addEventListener('input', triggerSave);

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
                previewEl.innerHTML = "<p class='text-red-500'>Markdown rendering failed. Connecting online might be needed.</p>";
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
            if (confirm("Are you sure you want to delete this note? This action cannot be undone.")) {
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
            // Optional: Hide tags container too
            container.querySelector('#editor-tags-container').classList.toggle('opacity-0');
        });

        // Disable focus mode when leaving route
        const clearFocus = () => document.body.classList.remove('focus-mode');
        window.addEventListener('popstate', clearFocus, { once: true });

        // Toolbar formatting logic
        toolbar.querySelectorAll('[data-format]').forEach(btn => {
            btn.addEventListener('click', () => {
                const format = btn.getAttribute('data-format');
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
                contentEl.selectionStart = start + replacement.length;
                contentEl.selectionEnd = start + replacement.length;
                triggerSave();
            });
        });

        // Auto focus content slightly delayed
        setTimeout(() => contentEl.focus(), 100);
    }
}
