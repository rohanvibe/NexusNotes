/**
 * Local Encryption Wrapper
 * Provides AES-GCM encryption/decryption for vault data using Web Crypto API
 */

export class CryptoLayer {

    /**
     * Generate a cryptographic key from a user password
     * @param {string} password 
     * @param {Uint8Array} salt 
     * @returns {Promise<CryptoKey>}
     */
    async deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMaterial = await window.crypto.subtle.importKey(
            "raw",
            enc.encode(password),
            { name: "PBKDF2" },
            false,
            ["deriveBits", "deriveKey"]
        );

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: salt,
                iterations: 100000,
                hash: "SHA-256"
            },
            keyMaterial,
            { name: "AES-GCM", length: 256 },
            true,
            ["encrypt", "decrypt"]
        );
    }

    /**
     * Encrypt a string (e.g. JSON stringified state)
     * @param {string} text 
     * @param {string} password 
     * @returns {Promise<{ciphertext: string, iv: string, salt: string}>}
     */
    async encryptData(text, password) {
        const salt = window.crypto.getRandomValues(new Uint8Array(16));
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const key = await this.deriveKey(password, salt);

        const enc = new TextEncoder();
        const encryptedContent = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            key,
            enc.encode(text)
        );

        // Convert ArrayBuffers to Base64 strings for easy storage
        return {
            ciphertext: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
            iv: btoa(String.fromCharCode(...iv)),
            salt: btoa(String.fromCharCode(...salt))
        };
    }

    /**
     * Decrypt data back to string
     * @param {string} ciphertextBase64 
     * @param {string} ivBase64 
     * @param {string} saltBase64 
     * @param {string} password 
     * @returns {Promise<string>}
     */
    async decryptData(ciphertextBase64, ivBase64, saltBase64, password) {
        try {
            const ciphertext = Uint8Array.from(atob(ciphertextBase64), c => c.charCodeAt(0));
            const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
            const salt = Uint8Array.from(atob(saltBase64), c => c.charCodeAt(0));

            const key = await this.deriveKey(password, salt);

            const decryptedContent = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: iv },
                key,
                ciphertext
            );

            const dec = new TextDecoder();
            return dec.decode(decryptedContent);
        } catch (e) {
            console.error("[Crypto] Decryption failed. Incorrect password or corrupt data.");
            throw new Error("Decryption failed");
        }
    }
}

export const cryptoLayer = new CryptoLayer();
