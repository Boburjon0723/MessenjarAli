import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { gcm } from "@noble/ciphers/aes.js";
import type { E2eAlg, E2eEnvelopeMeta } from "./e2e-envelope";

const INFO = new TextEncoder().encode("expertline-e2e-v1");
const ZERO_SALT = new Uint8Array(32);
const STORAGE_PREFIX = "e2e_id_";

type StoredIdentity = {
  alg: E2eAlg;
  publicKey: string;
  privateKey: string;
};

function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function storageKey(userId: string): string {
  return `${STORAGE_PREFIX}${userId.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
}

function deriveAesKeyBytes(privateRaw: Uint8Array, publicRaw: Uint8Array): Uint8Array {
  const shared = x25519.getSharedSecret(privateRaw, publicRaw);
  return hkdf(sha256, shared, ZERO_SALT, INFO, 32);
}

export async function loadOrCreateIdentity(userId: string): Promise<StoredIdentity> {
  const existing = await SecureStore.getItemAsync(storageKey(userId));
  if (existing) {
    try {
      const parsed = JSON.parse(existing) as StoredIdentity;
      if (parsed.publicKey && parsed.privateKey && parsed.alg === "x25519") return parsed;
    } catch {
      /* regenerate */
    }
  }
  const pair = x25519.keygen();
  const stored: StoredIdentity = {
    alg: "x25519",
    publicKey: bytesToB64(pair.publicKey),
    privateKey: bytesToB64(pair.secretKey),
  };
  await SecureStore.setItemAsync(storageKey(userId), JSON.stringify(stored));
  return stored;
}

export async function publishIdentity(userId: string): Promise<StoredIdentity | null> {
  try {
    const identity = await loadOrCreateIdentity(userId);
    const { apiFetch } = await import("./api");
    await apiFetch("/api/crypto/keys", {
      method: "PUT",
      body: JSON.stringify({ alg: identity.alg, publicKey: identity.publicKey }),
    });
    return identity;
  } catch (err) {
    console.warn("[e2e] publish failed", err);
    return null;
  }
}

const peerKeyCache = new Map<string, { alg: E2eAlg; publicKey: string } | null>();

export async function fetchPeerPublicKey(
  userId: string
): Promise<{ alg: E2eAlg; publicKey: string } | null> {
  if (peerKeyCache.has(userId)) return peerKeyCache.get(userId) ?? null;
  const { apiFetch } = await import("./api");
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
  try {
    const identity = await loadOrCreateIdentity(myUserId);
    const peer = await fetchPeerPublicKey(peerUserId);
    if (!peer || peer.alg !== "x25519" || identity.alg !== "x25519") return null;

    const aesKey = deriveAesKeyBytes(b64ToBytes(identity.privateKey), b64ToBytes(peer.publicKey));
    const nonce = new Uint8Array(12);
    crypto.getRandomValues(nonce);
    const aes = gcm(aesKey, nonce);
    const cipher = aes.encrypt(new TextEncoder().encode(plaintext));
    return {
      content: bytesToB64(cipher),
      metadata: {
        e2e: true,
        e2e_v: 1,
        alg: "x25519",
        nonce: bytesToB64(nonce),
        sender_pub: identity.publicKey,
        recipient_pub: peer.publicKey,
      },
    };
  } catch (err) {
    console.warn("[e2e] encrypt failed", err);
    return null;
  }
}

export async function decryptTextEnvelope(
  myUserId: string,
  ciphertextB64: string,
  meta: E2eEnvelopeMeta | Record<string, unknown>
): Promise<string | null> {
  try {
    const identity = await loadOrCreateIdentity(myUserId);
    if ((meta.alg as string) && meta.alg !== "x25519") return null;
    const senderPub = String(meta.sender_pub || "");
    const recipientPub = String(meta.recipient_pub || "");
    const peerB64 = senderPub === identity.publicKey ? recipientPub : senderPub;
    if (!peerB64 || !meta.nonce) return null;

    const aesKey = deriveAesKeyBytes(b64ToBytes(identity.privateKey), b64ToBytes(peerB64));
    const aes = gcm(aesKey, b64ToBytes(String(meta.nonce)));
    const plain = aes.decrypt(b64ToBytes(ciphertextB64));
    return new TextDecoder().decode(plain);
  } catch {
    return null;
  }
}
