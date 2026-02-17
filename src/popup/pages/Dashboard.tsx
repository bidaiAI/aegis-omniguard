import type { AegisSettings, ProtectionLevel } from '../../shared/types';
import { useLocale, LangSwitch } from '../i18n';

type Page = 'dashboard' | 'logs' | 'whitelist' | 'settings';

interface Props {
  settings: AegisSettings;
  onUpdate: (updates: Partial<AegisSettings>) => void;
  onNavigate: (page: Page) => void;
}

const LEVELS: ProtectionLevel[] = ['low', 'medium', 'high'];
const LEVEL_COLORS: Record<ProtectionLevel, string> = {
  low: '#f59e0b',
  medium: '#00d4aa',
  high: '#ef4444',
};

export default function Dashboard({ settings, onUpdate, onNavigate }: Props) {
  const { t } = useLocale();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a1a2e]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">&#x1f6e1;</span>
            <div>
              <h1 className="text-lg font-bold text-[#00d4aa]">{t('dashboard.title')}</h1>
              <p className="text-xs text-[#888]">{t('dashboard.subtitle')}</p>
            </div>
          </div>
          <LangSwitch />
        </div>
      </div>

      {/* Main Toggle */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between bg-[#1a1a2e] rounded-xl p-4">
          <div>
            <div className="font-semibold">{t('dashboard.shield')}</div>
            <div className="text-xs text-[#888] mt-1">
              {settings.enabled ? t('dashboard.shield.active') : t('dashboard.shield.disabled')}
            </div>
          </div>
          <button
            onClick={() => onUpdate({ enabled: !settings.enabled })}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              settings.enabled ? 'bg-[#00d4aa]' : 'bg-[#333]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Protection Level */}
      <div className="px-4 py-2">
        <div className="text-sm font-semibold mb-2">{t('dashboard.level')}</div>
        <div className="flex gap-2">
          {LEVELS.map((level) => {
            const isActive = settings.protectionLevel === level;
            return (
              <button
                key={level}
                onClick={() => onUpdate({ protectionLevel: level })}
                className={`flex-1 p-3 rounded-lg border transition-all ${
                  isActive
                    ? 'border-[#00d4aa] bg-[#00d4aa]/10'
                    : 'border-[#333] bg-[#1a1a2e] hover:border-[#555]'
                }`}
              >
                <div
                  className="text-sm font-bold"
                  style={{ color: isActive ? LEVEL_COLORS[level] : '#888' }}
                >
                  {t(`dashboard.level.${level}`)}
                </div>
                <div className="text-[10px] text-[#666] mt-1">{t(`dashboard.level.${level}.desc`)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Toggles */}
      <div className="px-4 py-2">
        <div className="text-sm font-semibold mb-2">{t('dashboard.modules')}</div>
        <div className="space-y-2">
          <ModuleToggle
            label={t('dashboard.module.dlp')}
            desc={t('dashboard.module.dlp.desc')}
            enabled={settings.web2DlpEnabled}
            onChange={(v) => onUpdate({ web2DlpEnabled: v })}
          />
          <ModuleToggle
            label={t('dashboard.module.sentinel')}
            desc={t('dashboard.module.sentinel.desc')}
            enabled={settings.web3SentinelEnabled}
            onChange={(v) => onUpdate({ web3SentinelEnabled: v })}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 flex-1">
        <div className="flex gap-2">
          <button
            onClick={() => onNavigate('logs')}
            className="flex-1 flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg p-3 transition-colors"
          >
            <span className="text-base">&#x1f4cb;</span>
            <div className="text-left">
              <div className="text-xs font-medium">{t('dashboard.nav.logs')}</div>
              <div className="text-[10px] text-[#666]">{t('dashboard.nav.logs.desc')}</div>
            </div>
          </button>
          <button
            onClick={() => onNavigate('whitelist')}
            className="flex-1 flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg p-3 transition-colors"
          >
            <span className="text-base">&#x1f310;</span>
            <div className="text-left">
              <div className="text-xs font-medium">{t('dashboard.nav.whitelist')}</div>
              <div className="text-[10px] text-[#666]">
                {t('dashboard.nav.whitelist.desc', { count: String(settings.whitelist.length) })}
              </div>
            </div>
          </button>
          <button
            onClick={() => onNavigate('settings')}
            className="flex-1 flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg p-3 transition-colors"
          >
            <span className="text-base">&#x2699;&#xfe0f;</span>
            <div className="text-left">
              <div className="text-xs font-medium">{t('dashboard.nav.settings')}</div>
              <div className="text-[10px] text-[#666]">{t('dashboard.nav.settings.desc')}</div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a1a2e] text-center">
        <span className="text-[10px] text-[#555]">{t('dashboard.footer')}</span>
      </div>
    </div>
  );
}

function ModuleToggle({
  label,
  desc,
  enabled,
  onChange,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between bg-[#1a1a2e] rounded-lg p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
        </div>
        <div className="text-[11px] text-[#666] mt-0.5">{desc}</div>
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className={`relative w-10 h-5 rounded-full transition-colors ${
          enabled ? 'bg-[#00d4aa]' : 'bg-[#333]'
        }`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
            enabled ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}
