import { useState } from 'react';
import type { AegisSettings } from '../../shared/types';

interface Props {
  settings: AegisSettings;
  onUpdate: (updates: Partial<AegisSettings>) => void;
  onBack: () => void;
}

export default function Whitelist({ settings, onUpdate, onBack }: Props) {
  const [newDomain, setNewDomain] = useState('');

  const addDomain = () => {
    const domain = newDomain.trim().toLowerCase();
    if (!domain) return;
    if (settings.whitelist.includes(domain)) return;

    onUpdate({ whitelist: [...settings.whitelist, domain] });
    setNewDomain('');
  };

  const removeDomain = (domain: string) => {
    onUpdate({ whitelist: settings.whitelist.filter((d) => d !== domain) });
  };

  const handleKeydown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addDomain();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-[#1a1a2e]">
        <div className="flex items-center gap-2 mb-2">
          <button onClick={onBack} className="text-[#888] hover:text-white text-sm">
            &larr; Back
          </button>
          <h2 className="text-sm font-semibold text-[#00d4aa]">Whitelist</h2>
        </div>
        <p className="text-[10px] text-[#666]">
          Domains in the whitelist will bypass DLP scanning. Use *.example.com for wildcards.
        </p>
      </div>

      {/* Add Domain */}
      <div className="px-4 py-3 flex gap-2">
        <input
          type="text"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
          onKeyDown={handleKeydown}
          placeholder="e.g. mycompany.com"
          className="flex-1 bg-[#1a1a2e] border border-[#333] rounded-lg px-3 py-2 text-sm text-white placeholder-[#555] outline-none focus:border-[#00d4aa] transition-colors"
        />
        <button
          onClick={addDomain}
          disabled={!newDomain.trim()}
          className="px-3 py-2 bg-[#00d4aa] text-[#0f0f1a] rounded-lg text-sm font-medium disabled:opacity-30 hover:bg-[#00eabb] transition-colors"
        >
          Add
        </button>
      </div>

      {/* Domain List */}
      <div className="flex-1 overflow-y-auto px-4">
        {settings.whitelist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#555]">
            <span className="text-xl mb-1">&#x1f310;</span>
            <span className="text-[11px]">No whitelisted domains</span>
          </div>
        ) : (
          <div className="space-y-1">
            {settings.whitelist.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between bg-[#1a1a2e] rounded-lg px-3 py-2"
              >
                <span className="text-sm text-[#e0e0e0] font-mono">{domain}</span>
                <button
                  onClick={() => removeDomain(domain)}
                  className="text-[#555] hover:text-[#ef4444] text-sm transition-colors"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
