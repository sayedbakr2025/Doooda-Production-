import { useState } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { useAuth } from '../../../contexts/AuthContext';

interface Institution {
  id: string;
  name: string;
  tokens_balance: number;
}

interface Props {
  institution: Institution;
  onClose: () => void;
  onDone: () => void;
}

export default function AdminInstitutionTokenModal({ institution, onClose, onDone }: Props) {
  const { user } = useAuth();
  const [action, setAction] = useState<'add' | 'remove' | 'reset'>('add');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit() {
    const amt = parseInt(amount);
    if (action !== 'reset' && (!amt || amt <= 0)) {
      setError('Please enter a valid amount');
      return;
    }
    setSubmitting(true);
    setError('');
    const balanceBefore = institution.tokens_balance;
    let balanceAfter = balanceBefore;
    if (action === 'add') balanceAfter = balanceBefore + amt;
    else if (action === 'remove') balanceAfter = Math.max(0, balanceBefore - amt);
    else balanceAfter = 0;

    const { error: updateErr } = await supabase
      .from('institutional_accounts')
      .update({ tokens_balance: balanceAfter })
      .eq('id', institution.id);

    if (updateErr) { setError(updateErr.message); setSubmitting(false); return; }

    await supabase.from('institution_token_logs').insert({
      institution_id: institution.id,
      admin_id: user?.id,
      action,
      amount: action === 'reset' ? balanceBefore : amt,
      balance_before: balanceBefore,
      balance_after: balanceAfter,
      note,
    });

    setSubmitting(false);
    onDone();
    onClose();
  }

  const preview = () => {
    const amt = parseInt(amount) || 0;
    if (action === 'add') return institution.tokens_balance + amt;
    if (action === 'remove') return Math.max(0, institution.tokens_balance - amt);
    return 0;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-2xl p-6 w-full max-w-sm" style={{ backgroundColor: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <h3 className="font-bold mb-1" style={{ color: 'var(--color-text-primary)' }}>Manage Tokens</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{institution.name}</p>

        <div className="mb-3 p-3 rounded-xl text-center" style={{ backgroundColor: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-tertiary)' }}>Current Balance</p>
          <p className="text-2xl font-bold" style={{ color: '#16a34a' }}>{institution.tokens_balance.toLocaleString()}</p>
        </div>

        <div className="flex gap-1 mb-4 p-1 rounded-xl" style={{ backgroundColor: 'var(--color-bg)' }}>
          {(['add', 'remove', 'reset'] as const).map(a => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className="flex-1 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
              style={{
                backgroundColor: action === a ? (a === 'remove' || a === 'reset' ? '#dc2626' : '#16a34a') : 'transparent',
                color: action === a ? 'white' : 'var(--color-text-secondary)',
              }}
            >
              {a}
            </button>
          ))}
        </div>

        {action !== 'reset' && (
          <input
            type="number"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            placeholder="Amount"
            min="1"
            className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
          />
        )}

        <input
          type="text"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Note (optional)"
          className="w-full rounded-xl px-3 py-2.5 text-sm mb-3"
          style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-primary)' }}
        />

        {(action !== 'reset' && amount) && (
          <div className="mb-3 text-xs text-center" style={{ color: 'var(--color-text-tertiary)' }}>
            New balance: <strong style={{ color: 'var(--color-text-primary)' }}>{preview().toLocaleString()}</strong>
          </div>
        )}
        {action === 'reset' && (
          <div className="mb-3 text-xs text-center" style={{ color: '#dc2626' }}>
            Balance will be set to 0
          </div>
        )}

        {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-accent)', color: 'white' }}
          >
            {submitting ? 'Saving...' : 'Confirm'}
          </button>
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: 'var(--color-bg)', border: '1px solid var(--color-border)', color: 'var(--color-text-secondary)' }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
