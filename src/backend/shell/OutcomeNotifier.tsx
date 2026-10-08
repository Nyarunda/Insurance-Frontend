/**
 * Tells a requester how their approvals ended (NTF-2): approved, rejected (with the reason) or
 * cancelled, in the post-pilot backlog's wording. The list is the server's `/workflows/my-notifications`,
 * polled by the shell every minute while the window is visible. Unread outcomes are announced once:
 * one toast for a single outcome, a summary for several, and then the server is told they were seen,
 * so they are not announced again in another tab or after a reload. An approver can open the approval;
 * everyone else reads the message (their record's own page shows the outcome).
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, CircleSlash, XCircle } from 'lucide-react';
import { ToastCard } from '../../components/horizon';
import { OutcomeNotification, outcomeText, useMarkSeen, useMyNotifications } from '../workflow/notifications';
import { REMINDER_MS } from './ApprovalReminder';

type Toast = { title: string; text: string; tone: 'success' | 'danger' | 'warning' | 'info'; instanceId: string | null; key: number } | null;

const TONE = { APPROVED: 'success', REJECTED: 'danger', VOIDED: 'warning' } as const;
const ICON = { APPROVED: CheckCircle2, REJECTED: XCircle, VOIDED: CircleSlash } as const;

export const OutcomeNotifier: React.FC<{ canOpen: boolean }> = ({ canOpen }) => {
  const navigate = useNavigate();
  const notifications = useMyNotifications();
  const markSeen = useMarkSeen();
  const announced = useRef(new Set<string>());
  const [toast, setToast] = useState<Toast>(null);
  const [event, setEvent] = useState<OutcomeNotification['event']>('APPROVED');

  useEffect(() => {
    const data = notifications.data;
    // A notice must never break the screen: an answer without the expected list announces nothing.
    if (!data || !Array.isArray(data.results)) return;
    const fresh = data.results.filter((n) => n.unread && !announced.current.has(n.id));
    if (fresh.length === 0) return;
    fresh.forEach((n) => announced.current.add(n.id));
    const newest = fresh[0];
    if (fresh.length === 1 && data.unread_count <= 1) {
      const words = outcomeText(newest);
      setEvent(newest.event);
      setToast({ ...words, tone: TONE[newest.event], instanceId: newest.workflow_instance_id, key: Date.now() });
    } else {
      const count = Math.max(data.unread_count, fresh.length);
      setEvent(newest.event);
      setToast({
        title: `${count} approval outcomes`,
        text: `Latest: ${outcomeText(newest).text}`,
        tone: 'info',
        instanceId: null,
        key: Date.now(),
      });
    }
    void markSeen(newest.occurred_at);
  }, [notifications.data, markSeen]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), REMINDER_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;
  const instanceId = toast.instanceId;
  return (
    <ToastCard
      key={toast.key}
      tone={toast.tone}
      icon={ICON[event]}
      title={toast.title}
      position="bottom"
      sound
      onClose={() => setToast(null)}
      action={
        canOpen && instanceId ? (
          <button
            type="button"
            className="rounded-md bg-white/15 px-2.5 py-1 text-[13px] font-medium text-white hover:bg-white/25"
            onClick={() => {
              setToast(null);
              navigate(`/my-work/list/${encodeURIComponent(instanceId)}`);
            }}
          >
            Open
          </button>
        ) : undefined
      }
    >
      {toast.text}
    </ToastCard>
  );
};
