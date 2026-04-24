import { useEffect, useState } from 'react';
import { getSMTPSettings, updateSMTPSettings, testSMTP } from '../../services/api';
import Input from '../Input';
import Button from '../Button';

interface SMTPSettings {
  host: string;
  port: number;
  username: string;
  password: string;
  from_email: string;
  from_name: string;
  use_tls: boolean;
  is_active: boolean;
}

export default function AdminNotifications() {
  const [settings, setSettings] = useState<SMTPSettings>({
    host: '',
    port: 587,
    username: '',
    password: '',
    from_email: '',
    from_name: 'Doooda',
    use_tls: true,
    is_active: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getSMTPSettings();
      if (data) {
        setSettings(data);
      }
    } catch (err) {
      console.error('Failed to load SMTP settings', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);
      await updateSMTPSettings(settings);
      setMessage({ type: 'success', text: 'SMTP settings saved successfully' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save SMTP settings' });
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter a test email address' });
      return;
    }

    try {
      setTesting(true);
      setMessage(null);
      await testSMTP(testEmail);
      setMessage({ type: 'success', text: 'Test email sent successfully! Check your inbox.' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send test email. Check your settings.' });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return <div className="text-gray-600 dark:text-gray-400">Loading settings...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Notifications & SMTP Settings
      </h2>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200'
              : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="SMTP Host"
            value={settings.host}
            onChange={(e) => setSettings({ ...settings, host: e.target.value })}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            type="number"
            value={settings.port}
            onChange={(e) => setSettings({ ...settings, port: parseInt(e.target.value) })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Username"
            value={settings.username}
            onChange={(e) => setSettings({ ...settings, username: e.target.value })}
            placeholder="your-email@example.com"
          />
          <Input
            label="Password"
            type="password"
            value={settings.password}
            onChange={(e) => setSettings({ ...settings, password: e.target.value })}
            placeholder="App password or SMTP password"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="From Email"
            type="email"
            value={settings.from_email}
            onChange={(e) => setSettings({ ...settings, from_email: e.target.value })}
            placeholder="noreply@doooda.com"
          />
          <Input
            label="From Name"
            value={settings.from_name}
            onChange={(e) => setSettings({ ...settings, from_name: e.target.value })}
            placeholder="Doooda"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.use_tls}
              onChange={(e) => setSettings({ ...settings, use_tls: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Use TLS/SSL</span>
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={settings.is_active}
              onChange={(e) => setSettings({ ...settings, is_active: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Enable Email Notifications</span>
          </label>
        </div>

        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </div>

      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Test Email</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Send a test email to verify your SMTP configuration is working correctly.
        </p>
        <div className="flex gap-3">
          <div className="flex-1">
            <Input
              placeholder="test@example.com"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              type="email"
            />
          </div>
          <Button onClick={handleTest} disabled={testing}>
            {testing ? 'Sending...' : 'Send Test Email'}
          </Button>
        </div>
      </div>
    </div>
  );
}
