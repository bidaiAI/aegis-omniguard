import type { AegisSettings, ProtectionLevel } from '../../shared/types';

type Page = 'dashboard' | 'logs' | 'whitelist';

interface Props {
  settings: AegisSettings;
  onUpdate: (updates: Partial<AegisSettings>) => void;
  onNavigate: (page: Page) => void;
}

const LEVEL_LABELS: Record<ProtectionLevel, { label: string; desc: string; color: string }> = {
  low: { label: 'Low', desc: 'Only high-confidence threats', color: '#f59e0b' },
  medium: { label: 'Medium', desc: 'Balanced protection', color: '#00d4aa' },
  high: { label: 'High', desc: 'Maximum sensitivity', color: '#ef4444' },
};

export default function Dashboard({ settings, onUpdate, onNavigate }: Props) {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-2">
          <span className="text-2xl">&#x1f6e1;</span>
          <div>
            <h1 className="text-lg font-bold text-[#00d4aa]">Aegis OmniGuard</h1>
            <p className="text-xs text-[#888]">AI-Era Data Sovereignty Guardian</p>
          </div>
        </div>
      </div>

      {/* Main Toggle */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between bg-[#1a1a2e] rounded-xl p-4">
          <div>
            <div className="font-semibold">Protection Shield</div>
            <div className="text-xs text-[#888] mt-1">
              {settings.enabled ? 'Active - Monitoring all inputs' : 'Disabled'}
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
        <div className="text-sm font-semibold mb-2">Protection Level</div>
        <div className="flex gap-2">
          {(Object.keys(LEVEL_LABELS) as ProtectionLevel[]).map((level) => {
            const info = LEVEL_LABELS[level];
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
                  style={{ color: isActive ? info.color : '#888' }}
                >
                  {info.label}
                </div>
                <div className="text-[10px] text-[#666] mt-1">{info.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Module Toggles */}
      <div className="px-4 py-2">
        <div className="text-sm font-semibold mb-2">Modules</div>
        <div className="space-y-2">
          <ModuleToggle
            label="Web2 DLP Shield"
            desc="Detect credit cards, mnemonics, API keys, PII"
            enabled={settings.web2DlpEnabled}
            onChange={(v) => onUpdate({ web2DlpEnabled: v })}
          />
          <ModuleToggle
            label="Web3 Sentinel"
            desc="Smart contract signature analysis"
            enabled={settings.web3SentinelEnabled}
            onChange={(v) => onUpdate({ web3SentinelEnabled: v })}
            badge="Phase 2"
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
              <div className="text-xs font-medium">Intercept Log</div>
              <div className="text-[10px] text-[#666]">View blocked items</div>
            </div>
          </button>
          <button
            onClick={() => onNavigate('whitelist')}
            className="flex-1 flex items-center gap-2 bg-[#1a1a2e] hover:bg-[#252540] rounded-lg p-3 transition-colors"
          >
            <span className="text-base">&#x1f310;</span>
            <div className="text-left">
              <div className="text-xs font-medium">Whitelist</div>
              <div className="text-[10px] text-[#666]">{settings.whitelist.length} domains</div>
            </div>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#1a1a2e] text-center">
        <span className="text-[10px] text-[#555]">Aegis OmniGuard v0.1.0 | Open Source</span>
      </div>
    </div>
  );
}

function ModuleToggle({
  label,
  desc,
  enabled,
  onChange,
  badge,
}: {
  label: string;
  desc: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  badge?: string;
}) {
  return (
    <div className="flex items-center justify-between bg-[#1a1a2e] rounded-lg p-3">
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{label}</span>
          {badge && (
            <span className="text-[9px] px-1.5 py-0.5 bg-[#333] text-[#888] rounded">
              {badge}
            </span>
          )}
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
