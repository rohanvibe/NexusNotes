import { Router } from './core/router.js';
import { events } from './core/events.js';
import { db } from './db/indexeddb.js';
import { syncEngine } from './core/sync.js';

// Import Components
import { DashboardComponent } from './components/dashboard.js';
import { EditorComponent } from './components/editor.js';
import { GraphComponent } from './components/graph.js';
import { VaultManagerComponent } from './components/vault-manager.js';
import { SettingsComponent } from './components/settings.js';

// Define Route Handlers
const routes = [
    {
        path: '/',
        handler: async () => await DashboardComponent.render(),
        onRender: (container) => DashboardComponent.onRender && DashboardComponent.onRender(container)
    },
    {
        path: '/editor',
        handler: async () => await EditorComponent.render(),
        onRender: (container) => EditorComponent.onRender && EditorComponent.onRender(container)
    },
    {
        path: '/graph',
        handler: async () => await GraphComponent.render(),
        onRender: (container) => GraphComponent.onRender && GraphComponent.onRender(container)
    },
    {
        path: '/vaults',
        handler: async () => await VaultManagerComponent.render(),
        onRender: (container) => VaultManagerComponent.onRender && VaultManagerComponent.onRender(container)
    },
    {
        path: '/settings',
        handler: async () => await SettingsComponent.render(),
        onRender: (container) => SettingsComponent.onRender && SettingsComponent.onRender(container)
    },
    {
        path: '*',
        handler: async () => `<div class="p-6 flex items-center justify-center"><h2>Page Not Found</h2></div>`
    }
];

// Initialize App
const initApp = async () => {
    console.log('[App] Initializing Stitch...');

    // 1. Initial UI Setup (Theme)
    const initTheme = () => {
        const themeBtn = document.getElementById('btn-theme-toggle');
        const themeIcon = document.getElementById('theme-icon');

        const updateIcon = (isDark) => {
            if (themeIcon) themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode';
        };

        const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        updateIcon(isDark);

        themeBtn?.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            const isNowDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
            updateIcon(isNowDark);
            events.emit('theme:changed', isNowDark);
        });
    };
    initTheme();

    // 1.5 Initialize Accent Colors
    const initAccent = () => {
        const savedAccent = localStorage.getItem('accent-color') || '#7c3bed';
        document.documentElement.style.setProperty('--primary-color', savedAccent);
        // Add style tag for tailwind override
        const style = document.createElement('style');
        style.id = 'accent-style';
        style.innerHTML = `
            .text-primary { color: ${savedAccent} !important; }
            .bg-primary { background-color: ${savedAccent} !important; }
            .border-primary { border-color: ${savedAccent} !important; }
            .ring-primary { --tw-ring-color: ${savedAccent} !important; }
        `;
        document.head.appendChild(style);
    };
    initAccent();

    // 1.6 Global Search Logic
    const initSearch = () => {
        const searchBtn = document.getElementById('btn-global-search');
        const overlay = document.getElementById('search-overlay');
        const input = document.getElementById('global-search-input');
        const resultsContainer = document.getElementById('search-results');

        const toggleSearch = (show) => {
            overlay.classList.toggle('hidden', !show);
            if (show) input.focus();
        };

        searchBtn?.addEventListener('click', () => toggleSearch(true));
        overlay?.addEventListener('click', (e) => {
            if (e.target === overlay) toggleSearch(false);
        });

        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                toggleSearch(true);
            }
            if (e.key === 'Escape') toggleSearch(false);
        });

        input?.addEventListener('input', async (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) {
                resultsContainer.innerHTML = '<div class="p-8 text-center text-slate-400 italic">Type to search...</div>';
                return;
            }

            const notes = await db.getAllNotes();
            const results = notes.filter(n =>
                n.title.toLowerCase().includes(query) ||
                n.content.toLowerCase().includes(query) ||
                n.tags.some(t => t.toLowerCase().includes(query))
            );

            if (results.length === 0) {
                resultsContainer.innerHTML = '<div class="p-8 text-center text-slate-400 italic">No results found for "' + query + '"</div>';
            } else {
                resultsContainer.innerHTML = results.map(n => `
                    <a href="#/editor?id=${n.id}" data-route="#/editor?id=${n.id}" class="block p-4 hover:bg-slate-50 dark:hover:bg-slate-custom/50 rounded-xl transition-colors border-b border-slate-100 dark:border-border-custom last:border-none">
                        <div class="font-bold text-sm">${n.title || 'Untitled'}</div>
                        <div class="text-xs text-slate-500 truncate">${n.content.substring(0, 80)}...</div>
                    </a>
                `).join('');

                // Re-bind SPA links in search
                resultsContainer.querySelectorAll('a').forEach(a => {
                    a.addEventListener('click', () => toggleSearch(false));
                });
            }
        });
    };
    initSearch();

    // 2. Initialize Database
    try {
        await db.init();
        console.log('[App] Database ready');
    } catch (err) {
        console.error('[App] Fatal: Initializing database failed:', err);
        document.getElementById('app-root').innerHTML = `
            <div class="flex-1 flex flex-col items-center justify-center text-red-500 p-8 text-center">
                <span class="material-symbols-outlined text-5xl mb-4">error</span>
                <h2 class="text-2xl font-bold mb-2">Storage Error</h2>
                <p>Failed to initialize local IndexedDB storage. You may be in incognito mode or your browser is restricting access.</p>
            </div>
        `;
        return;
    }

    // 3. Register Service Worker
    if ('serviceWorker' in navigator) {
        try {
            const registration = await navigator.serviceWorker.register('./service-worker.js');
            console.log('[Service Worker] Registered with scope:', registration.scope);
        } catch (error) {
            console.error('[Service Worker] Registration failed:', error);
        }
    }

    // 4. Initialize Sync Engine
    await syncEngine.loadQueue();

    // 5. Initialize Router
    const router = new Router(routes);
    await router.init();

    // Attach router to window for global access if needed (e.g. from components)
    window.AppRouter = router;

    console.log('[App] Stitch Initialized Successfully.');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
