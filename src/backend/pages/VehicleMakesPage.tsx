/**
 * Vehicle makes and models (SETUP-DRIVEN-1 SD-C over SD-A): `/vehicle-makes/list`, the tenant's own
 * list that motor quotations take the make and model from. For `products.reference.manage` (the
 * REFERENCE_DATA_MANAGER profile, tenant-wide); the backend decides every call.
 *
 * - The list: every make with its models, active and inactive; "Active only" narrows it.
 * - A manager creates makes and models, renames them, and deactivates or reactivates them. Codes
 *   never change and nothing is deleted (SD-D1), so there is no delete and no code edit.
 * - An edit reads the record's ETag from the server when its dialog opens and sends it as If-Match;
 *   a 412 reloads it, keeps what was typed, and the same confirmation resends with the same key.
 * - Deactivating stops a make or model being offered on new quotations; quotations and policies
 *   already made keep the name they were made with.
 */

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useQuery } from '@tanstack/react-query';
import { Car, Plus, RefreshCw } from 'lucide-react';
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
import { hasPermission, useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { REFERENCE_MANAGE } from '../permissions';
import {
  CODE_PATTERN,
  normalCode,
  referenceRefusal,
  ReferenceTarget,
  useReferenceCommands,
  useVehicleMakes,
  VehicleMake,
  VehicleModel,
} from '../reference/vehicles';

export const NO_MAKES_TEXT = 'No vehicle makes are set up';
export const NO_MODELS_TEXT = 'No models for this make yet';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

/** What an open dialog is doing: create a make, a model of a make, or change one record. */
type Dialog =
  | { kind: 'make' }
  | { kind: 'model'; make: VehicleMake }
  | { kind: 'rename' | 'deactivate' | 'reactivate'; target: ReferenceTarget; what: string; name: string }
  | null;

const Refusal: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const text = referenceRefusal(error);
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

const Status: React.FC<{ active: boolean }> = ({ active }) => (
  <StatusBadge square label={active ? 'Active' : 'Inactive'} tone={active ? 'success' : 'neutral'} />
);

export const VehicleMakesPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const activeOnly = params.get('active') === 'only';
  const makes = useVehicleMakes(activeOnly);
  const manager = hasPermission(useMe().data, REFERENCE_MANAGE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const setActiveOnly = (only: boolean) => {
    const next = new URLSearchParams(params);
    if (only) next.set('active', 'only');
    else next.delete('active');
    setParams(next, { replace: true });
  };
  const done = (message: string) => {
    setDialog(null);
    setToast(message);
  };
  const changes = (target: ReferenceTarget, what: string, row: VehicleModel) =>
    manager && (
      <div className="flex justify-end gap-2">
        <button type="button" className="hz-button hz-button-secondary" aria-label={`Rename ${what}`}
          onClick={() => setDialog({ kind: 'rename', target, what, name: row.name })}>
          Rename
        </button>
        <button type="button" className="hz-button hz-button-secondary" aria-label={`${row.is_active ? 'Deactivate' : 'Reactivate'} ${what}`}
          onClick={() => setDialog({ kind: row.is_active ? 'deactivate' : 'reactivate', target, what, name: row.name })}>
          {row.is_active ? 'Deactivate' : 'Reactivate'}
        </button>
      </div>
    );

  return (
    <HorizonPage id="vehicle-makes">
      <HorizonToast message={toast} />
      <HorizonPageTitle
        title="Vehicle makes and models"
        subtitle="The tenant's list that motor quotations choose the make and model from"
        actions={
          <>
            <button type="button" className="hz-button hz-button-secondary" disabled={makes.isFetching} onClick={() => void makes.refetch()}>
              <RefreshCw className={`h-3.5 w-3.5 ${makes.isFetching ? 'animate-spin' : ''}`} />
              {makes.isFetching ? 'Refreshing…' : 'Refresh'}
            </button>
            {manager && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => setDialog({ kind: 'make' })}>
                <Plus className="h-3.5 w-3.5" />
                New make
              </button>
            )}
          </>
        }
      />
      <div className="flex flex-col gap-4 px-4 pb-6">
        <label className="flex items-center gap-2 text-[13px] text-[var(--hz-text-primary)]">
          <input type="checkbox" checked={activeOnly} onChange={(event) => setActiveOnly(event.target.checked)} />
          Active only
        </label>
        {makes.isPending && <HorizonLoader tip="Loading the makes..." />}
        {makes.isError && <ApiErrorAlert error={makes.error} title="The makes could not be loaded" />}
        {makes.isSuccess && makes.data.length === 0 && (
          <EmptyState icon={Car} title={NO_MAKES_TEXT} hint={manager ? 'Use New make to add the first one.' : 'A reference data manager adds them.'} />
        )}
        {makes.isSuccess &&
          makes.data.map((make) => (
            <DetailGroup
              key={make.id}
              title={make.name}
              description={`Code ${make.code}. Codes never change; a make is deactivated, never deleted.`}
            >
              <div role="region" aria-label={`Make ${make.code}`} className="flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Status active={make.is_active} />
                  <div className="flex gap-2">
                    {changes({ makeId: make.id }, `make ${make.code}`, make)}
                    {manager && (
                      <button type="button" className="hz-button hz-button-secondary" aria-label={`Add a model of ${make.code}`}
                        onClick={() => setDialog({ kind: 'model', make })}>
                        <Plus className="h-3.5 w-3.5" />
                        Add model
                      </button>
                    )}
                  </div>
                </div>
                {make.models.length === 0 ? (
                  <p className="text-[13px] text-[var(--hz-text-muted)]">{NO_MODELS_TEXT}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="hz-grid w-full" aria-label={`Models of ${make.code}`}>
                      <thead>
                        <tr>
                          <th>Code</th>
                          <th>Name</th>
                          <th>Status</th>
                          <th aria-hidden="true" />
                        </tr>
                      </thead>
                      <tbody>
                        {make.models.map((model) => (
                          <tr key={model.id}>
                            <td className="font-mono">{model.code}</td>
                            <td>{model.name}</td>
                            <td>
                              <Status active={model.is_active} />
                            </td>
                            <td>{changes({ makeId: make.id, modelId: model.id }, `model ${make.code} ${model.code}`, model)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </DetailGroup>
          ))}
      </div>

      {dialog?.kind === 'make' && <CreateDialog onClose={() => setDialog(null)} onDone={(code) => done(`Make ${code} created`)} />}
      {dialog?.kind === 'model' && (
        <CreateDialog make={dialog.make} onClose={() => setDialog(null)} onDone={(code) => done(`Model ${code} of ${dialog.make.name} created`)} />
      )}
      {dialog && (dialog.kind === 'rename' || dialog.kind === 'deactivate' || dialog.kind === 'reactivate') && (
        <ChangeDialog
          key={`${dialog.kind}:${dialog.target.makeId}:${dialog.target.modelId ?? ''}`}
          mode={dialog.kind}
          target={dialog.target}
          what={dialog.what}
          name={dialog.name}
          onClose={() => setDialog(null)}
          onDone={(message) => done(message)}
        />
      )}
    </HorizonPage>
  );
};

// ---------------------------------------------------------------------------- create

const CreateDialog: React.FC<{ make?: VehicleMake; onClose: () => void; onDone: (code: string) => void }> = ({ make, onClose, onDone }) => {
  const commands = useReferenceCommands();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const what = make ? 'model' : 'make';
  const local: Record<string, string | undefined> = {
    code: !code.trim() ? 'Enter a code.' : CODE_PATTERN.test(normalCode(code)) ? undefined : 'Use up to 40 capital letters, digits, hyphens or underscores, starting with a letter or digit.',
    name: name.trim() ? undefined : 'Enter a name.',
  };
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean)) return;
    setFailure(null);
    setFields({});
    const body = { code: normalCode(code), name: name.trim() };
    const outcome = make ? await commands.createModel(make.id, body) : await commands.createMake(body);
    if (outcome.ok === true) return onDone(body.code);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local) && !referenceRefusal(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };
  const id = `reference-${what}`;
  return (
    <DialogFrame
      titleId={`${id}-title`}
      title={make ? `New model of ${make.name}` : 'New vehicle make'}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form={`${id}-form`} className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Saving…' : `Create ${what}`}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title={`The ${what} was not created`} />}
      <form id={`${id}-form`} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <div>
          <label htmlFor={`${id}-code`} className={label}>
            Code <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input id={`${id}-code`} value={code} maxLength={40} onChange={(event) => setCode(event.target.value.toUpperCase())}
            aria-invalid={!!errorFor('code')} className={`${field(!!errorFor('code'))} font-mono`} />
          <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">The code never changes once created.</p>
          <FieldError message={errorFor('code')} />
        </div>
        <div>
          <label htmlFor={`${id}-name`} className={label}>
            Name <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input id={`${id}-name`} value={name} maxLength={255} onChange={(event) => setName(event.target.value)}
            aria-invalid={!!errorFor('name')} className={field(!!errorFor('name'))} />
          <FieldError message={errorFor('name')} />
        </div>
      </form>
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- rename, deactivate, reactivate

const ChangeDialog: React.FC<{
  mode: 'rename' | 'deactivate' | 'reactivate';
  target: ReferenceTarget;
  what: string;
  name: string;
  onClose: () => void;
  onDone: (message: string) => void;
}> = ({ mode, target, what, name: current, onClose, onDone }) => {
  const commands = useReferenceCommands();
  // The record's ETag as the server returns it, read when the dialog opens and again after a 412.
  const etag = useQuery({
    queryKey: ['vehicle-makes', 'etag', target.makeId, target.modelId ?? ''],
    queryFn: () => commands.etagOf(target),
    staleTime: 0,
    gcTime: 0,
  });
  const [name, setName] = useState(current);
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const nameError = mode === 'rename' && !name.trim() ? 'Enter a name.' : undefined;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (nameError || !etag.data) return;
    setFailure(null);
    setStale(false);
    const body = mode === 'rename' ? { name: name.trim() } : { is_active: mode === 'reactivate' };
    const outcome = await commands.change(target, body, etag.data);
    if (outcome.ok === true) {
      return onDone(mode === 'rename' ? `Renamed to ${body.name}` : `${current} ${mode === 'reactivate' ? 'reactivated' : 'deactivated'}`);
    }
    if (outcome.kind === 'stale') {
      setStale(true);
      await etag.refetch();
      return;
    }
    setFailure(outcome.error);
  };

  const title = mode === 'rename' ? `Rename ${what}` : `${mode === 'reactivate' ? 'Reactivate' : 'Deactivate'} ${current}`;
  const id = 'reference-change';
  return (
    <DialogFrame
      titleId={`${id}-title`}
      title={title}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form={`${id}-form`} className="hz-button hz-button-primary" disabled={commands.pending || !etag.data}>
            {commands.pending ? 'Saving…' : mode === 'rename' ? 'Rename' : mode === 'reactivate' ? 'Reactivate' : 'Deactivate'}
          </button>
        </>
      }
    >
      {etag.isPending && <HorizonLoader tip="Loading..." />}
      {etag.isError && <Refusal error={etag.error} title="This could not be loaded" />}
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <Refusal error={failure} title="Nothing was changed" />}
      <form id={`${id}-form`} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        {mode === 'rename' ? (
          <div>
            <label htmlFor={`${id}-name`} className={label}>
              Name <span className="text-[var(--hz-danger)]">*</span>
            </label>
            <input id={`${id}-name`} value={name} maxLength={255} onChange={(event) => setName(event.target.value)}
              aria-invalid={attempted && !!nameError} className={field(attempted && !!nameError)} />
            <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">
              New quotations show the new name; quotations and policies already made keep the name they were made with.
            </p>
            <FieldError message={attempted ? nameError : undefined} />
          </div>
        ) : (
          <p className="text-sm text-[var(--hz-text-primary)]">
            {mode === 'deactivate'
              ? 'It will no longer be offered on new quotations. Quotations and policies already made keep it. It can be reactivated later.'
              : 'It will be offered again on new quotations.'}
          </p>
        )}
      </form>
    </DialogFrame>
  );
};
