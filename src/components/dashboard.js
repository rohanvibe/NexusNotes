import { db } from '../db/indexeddb.js';
import { events } from '../core/events.js';

export const DashboardComponent = {
    async render() {
        const notes = await db.getAllNotes();
        const edges = await db.getAll('edges');

        // Calculate storage size roughly
        let storageBytes = 0;
        try {
            const dataDump = JSON.stringify(notes) + JSON.stringify(edges);
            storageBytes = new TextEncoder().encode(dataDump).length;
        } catch (e) { }

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };
        const storageUsage = formatBytes(storageBytes);

        // Metadata extraction
        const last24hCount = notes.filter(n => (Date.now() - n.updatedAt) < 24 * 60 * 60 * 1000).length;

        // Extract all unique tags for the category system
        const allTags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
        const displayNotes = notes.sort((a, b) => b.updatedAt - a.updatedAt);

        return `
        <div class="w-full max-w-4xl mx-auto px-4 py-6 space-y-8 fade-in">
            <!-- Quick Actions -->
            <section class="overflow-x-auto no-scrollbar pb-2">
                <div class="flex gap-3">
                    <a href="#/editor?id=new" data-route="#/editor?id=new" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white border border-primary hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-lg shadow-primary/20" id="btn-new-note">
                        <span class="material-symbols-outlined text-xl fill-icon">add</span>
                        <span class="font-medium text-sm">New Note</span>
                    </a>
                    <a href="#/vaults" data-route="#/vaults" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom hover:border-primary/50 transition-all shrink-0">
                        <span class="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Vaults</span>
                    </a>
                    <a href="#/graph" data-route="#/graph" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom hover:border-primary/50 transition-all shrink-0">
                        <span class="material-symbols-outlined text-primary text-xl">hub</span>
                        <span class="font-medium text-sm text-slate-700 dark:text-slate-300">Graph</span>
                    </a>
                </div>
            </section>

            <!-- Capture Area -->
            <section class="w-full">
                <div class="relative group">
                    <div class="absolute -inset-0.5 bg-gradient-to-r from-primary/20 to-indigo-500/20 rounded-xl blur opacity-30 group-hover:opacity-50 transition duration-1000"></div>
                    <div class="relative bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl p-4 shadow-sm">
                        <textarea id="quick-capture-input" class="w-full bg-transparent border-none focus:ring-0 text-lg placeholder:text-slate-400 dark:placeholder:text-slate-600 resize-none h-24 mb-4" placeholder="Brain Dump..."></textarea>
                        <div class="flex items-center justify-between">
                            <div class="flex items-center gap-1">
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors" title="Insert Link">
                                    <span class="material-symbols-outlined">link</span>
                                </button>
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors" title="Add Tag">
                                    <span class="material-symbols-outlined">sell</span>
                                </button>
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors" title="Voice Note">
                                    <span class="material-symbols-outlined">mic</span>
                                </button>
                            </div>
                            <button id="quick-capture-btn" class="bg-primary hover:bg-primary/90 text-white px-6 py-2 rounded-lg font-semibold text-sm transition-all shadow-lg shadow-primary/20">
                                Capture
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Workspace Pulse -->
            <section>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Knowledge Density</p>
                        <p class="text-2xl font-black">${notes.length}</p>
                        <div class="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-primary h-full" style="width: ${Math.min((notes.length / 100) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Network Links</p>
                        <p class="text-2xl font-black">${edges.length}</p>
                        <div class="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-indigo-500 h-full" style="width: ${Math.min((edges.length / 50) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Recent Growth</p>
                        <p class="text-2xl font-black text-primary">+${last24hCount}</p>
                        <p class="text-[10px] text-slate-500 mt-2 italic flex items-center gap-1">
                            <span class="size-1.5 bg-primary rounded-full animate-pulse"></span>
                            Last 24 hours
                        </p>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Local Footprint</p>
                        <p class="text-2xl font-black">${storageUsage}</p>
                        <div class="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-slate-300 dark:bg-slate-600 h-full w-[15%]"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Knowledge Library Section -->
            <section class="space-y-6">
                <div class="flex items-center justify-between px-1">
                    <h2 class="text-lg font-bold tracking-tight">Your Knowledge</h2>
                    <a href="#/editor?id=new" class="text-xs text-primary font-bold hover:underline">New Note</a>
                </div>

                <!-- Category Navigation -->
                <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2 pt-1" id="category-scroller">
                    <button class="category-chip px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap bg-primary text-white active" data-category="all">
                        All Notes
                    </button>
                    ${allTags.map(tag => `
                        <button class="category-chip px-4 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom text-slate-500 hover:border-primary/40" data-category="${tag}">
                            #${tag}
                        </button>
                    `).join('')}
                </div>

                <!-- Notes Grid/List -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4" id="notes-grid">
                    ${displayNotes.length === 0 ? `
                        <div class="p-12 text-center text-slate-500 bg-white dark:bg-slate-custom rounded-2xl border border-dashed border-slate-300 dark:border-border-custom col-span-full">
                            <span class="material-symbols-outlined text-4xl mb-2 opacity-20">inventory_2</span>
                            <p class="font-medium">The vault is quiet.</p>
                            <p class="text-xs mt-1">Capture your first thought to begin the web.</p>
                        </div>
                    ` : displayNotes.map(n => {
            const icon = n.tags?.includes('article') ? 'article' : (n.tags?.includes('voice') ? 'mic' : (n.tags?.includes('link') ? 'link' : 'description'));
            const dateString = new Date(n.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            const tagClasses = (n.tags || []).map(t => 'cat-' + t).join(' ');

            return `
                        <a href="#/editor?id=${n.id}" data-route="#/editor?id=${n.id}" data-tags="${(n.tags || []).join(',')}" 
                           class="note-card group flex flex-col p-5 bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-2xl hover:border-primary/50 transition-all hover:shadow-xl hover:shadow-primary/5 cursor-pointer ${tagClasses}">
                            <div class="flex items-start justify-between mb-3">
                                <div class="size-10 rounded-xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                                    <span class="material-symbols-outlined">${icon}</span>
                                </div>
                                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">${dateString}</span>
                            </div>
                            <h4 class="font-bold text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-1 mb-1">${n.title || 'Untitled'}</h4>
                            <p class="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">${n.content?.substring(0, 100) || 'No additional content...'}</p>
                            <div class="flex items-center gap-1 mt-auto overflow-hidden">
                                ${n.tags ? n.tags.slice(0, 3).map(t => `
                                    <span class="text-[9px] font-black bg-slate-100 dark:bg-slate-800/50 px-2 py-0.5 rounded text-slate-500 uppercase">#${t}</span>
                                `).join('') : ''}
                                ${n.tags && n.tags.length > 3 ? `<span class="text-[9px] text-slate-400 font-bold">+${n.tags.length - 3}</span>` : ''}
                            </div>
                        </a>
                        `;
        }).join('')}
                </div>
            </section>
        </div>
        `;
    },

    onRender(container) {
        // Event listener for online/offline metric toggle
        const refreshRoute = () => window.AppRouter.handleRoute(window.location.hash || '#/');
        window.addEventListener('online', refreshRoute);
        window.addEventListener('offline', refreshRoute);

        // Cleanup to avoid memory leaks
        events.once('route:change:start', () => {
            window.removeEventListener('online', refreshRoute);
            window.removeEventListener('offline', refreshRoute);
        });

        // Quick Capture Logic
        const captureBtn = document.getElementById('quick-capture-btn');
        const captureInput = document.getElementById('quick-capture-input');

        if (captureBtn && captureInput) {
            const doCapture = async () => {
                const content = captureInput.value.trim();
                if (!content) return;

                const title = content.split('\n')[0].substring(0, 30);
                const newNote = {
                    title: title,
                    content: content,
                    tags: ['quick-capture'],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                await db.saveNote(newNote);
                captureInput.value = '';
                window.AppRouter.handleRoute(window.location.hash || '#/');
            };

            captureBtn.addEventListener('click', doCapture);

            captureInput.addEventListener('keydown', (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    e.preventDefault();
                    doCapture();
                }
            });

            container.querySelectorAll('button').forEach(btn => {
                const icon = btn.querySelector('.material-symbols-outlined');
                if (!icon) return;

                if (icon.textContent === 'link') {
                    btn.onclick = () => { captureInput.value += '[link text](url)'; captureInput.focus(); }
                }
                if (icon.textContent === 'sell') {
                    btn.onclick = () => { captureInput.value += ' #tag '; captureInput.focus(); }
                }
                if (icon.textContent === 'mic') {
                    btn.onclick = () => { alert("Voice capture is coming in the next update!"); }
                }
            });
        }

        // --- Category System Logic ---
        const chips = container.querySelectorAll('.category-chip');
        const cards = container.querySelectorAll('.note-card');

        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                const category = chip.getAttribute('data-category');

                // UI Update: Toggle active state on chips
                chips.forEach(c => {
                    c.classList.remove('bg-primary', 'text-white', 'active');
                    c.classList.add('bg-white', 'dark:bg-slate-custom', 'text-slate-500');
                });
                chip.classList.add('bg-primary', 'text-white', 'active');
                chip.classList.remove('bg-white', 'dark:bg-slate-custom', 'text-slate-500');

                // Filter Cards
                cards.forEach(card => {
                    if (category === 'all') {
                        card.classList.remove('hidden');
                    } else {
                        const tags = (card.getAttribute('data-tags') || '').split(',');
                        if (tags.includes(category)) {
                            card.classList.remove('hidden');
                        } else {
                            card.classList.add('hidden');
                        }
                    }
                });
            });
        });
    }
}
