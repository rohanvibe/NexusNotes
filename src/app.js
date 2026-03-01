import { Router } from './core/router.js';
import { events } from './core/events.js';
import { db } from './db/indexeddb.js';
import { syncEngine } from './core/sync.js';

// Import Components & Engines
import { DashboardComponent } from './components/dashboard.js';
import { EditorComponent } from './components/editor.js';
import { GraphComponent } from './components/graph.js';
import { VaultManagerComponent } from './components/vault-manager.js';
import { SettingsComponent } from './components/settings.js';
import { CommandPalette } from './components/command-palette.js';
import { VaultUnlockComponent } from './components/vault-unlock.js';

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
    console.log('[Nexus] Booting Knowledge OS...');

    // 1. Initial UI Setup (Theme & Accent)
    const initTheme = () => {
        const themeBtn = document.getElementById('btn-theme-toggle');
        const themeIcon = document.getElementById('theme-icon');
        const updateIcon = (isDark) => { if (themeIcon) themeIcon.textContent = isDark ? 'light_mode' : 'dark_mode'; };
        const isDark = localStorage.getItem('theme') === 'dark' || (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
        document.documentElement.classList.toggle('dark', isDark);
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

    const initAccent = () => {
        const savedAccent = localStorage.getItem('accent-color') || '#7c3bed';
        document.documentElement.style.setProperty('--primary-color', savedAccent);
        const style = document.createElement('style');
        style.id = 'accent-style';
        style.innerHTML = `.text-primary { color: ${savedAccent} !important; } .bg-primary { background-color: ${savedAccent} !important; } .border-primary { border-color: ${savedAccent} !important; } .ring-primary { --tw-ring-color: ${savedAccent} !important; }`;
        document.head.appendChild(style);
    };
    initAccent();

    // 2. Initialize Database Engine
    try {
        await db.init();

        // 2.1 Check for Vault Lock status
        const isVaultEncrypted = await db.getSetting('is_encrypted');
        if (isVaultEncrypted && !db.vaultKey) {
            db.isEncrypted = true;
            const root = document.getElementById('app-root');
            root.innerHTML = await VaultUnlockComponent.render();
            VaultUnlockComponent.init();
            return; // Halt boot until unlocked
        }
    } catch (err) {
        console.error('[App] Fatal: Initializing database failed:', err);
        return;
    }

    // 3. Command Palette System
    const cpRoot = document.getElementById('command-palette-root');
    if (cpRoot) {
        cpRoot.innerHTML = await CommandPalette.render();
        CommandPalette.init();
        document.getElementById('command-palette-input')?.addEventListener('input', (e) => CommandPalette.handleInput(e));

        // Bind existing search button to CP
        document.getElementById('btn-global-search')?.addEventListener('click', () => CommandPalette.toggle(true));
    }

    // 4. Router & Sync
    await syncEngine.loadQueue();
    const router = new Router(routes);
    await router.init();
    window.AppRouter = router;

    // 5. Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch(err => console.debug('Offline support pending.'));
    }

    console.log('[Nexus] Systems Stable.');
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
