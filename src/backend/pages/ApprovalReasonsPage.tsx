/**
 * Approval reasons (WRC-1): `/approval-reasons/list`, Setup → Approval reasons, for
 * `admin.workflow.manage`. The reasons a checker chooses from when approving or rejecting in My Work
 * Queue are the tenant's own setup, not a fixed list; the backend decides every call.
 *
 * - Every reason, active or not: its label, whether it applies to approving, rejecting or both, and
 *   whether the checker must also write an explanation.
 * - New reason; Edit (label, applies to, explanation required); Deactivate and Reactivate. The code
 *   never changes and nothing is deleted, so past decisions keep their reason. The system reason is
 *   shown and never edited.
 * - An edit reads the reason's ETag from the server when its dialog opens; a 412 reloads it, keeps
 *   what was typed, and the same confirmation resends with the same key.
 */

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import {
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
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import {
  REASON_CODE_PATTERN,
  ReasonAction,
  ReasonCodeSetup,
  reasonRefusal,
  useReasonCommands,
  useReasonSetup,
} from '../workflow/reasonSetup';

export const NO_REASONS_TEXT = 'No approval reasons are set up';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

const appliesTo = (actions: ReasonAction[]) =>
  actions.length === 2 ? 'Approving and rejecting' : actions[0] === 'APPROVE' ? 'Approving' : 'Rejecting';

type Dialog = { kind: 'new' } | { kind: 'edit' | 'deactivate' | 'reactivate'; reason: ReasonCodeSetup } | null;

const Refusal: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const text = reasonRefusal(error);
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

export const ApprovalReasonsPage: React.FC = () => {
  const reasons = useReasonSetup();
  const [dialog, setDialog] = useState<Dialog>(null);
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
    <HorizonPage id="approval-reasons">
      <HorizonToast message={toast} />
      <HorizonPageTitle
        title="Approval reasons"
        subtitle="The reasons a checker chooses from when approving or rejecting in My Work Queue"
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" disabled={reasons.isFetching} onClick={() => void reasons.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 ${reasons.isFetching ? 'animate-spin' : ''}`} />
              {reasons.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className="hz-button hz-button-primary" onClick={() => setDialog({ kind: 'new' })}>
              <Plus className="h-3.5 w-3.5" />
              New reason
            </button>
          </>
        }
      />
      <div className="px-4 pb-6">
        <DetailGroup title="Reasons" description="A reason is switched off rather than deleted, so decisions already made keep their reason.">
          {reasons.isPending && <HorizonLoader tip="Loading the reasons..." />}
          {reasons.isError && <ApiErrorAlert error={reasons.error} title="The reasons could not be loaded" />}
          {reasons.isSuccess && reasons.data.length === 0 && <EmptyState icon={ListChecks} title={NO_REASONS_TEXT} hint="Use New reason to add the first one." />}
          {reasons.isSuccess && reasons.data.length > 0 && (
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Approval reasons">
                <thead>
                  <tr>
                    <th>Reason</th>
                    <th>Used when</th>
                    <th>Explanation</th>
                    <th>Status</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {reasons.data.map((reason) => (
                    <tr key={reason.code}>
                      <td>
                        <div>{reason.label}</div>
                        <div className="font-mono text-[13px] text-[var(--hz-text-muted)]">{reason.code}</div>
                      </td>
                      <td>{appliesTo(reason.applicable_actions)}</td>
                      <td>{reason.requires_text ? 'Required' : 'Optional'}</td>
                      <td>
                        {reason.system ? (
                          <StatusBadge square label="System" tone="neutral" />
                        ) : (
                          <StatusBadge square label={reason.is_active ? 'Active' : 'Inactive'} tone={reason.is_active ? 'success' : 'neutral'} />
                        )}
                      </td>
                      <td>
                        {!reason.system && (
                          <div className="flex justify-end gap-2">
                            <button type="button" className="hz-button hz-button-secondary" aria-label={`Edit ${reason.code}`}
                              onClick={() => setDialog({ kind: 'edit', reason })}>
                              Edit
                            </button>
                            <button type="button" className="hz-button hz-button-secondary" aria-label={`${reason.is_active ? 'Deactivate' : 'Reactivate'} ${reason.code}`}
                              onClick={() => setDialog({ kind: reason.is_active ? 'deactivate' : 'reactivate', reason })}>
                              {reason.is_active ? 'Deactivate' : 'Reactivate'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailGroup>
      </div>
      {dialog?.kind === 'new' && <ReasonDialog onClose={() => setDialog(null)} onDone={(code) => done(`Reason ${code} created`)} />}
      {dialog && dialog.kind !== 'new' && (
        <ReasonDialog key={`${dialog.kind}:${dialog.reason.code}`} mode={dialog.kind} reason={dialog.reason}
          onClose={() => setDialog(null)} onDone={(code) => done(`Reason ${code} ${dialog.kind === 'edit' ? 'saved' : `${dialog.kind}d`}`)} />
      )}
    </HorizonPage>
  );
};

const ReasonDialog: React.FC<{
  mode?: 'edit' | 'deactivate' | 'reactivate';
  reason?: ReasonCodeSetup;
  onClose: () => void;
  onDone: (code: string) => void;
}> = ({ mode, reason, onClose, onDone }) => {
  const commands = useReasonCommands();
  const editing = !!reason;
  // The reason's ETag as the server returns it, read when the dialog opens and again after a 412.
  const etag = useQuery({
    queryKey: ['workflow', 'reason-setup', 'etag', reason?.code ?? ''],
    queryFn: () => commands.etagOf(reason!.code),
    enabled: editing,
    staleTime: 0,
    gcTime: 0,
  });
  const [code, setCode] = useState('');
  const [text, setText] = useState(reason?.label ?? '');
  const [actions, setActions] = useState<ReasonAction[]>(reason?.applicable_actions ?? ['REJECT']);
  const [requiresText, setRequiresText] = useState(reason?.requires_text ?? false);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);
  const switching = mode === 'deactivate' || mode === 'reactivate';

  const local: Record<string, string | undefined> = switching ? {} : {
    code: editing ? undefined : !code ? 'Enter a code.' : REASON_CODE_PATTERN.test(code) ? undefined : 'Use 2 to 64 capital letters, digits or _, starting with a letter.',
    label: text.trim() ? undefined : 'Enter the reason as the checker will read it.',
    applicable_actions: actions.length ? undefined : 'Choose approving, rejecting or both.',
  };
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];
  const toggle = (action: ReasonAction) =>
    setActions((current) => (current.includes(action) ? current.filter((item) => item !== action) : [...current, action].sort() as ReasonAction[]));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean)) return;
    setFailure(null);
    setFields({});
    setStale(false);
    let outcome;
    if (!editing) {
      outcome = await commands.create({ code, label: text.trim(), applicable_actions: actions, requires_text: requiresText });
    } else {
      if (!etag.data) return;
      const body = switching ? { is_active: mode === 'reactivate' } : { label: text.trim(), applicable_actions: actions, requires_text: requiresText };
      outcome = await commands.change(reason!.code, body, etag.data);
    }
    if (outcome.ok === true) return onDone(editing ? reason!.code : code);
    if (outcome.kind === 'stale') {
      setStale(true);
      await etag.refetch();
      return;
    }
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local) && !reasonRefusal(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };

  const title = !editing ? 'New approval reason' : mode === 'edit' ? `Edit ${reason!.code}` : `${mode === 'reactivate' ? 'Reactivate' : 'Deactivate'} ${reason!.label}`;
  const confirm = !editing ? 'Create reason' : mode === 'edit' ? 'Save' : mode === 'reactivate' ? 'Reactivate' : 'Deactivate';
  return (
    <DialogFrame titleId="reason-dialog-title" title={title} onClose={onClose} size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>Back</button>
          <button type="submit" form="reason-form" className="hz-button hz-button-primary" disabled={commands.pending || (editing && !etag.data)}>
            {commands.pending ? 'Saving…' : confirm}
          </button>
        </>
      }>
      {editing && etag.isPending && <HorizonLoader tip="Loading..." />}
      {etag.isError && <Refusal error={etag.error} title="This could not be loaded" />}
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <Refusal error={failure} title="Nothing was changed" />}
      <form id="reason-form" noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        {switching ? (
          <p className="text-sm text-[var(--hz-text-primary)]">
            {mode === 'deactivate'
              ? 'Checkers will no longer be offered it. Decisions already made keep it, and it can be reactivated later.'
              : 'Checkers will be offered it again.'}
          </p>
        ) : (
          <>
            {!editing && (
              <div>
                <label htmlFor="reason-code" className={label}>Code <span className="text-[var(--hz-danger)]">*</span></label>
                <input id="reason-code" value={code} maxLength={64} onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, '_'))}
                  aria-invalid={!!errorFor('code')} className={`${field(!!errorFor('code'))} font-mono`} />
                <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">For example DOCS_MISSING. The code never changes once created.</p>
                <FieldError message={errorFor('code')} />
              </div>
            )}
            <div>
              <label htmlFor="reason-label" className={label}>Reason <span className="text-[var(--hz-danger)]">*</span></label>
              <input id="reason-label" value={text} maxLength={128} onChange={(event) => setText(event.target.value)}
                aria-invalid={!!errorFor('label')} className={field(!!errorFor('label'))} />
              <FieldError message={errorFor('label')} />
            </div>
            <fieldset>
              <legend className={label}>Used when <span className="text-[var(--hz-danger)]">*</span></legend>
              <div className="flex gap-4 text-sm">
                {(['REJECT', 'APPROVE'] as ReasonAction[]).map((action) => (
                  <label key={action} className="flex items-center gap-2">
                    <input type="checkbox" checked={actions.includes(action)} onChange={() => toggle(action)} />
                    {action === 'REJECT' ? 'Rejecting' : 'Approving'}
                  </label>
                ))}
              </div>
              <FieldError message={errorFor('applicable_actions')} />
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={requiresText} onChange={(event) => setRequiresText(event.target.checked)} />
              The checker must also write an explanation
            </label>
          </>
        )}
      </form>
    </DialogFrame>
  );
};
