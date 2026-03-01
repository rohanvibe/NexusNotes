/**
 * NexusNotes Security Engine
 * Implementation of Zero-Knowledge encryption using Web Crypto API (AES-GCM 256)
 */

export const SecurityEngine = {
    /**
     * Derives a cryptographic key from a password and salt.
     * @param {string} password 
     * @param {Uint8Array} salt 
     */
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const baseKey = await crypto.subtle.importKey(
            'raw',
            enc.encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: salt,
                iterations: 100000,
                hash: 'SHA-256'
            },
            baseKey,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt']
        );
    },

    /**
     * Encrypts a string of data.
     * @param {string} data 
     * @param {CryptoKey} key 
     */
    async encrypt(data, key) {
        const enc = new TextEncoder();
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            key,
            enc.encode(data)
        );

        // Combine IV and encrypted data
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv);
        combined.set(new Uint8Array(encrypted), iv.length);

        // Return as base64
        return btoa(String.fromCharCode(...combined));
    },

    /**
     * Decrypts a base64 string.
     * @param {string} base64Data 
     * @param {CryptoKey} key 
     */
    async decrypt(base64Data, key) {
        const combined = new Uint8Array(
            atob(base64Data)
                .split('')
                .map(c => c.charCodeAt(0))
        );

        const iv = combined.slice(0, 12);
        const encrypted = combined.slice(12);

        const decrypted = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            encrypted
        );

        const dec = new TextDecoder();
        return dec.decode(decrypted);
    }
};
