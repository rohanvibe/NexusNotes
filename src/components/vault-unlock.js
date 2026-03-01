import { db } from '../db/indexeddb.js';

export const VaultUnlockComponent = {
    async render() {
        return `
        <div class="fixed inset-0 bg-background-light dark:bg-background-dark z-[200] flex flex-col items-center justify-center p-6 fade-in">
            <div class="w-full max-w-sm space-y-8 animate-slide-up">
                <div class="text-center space-y-2">
                    <div class="size-16 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
                        <span class="material-symbols-outlined text-primary text-4xl">key</span>
                    </div>
                    <h1 class="text-2xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">Vault Encrypted</h1>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">Provide cryptographic passphrase to initiate semantic synthesis</p>
                </div>

                <div class="space-y-4">
                    <input type="password" id="vault-password" placeholder="PASSPHRASE" 
                           class="w-full bg-white dark:bg-slate-custom border-2 border-slate-200 dark:border-border-custom px-6 py-4 rounded-2xl text-center font-black tracking-[0.5em] focus:border-primary transition-all outline-none">
                    <button id="btn-unlock-vault" class="w-full py-4 bg-primary rounded-2xl text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all active:scale-95">
                        Unlock Knowledge Base
                    </button>
                </div>

                <div class="text-center pt-8">
                    <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                        Data is decrypted locally via AES-GCM-256.<br> Passphrase is never transmitted or persisted.
                    </p>
                </div>
            </div>
        </div>
        `;
    },

    init() {
        const btn = document.getElementById('btn-unlock-vault');
        const input = document.getElementById('vault-password');

        const unlockAction = async () => {
            const pass = input.value;
            if (!pass) return;

            btn.disabled = true;
            btn.textContent = "DERIVING KEY...";

            try {
                await db.unlock(pass);
                // Success - trigger a re-render of the current route
                window.location.reload();
            } catch (e) {
                console.error(e);
                btn.textContent = "ACCESS DENIED";
                btn.classList.add('bg-red-500');
                setTimeout(() => {
                    btn.disabled = false;
                    btn.textContent = "Unlock Knowledge Base";
                    btn.classList.remove('bg-red-500');
                }, 2000);
            }
        };

        btn?.addEventListener('click', unlockAction);
        input?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') unlockAction();
        });
    }
};
