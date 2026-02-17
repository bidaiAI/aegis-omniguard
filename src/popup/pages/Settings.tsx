import { useState, useEffect, useCallback } from 'react';
import { MSG } from '../../shared/message_types';
import type { AegisSettings, LLMProvider, LLMUsageStats } from '../../shared/types';
import { useLocale } from '../i18n';

interface Props {
  settings: AegisSettings;
  onUpdate: (updates: Partial<AegisSettings>) => void;
  onBack: () => void;
}

interface ProviderInfo {
  label: string;
  placeholder: string;
  docsUrl: string;
}

const PROVIDERS: Record<LLMProvider, ProviderInfo> = {
  openai: { label: 'OpenAI', placeholder: 'sk-proj-...', docsUrl: 'https://platform.openai.com/api-keys' },
  anthropic: { label: 'Anthropic', placeholder: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys' },
  deepseek: { label: 'DeepSeek', placeholder: 'sk-...', docsUrl: 'https://platform.deepseek.com/api_keys' },
};

type TestStatus = 'idle' | 'testing' | 'valid' | 'invalid' | 'rate_limited';
type MsgType = 'success' | 'warning' | 'error';

export default function Settings({ settings, onUpdate, onBack }: Props) {
  const { t } = useLocale();
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(settings.llmProvider || 'openai');
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testError, setTestError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [saveMsgType, setSaveMsgType] = useState<MsgType>('success');
  const [usageStats, setUsageStats] = useState<LLMUsageStats | null>(null);
  const [keyStatus, setKeyStatus] = useState<Record<LLMProvider, boolean>>({
    openai: false, anthropic: false, deepseek: false,
  });

  const loadData = useCallback(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_LLM_USAGE }, (stats: LLMUsageStats) => {
      if (stats && !('error' in stats)) setUsageStats(stats);
    });
    const providers: LLMProvider[] = ['openai', 'anthropic', 'deepseek'];
    providers.forEach((p) => {
      chrome.runtime.sendMessage(
        { type: MSG.CHECK_API_KEY, payload: { provider: p } },
        (resp: { hasKey: boolean }) => {
          if (resp && !('error' in resp)) setKeyStatus((prev) => ({ ...prev, [p]: resp.hasKey }));
        }
      );
    });
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleTest = () => {
    if (!apiKey.trim()) return;
    setTestStatus('testing');
    setTestError('');
    chrome.runtime.sendMessage(
      { type: MSG.VALIDATE_API_KEY, payload: { apiKey: apiKey.trim(), provider: selectedProvider } },
      (result: { valid: boolean; error?: string }) => {
        if (!result || 'error' in result) {
          setTestStatus('invalid');
          setTestError(String((result as { error?: string })?.error || t('settings.msg.connfail')));
          return;
        }
        if (result.valid) {
          if (result.error?.includes('rate limited')) {
            setTestStatus('rate_limited');
            setTestError(result.error);
          } else {
            setTestStatus('valid');
            setTestError('');
          }
        } else {
          setTestStatus('invalid');
          setTestError(result.error || t('settings.btn.invalid'));
        }
      }
    );
  };

  const handleSave = () => {
    if (!apiKey.trim()) return;
    setSaving(true);
    setSaveMessage('');
    chrome.runtime.sendMessage(
      { type: MSG.STORE_API_KEY, payload: { apiKey: apiKey.trim(), provider: selectedProvider } },
      (result: { ok: boolean; error?: string }) => {
        setSaving(false);
        if (result?.ok) {
          setSaveMessage(t('settings.msg.saved'));
          setSaveMsgType('success');
          setApiKey('');
          setTestStatus('idle');
          onUpdate({ llmProvider: selectedProvider });
          loadData();
        } else {
          setSaveMessage(result?.error || t('settings.msg.failed'));
          setSaveMsgType('error');
        }
      }
    );
  };

  const handleDelete = () => {
    chrome.runtime.sendMessage(
      { type: MSG.DELETE_API_KEY, payload: { provider: selectedProvider } },
      () => {
        setSaveMessage(t('settings.msg.deleted'));
        setSaveMsgType('warning');
        setApiKey('');
        setTestStatus('idle');
        loadData();
      }
    );
  };

  const providerInfo = PROVIDERS[selectedProvider];
  const hasKey = keyStatus[selectedProvider];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a1a2e] flex items-center gap-3">
        <button onClick={onBack} className="text-[#888] hover:text-[#e0e0e0] transition-colors text-lg">
          &#x2190;
        </button>
        <div>
          <h1 className="text-base font-bold text-[#00d4aa]">{t('settings.title')}</h1>
          <p className="text-[10px] text-[#888]">{t('settings.subtitle')}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {/* Provider Selection */}
        <div>
          <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
            {t('settings.provider')}
          </div>
          <div className="flex gap-2">
            {(Object.keys(PROVIDERS) as LLMProvider[]).map((p) => {
              const info = PROVIDERS[p];
              const isSelected = selectedProvider === p;
              const pHasKey = keyStatus[p];
              const isActive = settings.llmProvider === p;

              return (
                <button
                  key={p}
                  onClick={() => {
                    setSelectedProvider(p);
                    setApiKey('');
                    setTestStatus('idle');
                    setTestError('');
                    setSaveMessage('');
                  }}
                  className={`flex-1 p-2.5 rounded-lg border transition-all text-center ${
                    isSelected
                      ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                      : 'border-[#333] bg-[#1a1a2e] hover:border-[#555]'
                  }`}
                >
                  <div className={`text-xs font-bold ${isSelected ? 'text-[#00d4aa]' : 'text-[#888]'}`}>
                    {info.label}
                  </div>
                  <div className="text-[9px] mt-0.5">
                    {pHasKey ? (
                      <span className={isActive ? 'text-[#22c55e]' : 'text-[#888]'}>
                        {isActive ? `\u2705 ${t('settings.provider.active')}` : `\u{1F511} ${t('settings.provider.configured')}`}
                      </span>
                    ) : (
                      <span className="text-[#555]">{t('settings.provider.notset')}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key Input */}
        <div>
          <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
            {t('settings.apikey')}
          </div>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setTestStatus('idle');
                setTestError('');
                setSaveMessage('');
              }}
              placeholder={hasKey ? `\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022  ${t('settings.apikey.configured')}` : providerInfo.placeholder}
              className="w-full bg-[#1a1a2e] border border-[#333] rounded-lg px-3 py-2.5 text-sm
                         text-[#e0e0e0] placeholder-[#555] focus:outline-none focus:border-[#00d4aa]
                         font-mono pr-10"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#666] hover:text-[#999] text-xs"
            >
              {showKey ? '\u{1F441}' : '\u{1F441}\uFE0F\u200D\u{1F5E8}\uFE0F'}
            </button>
          </div>
          <div className="mt-1.5 text-right">
            <a
              href={providerInfo.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] text-[#00d4aa] hover:underline"
            >
              {t('settings.apikey.get', { provider: providerInfo.label })} &#x2197;
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleTest}
            disabled={!apiKey.trim() || testStatus === 'testing'}
            className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all border ${
              testStatus === 'testing'
                ? 'border-[#818cf8] bg-[#818cf8]/10 text-[#818cf8]'
                : testStatus === 'valid' || testStatus === 'rate_limited'
                  ? 'border-[#22c55e] bg-[#22c55e]/10 text-[#22c55e]'
                  : testStatus === 'invalid'
                    ? 'border-[#ef4444] bg-[#ef4444]/10 text-[#ef4444]'
                    : 'border-[#555] bg-[#1a1a2e] text-[#ccc] hover:border-[#00d4aa] disabled:opacity-40'
            }`}
          >
            {testStatus === 'testing' ? `\u23F3 ${t('settings.btn.testing')}` :
             testStatus === 'valid' ? `\u2705 ${t('settings.btn.valid')}` :
             testStatus === 'rate_limited' ? `\u2705 ${t('settings.btn.valid_limited')}` :
             testStatus === 'invalid' ? `\u274C ${t('settings.btn.invalid')}` :
             `\u{1F50D} ${t('settings.btn.test')}`}
          </button>
          <button
            onClick={handleSave}
            disabled={!apiKey.trim() || saving}
            className="flex-1 py-2 rounded-lg text-xs font-semibold bg-[#00d4aa]/15 text-[#00d4aa]
                       border border-[#00d4aa]/30 hover:bg-[#00d4aa]/25 transition-all disabled:opacity-40"
          >
            {saving ? `\u23F3 ${t('settings.btn.saving')}` : `\u{1F4BE} ${t('settings.btn.save')}`}
          </button>
        </div>

        {/* Delete button */}
        {hasKey && (
          <button
            onClick={handleDelete}
            className="w-full py-2 rounded-lg text-[11px] text-[#ef4444] border border-[#ef4444]/20
                       hover:bg-[#ef4444]/10 transition-all"
          >
            &#x1f5d1; {t('settings.btn.delete', { provider: providerInfo.label })}
          </button>
        )}

        {/* Status Messages */}
        {testError && (
          <div className={`text-[11px] px-3 py-2 rounded-lg ${
            testStatus === 'rate_limited' ? 'bg-[#f59e0b]/10 text-[#f59e0b]' : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            {testError}
          </div>
        )}
        {saveMessage && (
          <div className={`text-[11px] px-3 py-2 rounded-lg ${
            saveMsgType === 'success' ? 'bg-[#22c55e]/10 text-[#22c55e]'
              : saveMsgType === 'warning' ? 'bg-[#f59e0b]/10 text-[#f59e0b]'
              : 'bg-[#ef4444]/10 text-[#ef4444]'
          }`}>
            {saveMessage}
          </div>
        )}

        <div className="border-t border-[#1a1a2e]" />

        {/* Usage Stats */}
        <div>
          <div className="text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">
            {t('settings.usage')}
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-[#888]">{t('settings.usage.provider')}</span>
              <span className="text-[11px] font-medium">
                {settings.llmProvider
                  ? <span className="text-[#00d4aa]">{PROVIDERS[settings.llmProvider]?.label || settings.llmProvider}</span>
                  : <span className="text-[#f59e0b]">{t('settings.usage.free')}</span>
                }
              </span>
            </div>
            {usageStats && !settings.llmProvider && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#888]">{t('settings.usage.free_analyses')}</span>
                  <span className="text-[11px] font-mono text-[#e0e0e0]">
                    {usageStats.today} / {usageStats.dailyLimit}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#333] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (usageStats.today / usageStats.dailyLimit) * 100)}%`,
                      backgroundColor: usageStats.today >= usageStats.dailyLimit ? '#ef4444' : '#00d4aa',
                    }}
                  />
                </div>
              </div>
            )}
            {settings.llmProvider && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-[#22c55e]">&#x221e; {t('settings.usage.unlimited')}</span>
              </div>
            )}
          </div>
        </div>

        {/* Security info */}
        <div className="bg-[#1a1a2e] rounded-lg p-3 border border-[#333]">
          <div className="text-[11px] text-[#888] leading-relaxed">
            <span className="text-[#00d4aa] font-semibold">&#x1f512; {t('settings.security')}</span> {t('settings.security.desc')}
          </div>
        </div>
      </div>
    </div>
  );
}
