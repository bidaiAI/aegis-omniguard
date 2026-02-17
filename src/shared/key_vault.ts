/**
 * Key Vault - Secure API key storage
 *
 * Security hardening (audit F-04/F-05):
 * - Per-installation random secret (32 bytes) generated on first use
 * - Per-encryption random salt (16 bytes) stored alongside ciphertext
 * - PBKDF2 key derivation: extensionId + installSecret + randomSalt
 * - AES-256-GCM with random 12-byte IV per encryption
 * - Content Scripts have ZERO access to keys
 * - All LLM requests proxied through Background Service Worker
 */

import { STORAGE_KEYS } from './constants';
import type { LLMProvider } from './types';

const INSTALL_SECRET_KEY = 'aegis_install_secret';

/**
 * Get or create a per-installation random secret (32 bytes).
 * Generated once on first use, persisted in chrome.storage.local.
 */
async function getInstallSecret(): Promise<Uint8Array> {
  const result = await chrome.storage.local.get(INSTALL_SECRET_KEY);
  if (result[INSTALL_SECRET_KEY]) {
    return new Uint8Array(result[INSTALL_SECRET_KEY] as number[]);
  }
  // First time: generate random 32-byte secret
  const secret = crypto.getRandomValues(new Uint8Array(32));
  await chrome.storage.local.set({ [INSTALL_SECRET_KEY]: Array.from(secret) });
  return secret;
}

/**
 * Derive an AES-256-GCM encryption key using PBKDF2.
 * Input: extensionId + installSecret (unique per installation)
 * Salt: random per-encryption (passed in)
 */
async function getDerivedKey(salt: Uint8Array): Promise<CryptoKey> {
  const extensionId = chrome.runtime.id;
  const encoder = new TextEncoder();
  const installSecret = await getInstallSecret();

  // Combine extensionId + installSecret as key material
  const idBytes = encoder.encode(extensionId);
  const combined = new Uint8Array(idBytes.length + installSecret.length);
  combined.set(idBytes, 0);
  combined.set(installSecret, idBytes.length);

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    combined,
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Get storage key name for a specific LLM provider
 */
function getStorageKeyName(provider?: LLMProvider): string {
  if (!provider) return STORAGE_KEYS.API_KEY;
  return `${STORAGE_KEYS.API_KEY}_${provider}`;
}

/**
 * Store an API key securely (Background only)
 */
export async function storeApiKey(key: string, provider?: LLMProvider): Promise<void> {
  const encoder = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16)); // random salt per encryption
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const derivedKey = await getDerivedKey(salt);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(key)
  );

  const data = {
    salt: Array.from(salt),
    iv: Array.from(iv),
    encrypted: Array.from(new Uint8Array(encrypted)),
  };

  const storageKey = getStorageKeyName(provider);
  await chrome.storage.local.set({ [storageKey]: data });
}

/**
 * Retrieve the API key (Background only)
 */
export async function getApiKey(provider?: LLMProvider): Promise<string | null> {
  const storageKey = getStorageKeyName(provider);
  const result = await chrome.storage.local.get(storageKey);
  const data = result[storageKey] as { salt?: number[]; iv: number[]; encrypted: number[] } | undefined;

  if (!data) return null;

  // Validate structure before decryption
  if (!Array.isArray(data.iv) || !Array.isArray(data.encrypted) || data.encrypted.length < 16) {
    console.warn('[Aegis KeyVault] Corrupted encrypted data structure');
    return null;
  }

  // Support legacy format (no salt field) — use hardcoded fallback for migration
  const salt = data.salt
    ? new Uint8Array(data.salt)
    : new TextEncoder().encode('aegis-omniguard-vault');

  const derivedKey = await getDerivedKey(salt);
  const iv = new Uint8Array(data.iv);
  const encrypted = new Uint8Array(data.encrypted);

  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      derivedKey,
      encrypted
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    return null;
  }
}

/**
 * Delete the stored API key for a provider
 */
export async function deleteApiKey(provider?: LLMProvider): Promise<void> {
  const storageKey = getStorageKeyName(provider);
  await chrome.storage.local.remove(storageKey);
}

/**
 * Check if an API key exists for a provider (without decrypting)
 */
export async function hasApiKey(provider?: LLMProvider): Promise<boolean> {
  const storageKey = getStorageKeyName(provider);
  const result = await chrome.storage.local.get(storageKey);
  return !!result[storageKey];
}
