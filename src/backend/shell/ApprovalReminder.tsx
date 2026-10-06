/**
 * Reminds an approver of the approvals waiting for them (DESIGN-1): once per browser session when
 * some are waiting, and again whenever a new one arrives (the queue is polled by the shell). Each
 * reminder is a toast with the notification sound and a link to My Work Queue. Nothing is inferred:
 * the tasks are the server's `/work-queue`.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { BellRing } from 'lucide-react';
import { ToastCard } from '../../components/horizon';
import type { WorkQueueItem } from '../workflow/types';
import { humanize } from '../workflow/format';

const REMINDED_KEY = 'hz-approvals-reminded';
export const REMINDER_MS = 10_000;

const readReminded = () => {
  try {
    return window.sessionStorage.getItem(REMINDED_KEY) === '1';
  } catch {
    return false;
  }
};

const writeReminded = () => {
  try {
    window.sessionStorage.setItem(REMINDED_KEY, '1');
  } catch {
    // Storage unavailable: the reminder may show again after a reload.
  }
};

type Reminder = { title: string; text: string; key: number } | null;

const recordOf = (item: WorkQueueItem) => `${humanize(item.resource_type)}${item.resource_reference ? ` ${item.resource_reference}` : ''}`;

export const ApprovalReminder: React.FC<{ tasks: WorkQueueItem[] | undefined }> = ({ tasks }) => {
  const navigate = useNavigate();
  const seen = useRef<Set<string> | null>(null);
  const [reminder, setReminder] = useState<Reminder>(null);

  useEffect(() => {
    if (!tasks) return;
    const ids = new Set(tasks.map((task) => task.assignment_id));
    if (seen.current === null) {
      // The first answer: remind once per session when something is waiting.
      seen.current = ids;
      if (tasks.length > 0 && !readReminded()) {
        writeReminded();
        setReminder({
          title: tasks.length === 1 ? '1 approval is waiting for you' : `${tasks.length} approvals are waiting for you`,
          text: 'Open My Work Queue to decide them.',
          key: Date.now(),
        });
      }
      return;
    }
    const arrived = tasks.filter((task) => !seen.current!.has(task.assignment_id));
    seen.current = ids;
    if (arrived.length > 0) {
      setReminder({
        title: arrived.length === 1 ? 'New approval waiting' : `${arrived.length} new approvals waiting`,
        text: arrived.length === 1 ? `${recordOf(arrived[0])} · ${arrived[0].stage_label}` : 'Open My Work Queue to decide them.',
        key: Date.now(),
      });
    }
  }, [tasks]);

  useEffect(() => {
    if (!reminder) return;
    const timer = window.setTimeout(() => setReminder(null), REMINDER_MS);
    return () => window.clearTimeout(timer);
  }, [reminder]);

  if (!reminder) return null;
  return (
    <ToastCard
      key={reminder.key}
      tone="info"
      icon={BellRing}
      title={reminder.title}
      position="bottom"
      sound
      onClose={() => setReminder(null)}
      action={
        <button
          type="button"
          className="rounded-md bg-white/15 px-2.5 py-1 text-[13px] font-medium text-white hover:bg-white/25"
          onClick={() => {
            setReminder(null);
            navigate('/my-work/list');
          }}
        >
          Open
        </button>
      }
    >
      {reminder.text}
    </ToastCard>
  );
};
