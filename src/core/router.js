import { events } from './events.js';

export class Router {
    constructor(routes) {
        this.routes = routes;
        this.rootElement = document.getElementById('app-root');

        // Listen to native history changes (hashchange for hash routing)
        window.addEventListener('hashchange', this.handleHashChange.bind(this));

        // Intercept link clicks
        document.body.addEventListener('click', e => {
            const link = e.target.closest('a[data-route]');
            if (link) {
                e.preventDefault();
                // Use href if it's a hash link, otherwise use data-route
                const href = link.getAttribute('href');
                const route = link.getAttribute('data-route');
                const target = (href && href.startsWith('#')) ? href : route;
                this.navigate(target);
            }
        });
    }

    async init() {
        if (!window.location.hash) {
            window.location.hash = '#/';
        } else {
            await this.handleRoute(window.location.hash);
        }
    }

    navigate(path, silent = false) {
        if (window.location.hash !== path) {
            if (silent) this._silentNext = true;
            window.location.hash = path;
        } else if (!silent) {
            // If already on the path, just force re-render
            this.handleRoute(path);
        }
    }

    handleHashChange() {
        if (this._silentNext) {
            this._silentNext = false;
            return;
        }
        this.handleRoute(window.location.hash);
    }

    async handleRoute(hashStr) {
        // e.g. '#/editor?id=123'
        const fullPath = hashStr.replace(/^#/, '') || '/';
        const urlStr = "http://localhost" + fullPath;
        const url = new URL(urlStr);
        const path = url.pathname;

        events.emit('route:change:start', path);

        const route = this.routes.find(r => r.path === path) || this.routes.find(r => r.path === '*');

        if (!route) {
            this.rootElement.innerHTML = '<div class="flex-1 flex items-center justify-center"><h2>404 - Not Found</h2></div>';
            return;
        }

        this.rootElement.classList.add('opacity-0');

        document.querySelectorAll('.nav-link').forEach(nav => {
            nav.classList.remove('text-primary');
            nav.classList.add('text-slate-400');
            const icon = nav.querySelector('.nav-icon');
            if (icon) icon.style.fontVariationSettings = "'FILL' 0";

            if (nav.getAttribute('data-route') === hashStr || nav.getAttribute('data-route') === '#' + path) {
                nav.classList.remove('text-slate-400');
                nav.classList.add('text-primary');
                if (icon) icon.style.fontVariationSettings = "'FILL' 1";
            }
        });

        setTimeout(async () => {
            try {
                const contentHTML = await route.handler();
                this.rootElement.innerHTML = contentHTML;

                if (typeof route.onRender === 'function') {
                    setTimeout(() => {
                        route.onRender(this.rootElement);
                    }, 0);
                }

            } catch (error) {
                console.error('Route error:', error);
                this.rootElement.innerHTML = '<div class="flex-1 flex items-center justify-center text-red-500"><h2>Error loading view</h2></div>';
            } finally {
                this.rootElement.classList.remove('opacity-0');
                events.emit('route:change:end', path);
            }
        }, 150);
    }
}
