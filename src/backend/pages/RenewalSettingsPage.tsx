/**
 * Renewal settings (SETUP-DRIVEN-1 SD-E): `/renewal-settings/list`, the tenant's renewal window either
 * side of expiry and how long an offer stays open, as effective-dated periods. The backend decides
 * every call.
 *
 * - Everyone who prepares or approves renewals sees the values in force and every period.
 * - A tenant-wide renewal settings manager drafts a period from a date (today or later).
 * - A tenant-wide configuration publisher who did not draft it publishes it; a published period never
 *   changes, and while one is open a new period starts tomorrow at the earliest.
 * - What a period changes: the window when a renewal is prepared (and the due list), and the validity
 *   when an offer is made. Offers already made keep their expiry; renewals already prepared carry on.
 */

import React, { useEffect, useState } from 'react';
import { CalendarClock, Plus, RefreshCw } from 'lucide-react';
import {
  DetailGrid,
  DetailGroup,
  EmptyState,
  FieldError,
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageTitle,
  HorizonToast,
  StatusBadge,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { CONFIG_PUBLISH, RENEWAL_SETTINGS_MANAGE } from '../permissions';
import { formatDate } from '../policies/format';
import {
  days,
  RenewalSettingsPeriod,
  RenewalSettingValues,
  settingsRefusal,
  useRenewalSettings,
  useRenewalSettingsCommands,
} from '../renewals/settings';

export const NO_PERIODS_TEXT = 'No renewal settings are set up';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const hint = 'mt-1.5 text-[13px] text-[var(--hz-text-muted)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

const Refusal: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const text = settingsRefusal(error);
  if (!text) return <ApiErrorAlert error={error} title={title} />;
  return (
    <div role="alert">
      <HorizonAlert tone="warning" title={title}>
        {text}
        <ErrorReference reference={referenceOf(error)} />
      </HorizonAlert>
    </div>
  );
};

const Status: React.FC<{ status: RenewalSettingsPeriod['status'] }> = ({ status }) => (
  <StatusBadge square label={status === 'PUBLISHED' ? 'Published' : 'Draft'} tone={status === 'PUBLISHED' ? 'success' : 'warning'} />
);

const until = (row: RenewalSettingsPeriod) => (row.effective_to ? formatDate(row.effective_to) : 'Open');

