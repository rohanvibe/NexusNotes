export const SettingsComponent = {
    async render() {
        return `
        <div class="w-full max-w-2xl mx-auto px-4 py-8 fade-in pb-24">
            <header class="mb-8 border-b border-slate-200 dark:border-border-custom pb-4">
                <h2 class="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">App Settings</h2>
                <p class="text-sm text-slate-500 mt-1">Configure your local-first experience</p>
            </header>

            <div class="space-y-8">
                
                <!-- Appearance -->
                <section>
                    <h3 class="text-sm font-semibold uppercase tracking-widest text-slate-500 mb-4 px-1">Appearance</h3>
                    <div class="bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-border-custom">
                        
                        <div class="p-4 flex items-center justify-between">
                            <div>
                                <p class="font-medium text-slate-900 dark:text-slate-100">Dark Mode</p>
                                <p class="text-xs text-slate-500">Toggle dark/light theme (also hits header button)</p>
                            </div>
                            <button id="toggle-settings-theme" class="w-12 h-6 rounded-full bg-slate-200 dark:bg-primary relative transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                                <div class="w-4 h-4 bg-white rounded-full absolute top-1 left-1 dark:translate-x-6 transition-transform shadow-sm"></div>
                            </button>
                        </div>
                        
                        <div class="p-4 flex items-center justify-between">
                            <div>
                                <p class="font-medium text-slate-900 dark:text-slate-100">Accent Color</p>
                                <p class="text-xs text-slate-500">Customize main UI accent</p>
                            </div>
                            <div class="flex gap-2" id="accent-picker">
                                <div class="w-6 h-6 rounded-full bg-[#7c3bed] cursor-pointer hover:scale-110 transition-transform" data-color="#7c3bed"></div>
                                <div class="w-6 h-6 rounded-full bg-[#10b981] cursor-pointer hover:scale-110 transition-transform" data-color="#10b981"></div>
                                <div class="w-6 h-6 rounded-full bg-[#f43f5e] cursor-pointer hover:scale-110 transition-transform" data-color="#f43f5e"></div>
                                <div class="w-6 h-6 rounded-full bg-[#0ea5e9] cursor-pointer hover:scale-110 transition-transform" data-color="#0ea5e9"></div>
                            </div>
                        </div>

                    </div>
                </section>

                <!-- About -->
                <section class="text-center pt-8">
                     <span class="material-symbols-outlined text-4xl text-primary mb-2">cloud_off</span>
                     <p class="font-bold text-slate-900 dark:text-slate-100">NexusNotes v1.0.0 (Local)</p>
                     <p class="text-xs text-slate-500 w-3/4 mx-auto mt-2">A completely offline, local-first knowledge management system utilizing pure Native ES Modules and PWA technologies.</p>
                </section>

            </div>
        </div>
        `;
    },

    onRender(container) {
        // Theme toggle listener specific to settings view
        const themeToggle = container.querySelector('#toggle-settings-theme');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                document.documentElement.classList.toggle('dark');
                const isNowDark = document.documentElement.classList.contains('dark');
                localStorage.setItem('theme', isNowDark ? 'dark' : 'light');
                // Forcing UI re-render on toggle visually is handled by CSS mostly, no further action needed.
            });
        }

        // Wipe Data Button
        const btnWipe = container.querySelector('#btn-clear-data');
        if (btnWipe) {
            btnWipe.addEventListener('click', async () => {
                const pass = prompt("Type 'DELETE' to permanently erase all local notes and settings.");
                if (pass === 'DELETE') {
                    // Delete all notes
                    const notes = await db.getAllNotes();
                    for (let n of notes) {
                        await db.deleteNote(n.id);
                    }
                    // Clear settings
                    localStorage.clear();
                    alert("Vault wiped. Reloading application.");
                    window.location.href = "/";
                }
            });
        }

        // Accent Color Picker
        const accentPicker = container.querySelector('#accent-picker');
        if (accentPicker) {
            accentPicker.addEventListener('click', (e) => {
                const dot = e.target.closest('[data-color]');
                if (dot) {
                    const color = dot.getAttribute('data-color');
                    localStorage.setItem('accent-color', color);
                    // Apply immediately
                    document.documentElement.style.setProperty('--primary-color', color);
                    const style = document.getElementById('accent-style');
                    if (style) {
                        style.innerHTML = `
                            .text-primary { color: ${color} !important; }
                            .bg-primary { background-color: ${color} !important; }
                            .border-primary { border-color: ${color} !important; }
                            .ring-primary { --tw-ring-color: ${color} !important; }
                        `;
                    }
                }
            });
        }
    }
}
