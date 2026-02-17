import { useEffect, useState } from 'react';
import { MSG } from '../shared/message_types';
import type { AegisSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/types';
import Dashboard from './pages/Dashboard';
import Logs from './pages/Logs';
import Whitelist from './pages/Whitelist';
import Settings from './pages/Settings';
import { LocaleProvider, type Locale } from './i18n';

type Page = 'dashboard' | 'logs' | 'whitelist' | 'settings';

function App() {
  const [settings, setSettings] = useState<AegisSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState<Page>('dashboard');

  useEffect(() => {
    chrome.runtime.sendMessage({ type: MSG.GET_SETTINGS }, (response: AegisSettings) => {
      if (response && !('error' in response)) {
        setSettings(response);
      }
      setLoading(false);
    });
  }, []);

  const updateSettings = (updates: Partial<AegisSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    chrome.runtime.sendMessage({
      type: MSG.UPDATE_SETTINGS,
      payload: updates,
    });
  };

  const handleLocaleChange = (locale: Locale) => {
    updateSettings({ language: locale });
  };

  if (loading) {
    return (
      <div className="w-[360px] h-[480px] bg-[#0f0f1a] flex items-center justify-center">
        <div className="text-[#00d4aa] text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <LocaleProvider
      initialLocale={(settings.language as Locale) || 'en'}
      onLocaleChange={handleLocaleChange}
    >
      <div className="w-[360px] h-[480px] bg-[#0f0f1a] text-[#e0e0e0] overflow-y-auto">
        {page === 'dashboard' && (
          <Dashboard
            settings={settings}
            onUpdate={updateSettings}
            onNavigate={setPage}
          />
        )}
        {page === 'logs' && <Logs onBack={() => setPage('dashboard')} />}
        {page === 'whitelist' && (
          <Whitelist
            settings={settings}
            onUpdate={updateSettings}
            onBack={() => setPage('dashboard')}
          />
        )}
        {page === 'settings' && (
          <Settings
            settings={settings}
            onUpdate={updateSettings}
            onBack={() => setPage('dashboard')}
          />
        )}
      </div>
    </LocaleProvider>
  );
}

export default App;