export const RenewalSettingsPage: React.FC = () => {
  const settings = useRenewalSettings();
  const me = useMe().data;
  const manager = hasPermission(me, RENEWAL_SETTINGS_MANAGE);
  const publisher = hasPermission(me, CONFIG_PUBLISH);
  const [dialog, setDialog] = useState<{ kind: 'draft' } | { kind: 'publish'; period: RenewalSettingsPeriod } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);
  const done = (message: string) => {
    setDialog(null);
    setToast(message);
  };

  return (
    <HorizonPage id="renewal-settings">
      <HorizonToast message={toast} />
      <HorizonPageTitle
        title="Renewal settings"
        subtitle="When a policy can be renewed and how long a renewal offer stays open"
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" disabled={settings.isFetching} onClick={() => void settings.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 ${settings.isFetching ? 'animate-spin' : ''}`} />
              {settings.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {manager && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => setDialog({ kind: 'draft' })}>
                <Plus className="h-3.5 w-3.5" />
                New period
              </button>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        {settings.isPending && <HorizonLoader tip="Loading the settings..." />}
        {settings.isError && <ApiErrorAlert error={settings.error} title="The settings could not be loaded" />}
        {settings.isSuccess && (
          <>
            <DetailGroup title="In force today" description={`The published period covering ${formatDate(settings.data.in_force.on)}.`}>
              <div role="region" aria-label="In force today">
                <DetailGrid items={valueItems(settings.data.in_force)} />
              </div>
            </DetailGroup>
            <DetailGroup
              title="Periods"
              description="A published period never changes. A new period replaces it from its date; offers already made keep their expiry, and renewals already prepared carry on."
            >
              {settings.data.results.length === 0 ? (
                <EmptyState icon={CalendarClock} title={NO_PERIODS_TEXT} hint={manager ? 'Use New period to draft one.' : 'A renewal settings manager drafts them.'} />
              ) : (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Renewal settings periods">
                    <thead>
                      <tr>
                        <th>From</th>
                        <th>Until</th>
                        <th>Status</th>
                        <th>Before expiry</th>
                        <th>After expiry</th>
                        <th>Offer open</th>
                        <th>Longest offer</th>
                        <th aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {settings.data.results.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.effective_from)}</td>
                          <td>{until(row)}</td>
                          <td>
                            <Status status={row.status} />
                          </td>
                          <td>{days(row.early_window_days)}</td>
                          <td>{days(row.late_window_days)}</td>
                          <td>{days(row.offer_validity_days)}</td>
                          <td>{days(row.offer_max_validity_days)}</td>
                          <td>
                            {row.status === 'DRAFT' && publisher && row.created_by !== me?.user.id && (
                              <div className="flex justify-end">
                                <button type="button" className="hz-button hz-button-secondary" aria-label={`Publish the period from ${formatDate(row.effective_from)}`}
                                  onClick={() => setDialog({ kind: 'publish', period: row })}>
                                  Publish
                                </button>
                              </div>
                            )}
                            {row.status === 'DRAFT' && row.created_by === me?.user.id && (
                              <span className="text-[13px] text-[var(--hz-text-muted)]">Someone else publishes</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailGroup>
          </>
        )}
      </div>

      {dialog?.kind === 'draft' && settings.isSuccess && (
        <DraftDialog start={settings.data.in_force} onClose={() => setDialog(null)} onDone={(from) => done(`Period from ${formatDate(from)} drafted; someone else publishes it`)} />
      )}
      {dialog?.kind === 'publish' && (
        <PublishDialog key={dialog.period.id} period={dialog.period} onClose={() => setDialog(null)}
          onDone={(from) => done(`Period from ${formatDate(from)} published`)} />
      )}
    </HorizonPage>
  );
};

const valueItems = (values: RenewalSettingValues) => [
  { label: 'Renewable before expiry', value: days(values.early_window_days) },
  { label: 'Renewable after expiry', value: days(values.late_window_days) },
  { label: 'Offer open for', value: days(values.offer_validity_days) },
  { label: 'Longest offer', value: days(values.offer_max_validity_days) },
];

// ---------------------------------------------------------------------------- draft

type Key = keyof RenewalSettingValues;

const FIELDS: { key: Key; text: string; help: string; min: number }[] = [
  { key: 'early_window_days', text: 'Renewable before expiry (days)', help: 'How early a renewal can be prepared; 1 to 365.', min: 1 },
  { key: 'late_window_days', text: 'Renewable after expiry (days)', help: 'How long after expiry it can still be prepared; 0 to 365.', min: 0 },
  { key: 'offer_validity_days', text: 'Offer open for (days)', help: 'The standard validity of an offer; up to the longest offer.', min: 1 },
  { key: 'offer_max_validity_days', text: 'Longest offer (days)', help: 'The most an offer may be given; 1 to 365.', min: 1 },
];

const tomorrow = () => {
  const day = new Date();
  day.setDate(day.getDate() + 1);
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`;
};

const DraftDialog: React.FC<{ start: RenewalSettingValues; onClose: () => void; onDone: (from: string) => void }> = ({ start, onClose, onDone }) => {
  const commands = useRenewalSettingsCommands();
  const [from, setFrom] = useState(tomorrow());
  const [values, setValues] = useState<Record<Key, string>>({
    early_window_days: String(start.early_window_days),
    late_window_days: String(start.late_window_days),
    offer_validity_days: String(start.offer_validity_days),
    offer_max_validity_days: String(start.offer_max_validity_days),
  });
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const number = (key: Key) => (/^\d+$/.test(values[key].trim()) ? Number(values[key].trim()) : null);
  const local: Record<string, string | undefined> = { effective_from: from ? undefined : 'Choose the date the period starts.' };
  for (const { key, min } of FIELDS) {
    const n = number(key);
    if (n === null || n < min || n > 365) local[key] = `A whole number from ${min} to 365.`;
  }
  const validity = number('offer_validity_days');
  const longest = number('offer_max_validity_days');
  if (!local.offer_validity_days && validity !== null && longest !== null && validity > longest) {
    local.offer_validity_days = 'The offer cannot be open longer than the longest offer.';
  }
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean)) return;
    setFailure(null);
    setFields({});
    const outcome = await commands.draft({
      effective_from: from,
      early_window_days: number('early_window_days')!,
      late_window_days: number('late_window_days')!,
      offer_validity_days: validity!,
      offer_max_validity_days: longest!,
    });
    if (outcome.ok === true) return onDone(outcome.data.effective_from);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local || FIELDS.some((f) => f.key === key))) setFields(found);
    else setFailure(outcome.error);
  };

  const id = 'renewal-settings-draft';
  return (
    <DialogFrame
      titleId={`${id}-title`}
      title="New renewal settings period"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form={`${id}-form`} className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Saving…' : 'Save draft'}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title="The period was not drafted" />}
      <form id={`${id}-form`} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <p className="text-[13px] text-[var(--hz-text-muted)]">
          A draft changes nothing until someone else publishes it. Values start from those in force today.
        </p>
        <div>
          <label htmlFor={`${id}-from`} className={label}>
            Starts on <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input id={`${id}-from`} type="date" value={from} onChange={(event) => setFrom(event.target.value)}
            aria-invalid={!!errorFor('effective_from')} className={field(!!errorFor('effective_from'))} />
          <p className={hint}>While a period is in force, a new one can start tomorrow at the earliest.</p>
          <FieldError message={errorFor('effective_from')} />
        </div>
        {FIELDS.map(({ key, text, help }) => (
          <div key={key}>
            <label htmlFor={`${id}-${key}`} className={label}>
              {text} <span className="text-[var(--hz-danger)]">*</span>
            </label>
            <input id={`${id}-${key}`} inputMode="numeric" value={values[key]}
              onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))}
              aria-invalid={!!errorFor(key)} className={field(!!errorFor(key))} />
            <p className={hint}>{help}</p>
            <FieldError message={errorFor(key)} />
          </div>
        ))}
      </form>
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- publish

const PublishDialog: React.FC<{ period: RenewalSettingsPeriod; onClose: () => void; onDone: (from: string) => void }> = ({ period, onClose, onDone }) => {
  const commands = useRenewalSettingsCommands();
  const [failure, setFailure] = useState<unknown>(null);
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFailure(null);
    const outcome = await commands.publish(period.id);
    if (outcome.ok === true) return onDone(outcome.data.effective_from);
    setFailure(outcome.error);
  };
  const id = 'renewal-settings-publish';
  return (
    <DialogFrame
      titleId={`${id}-title`}
      title={`Publish the period from ${formatDate(period.effective_from)}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form={`${id}-form`} className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Publishing…' : 'Publish'}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title="The period was not published" />}
      <form id={`${id}-form`} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <DetailGrid items={valueItems(period)} />
        <p className="text-sm text-[var(--hz-text-primary)]">
          From {formatDate(period.effective_from)}, renewals are prepared and offered with these values. The period in force
          ends the day before. Once published, it never changes.
        </p>
      </form>
    </DialogFrame>
  );
};
