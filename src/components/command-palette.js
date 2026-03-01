import { db } from '../db/indexeddb.js';

export const CommandPalette = {
    isOpen: false,

    async render() {
        return `
        <div id="command-palette-overlay" class="fixed inset-0 bg-background-dark/80 backdrop-blur-xl z-[100] hidden flex flex-col items-center pt-32 px-4 fade-in">
            <div class="w-full max-w-xl bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
                <div class="p-6 border-b border-slate-200 dark:border-border-custom flex items-center gap-4">
                    <span class="material-symbols-outlined text-primary text-2xl">terminal</span>
                    <input type="text" id="command-palette-input" placeholder="Execute command or jump to entity..." 
                           class="w-full bg-transparent border-none outline-none focus:ring-0 text-xl font-black placeholder:text-slate-300 dark:placeholder:text-slate-700">
                    <kbd class="text-[10px] bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-400 font-bold">ESC</kbd>
                </div>
                <div id="command-palette-results" class="max-h-[50vh] overflow-y-auto no-scrollbar py-2">
                    <div class="p-8 text-center text-slate-400 italic text-xs uppercase tracking-widest font-black">Waiting for directive...</div>
                </div>
                <div class="px-6 py-3 bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest border-t border-slate-100 dark:border-border-custom">
                    <span>↑↓ TO NAVIGATE</span>
                    <span>ENTER TO EXECUTE</span>
                    <span>⌘ P TO ACCESS</span>
                </div>
            </div>
        </div>
        `;
    },

    init() {
        // Global shortcut
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
                e.preventDefault();
                this.toggle(true);
            }
            if (e.key === 'Escape') this.toggle(false);
        });

        const overlay = document.getElementById('command-palette-overlay');
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) this.toggle(false);
        });
    },

    toggle(show) {
        const overlay = document.getElementById('command-palette-overlay');
        const input = document.getElementById('command-palette-input');
        if (!overlay || !input) return;

        this.isOpen = show;
        overlay.classList.toggle('hidden', !show);
        if (show) {
            input.value = '';
            input.focus();
            this.search('');
        }
    },

    async search(query) {
        const resultsContainer = document.getElementById('command-palette-results');
        if (!resultsContainer) return;

        const allNotes = await db.getAllNotes();
        const commands = [
            { icon: 'add', title: 'New Note', action: () => window.AppRouter.navigate('#/editor?id=new') },
            { icon: 'hub', title: 'Recenter Graph', action: () => window.AppRouter.navigate('#/graph') },
            { icon: 'inventory_2', title: 'Open Vaults', action: () => window.AppRouter.navigate('#/vaults') },
            { icon: 'settings', title: 'System Settings', action: () => window.AppRouter.navigate('#/settings') },
            { icon: 'lock', title: 'Lock Vault', action: () => { db.vaultKey = null; location.reload(); } }
        ];

        let filtered = [];

        if (!query) {
            filtered = commands.map(c => ({ ...c, type: 'cmd' }));
        } else {
            const matches = allNotes.filter(n => n.title.toLowerCase().includes(query.toLowerCase()));
            filtered = [
                ...commands.filter(c => c.title.toLowerCase().includes(query.toLowerCase())).map(c => ({ ...c, type: 'cmd' })),
                ...matches.map(n => ({ icon: 'description', title: n.title || 'Untitled', action: () => window.AppRouter.navigate(`#/editor?id=${n.id}`), type: 'note' }))
            ];
        }

        resultsContainer.innerHTML = filtered.map((f, idx) => `
            <div class="palette-item group flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-primary/5 transition-all border-l-4 border-transparent hover:border-primary" 
                 data-idx="${idx}">
                <div class="flex items-center gap-4">
                    <span class="material-symbols-outlined text-sm ${f.type === 'cmd' ? 'text-primary' : 'text-slate-400'}">${f.icon}</span>
                    <span class="text-xs font-bold ${f.type === 'cmd' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'} uppercase tracking-wider">${f.title}</span>
                </div>
                ${f.type === 'cmd' ? '<span class="text-[9px] font-black text-primary/50 uppercase tracking-widest">COMMAND</span>' : ''}
            </div>
        `).join('');

        // Bind clicks
        resultsContainer.querySelectorAll('.palette-item').forEach((item, idx) => {
            item.onclick = () => {
                filtered[idx].action();
                this.toggle(false);
            };
        });
    },

    handleInput(e) {
        this.search(e.target.value);
    }
};
