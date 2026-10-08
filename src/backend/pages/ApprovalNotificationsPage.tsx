/**
 * Approval notifications (NTF-2): `/approval-notifications`, which approval outcomes the tenant
 * announces to the person who asked for the approval. Read with `admin.workflow.view`; changed by a
 * tenant-wide `admin.workflow.manage` with the server's ETag (a 412 reloads and keeps the choices).
 * In the application only: email and SMS wait for a delivery channel. Approvers are told about new
 * work by their queue (NTF-1), which this does not change.
 */

import React, { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { DetailGroup, HorizonAlert, HorizonLoader, HorizonPage, HorizonPageTitle, HorizonToast } from '../../components/horizon';
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { WORKFLOW_MANAGE } from '../permissions';
import { EVENT_LABEL, OutcomeEvent, useNotificationSettings, useNotificationSettingsCommand } from '../workflow/notifications';

const EXAMPLE: Record<OutcomeEvent, string> = {
  APPROVED: '"Your endorsement END0000042 was approved."',
  REJECTED: '"Your endorsement END0000042 was rejected. Open it to review the reason."',
  VOIDED: '"Approval for END0000042 was cancelled." (when someone else\'s action or a change to the record cancels it)',
};

export const ApprovalNotificationsPage: React.FC = () => {
  const settings = useNotificationSettings();
  const command = useNotificationSettingsCommand();
  const manager = hasPermission(useMe().data, WORKFLOW_MANAGE);
  const [choice, setChoice] = useState<Partial<Record<OutcomeEvent, boolean>>>({});
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const current = (event: OutcomeEvent) => settings.data?.view.results.find((r) => r.event === event)?.in_app ?? false;
  const value = (event: OutcomeEvent) => choice[event] ?? current(event);
  const changes = Object.fromEntries(
    (Object.keys(choice) as OutcomeEvent[]).filter((event) => choice[event] !== current(event)).map((event) => [event, choice[event]]),
  ) as Partial<Record<OutcomeEvent, boolean>>;
  const dirty = Object.keys(changes).length > 0;

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!dirty || !settings.data) return;
    setFailure(null);
    setStale(false);
    const outcome = await command.change(changes, settings.data.etag);
    if (outcome.ok === true) {
      setChoice({});
      setToast('Notification settings saved');
      return;
    }
    if (outcome.kind === 'stale') {
      setStale(true);
      await settings.refetch();
      return;
    }
    setFailure(outcome.error);
  };

  return (
    <HorizonPage id="approval-notifications">
      <HorizonToast message={toast} />
      <HorizonPageTitle
        title="Approval notifications"
        subtitle="What the person who asked for an approval is told when it ends"
        actions={
          <button type="button" className="hz-button hz-button-secondary" disabled={settings.isFetching} onClick={() => void settings.refetch()}>
            <RefreshCw className={`h-3.5 w-3.5 ${settings.isFetching ? 'animate-spin' : ''}`} />
            {settings.isFetching ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {settings.isPending && <HorizonLoader tip="Loading the settings..." />}
        {settings.isError && <ApiErrorAlert error={settings.error} title="The settings could not be loaded" />}
        {settings.isSuccess && (
          <DetailGroup
            title="In the application"
            description="Shown as a notice within a minute while they have the application open, or when they next sign in. Approvers are told about waiting approvals by My Work Queue."
          >
            {stale && (
              <div role="status">
                <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
              </div>
            )}
            {failure !== null && <ApiErrorAlert error={failure} title="The settings were not saved" />}
            <form noValidate aria-label="Approval notifications" onSubmit={(e) => void save(e)} className="flex flex-col gap-3">
              {(['APPROVED', 'REJECTED', 'VOIDED'] as OutcomeEvent[]).map((event) => (
                <label key={event} className="flex items-start gap-3 text-sm text-[var(--hz-text-primary)]">
                  <input type="checkbox" className="mt-1" checked={value(event)} disabled={!manager || command.pending}
                    onChange={(e) => setChoice((now) => ({ ...now, [event]: e.target.checked }))} />
                  <span>
                    <span className="font-medium">{EVENT_LABEL[event]}</span>
                    <span className="block text-[13px] text-[var(--hz-text-muted)]">{EXAMPLE[event]}</span>
                  </span>
                </label>
              ))}
              {manager ? (
                <div className="flex gap-2">
                  <button type="button" className="hz-button hz-button-secondary" disabled={!dirty || command.pending} onClick={() => setChoice({})}>
                    Undo
                  </button>
                  <button type="submit" className="hz-button hz-button-primary" disabled={!dirty || command.pending}>
                    {command.pending ? 'Saving…' : 'Save'}
                  </button>
                </div>
              ) : (
                <p className="text-[13px] text-[var(--hz-text-muted)]">A tenant-wide workflow administrator changes these.</p>
              )}
            </form>
          </DetailGroup>
        )}
      </div>
    </HorizonPage>
  );
};
