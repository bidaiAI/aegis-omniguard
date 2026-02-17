import { useEffect, useState } from 'react';
import { MSG } from '../../shared/message_types';
import type { InterceptLogEntry, SensitiveDataType } from '../../shared/types';
import { useLocale } from '../i18n';

const TYPE_ICONS: Record<SensitiveDataType, string> = {
  credit_card: '\u{1F4B3}',
  mnemonic: '\u{1F511}',
  private_key: '\u{1F512}',
  private_key_bitcoin: '\u{1F4B0}',
  private_key_solana: '\u{1F512}',
  private_key_tron: '\u{1F512}',
  api_key: '\u{1F5DD}',
  pii_id_card: '\u{1FAAA}',
  pii_phone: '\u{1F4F1}',
  pii_email: '\u{1F4E7}',
};

interface Props {
  onBack: () => void;
}

export default function Logs({ onBack }: Props) {
  const { t } = useLocale();
  const [logs, setLogs] = useState<InterceptLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_LOGS }, (response: InterceptLogEntry[]) => {
      if (Array.isArray(response)) {
        setLogs(response);
      }
      setLoading(false);
    });
  }, []);

  const clearLogs = () => {
    chrome.runtime.sendMessage({ type: MSG.CLEAR_LOGS }, () => {
      setLogs([]);
    });
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) +
      ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a1a2e] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="text-[#888] hover:text-white text-sm"
          >
            &larr; {t('common.back')}
          </button>
          <h2 className="text-sm font-semibold text-[#00d4aa]">{t('logs.title')}</h2>
        </div>
        {logs.length > 0 && (
          <button
            onClick={clearLogs}
            className="text-[10px] text-[#666] hover:text-[#ef4444] transition-colors"
          >
            {t('logs.clear')}
          </button>
        )}
      </div>

      {/* Log List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-[#666] text-sm">
            {t('common.loading')}
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-[#555]">
            <span className="text-3xl mb-2">&#x2705;</span>
            <span className="text-sm">{t('logs.empty')}</span>
            <span className="text-[10px] text-[#444] mt-1">{t('logs.empty.desc')}</span>
          </div>
        ) : (
          <div className="divide-y divide-[#1a1a2e]">
            {logs.map((log) => (
              <div key={log.id} className="px-4 py-3 hover:bg-[#1a1a2e]/50">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] text-[#00d4aa] font-medium truncate max-w-[200px]">
                    {log.domain}
                  </span>
                  <span className="text-[10px] text-[#555]">{formatTime(log.timestamp)}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {log.detections.map((d, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 text-[10px] bg-[#1e293b] text-[#94a3b8] px-2 py-0.5 rounded-full"
                    >
                      <span>{TYPE_ICONS[d.type] || '\u{1F6E1}'}</span>
                      <span>{t(`types.${d.type}`) || d.type}</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer Stats */}
      {logs.length > 0 && (
        <div className="px-4 py-2 border-t border-[#1a1a2e] text-center">
          <span className="text-[10px] text-[#555]">
            {t('logs.count', { count: String(logs.length) })}
          </span>
        </div>
      )}
    </div>
  );
}
