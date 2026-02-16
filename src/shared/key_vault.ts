/**
 * Key Vault - Secure API key storage
 *
 * CRITICAL SECURITY (Difficulty #6):
 * - API Keys stored ONLY in chrome.storage.local (extension-isolated)
 * - Content Scripts have ZERO access to keys
 * - All LLM requests proxied through Background Service Worker
 * - Keys encrypted with AES-GCM via WebCrypto API
 */

import { STORAGE_KEYS } from './constants';

// Derive an encryption key from extension ID (unique per installation)
async function getDerivedKey(): Promise<CryptoKey> {
  const extensionId = chrome.runtime.id;
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(extensionId),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('aegis-omniguard-vault'),
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
 * Store an API key securely (Background only)
 */
export async function storeApiKey(key: string): Promise<void> {
  const derivedKey = await getDerivedKey();
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    derivedKey,
    encoder.encode(key)
  );

  const data = {
    iv: Array.from(iv),
    encrypted: Array.from(new Uint8Array(encrypted)),
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.API_KEY]: data });
}

/**
 * Retrieve the API key (Background only)
 */
export async function getApiKey(): Promise<string | null> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.API_KEY);
  const data = result[STORAGE_KEYS.API_KEY] as { iv: number[]; encrypted: number[] } | undefined;

  if (!data) return null;

  const derivedKey = await getDerivedKey();
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
 * Delete the stored API key
 */
export async function deleteApiKey(): Promise<void> {
  await chrome.storage.local.remove(STORAGE_KEYS.API_KEY);
}
