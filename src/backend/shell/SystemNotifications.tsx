import React from 'react';
import { AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api/instance';
import { useMe } from '../../lib/auth/me';

interface SystemNotification {
  id: string;
  category: string;
  title: string;
  body: string;
  severity: 'INFO' | 'WARNING' | 'ERROR';
  created_at: string;
}

const ICON = { INFO: Info, WARNING: AlertTriangle, ERROR: XCircle } as const;
const TONE = {
  INFO: { bg: 'var(--hz-bg-muted, #f0f9ff)', border: 'var(--hz-primary, #153980)', color: 'var(--hz-text-primary)' },
  WARNING: { bg: '#fffbeb', border: '#ca8a04', color: '#92400e' },
  ERROR: { bg: '#fef2f2', border: '#dc2626', color: '#991b1b' },
} as const;

export function SystemNotificationBanner() {
  const me = useMe().data;
  const query = useQuery({
    queryKey: ['system-notifications', me?.tenant.id],
    queryFn: async ({ signal }) => (await api.request<SystemNotification[]>('/notifications/system', { signal })).data,
    enabled: !!me,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
  const cache = useQueryClient();

  if (!query.data?.length) return null;

  const dismiss = async (id: string) => {
    try {
      await api.request(`/notifications/system/${id}/dismiss`, { method: 'POST', data: {} });
      void cache.invalidateQueries({ queryKey: ['system-notifications'] });
    } catch { /* silent */ }
  };

  return <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
    {query.data.map(n => {
      const tone = TONE[n.severity];
      const Icon = ICON[n.severity];
      return <div key={n.id} role="alert" data-testid="system-notification"
        style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px',
          background: tone.bg, borderLeft: `3px solid ${tone.border}`, color: tone.color, fontSize: 13 }}>
        <Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <strong>{n.title}</strong>
          {n.body && <div style={{ marginTop: 2 }}>{n.body}</div>}
        </div>
        <button onClick={() => dismiss(n.id)} title="Dismiss" style={{ flexShrink: 0, background: 'none',
          border: 'none', cursor: 'pointer', padding: 2, color: 'inherit', opacity: 0.6 }}>
          <X size={14} />
        </button>
      </div>;
    })}
  </div>;
}
