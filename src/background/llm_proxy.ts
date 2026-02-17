/**
 * LLM Proxy - Routes LLM calls to configured provider
 *
 * Supports:
 * - BYOK (Bring Your Own Key): OpenAI, Anthropic, DeepSeek
 * - Free Cloud: DeepSeek V3 with daily limit (3 calls/day)
 *
 * All API keys are stored encrypted in Key Vault.
 * Content Scripts never see the keys - all calls go through Background.
 */

import { getApiKey, hasApiKey } from '../shared/key_vault';
import { STORAGE_KEYS, FREE_CLOUD_DAILY_LIMIT } from '../shared/constants';
import type { LLMProvider, LLMUsageRecord, LLMUsageStats } from '../shared/types';

// ===== Provider API Configs =====

interface ProviderConfig {
  name: string;
  endpoint: string;
  model: string;
  buildHeaders: (apiKey: string) => Record<string, string>;
  buildBody: (prompt: string) => Record<string, unknown>;
  extractResponse: (data: unknown) => string;
}

const PROVIDERS: Record<LLMProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (prompt) => ({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    }),
    extractResponse: (data) => {
      const d = data as { choices?: Array<{ message?: { content?: string } }> };
      return d.choices?.[0]?.message?.content || '';
    },
  },

  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-20250414',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    }),
    buildBody: (prompt) => ({
      model: 'claude-haiku-4-20250414',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
    extractResponse: (data) => {
      const d = data as { content?: Array<{ text?: string }> };
      return d.content?.[0]?.text || '';
    },
  },

  deepseek: {
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    buildHeaders: (apiKey) => ({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    }),
    buildBody: (prompt) => ({
      model: 'deepseek-chat',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1,
      max_tokens: 800,
    }),
    extractResponse: (data) => {
      const d = data as { choices?: Array<{ message?: { content?: string } }> };
      return d.choices?.[0]?.message?.content || '';
    },
  },
};

// Free cloud uses DeepSeek (used in Phase 3 when cloud proxy is available)
// const FREE_CLOUD_CONFIG = PROVIDERS.deepseek;

// ===== Usage Tracking =====

function getTodayKey(): string {
  return new Date().toISOString().split('T')[0]; // YYYY-MM-DD
}

async function getUsageToday(): Promise<number> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LLM_USAGE);
  const usage = result[STORAGE_KEYS.LLM_USAGE] as LLMUsageRecord | undefined;

  if (!usage || usage.date !== getTodayKey()) {
    return 0;
  }
  return usage.count;
}

async function incrementUsage(): Promise<void> {
  const today = getTodayKey();
  const result = await chrome.storage.local.get(STORAGE_KEYS.LLM_USAGE);
  const existing = result[STORAGE_KEYS.LLM_USAGE] as LLMUsageRecord | undefined;

  const usage: LLMUsageRecord = {
    date: today,
    count: (existing?.date === today ? existing.count : 0) + 1,
  };

  await chrome.storage.local.set({ [STORAGE_KEYS.LLM_USAGE]: usage });
}

/**
 * Get usage stats for display in Settings
 */
export async function getUsageStats(provider: LLMProvider | null): Promise<LLMUsageStats> {
  const today = await getUsageToday();
  const hasKey = provider ? await hasApiKey(provider) : false;

  return {
    today,
    dailyLimit: FREE_CLOUD_DAILY_LIMIT,
    provider: provider || 'free_cloud',
    hasApiKey: hasKey,
  };
}

// ===== Core LLM Call =====

/**
 * Call LLM with BYOK key
 */
export async function callLLM(prompt: string, provider: LLMProvider): Promise<string> {
  const apiKey = await getApiKey(provider);
  if (!apiKey) {
    throw new Error(`No API key configured for ${provider}`);
  }

  const config = PROVIDERS[provider];

  const response = await fetch(config.endpoint, {
    method: 'POST',
    headers: config.buildHeaders(apiKey),
    body: JSON.stringify(config.buildBody(prompt)),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`${config.name} API error (${response.status}): ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = config.extractResponse(data);

  if (!text) {
    throw new Error(`${config.name} returned empty response`);
  }

  return text;
}

/**
 * Call free cloud LLM (DeepSeek, daily limit)
 *
 * NOTE: In Phase 2, this calls DeepSeek directly with a built-in key.
 * In Phase 3, this will route through our cloud proxy server.
 */
export async function callCloudLLM(_prompt: string): Promise<string> {
  const usageToday = await getUsageToday();

  if (usageToday >= FREE_CLOUD_DAILY_LIMIT) {
    throw new Error(
      `Free cloud analysis limit reached (${FREE_CLOUD_DAILY_LIMIT}/day). ` +
      'Configure your own API key in Settings for unlimited analysis.'
    );
  }

  // Phase 3 TODO: Route through our cloud proxy instead of direct API call
  // For now, free cloud is placeholder - returns local analysis only
  // The real implementation will use a server-side API key
  await incrementUsage();

  throw new Error(
    'Free cloud analysis is not yet available. ' +
    'Please configure your own API key (OpenAI, Anthropic, or DeepSeek) in Settings.'
  );
}

/**
 * Smart LLM call: uses BYOK if available, falls back to free cloud
 */
export async function smartLLMCall(prompt: string, preferredProvider: LLMProvider | null): Promise<string> {
  // Try BYOK first
  if (preferredProvider) {
    const hasKey = await hasApiKey(preferredProvider);
    if (hasKey) {
      return callLLM(prompt, preferredProvider);
    }
  }

  // Fallback: try free cloud
  return callCloudLLM(prompt);
}

// ===== API Key Validation =====

/**
 * Test if an API key is valid by making a minimal API call
 */
export async function validateApiKey(apiKey: string, provider: LLMProvider): Promise<{ valid: boolean; error?: string }> {
  const config = PROVIDERS[provider];

  try {
    const response = await fetch(config.endpoint, {
      method: 'POST',
      headers: config.buildHeaders(apiKey),
      body: JSON.stringify({
        ...config.buildBody('Say "ok"'),
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      return { valid: true };
    }

    const errorText = await response.text().catch(() => 'Unknown error');

    if (response.status === 401 || response.status === 403) {
      return { valid: false, error: 'Invalid API key' };
    }
    if (response.status === 429) {
      return { valid: true, error: 'Key valid but rate limited' }; // Key is valid, just rate limited
    }

    return { valid: false, error: `API error (${response.status}): ${errorText.slice(0, 100)}` };
  } catch (err) {
    return { valid: false, error: `Connection failed: ${String(err).slice(0, 100)}` };
  }
}
