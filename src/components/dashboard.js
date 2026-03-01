import { db } from '../db/indexeddb.js';

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

        // Logic for workspace pulse
        const last24hCount = notes.filter(n => (Date.now() - n.updatedAt) < 24 * 60 * 60 * 1000).length;
        const recentNotes = notes.sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 10);

        return `
        <div class="w-full max-w-4xl mx-auto px-4 py-6 space-y-8 fade-in">
            <!-- Quick Actions -->
            <section class="overflow-x-auto no-scrollbar pb-2">
                <div class="flex gap-3">
                    <a href="#/editor?id=new" data-route="#/editor" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white border border-primary hover:bg-primary/90 transition-all shrink-0 cursor-pointer shadow-lg shadow-primary/20" id="btn-new-note">
                        <span class="material-symbols-outlined text-xl fill-icon">add</span>
                        <span class="font-medium text-sm">New Note</span>
                    </a>
                    <a href="#/vaults" data-route="#/vaults" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-custom border border-slate-300 dark:border-border-custom hover:border-primary/50 transition-all shrink-0">
                        <span class="material-symbols-outlined text-primary text-xl">account_balance_wallet</span>
                        <span class="font-medium text-sm">Vaults</span>
                    </a>
                    <a href="#/graph" data-route="#/graph" class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-custom border border-slate-300 dark:border-border-custom hover:border-primary/50 transition-all shrink-0">
                        <span class="material-symbols-outlined text-primary text-xl">hub</span>
                        <span class="font-medium text-sm">Graph</span>
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
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">link</span>
                                </button>
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">sell</span>
                                </button>
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">mic</span>
                                </button>
                                <button class="p-2 text-slate-500 hover:text-primary transition-colors">
                                    <span class="material-symbols-outlined">image</span>
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
                <h2 class="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4 px-1">Workspace Pulse</h2>
                <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-xs text-slate-500 mb-1">Total Nodes</p>
                        <p class="text-2xl font-bold">${notes.length}</p>
                        <div class="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-primary h-full" style="width: ${Math.min((notes.length / 50) * 100, 100)}%"></div>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-xs text-slate-500 mb-1">Active Sync</p>
                        <p class="text-2xl font-bold flex items-center gap-2">
                            ${navigator.onLine ? 'Online' : 'Offline'}
                        </p>
                        <div class="flex items-center gap-1 mt-2">
                            <span class="size-2 ${navigator.onLine ? 'bg-green-500' : 'bg-amber-500'} rounded-full animate-pulse"></span>
                            <span class="text-[10px] ${navigator.onLine ? 'text-green-500' : 'text-amber-500'} uppercase font-bold">Stable</span>
                        </div>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-xs text-slate-500 mb-1">Recent Notes</p>
                        <p class="text-2xl font-bold text-primary">+${last24hCount}</p>
                        <p class="text-[10px] text-slate-500 mt-2 italic">Last 24 hours</p>
                    </div>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom p-4 rounded-xl">
                        <p class="text-xs text-slate-500 mb-1">Storage</p>
                        <p class="text-2xl font-bold">${storageUsage}</p>
                        <div class="mt-2 h-1 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div class="bg-indigo-400 h-full w-[42%]"></div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- Recent Activity -->
            <section>
                <div class="flex items-center justify-between mb-4 px-1">
                    <h2 class="text-sm font-semibold uppercase tracking-widest text-slate-500">Recent Activity</h2>
                    <a href="#/editor" data-route="#/editor" class="text-xs text-primary font-medium hover:underline">View All</a>
                </div>
                <div class="space-y-3" id="recent-notes-list">
                    ${recentNotes.length === 0 ? `
                        <div class="p-8 text-center text-slate-500 bg-white dark:bg-slate-custom rounded-xl border border-dashed border-slate-300 dark:border-border-custom">
                            No activity found. Capture a thought to begin!
                        </div>
                    ` : recentNotes.map(n => {
            const isHeading = n.content?.startsWith('# ');
            const icon = n.tags?.includes('article') ? 'article' : (n.tags?.includes('voice') ? 'mic' : (n.tags?.includes('link') ? 'link' : 'description'));
            const timeString = new Date(n.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            return `
                        <a href="#/editor?id=${n.id}" data-route="#/editor" class="group flex items-center gap-4 p-4 bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl hover:border-primary/40 transition-colors cursor-pointer block">
                            <div class="size-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                <span class="material-symbols-outlined">${icon}</span>
                            </div>
                            <div class="flex-1 min-w-0">
                                <h4 class="font-semibold text-sm truncate">${n.title || n.content?.substring(0, 30) || 'Untitled'}</h4>
                                <div class="flex items-center gap-2 mt-1">
                                    ${n.tags ? n.tags.slice(0, 3).map(t => `<span class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-500">#${t}</span>`).join('') : ''}
                                    <span class="text-[10px] text-slate-400 ml-2">${timeString}</span>
                                </div>
                            </div>
                            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pr-2">
                                <span class="material-symbols-outlined text-slate-400">arrow_forward_ios</span>
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

        // Quick Capture Logic
        const captureBtn = document.getElementById('quick-capture-btn');
        const captureInput = document.getElementById('quick-capture-input');

        if (captureBtn && captureInput) {
            captureBtn.addEventListener('click', async () => {
                const content = captureInput.value.trim();
                if (!content) return;

                // Create a basic title from first 30 chars
                const title = content.split('\\n')[0].substring(0, 30);

                const newNote = {
                    title: title,
                    content: content,
                    tags: ['quick-capture'],
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                };

                await db.saveNote(newNote);
                captureInput.value = '';

                // Refresh dashboard to show new note
                window.AppRouter.handleRoute(window.location.hash || '#/');
            });
        }
    }
}
