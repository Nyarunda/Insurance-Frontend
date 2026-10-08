/**
 * Outcome notifications for requesters (NTF-2), from the server's workflow outbox.
 *
 *   GET   /workflows/my-notifications              the caller's outcomes, newest first; unread_count, seen_until
 *   POST  /workflows/my-notifications/seen         {until}: seen up to then (only ever forward)
 *   GET   /workflows/notification-settings         which outcomes the tenant announces, with its ETag
 *   PATCH /workflows/notification-settings         {events: {APPROVED: bool, ...}}, If-Match
 *
 * The shell polls the list as it polls an approver's queue (NTF-1): every minute while the window is
 * visible, never in the background. Nothing is inferred here: what to announce is the server's answer.
 */

import { useCallback, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { classifyCommandError, CommandErrorKind } from '../../lib/api/commandErrors';
import { CommandKeyLifecycle, sendCommand } from '../../lib/api/idempotency';
import { api } from '../../lib/api/instance';
import { QUEUE_POLL_MS } from './queries';

export type OutcomeEvent = 'APPROVED' | 'REJECTED' | 'VOIDED';

export interface OutcomeNotification {
  id: string;
  event: OutcomeEvent;
  occurred_at: string;
  workflow_instance_id: string;
  definition_name: string;
  resource_type: string;
  resource_reference: string;
  reason_code: string | null;
  reason_label: string | null;
  reason_text: string | null;
  unread: boolean;
}

export interface MyNotifications {
  results: OutcomeNotification[];
  unread_count: number;
  seen_until: string | null;
}

export interface NotificationSettings {
  results: { event: OutcomeEvent; in_app: boolean; updated_at: string }[];
  etag: string;
}

export const NOTIFICATION_KEYS = {
  // Their own root: domain commands invalidate ['workflow'] and must not wait on this poll.
  mine: ['notifications', 'mine'] as const,
  settings: ['notifications', 'settings'] as const,
};

export function useMyNotifications(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.mine,
    queryFn: async () => (await api.request<MyNotifications>('/workflows/my-notifications')).data,
    enabled,
    staleTime: 0,
    refetchInterval: enabled ? QUEUE_POLL_MS : false,
    refetchIntervalInBackground: false,
  });
}

/** Marks the caller's notifications seen up to `until`; failures are quiet (the next poll shows them again). */
export function useMarkSeen() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  return useCallback(
    async (until: string) => {
      if (!keys.current.has(until)) keys.current.set(until, new CommandKeyLifecycle());
      const keyring = keys.current.get(until)!;
      try {
        const result = await sendCommand<MyNotifications>(api, keyring,
          { type: 'WORKFLOW_NOTIFICATIONS_SEEN', resource: 'my-notifications', body: { until } },
          { path: '/workflows/my-notifications/seen', method: 'POST' });
        keyring.reset();
        queryClient.setQueryData(NOTIFICATION_KEYS.mine, result.data);
      } catch {
        // Not seen yet: the next answer still lists them as unread, and nothing is lost.
      }
    },
    [queryClient],
  );
}

export function useNotificationSettings(enabled = true) {
  return useQuery({
    queryKey: NOTIFICATION_KEYS.settings,
    queryFn: async () => {
      const result = await api.request<NotificationSettings>('/workflows/notification-settings');
      return { view: result.data, etag: result.etag ?? result.data.etag };
    },
    enabled,
  });
}

export type SettingsOutcome = { ok: true; data: NotificationSettings } | { ok: false; kind: CommandErrorKind; error: unknown };

export function useNotificationSettingsCommand() {
  const queryClient = useQueryClient();
  const keys = useRef(new Map<string, CommandKeyLifecycle>());
  const [pending, setPending] = useState(false);
  const change = useCallback(
    async (events: Partial<Record<OutcomeEvent, boolean>>, etag: string): Promise<SettingsOutcome> => {
      const slot = JSON.stringify(events);
      if (!keys.current.has(slot)) keys.current.set(slot, new CommandKeyLifecycle());
      const keyring = keys.current.get(slot)!;
      setPending(true);
      try {
        const result = await sendCommand<NotificationSettings>(api, keyring,
          { type: 'WORKFLOW_NOTIFICATION_SETTINGS_UPDATE', resource: 'notification-settings', body: { events } },
          { path: '/workflows/notification-settings', method: 'PATCH', ifMatch: etag });
        keyring.reset();
        await queryClient.invalidateQueries({ queryKey: NOTIFICATION_KEYS.settings });
        return { ok: true, data: result.data };
      } catch (error) {
        return { ok: false, kind: classifyCommandError(error), error };
      } finally {
        setPending(false);
      }
    },
    [queryClient],
  );
  return { pending, change };
}

const NOUN: Record<string, string> = {
  POLICY_ENDORSEMENT: 'endorsement',
  POLICY_RENEWAL: 'renewal',
  QUOTATION_REVISION: 'quotation',
  UNDERWRITING_EXCEPTION: 'underwriting exception',
  CERTIFICATE: 'certificate cancellation',
};

/** The post-pilot backlog's wording: "Your endorsement END0000042 was approved." */
export function outcomeText(n: OutcomeNotification): { title: string; text: string } {
  const noun = NOUN[n.resource_type] ?? n.definition_name.toLowerCase();
  const reason = n.reason_label ?? n.reason_text;
  if (n.event === 'APPROVED') return { title: 'Approved', text: `Your ${noun} ${n.resource_reference} was approved.` };
  if (n.event === 'REJECTED') {
    return { title: 'Rejected', text: `Your ${noun} ${n.resource_reference} was rejected${reason ? `: ${reason}` : ''}. Open it to review the reason.` };
  }
  return { title: 'Approval cancelled', text: `Approval for ${n.resource_reference} was cancelled${n.reason_text ? `: ${n.reason_text}` : ''}.` };
}

export const EVENT_LABEL: Record<OutcomeEvent, string> = {
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  VOIDED: 'Cancelled (voided)',
};
