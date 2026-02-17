/**
 * Key Vault - Secure API key storage
 *
 * CRITICAL SECURITY (Difficulty #6):
 * - API Keys stored ONLY in chrome.storage.local (extension-isolated)
 * - Content Scripts have ZERO access to keys
 * - All LLM requests proxied through Background Service Worker
 * - Keys encrypted with AES-GCM via WebCrypto API
 *
 * Supports multiple providers (OpenAI, Anthropic, DeepSeek)
 * Each provider's key is stored under a separate storage key.
 */

import { STORAGE_KEYS } from './constants';
import type { LLMProvider } from './types';

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

  const storageKey = getStorageKeyName(provider);
  await chrome.storage.local.set({ [storageKey]: data });
}

/**
 * Retrieve the API key (Background only)
 */
export async function getApiKey(provider?: LLMProvider): Promise<string | null> {
  const storageKey = getStorageKeyName(provider);
  const result = await chrome.storage.local.get(storageKey);
  const data = result[storageKey] as { iv: number[]; encrypted: number[] } | undefined;

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
