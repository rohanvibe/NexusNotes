import { db } from '../db/indexeddb.js';

export const VaultManagerComponent = {
    async render() {
        const vaultsRaw = localStorage.getItem('nexus_vault_registry') || '[]';
        const vaults = JSON.parse(vaultsRaw);
        if (!vaults.includes('NexusDefault')) vaults.unshift('NexusDefault');

        const currentVault = db.currentVault;
        const notes = await db.getAllNotes();
        const totalSize = new TextEncoder().encode(JSON.stringify(notes)).length;

        const formatBytes = (bytes) => {
            if (bytes === 0) return '0 B';
            const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'], i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        };

        const isEncrypted = await db.getSetting('is_encrypted');

        return `
        <div class="w-full max-w-5xl mx-auto px-6 py-10 space-y-12 fade-in pb-32">
            
            <!-- Strategic Header -->
            <div class="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 dark:border-border-custom pb-8">
                <div class="space-y-2">
                    <div class="flex items-center gap-3">
                        <div class="size-12 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                            <span class="material-symbols-outlined text-white text-3xl">account_tree</span>
                        </div>
                        <h1 class="text-4xl font-black tracking-tighter text-slate-900 dark:text-slate-100 uppercase">Vault Architecture</h1>
                    </div>
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Configuration of local semantic repositories</p>
                </div>
                <div class="flex items-center gap-2">
                    <button id="btn-create-vault" class="px-6 py-3 bg-primary rounded-xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-1 transition-all">
                        Initialize New Vault
                    </button>
                    <button id="btn-import-vault" class="px-6 py-3 bg-slate-100 dark:bg-slate-custom border border-slate-200 dark:border-border-custom rounded-xl text-slate-600 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                        Import Archive
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                <!-- Left: Vault Switcher -->
                <div class="lg:col-span-2 space-y-6">
                    <h2 class="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Available Repositories</h2>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4" id="vault-list">
                        ${vaults.map(v => `
                            <div class="p-6 rounded-3xl border-2 ${v === currentVault ? 'border-primary bg-primary/5' : 'border-slate-100 dark:border-border-custom bg-white dark:bg-slate-custom'} transition-all group relative overflow-hidden">
                                <div class="flex items-start justify-between relative z-10">
                                    <div class="space-y-1">
                                        <h3 class="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-tight">${v}</h3>
                                        <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest truncate max-w-[150px]">LOCAL INDEXED DB STORAGE</p>
                                    </div>
                                    <span class="material-symbols-outlined ${v === currentVault ? 'text-primary' : 'text-slate-300'}">${v === currentVault ? 'check_circle' : 'database'}</span>
                                </div>
                                <div class="mt-6 flex items-center gap-2 relative z-10">
                                    ${v === currentVault ? `
                                        <button class="px-4 py-2 bg-primary rounded-lg text-white text-[9px] font-black uppercase tracking-widest">CURRENT</button>
                                    ` : `
                                        <button class="btn-switch-vault px-4 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-600 dark:text-slate-400 text-[9px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all" data-vault="${v}">ACTIVATE</button>
                                    `}
                                    <button class="p-2 text-slate-300 hover:text-red-500 transition-colors"><span class="material-symbols-outlined text-sm">delete_forever</span></button>
                                </div>
                                ${v === currentVault ? '<div class="absolute -right-4 -bottom-4 size-24 bg-primary/10 rounded-full blur-2xl"></div>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Right: Security & Stats -->
                <div class="space-y-8">
                    
                    <!-- Encryption Logic -->
                    <div class="p-8 rounded-[2rem] bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
                        <div class="space-y-2">
                             <div class="flex items-center gap-2 text-amber-400">
                                <span class="material-symbols-outlined text-sm">shield</span>
                                <h3 class="text-[10px] font-black uppercase tracking-widest">Security Protocol</h3>
                             </div>
                             <h4 class="text-xl font-black text-white uppercase tracking-tighter">Zero-Knowledge</h4>
                        </div>
                        
                        <div class="p-4 rounded-2xl ${isEncrypted ? 'bg-amber-500/10 border border-amber-500/20' : 'bg-slate-800'} space-y-3">
                             <p class="text-[10px] leading-relaxed text-slate-400 uppercase font-bold tracking-wider">
                                ${isEncrypted ? 'This vault is currently protected by AES-256 PBKDF2 encryption. Content is only accessible with your private passphrase.' : 'Encryption is currently disabled. Substrate data is stored in transparent format for faster access.'}
                             </p>
                             <button id="btn-toggle-encryption" class="w-full py-3 ${isEncrypted ? 'bg-white text-slate-900 border-none' : 'border border-amber-500/50 text-amber-500'} rounded-xl text-[9px] font-black uppercase tracking-widest hover:scale-[1.02] transition-all">
                                ${isEncrypted ? 'DISABLE ENCRYPTION' : 'ENABLE ZERO-KNOWLEDGE'}
                             </button>
                        </div>
                    </div>

                    <!-- Storage Pulse -->
                    <div class="p-8 rounded-[2rem] bg-white dark:bg-slate-custom border border-slate-200 dark:border-border-custom shadow-xl space-y-6">
                         <div class="space-y-1">
                            <h3 class="text-[10px] font-black uppercase tracking-widest text-slate-400">Volumetric Data</h3>
                            <p class="text-4xl font-black text-slate-900 dark:text-slate-100 tracking-tighter">${formatBytes(totalSize)}</p>
                         </div>
                         <div class="space-y-3">
                            <div class="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div class="h-full bg-primary" style="width: ${Math.min((totalSize / (50 * 1024 * 1024)) * 100, 100)}%"></div>
                            </div>
                            <div class="flex justify-between text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <span>USED</span>
                                <span>50 MB ALLOTMENT</span>
                            </div>
                         </div>
                    </div>

                </div>
            </div>

        </div>
        `;
    },

    onRender(container) {
        // Vault Switching
        container.querySelectorAll('.btn-switch-vault').forEach(btn => {
            btn.addEventListener('click', async () => {
                const vault = btn.getAttribute('data-vault');
                if (confirm(`Switch into vault [${vault}]? Session will reset.`)) {
                    localStorage.setItem('nexus_current_vault', vault);
                    window.location.reload();
                }
            });
        });

        // Create Vault
        container.querySelector('#btn-create-vault').addEventListener('click', () => {
            const name = prompt("Enter mnemonic identifier for new vault:");
            if (name) {
                const vaultsRaw = localStorage.getItem('nexus_vault_registry') || '[]';
                const vaults = JSON.parse(vaultsRaw);
                if (!vaults.includes(name)) {
                    vaults.push(name);
                    localStorage.setItem('nexus_vault_registry', JSON.stringify(vaults));
                    localStorage.setItem('nexus_current_vault', name);
                    window.location.reload();
                }
            }
        });

        // Toggle Encryption
        container.querySelector('#btn-toggle-encryption').addEventListener('click', async () => {
            const isEncrypted = await db.getSetting('is_encrypted');
            if (isEncrypted) {
                if (confirm("Disable encryption? This will decrypt all notes in this vault. Proceed with caution.")) {
                    const pass = prompt("Enter your CURRENT passphrase to decrypt:");
                    if (pass) {
                        try {
                            // 1. Get all notes
                            const notes = await db.getAllNotes(); // This uses current key
                            // 2. Wipe key/encryption setting
                            await db.saveSetting('is_encrypted', false);
                            await db.saveSetting('vault_salt', null);
                            db.isEncrypted = false;
                            db.vaultKey = null;

                            // 3. Resave all notes in transparent format
                            for (let n of notes) {
                                await db.saveNote(n);
                            }
                            alert("Vault successfully decrypted.");
                            window.location.reload();
                        } catch (e) {
                            alert("Decryption failed. Invalid passphrase.");
                        }
                    }
                }
            } else {
                const pass = prompt("Set a NEW PASSCODE to initiate zero-knowledge encryption for this vault:");
                if (pass) {
                    const confirmPass = prompt("Verify passcode:");
                    if (pass !== confirmPass) return alert("Mismatch.");

                    // 1. Get all notes
                    const notes = await db.getAllNotes();
                    // 2. Enable encryption
                    await db.saveSetting('is_encrypted', true);
                    db.isEncrypted = true;
                    await db.unlock(pass); // This creates new key and salt

                    // 3. Resave all notes as encrypted
                    for (let n of notes) {
                        await db.saveNote(n);
                    }
                    alert("Vault successfully encrypted via AES-256.");
                    window.location.reload();
                }
            }
        });
    }
}
