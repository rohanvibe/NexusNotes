import { db } from '../db/indexeddb.js';
import { events } from '../core/events.js';

export const DashboardComponent = {
    async render() {
        const notes = await db.getAllNotes();
        const edges = await db.getAll('edges');

        // Quantitative Assessment
        const last24hCount = notes.filter(n => (Date.now() - n.updatedAt) < 24 * 60 * 60 * 1000).length;
        const allTags = [...new Set(notes.flatMap(n => n.tags || []))].sort();
        const displayNotes = notes.sort((a, b) => b.updatedAt - a.updatedAt);
        const vaultStatus = db.isEncrypted ? 'ENCRYPTED' : 'TRANSPARENT';

        return `
        <div class="w-full max-w-5xl mx-auto px-6 py-10 space-y-12 fade-in pb-32">
            
            <!-- Contextual Dashboard Header -->
            <header class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-border-custom pb-8">
                <div class="space-y-1">
                    <div class="flex items-center gap-2">
                        <span class="material-symbols-outlined text-primary text-sm animate-pulse">sensors</span>
                        <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Knowledge Operations Center</h2>
                    </div>
                    <h1 class="text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 uppercase">Nexus Terminal</h1>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl" title="Shortcut Insight">
                         <span class="text-[9px] font-black text-slate-400 uppercase tracking-widest">CMD + P</span>
                         <span class="text-[9px] font-black text-primary uppercase tracking-widest">COMMAND PALETTE</span>
                    </div>
                </div>
            </header>

            <!-- Diagnostic Pulse -->
            <section class="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div class="p-6 rounded-3xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom space-y-4">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Synapses</p>
                    <div class="flex items-end justify-between">
                        <p class="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">${notes.length}</p>
                        <span class="text-[10px] font-bold text-primary uppercase">Active</span>
                    </div>
                    <div class="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-primary" style="width: ${Math.min((notes.length / 50) * 100, 100)}%"></div>
                    </div>
                </div>

                <div class="p-6 rounded-3xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom space-y-4">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Semantic Links</p>
                    <div class="flex items-end justify-between">
                        <p class="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">${edges.length}</p>
                        <span class="text-[10px] font-bold text-indigo-500 uppercase">Tied</span>
                    </div>
                    <div class="h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500" style="width: ${Math.min((edges.length / 10) * 100, 100)}%"></div>
                    </div>
                </div>

                <div class="p-6 rounded-3xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom space-y-4">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Daily Increment</p>
                    <div class="flex items-end justify-between">
                        <p class="text-4xl font-black text-primary tracking-tighter">+${last24hCount}</p>
                        <span class="text-[10px] font-bold text-slate-400 uppercase">Input</span>
                    </div>
                    <p class="text-[9px] text-slate-500 uppercase font-black">24H CYCLE</p>
                </div>

                <div class="p-6 rounded-3xl bg-slate-900 dark:bg-slate-custom border border-slate-800 dark:border-border-custom space-y-4">
                    <p class="text-[10px] font-black uppercase tracking-widest text-slate-400">Vault Security</p>
                    <div class="flex items-end justify-between">
                        <p class="text-xl font-black text-white uppercase tracking-tighter">${vaultStatus}</p>
                        <span class="material-symbols-outlined text-sm ${db.isEncrypted ? 'text-amber-500' : 'text-slate-500'}">${db.isEncrypted ? 'verified_user' : 'no_encryption'}</span>
                    </div>
                    <p class="text-[9px] text-slate-500 uppercase font-black">LOCAL HOSTED</p>
                </div>
            </section>

            <!-- Quick Capture Engine -->
            <section class="relative group">
                <div class="absolute -inset-1 bg-gradient-to-r from-primary/30 to-indigo-500/30 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
                <div class="relative p-8 rounded-[2.5rem] bg-white dark:bg-slate-custom border-2 border-slate-100 dark:border-border-custom shadow-2xl space-y-6">
                    <div class="flex items-center justify-between">
                        <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Rapid Data Ingestion</h3>
                        <div class="flex gap-2">
                             <span class="text-[9px] font-black text-slate-300 uppercase tracking-widest">CMD + ENTER TO COMMIT</span>
                        </div>
                    </div>
                    <textarea id="quick-capture-input" class="w-full bg-transparent border-none focus:ring-0 text-2xl font-black text-slate-900 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-800 resize-none h-24 no-scrollbar" placeholder="Initiate thought stream..."></textarea>
                    <div class="flex items-center justify-between border-t border-slate-100 dark:border-border-custom pt-6">
                        <div class="flex items-center gap-4">
                            <button class="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"><span class="material-symbols-outlined text-lg">sell</span> TAG</button>
                            <button class="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-primary transition-colors uppercase tracking-widest"><span class="material-symbols-outlined text-lg">link</span> REFERENCE</button>
                        </div>
                        <button id="quick-capture-btn" class="px-10 py-4 bg-primary rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                             Archive Stream
                        </button>
                    </div>
                </div>
            </section>

            <!-- Knowledge Repository -->
            <section class="space-y-8">
                <div class="flex items-center justify-between px-2">
                    <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Semantic Library</h2>
                    <div class="flex gap-2 overflow-x-auto no-scrollbar" id="category-scroller">
                        <button class="category-chip px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-primary text-white" data-category="all">ALL ENTITIES</button>
                        ${allTags.map(tag => `
                            <button class="category-chip px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom text-slate-400 hover:border-primary/50" data-category="${tag}">${tag}</button>
                        `).join('')}
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="notes-grid">
                    ${displayNotes.map(n => `
                        <a href="#/editor?id=${n.id}" data-route="#/editor?id=${n.id}" data-tags="${(n.tags || []).join(',')}" class="note-card bg-white dark:bg-slate-custom border border-slate-100 dark:border-border-custom rounded-[2rem] p-8 hover:border-primary/50 transition-all hover:shadow-2xl hover:shadow-primary/5 group relative overflow-hidden">
                            <div class="flex items-start justify-between mb-8">
                                <div class="size-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center group-hover:bg-primary transition-all">
                                    <span class="material-symbols-outlined text-slate-400 group-hover:text-white">description</span>
                                </div>
                                <span class="text-[9px] font-black text-slate-300 uppercase tracking-tighter">${new Date(n.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <h3 class="text-xl font-black text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors uppercase tracking-tighter line-clamp-1 mb-2">${n.title || 'Untitled'}</h3>
                            <p class="text-xs font-bold text-slate-400 line-clamp-2 leading-relaxed uppercase tracking-wide opacity-80">${n.content.substring(0, 100)}</p>
                            <div class="mt-8 flex items-center gap-2">
                                ${(n.tags || []).slice(0, 2).map(t => `<span class="text-[8px] font-black px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded uppercase text-slate-500">#${t}</span>`).join('')}
                            </div>
                            <div class="absolute -right-4 -bottom-4 size-24 bg-primary/5 rounded-full blur-2xl group-hover:bg-primary/10 transition-all"></div>
                        </a>
                    `).join('')}
                </div>
            </section>
        </div>
        `;
    },

    onRender(container) {
        // Quick Capture Injection
        const captureBtn = container.querySelector('#quick-capture-btn');
        const captureInput = container.querySelector('#quick-capture-input');

        const commitStream = async () => {
            const content = captureInput.value.trim();
            if (!content) return;
            const title = content.split('\n')[0].substring(0, 40);
            await db.saveNote({ title, content, tags: ['stream'] });
            captureInput.value = '';
            window.location.reload();
        };

        captureBtn.onclick = commitStream;
        captureInput.onkeydown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') commitStream();
        };

        // Category Filtering
        const chips = container.querySelectorAll('.category-chip');
        const cards = container.querySelectorAll('.note-card');

        chips.forEach(chip => {
            chip.onclick = () => {
                const cat = chip.getAttribute('data-category');
                chips.forEach(c => c.classList.replace('bg-primary', 'bg-white'));
                chips.forEach(c => c.classList.remove('text-white'));
                chip.classList.replace('bg-white', 'bg-primary');
                chip.classList.add('text-white');

                cards.forEach(card => {
                    const tags = card.getAttribute('data-tags').split(',');
                    card.classList.toggle('hidden', cat !== 'all' && !tags.includes(cat));
                });
            };
        });
    }
}
