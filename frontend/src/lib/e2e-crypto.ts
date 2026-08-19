/**
 * Telegram secret-chat analog: X25519 (fallback P-256) + HKDF + AES-GCM.
 * Private key never leaves the device.
 */
import type { E2eAlg, E2eEnvelopeMeta } from './e2e-envelope';

const INFO = new TextEncoder().encode('expertline-e2e-v1');
const STORAGE_PREFIX = 'mali_e2e_identity_';

type StoredIdentity = {
    alg: E2eAlg;
    publicKey: string;
    privateKey: string;
};

function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
    const u8 = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    let bin = '';
    for (let i = 0; i < u8.length; i++) bin += String.fromCharCode(u8[i]);
    return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
}

async function supportsX25519(): Promise<boolean> {
    try {
        await crypto.subtle.generateKey({ name: 'X25519' }, false, ['deriveBits']);
        return true;
    } catch {
        return false;
    }
}

async function generatePair(alg: E2eAlg): Promise<CryptoKeyPair> {
    if (alg === 'x25519') {
        return crypto.subtle.generateKey({ name: 'X25519' }, true, ['deriveBits']) as Promise<CryptoKeyPair>;
    }
    return crypto.subtle.generateKey(
        { name: 'ECDH', namedCurve: 'P-256' },
        true,
        ['deriveBits']
    );
}

async function importPrivate(alg: E2eAlg, pkcs8B64: string): Promise<CryptoKey> {
    const keyData = b64ToBytes(pkcs8B64) as BufferSource;
    if (alg === 'x25519') {
        return crypto.subtle.importKey('pkcs8', keyData, { name: 'X25519' }, false, ['deriveBits']);
    }
    return crypto.subtle.importKey('pkcs8', keyData, { name: 'ECDH', namedCurve: 'P-256' }, false, [
        'deriveBits',
    ]);
}

async function importPublic(alg: E2eAlg, rawB64: string): Promise<CryptoKey> {
    const keyData = b64ToBytes(rawB64) as BufferSource;
    if (alg === 'x25519') {
        return crypto.subtle.importKey('raw', keyData, { name: 'X25519' }, false, []);
    }
    return crypto.subtle.importKey('raw', keyData, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
}

async function deriveAesKey(alg: E2eAlg, privateKey: CryptoKey, publicKey: CryptoKey): Promise<CryptoKey> {
    const bits = await crypto.subtle.deriveBits(
        alg === 'x25519' ? { name: 'X25519', public: publicKey } : { name: 'ECDH', public: publicKey },
        privateKey,
        256
    );
    const hkdfKey = await crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: INFO },
        hkdfKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

function storageKey(userId: string): string {
    return `${STORAGE_PREFIX}${userId}`;
}

export async function loadOrCreateIdentity(userId: string): Promise<StoredIdentity> {
    const existing = localStorage.getItem(storageKey(userId));
    if (existing) {
        try {
            const parsed = JSON.parse(existing) as StoredIdentity;
            if (parsed.publicKey && parsed.privateKey && parsed.alg) return parsed;
        } catch {
            /* regenerate */
        }
    }
    const alg: E2eAlg = (await supportsX25519()) ? 'x25519' : 'p256';
    const pair = await generatePair(alg);
    const publicKey = bytesToB64(await crypto.subtle.exportKey('raw', pair.publicKey));
    const privateKey = bytesToB64(await crypto.subtle.exportKey('pkcs8', pair.privateKey));
    const stored: StoredIdentity = { alg, publicKey, privateKey };
    localStorage.setItem(storageKey(userId), JSON.stringify(stored));
    return stored;
}

export async function publishIdentity(userId: string): Promise<StoredIdentity | null> {
    if (typeof window === 'undefined' || !window.crypto?.subtle) return null;
    const identity = await loadOrCreateIdentity(userId);
    const { apiFetch } = await import('./api');
    await apiFetch('/api/crypto/keys', {
        method: 'PUT',
        body: JSON.stringify({ alg: identity.alg, publicKey: identity.publicKey }),
    });
    return identity;
}

const peerKeyCache = new Map<string, { alg: E2eAlg; publicKey: string } | null>();

export async function fetchPeerPublicKey(
    userId: string
): Promise<{ alg: E2eAlg; publicKey: string } | null> {
    if (peerKeyCache.has(userId)) return peerKeyCache.get(userId) ?? null;
    const { apiFetch } = await import('./api');
    const res = await apiFetch(`/api/crypto/keys/${userId}`);
    if (!res.ok) {
        peerKeyCache.set(userId, null);
        return null;
    }
    const data = (await res.json()) as { alg: E2eAlg; publicKey: string };
    peerKeyCache.set(userId, data);
    return data;
}

export async function encryptTextForPeer(
    myUserId: string,
    peerUserId: string,
    plaintext: string
): Promise<{ content: string; metadata: E2eEnvelopeMeta } | null> {
    const identity = await loadOrCreateIdentity(myUserId);
    const peer = await fetchPeerPublicKey(peerUserId);
    if (!peer || peer.alg !== identity.alg) return null;

    const myPriv = await importPrivate(identity.alg, identity.privateKey);
    const peerPub = await importPublic(identity.alg, peer.publicKey);
    const aes = await deriveAesKey(identity.alg, myPriv, peerPub);
    const nonce = crypto.getRandomValues(new Uint8Array(12));
    const cipher = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: nonce },
        aes,
        new TextEncoder().encode(plaintext)
    );
    return {
        content: bytesToB64(cipher),
        metadata: {
            e2e: true,
            e2e_v: 1,
            alg: identity.alg,
            nonce: bytesToB64(nonce),
            sender_pub: identity.publicKey,
            recipient_pub: peer.publicKey,
        },
    };
}

export async function decryptTextEnvelope(
    myUserId: string,
    ciphertextB64: string,
    meta: E2eEnvelopeMeta | Record<string, unknown>
): Promise<string | null> {
    try {
        const identity = await loadOrCreateIdentity(myUserId);
        const alg = (meta.alg as E2eAlg) || identity.alg;
        const senderPub = String(meta.sender_pub || '');
        const recipientPub = String(meta.recipient_pub || '');
        const peerB64 = senderPub === identity.publicKey ? recipientPub : senderPub;
        if (!peerB64 || !meta.nonce) return null;

        const myPriv = await importPrivate(identity.alg, identity.privateKey);
        const peerPub = await importPublic(alg, peerB64);
        const aes = await deriveAesKey(identity.alg, myPriv, peerPub);
        const plain = await crypto.subtle.decrypt(
            { name: 'AES-GCM', iv: b64ToBytes(String(meta.nonce)) as BufferSource },
            aes,
            b64ToBytes(ciphertextB64) as BufferSource
        );
        return new TextDecoder().decode(plain);
    } catch {
        return null;
    }
}
