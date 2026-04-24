import { useState } from 'react';
import DooodaGlobalToggle from './doooda/DooodaGlobalToggle';
import DooodaPlanLimits from './doooda/DooodaPlanLimits';
import DooodaAnalytics from './doooda/DooodaAnalytics';
import DooodaPersona from './doooda/DooodaPersona';
import DooodaSessionSettings from './doooda/DooodaSessionSettings';
import DooodaProviders from './doooda/DooodaProviders';

type Tab = 'config' | 'providers' | 'limits' | 'persona' | 'analytics';

const TABS: { id: Tab; label: string }[] = [
  { id: 'config', label: 'Global Config' },
  { id: 'providers', label: 'AI Providers' },
  { id: 'limits', label: 'Plan Limits' },
  { id: 'persona', label: 'Persona & Guardrails' },
  { id: 'analytics', label: 'Analytics' },
];

export default function AdminDoooda() {
  const [activeTab, setActiveTab] = useState<Tab>('config');

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Ask Doooda Control Panel
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Manage Ask Doooda availability, limits, persona, and analytics.
      </p>

      <div className="flex gap-1 mb-6 border-b border-gray-200 dark:border-gray-700">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'config' && (
        <div className="space-y-6">
          <DooodaGlobalToggle />
          <DooodaSessionSettings />
        </div>
      )}
      {activeTab === 'providers' && <DooodaProviders />}
      {activeTab === 'limits' && <DooodaPlanLimits />}
      {activeTab === 'persona' && <DooodaPersona />}
      {activeTab === 'analytics' && <DooodaAnalytics />}
    </div>
  );
}
