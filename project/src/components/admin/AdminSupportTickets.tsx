import { useState, useEffect } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import {
  getAllSupportTickets,
  getSupportMessages,
  adminReplyToTicket,
  adminUpdateTicketStatus,
} from '../../services/api';
import type { SupportMessage, TicketStatus } from '../../types';

const STATUS_LABELS: Record<TicketStatus, { ar: string; en: string }> = {
  open: { ar: 'مفتوح', en: 'Open' },
  answered: { ar: 'تم الرد', en: 'Answered' },
  pending: { ar: 'قيد الانتظار', en: 'Pending' },
  closed: { ar: 'مغلق', en: 'Closed' },
};

const STATUS_COLORS: Record<TicketStatus, string> = {
  open: '#22c55e',
  answered: '#3b82f6',
  pending: '#f59e0b',
  closed: '#6b7280',
};

export default function AdminSupportTickets() {
  const { language } = useLanguage();
  const [tickets, setTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<string | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TicketStatus | ''>('');

  useEffect(() => {
    loadTickets();
  }, [statusFilter]);

  useEffect(() => {
    if (selectedTicket) loadMessages();
  }, [selectedTicket]);

  async function loadTickets() {
    setLoading(true);
    try {
      const data = await getAllSupportTickets(statusFilter || undefined);
      setTickets(data);
    } catch (err) {
      console.error('[AdminSupportTickets] loadTickets error:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadMessages() {
    if (!selectedTicket) return;
    try {
      const data = await getSupportMessages(selectedTicket);
      setMessages(data);
    } catch (err) {
      console.error('[AdminSupportTickets] loadMessages error:', err);
    }
  }

  async function handleReply() {
    if (!selectedTicket || !replyText.trim()) return;
    setSending(true);
    try {
      await adminReplyToTicket(selectedTicket, replyText.trim());
      setReplyText('');
      await loadMessages();
      await loadTickets();
    } catch (err) {
      console.error('[AdminSupportTickets] reply error:', err);
    } finally {
      setSending(false);
    }
  }

  async function handleStatusChange(ticketId: string, newStatus: TicketStatus) {
    try {
      await adminUpdateTicketStatus(ticketId, newStatus);
      await loadTickets();
      if (selectedTicket === ticketId) await loadMessages();
    } catch (err) {
      console.error('[AdminSupportTickets] status change error:', err);
    }
  }

  const selected = tickets.find((t) => t.id === selectedTicket);

  return (
    <div style={{ padding: '1.5rem' }}>
      <h2 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--color-text-primary)' }}>
        {language === 'ar' ? 'تذاكر الدعم' : 'Support Tickets'}
      </h2>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {(['', 'open', 'answered', 'pending', 'closed'] as (TicketStatus | '')[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '0.5rem',
              border: '1px solid var(--color-border)',
              backgroundColor: statusFilter === s ? 'var(--color-accent)' : 'var(--color-surface)',
              color: statusFilter === s ? '#fff' : 'var(--color-text-primary)',
              cursor: 'pointer',
              fontSize: '0.8rem',
            }}
          >
            {s === '' ? (language === 'ar' ? 'الكل' : 'All') : STATUS_LABELS[s][language === 'ar' ? 'ar' : 'en']}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '1.5rem', minHeight: '500px' }}>
        {/* Ticket list */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
            {language === 'ar' ? 'التذاكر' : 'Tickets'} ({tickets.length})
          </div>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'جارٍ التحميل...' : 'Loading...'}
              </div>
            ) : tickets.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'لا توجد تذاكر' : 'No tickets found'}
              </div>
            ) : (
              tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket.id)}
                  style={{
                    padding: '0.75rem',
                    borderBottom: '1px solid var(--color-border)',
                    cursor: 'pointer',
                    backgroundColor: selectedTicket === ticket.id ? 'var(--color-bg-tertiary)' : 'transparent',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {ticket.title || (language === 'ar' ? 'بدون عنوان' : 'No title')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        padding: '0.15rem 0.5rem',
                        borderRadius: '9999px',
                        backgroundColor: STATUS_COLORS[ticket.status as TicketStatus] + '20',
                        color: STATUS_COLORS[ticket.status as TicketStatus],
                      }}
                    >
                      {STATUS_LABELS[ticket.status as TicketStatus]?.[language === 'ar' ? 'ar' : 'en'] || ticket.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                    {ticket.user_email || ticket.user_id?.slice(0, 8) + '...'}
                    {' · '}
                    {new Date(ticket.created_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Messages area */}
        <div style={{ border: '1px solid var(--color-border)', borderRadius: '0.75rem', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0.75rem', borderBottom: '1px solid var(--color-border)', backgroundColor: 'var(--color-bg-tertiary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--color-text-primary)' }}>
              {selected
                ? selected.title || (language === 'ar' ? 'تذكرة' : 'Ticket')
                : (language === 'ar' ? 'اختر تذكرة' : 'Select a ticket')}
            </span>
            {selected && (
              <select
                value={selected.status}
                onChange={(e) => handleStatusChange(selected.id, e.target.value as TicketStatus)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.25rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-surface)',
                  color: 'var(--color-text-primary)',
                }}
              >
                <option value="open">{language === 'ar' ? 'مفتوح' : 'Open'}</option>
                <option value="answered">{language === 'ar' ? 'تم الرد' : 'Answered'}</option>
                <option value="pending">{language === 'ar' ? 'قيد الانتظار' : 'Pending'}</option>
                <option value="closed">{language === 'ar' ? 'مغلق' : 'Closed'}</option>
              </select>
            )}
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '300px' }}>
            {!selected ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)', padding: '2rem' }}>
                {language === 'ar' ? 'اختر تذكرة لعرض المحادثة' : 'Select a ticket to view conversation'}
              </div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--color-text-tertiary)' }}>
                {language === 'ar' ? 'لا توجد رسائل' : 'No messages'}
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: msg.sender_type === 'admin' ? 'flex-end' : 'flex-start',
                    maxWidth: '80%',
                  }}
                >
                  <div
                    style={{
                      borderRadius: '1rem',
                      padding: '0.5rem 1rem',
                      fontSize: '0.85rem',
                      backgroundColor: msg.sender_type === 'admin' ? 'var(--color-accent)' : 'var(--color-surface)',
                      color: msg.sender_type === 'admin' ? '#fff' : 'var(--color-text-primary)',
                      border: msg.sender_type === 'admin' ? 'none' : '1px solid var(--color-border)',
                    }}
                  >
                    {msg.message}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', marginTop: '0.15rem', textAlign: msg.sender_type === 'admin' ? 'right' : 'left' }}>
                    {msg.sender_type === 'admin' ? (language === 'ar' ? 'دعم' : 'Support') : (language === 'ar' ? 'مستخدم' : 'User')}
                    {' · '}
                    {new Date(msg.created_at).toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US')}
                  </div>
                </div>
              ))
            )}
          </div>

          {selected && selected.status !== 'closed' && (
            <div style={{ padding: '0.75rem', borderTop: '1px solid var(--color-border)', display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleReply();
                  }
                }}
                placeholder={language === 'ar' ? 'اكتب ردك...' : 'Type your reply...'}
                disabled={sending}
                style={{
                  flex: 1,
                  padding: '0.5rem 1rem',
                  borderRadius: '0.75rem',
                  border: '1px solid var(--color-border)',
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.85rem',
                  outline: 'none',
                }}
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                style={{
                  padding: '0.5rem 1.25rem',
                  borderRadius: '0.75rem',
                  border: 'none',
                  backgroundColor: sending || !replyText.trim() ? 'var(--color-bg-tertiary)' : 'var(--color-accent)',
                  color: sending || !replyText.trim() ? 'var(--color-text-tertiary)' : '#fff',
                  cursor: sending || !replyText.trim() ? 'default' : 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                }}
              >
                {sending ? '...' : (language === 'ar' ? 'إرسال' : 'Send')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}