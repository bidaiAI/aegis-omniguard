/**
 * Lightweight i18n for Aegis Popup (zero dependencies)
 *
 * Supports: English (en) + Chinese Simplified (zh)
 * Uses React Context + flat key-value dictionary
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

export type Locale = 'en' | 'zh';

// ===== Translation Dictionaries =====

const en: Record<string, string> = {
  // Common
  'common.loading': 'Loading...',
  'common.back': 'Back',

  // Dashboard
  'dashboard.title': 'Aegis OmniGuard',
  'dashboard.subtitle': 'AI-Era Data Sovereignty Guardian',
  'dashboard.shield': 'Protection Shield',
  'dashboard.shield.active': 'Active - Monitoring all inputs',
  'dashboard.shield.disabled': 'Disabled',
  'dashboard.level': 'Protection Level',
  'dashboard.level.low': 'Low',
  'dashboard.level.low.desc': 'Only high-confidence threats',
  'dashboard.level.medium': 'Medium',
  'dashboard.level.medium.desc': 'Balanced protection',
  'dashboard.level.high': 'High',
  'dashboard.level.high.desc': 'Maximum sensitivity',
  'dashboard.modules': 'Modules',
  'dashboard.module.dlp': 'Web2 DLP Shield',
  'dashboard.module.dlp.desc': 'Detect credit cards, mnemonics, API keys, PII',
  'dashboard.module.sentinel': 'Web3 Sentinel',
  'dashboard.module.sentinel.desc': 'Smart contract signature analysis',
  'dashboard.nav.logs': 'Logs',
  'dashboard.nav.logs.desc': 'Blocked items',
  'dashboard.nav.whitelist': 'Whitelist',
  'dashboard.nav.whitelist.desc': '{count} domains',
  'dashboard.nav.settings': 'Settings',
  'dashboard.nav.settings.desc': 'LLM & API',
  'dashboard.footer': 'Aegis OmniGuard v0.2.0 | Open Source',

  // Logs
  'logs.title': 'Interception Log',
  'logs.clear': 'Clear All',
  'logs.empty': 'No interceptions yet',
  'logs.empty.desc': 'Your data is clean',
  'logs.count': '{count} interception(s) recorded',
  'types.credit_card': 'Credit Card',
  'types.mnemonic': 'Mnemonic',
  'types.private_key': 'Private Key',
  'types.private_key_bitcoin': 'BTC Key',
  'types.private_key_solana': 'Solana Key',
  'types.private_key_tron': 'Tron Key',
  'types.api_key': 'API Key',
  'types.pii_id_card': 'ID Card',
  'types.pii_phone': 'Phone',
  'types.pii_email': 'Email',

  // Whitelist
  'whitelist.title': 'Whitelist',
  'whitelist.desc': 'Domains in the whitelist will bypass DLP scanning. Use *.example.com for wildcards.',
  'whitelist.placeholder': 'e.g. mycompany.com',
  'whitelist.add': 'Add',
  'whitelist.empty': 'No whitelisted domains',
  'whitelist.remove': 'Remove',

  // Settings
  'settings.title': 'LLM Settings',
  'settings.subtitle': 'Configure AI analysis provider',
  'settings.provider': 'Provider',
  'settings.provider.active': 'Active',
  'settings.provider.configured': 'Configured',
  'settings.provider.notset': 'Not set',
  'settings.apikey': 'API Key',
  'settings.apikey.configured': '(key configured)',
  'settings.apikey.get': 'Get {provider} API key',
  'settings.btn.test': 'Test Connection',
  'settings.btn.testing': 'Testing...',
  'settings.btn.valid': 'Valid',
  'settings.btn.valid_limited': 'Valid (Rate Limited)',
  'settings.btn.invalid': 'Invalid',
  'settings.btn.save': 'Save Key',
  'settings.btn.saving': 'Saving...',
  'settings.btn.delete': 'Delete {provider} Key',
  'settings.msg.saved': 'Key saved and activated!',
  'settings.msg.deleted': 'Key deleted',
  'settings.msg.failed': 'Failed to save key',
  'settings.msg.connfail': 'Connection failed',
  'settings.usage': 'Usage Today',
  'settings.usage.provider': 'Active Provider',
  'settings.usage.free': 'Free Cloud (Limited)',
  'settings.usage.free_analyses': 'Free Analyses',
  'settings.usage.unlimited': 'Unlimited with your own key',
  'settings.security': 'Secure:',
  'settings.security.desc': 'API keys are encrypted with AES-256-GCM and never leave this extension. All LLM calls go through the background service worker.',
};

const zh: Record<string, string> = {
  // Common
  'common.loading': '\u52a0\u8f7d\u4e2d...',
  'common.back': '\u8fd4\u56de',

  // Dashboard
  'dashboard.title': 'Aegis OmniGuard',
  'dashboard.subtitle': 'AI \u65f6\u4ee3\u6570\u636e\u4e3b\u6743\u5b88\u536b',
  'dashboard.shield': '\u9632\u62a4\u76fe',
  'dashboard.shield.active': '\u5df2\u542f\u7528 - \u76d1\u63a7\u6240\u6709\u8f93\u5165',
  'dashboard.shield.disabled': '\u5df2\u7981\u7528',
  'dashboard.level': '\u4fdd\u62a4\u7b49\u7ea7',
  'dashboard.level.low': '\u4f4e',
  'dashboard.level.low.desc': '\u4ec5\u9ad8\u7f6e\u4fe1\u5ea6\u5a01\u80c1',
  'dashboard.level.medium': '\u4e2d',
  'dashboard.level.medium.desc': '\u5e73\u8861\u9632\u62a4',
  'dashboard.level.high': '\u9ad8',
  'dashboard.level.high.desc': '\u6700\u5927\u7075\u654f\u5ea6',
  'dashboard.modules': '\u529f\u80fd\u6a21\u5757',
  'dashboard.module.dlp': 'Web2 \u6570\u636e\u9632\u6cc4\u76fe',
  'dashboard.module.dlp.desc': '\u68c0\u6d4b\u94f6\u884c\u5361\u3001\u52a9\u8bb0\u8bcd\u3001API \u5bc6\u94a5\u3001\u4e2a\u4eba\u4fe1\u606f',
  'dashboard.module.sentinel': 'Web3 \u54e8\u5175',
  'dashboard.module.sentinel.desc': '\u667a\u80fd\u5408\u7ea6\u7b7e\u540d\u98ce\u9669\u5206\u6790',
  'dashboard.nav.logs': '\u65e5\u5fd7',
  'dashboard.nav.logs.desc': '\u62e6\u622a\u8bb0\u5f55',
  'dashboard.nav.whitelist': '\u767d\u540d\u5355',
  'dashboard.nav.whitelist.desc': '{count} \u4e2a\u57df\u540d',
  'dashboard.nav.settings': '\u8bbe\u7f6e',
  'dashboard.nav.settings.desc': 'LLM \u4e0e API',
  'dashboard.footer': 'Aegis OmniGuard v0.2.0 | \u5f00\u6e90',

  // Logs
  'logs.title': '\u62e6\u622a\u65e5\u5fd7',
  'logs.clear': '\u6e05\u7a7a',
  'logs.empty': '\u6682\u65e0\u62e6\u622a\u8bb0\u5f55',
  'logs.empty.desc': '\u4f60\u7684\u6570\u636e\u5f88\u5b89\u5168',
  'logs.count': '\u5df2\u8bb0\u5f55 {count} \u6761\u62e6\u622a',
  'types.credit_card': '\u94f6\u884c\u5361',
  'types.mnemonic': '\u52a9\u8bb0\u8bcd',
  'types.private_key': '\u79c1\u94a5',
  'types.private_key_bitcoin': 'BTC \u79c1\u94a5',
  'types.private_key_solana': 'Solana \u79c1\u94a5',
  'types.private_key_tron': 'Tron \u79c1\u94a5',
  'types.api_key': 'API \u5bc6\u94a5',
  'types.pii_id_card': '\u8eab\u4efd\u8bc1',
  'types.pii_phone': '\u624b\u673a\u53f7',
  'types.pii_email': '\u90ae\u7bb1',

  // Whitelist
  'whitelist.title': '\u767d\u540d\u5355',
  'whitelist.desc': '\u767d\u540d\u5355\u4e2d\u7684\u57df\u540d\u5c06\u8df3\u8fc7 DLP \u626b\u63cf\u3002\u652f\u6301 *.example.com \u901a\u914d\u7b26\u3002',
  'whitelist.placeholder': '\u4f8b\u5982 mycompany.com',
  'whitelist.add': '\u6dfb\u52a0',
  'whitelist.empty': '\u6682\u65e0\u767d\u540d\u5355\u57df\u540d',
  'whitelist.remove': '\u5220\u9664',

  // Settings
  'settings.title': 'LLM \u8bbe\u7f6e',
  'settings.subtitle': '\u914d\u7f6e AI \u5206\u6790\u670d\u52a1\u5546',
  'settings.provider': '\u670d\u52a1\u5546',
  'settings.provider.active': '\u4f7f\u7528\u4e2d',
  'settings.provider.configured': '\u5df2\u914d\u7f6e',
  'settings.provider.notset': '\u672a\u8bbe\u7f6e',
  'settings.apikey': 'API \u5bc6\u94a5',
  'settings.apikey.configured': '\uff08\u5bc6\u94a5\u5df2\u914d\u7f6e\uff09',
  'settings.apikey.get': '\u83b7\u53d6 {provider} API \u5bc6\u94a5',
  'settings.btn.test': '\u6d4b\u8bd5\u8fde\u63a5',
  'settings.btn.testing': '\u6d4b\u8bd5\u4e2d...',
  'settings.btn.valid': '\u6709\u6548',
  'settings.btn.valid_limited': '\u6709\u6548\uff08\u9650\u901f\uff09',
  'settings.btn.invalid': '\u65e0\u6548',
  'settings.btn.save': '\u4fdd\u5b58\u5bc6\u94a5',
  'settings.btn.saving': '\u4fdd\u5b58\u4e2d...',
  'settings.btn.delete': '\u5220\u9664 {provider} \u5bc6\u94a5',
  'settings.msg.saved': '\u5bc6\u94a5\u5df2\u4fdd\u5b58\u5e76\u6fc0\u6d3b\uff01',
  'settings.msg.deleted': '\u5bc6\u94a5\u5df2\u5220\u9664',
  'settings.msg.failed': '\u4fdd\u5b58\u5931\u8d25',
  'settings.msg.connfail': '\u8fde\u63a5\u5931\u8d25',
  'settings.usage': '\u4eca\u65e5\u7528\u91cf',
  'settings.usage.provider': '\u5f53\u524d\u670d\u52a1\u5546',
  'settings.usage.free': '\u514d\u8d39\u4e91\u7aef\uff08\u6709\u9650\u989d\uff09',
  'settings.usage.free_analyses': '\u514d\u8d39\u5206\u6790',
  'settings.usage.unlimited': '\u81ea\u5e26\u5bc6\u94a5\u65e0\u9650\u4f7f\u7528',
  'settings.security': '\u5b89\u5168\uff1a',
  'settings.security.desc': 'API \u5bc6\u94a5\u4ee5 AES-256-GCM \u52a0\u5bc6\u5b58\u50a8\uff0c\u6c38\u4e0d\u79bb\u5f00\u672c\u6269\u5c55\u3002\u6240\u6709 LLM \u8c03\u7528\u5747\u901a\u8fc7\u540e\u53f0\u670d\u52a1\u8fdb\u884c\u3002',
};

const dictionaries: Record<Locale, Record<string, string>> = { en, zh };

// ===== Translation Function =====

function translate(locale: Locale, key: string, params?: Record<string, string>): string {
  let text = dictionaries[locale][key] || dictionaries['en'][key] || key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(`{${k}}`, v);
    }
  }
  return text;
}

// ===== React Context =====

interface LocaleContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string>) => string;
}

const LocaleContext = createContext<LocaleContextType>({
  locale: 'en',
  setLocale: () => {},
  t: (key) => key,
});

export function LocaleProvider({
  children,
  initialLocale = 'en',
  onLocaleChange,
}: {
  children: ReactNode;
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback(
    (newLocale: Locale) => {
      setLocaleState(newLocale);
      onLocaleChange?.(newLocale);
    },
    [onLocaleChange]
  );

  const t = useCallback(
    (key: string, params?: Record<string, string>) => translate(locale, key, params),
    [locale]
  );

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}

// ===== Language Switcher Component =====

export function LangSwitch() {
  const { locale, setLocale } = useLocale();

  return (
    <div className="flex items-center bg-[#1a1a2e] rounded-full p-0.5 text-[10px] font-semibold">
      <button
        onClick={() => setLocale('en')}
        className={`px-2 py-0.5 rounded-full transition-colors ${
          locale === 'en' ? 'bg-[#00d4aa] text-[#0f0f1a]' : 'text-[#666] hover:text-[#999]'
        }`}
      >
        EN
      </button>
      <button
        onClick={() => setLocale('zh')}
        className={`px-2 py-0.5 rounded-full transition-colors ${
          locale === 'zh' ? 'bg-[#00d4aa] text-[#0f0f1a]' : 'text-[#666] hover:text-[#999]'
        }`}
      >
        中
      </button>
    </div>
  );
}
