/**
 * Certificate stock (CERTIFICATES-SURFACE-1 CS-C, CS-D8): `/certificates/stock`, for
 * `certificates.stock.manage` (the CERTIFICATE_STOCK_MANAGER profile); the backend decides every call.
 *
 * - Available stock: the current grouped stock by type, insurer and holder, as `/certificate-stock`
 *   returns it (counts and ranges, never individual blanks).
 * - Batches: receive a numbered range from an insurer, with a preview of the first and last serial
 *   before sending; the received batches; allocate a range of a batch to a branch, showing the
 *   command's own result.
 * - Types: list and create (R2 CS5: no rename or deactivate).
 * - Settings (SETUP-DRIVEN-1 SD-D): the tenant's largest batch, under the platform ceiling; changed by a
 *   tenant-wide stock manager with the server's ETag. The receive form states it and checks against it.
 *
 * Not here (deferred to a certificate-stock API follow-up): allocation to a named user, spoiling a
 * blank serial, movement history. No ID is ever typed or shown: branches are named from /me,
 * insurers from /insurers; stock held by a named user says so without naming the ID.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { Boxes, FileBadge, PackagePlus, Plus, RefreshCw } from 'lucide-react';
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
  WorkspaceTabs,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { useMe } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { useCertificateTypes } from '../certificates/queries';
import {
  Allocation,
  Batch,
  previewSerial,
  stockRefusal,
  useBatches,
  useCertificateSettings,
  useInsuranceClasses,
  useSettingsCommand,
  useInsurers,
  useStock,
  useStockCommands,
} from '../certificates/stock';
import type { CertificateCategory } from '../certificates/types';
import { formatDate } from '../policies/format';
import { formatDateTime, humanize } from '../workflow/format';

export const NO_STOCK_TEXT = 'No certificates are in stock';
export const NO_BATCHES_TEXT = 'No batches have been received';
export const NO_TYPES_TEXT = 'No certificate types are set up';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const hint = 'mt-1.5 text-[13px] text-[var(--hz-text-muted)]';

type TabId = 'stock' | 'batches' | 'types' | 'settings';
const TABS: { id: TabId; label: string }[] = [
  { id: 'stock', label: 'Available stock' },
  { id: 'batches', label: 'Batches' },
  { id: 'types', label: 'Types' },
  { id: 'settings', label: 'Settings' },
];
const isTab = (value: string | null): value is TabId => TABS.some((tab) => tab.id === value);

type Dialog = 'type' | 'receive' | { allocate: Batch } | null;

/** A refusal in words where the stock has its own; otherwise the server's message. */
const Refusal: React.FC<{ error: unknown; title: string }> = ({ error, title }) => {
  const text = stockRefusal(error);
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

/** Branch names from /me; a branch the user does not list is never shown by its ID. */
function useBranchNames() {
  const me = useMe().data;
  return useMemo(() => {
    const names = new Map((me?.branches ?? []).map((branch) => [branch.id, branch.name]));
    return { branches: me?.branches ?? [], name: (id: string) => names.get(id) ?? 'Another branch' };
  }, [me]);
}

export const CertificateStockPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab: TabId = isTab(params.get('tab')) ? (params.get('tab') as TabId) : 'stock';
  const stock = useStock();
  const batches = useBatches();
  const types = useCertificateTypes(true);
  const insurers = useInsurers();
  // The class's name from setup (`GET /insurance-classes`), not only its code.
  const classes = useInsuranceClasses(tab === 'types');
  const { name: branchName } = useBranchNames();
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [allocated, setAllocated] = useState<Allocation | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const insurerName = (id: string) => insurers.data?.find((insurer) => insurer.id === id)?.name ?? 'Insurer';
  const className = (id: string) => classes.data?.find((item) => item.id === id)?.name;
  const show = (next: TabId) => {
    const changed = new URLSearchParams(params);
    if (next === 'stock') changed.delete('tab');
    else changed.set('tab', next);
    setParams(changed, { replace: true });
  };
  const refreshing = stock.isFetching || batches.isFetching || types.isFetching;

  return (
    <HorizonPage id="certificate-stock">
      <HorizonToast message={toast} />
      <HorizonPageTitle
        title="Certificate stock"
        subtitle="Numbered certificates received from insurers, and where they are held"
        actions={
          <>
            <button
              type="button"
              className="hz-button hz-button-secondary"
              disabled={refreshing}
              onClick={() => void Promise.all([stock.refetch(), batches.refetch(), types.refetch()])}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog('type')}>
              <Plus className="h-3.5 w-3.5" />
              New type
            </button>
            <button type="button" className="hz-button hz-button-primary" onClick={() => setDialog('receive')}>
              <PackagePlus className="h-3.5 w-3.5" />
              Receive batch
            </button>
          </>
        }
      />
      <div className="px-4 pb-6">
        <WorkspaceTabs tabs={TABS} activeTab={tab} label="Stock sections" variant="line" onChange={show} />
        <div role="tabpanel" aria-label={TABS.find((item) => item.id === tab)?.label} className="flex flex-col gap-4 py-4">
          {allocated && (
            <div role="status">
              <HorizonAlert tone="success" title={`Allocated to ${branchName(allocated.to_branch_id)}`}>
                {allocated.quantity} {allocated.quantity === 1 ? 'certificate' : 'certificates'} of batch {allocated.batch_no}: {allocated.first_serial} to {allocated.last_serial}.
              </HorizonAlert>
            </div>
          )}

          {tab === 'stock' && (
            <DetailGroup title="Available stock" description="Certificates not yet issued, by type, insurer and holder.">
              {stock.isPending && <HorizonLoader tip="Loading the stock..." />}
              {stock.isError && <ApiErrorAlert error={stock.error} title="The stock could not be loaded" />}
              {stock.isSuccess && stock.data.length === 0 && (
                <EmptyState icon={Boxes} title={NO_STOCK_TEXT} hint="Receive a batch from an insurer to add stock." />
              )}
              {stock.isSuccess && stock.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Available stock">
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Insurer</th>
                        <th>Held by</th>
                        <th className="text-right">Available</th>
                        <th>Serials</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stock.data.map((row) => (
                        <tr key={`${row.certificate_type_id}:${row.insurer_id}:${row.branch_id}:${row.holder_user_id ?? ''}`}>
                          <td className="font-mono">{row.certificate_type}</td>
                          <td>{insurerName(row.insurer_id)}</td>
                          <td>{row.holder_user_id ? `A named user at ${branchName(row.branch_id)}` : branchName(row.branch_id)}</td>
                          <td className="text-right tabular-nums">{row.available}</td>
                          <td className="font-mono whitespace-nowrap">
                            {row.lowest_serial} – {row.highest_serial}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailGroup>
          )}

          {tab === 'batches' && (
            <DetailGroup title="Batches received" description="Each batch is a numbered range from an insurer; allocate part of it to a branch.">
              {batches.isPending && <HorizonLoader tip="Loading the batches..." />}
              {batches.isError && <ApiErrorAlert error={batches.error} title="The batches could not be loaded" />}
              {batches.isSuccess && batches.data.length === 0 && (
                <EmptyState icon={PackagePlus} title={NO_BATCHES_TEXT} hint="Use Receive batch when stock arrives from an insurer." />
              )}
              {batches.isSuccess && batches.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Batches">
                    <thead>
                      <tr>
                        <th>Batch</th>
                        <th>Type</th>
                        <th>Insurer</th>
                        <th>Serials</th>
                        <th className="text-right">Quantity</th>
                        <th>Branch</th>
                        <th>Delivery reference</th>
                        <th>Received</th>
                        <th aria-hidden="true" />
                      </tr>
                    </thead>
                    <tbody>
                      {batches.data.map((batch) => (
                        <tr key={batch.id}>
                          <td className="font-mono">{batch.batch_no}</td>
                          <td className="font-mono">{batch.certificate_type.code}</td>
                          <td>{insurerName(batch.insurer.id)}</td>
                          <td className="font-mono whitespace-nowrap">
                            {batch.first_serial} – {batch.last_serial}
                          </td>
                          <td className="text-right tabular-nums">{batch.quantity}</td>
                          <td>{branchName(batch.branch_id)}</td>
                          <td>{batch.delivery_reference || '—'}</td>
                          <td className="whitespace-nowrap">{formatDateTime(batch.received_at)}</td>
                          <td>
                            <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog({ allocate: batch })}
                              aria-label={`Allocate from ${batch.batch_no}`}>
                              Allocate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailGroup>
          )}

          {tab === 'settings' && <SettingsTab onSaved={(value) => setToast(`Batch maximum set to ${value.toLocaleString()}`)} />}

          {tab === 'types' && (
            <DetailGroup title="Certificate types" description="What a certificate certifies, and for which class of insurance. Types are created here; renaming and deactivating are not available yet.">
              {types.isPending && <HorizonLoader tip="Loading the types..." />}
              {types.isError && <ApiErrorAlert error={types.error} title="The types could not be loaded" />}
              {types.isSuccess && types.data.length === 0 && (
                <EmptyState icon={FileBadge} title={NO_TYPES_TEXT} hint="Use New type to set up a motor or marine certificate type." />
              )}
              {types.isSuccess && types.data.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="hz-grid w-full" aria-label="Certificate types">
                    <thead>
                      <tr>
                        <th>Code</th>
                        <th>Name</th>
                        <th>Category</th>
                        <th>Insurance class</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {types.data.map((t) => (
                        <tr key={t.id}>
                          <td className="font-mono">{t.code}</td>
                          <td>{t.name}</td>
                          <td>{humanize(t.category)}</td>
                          <td>
                            {className(t.insurance_class.id) ?? t.insurance_class.code}
                            {className(t.insurance_class.id) && (
                              <span className="ml-1.5 font-mono text-[13px] text-[var(--hz-text-muted)]">{t.insurance_class.code}</span>
                            )}
                          </td>
                          <td>
                            <StatusBadge square label={t.is_active ? 'Active' : 'Inactive'} tone={t.is_active ? 'success' : 'neutral'} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </DetailGroup>
          )}
        </div>
      </div>

      {dialog === 'type' && (
        <TypeDialog
          onClose={() => setDialog(null)}
          onDone={(code) => {
            setDialog(null);
            setToast(`Certificate type ${code} created`);
            show('types');
          }}
        />
      )}
      {dialog === 'receive' && (
        <ReceiveDialog
          onClose={() => setDialog(null)}
          onDone={(batch) => {
            setDialog(null);
            setToast(`Batch ${batch.batch_no} received: ${batch.first_serial} to ${batch.last_serial}`);
            show('batches');
          }}
        />
      )}
      {dialog && typeof dialog === 'object' && (
        <AllocateDialog
          batch={dialog.allocate}
          onClose={() => setDialog(null)}
          onDone={(result) => {
            setDialog(null);
            setAllocated(result);
          }}
        />
      )}
    </HorizonPage>
  );
};

// ---------------------------------------------------------------------------- new type

const CODE = /^[A-Z0-9][A-Z0-9_-]{1,31}$/;

const TypeDialog: React.FC<{ onClose: () => void; onDone: (code: string) => void }> = ({ onClose, onDone }) => {
  const commands = useStockCommands();
  const classes = useInsuranceClasses(true);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState<CertificateCategory | ''>('');
  const [classId, setClassId] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const local: Record<string, string | undefined> = {
    code: !code ? 'Enter a code.' : CODE.test(code) ? undefined : 'Use 2 to 32 capital letters, digits, hyphens or underscores, starting with a letter or digit.',
    name: name.trim() ? undefined : 'Enter a name.',
    category: category ? undefined : 'Choose motor or marine.',
    insurance_class_id: classId ? undefined : 'Choose the insurance class.',
  };
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean) || !category) return;
    setFailure(null);
    setFields({});
    const outcome = await commands.createType({ code, name: name.trim(), category, insurance_class_id: classId });
    if (outcome.ok === true) return onDone(outcome.data.code);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local) && !stockRefusal(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };
  const active = (classes.data ?? []).filter((item) => item.is_active);
  return (
    <DialogFrame
      titleId="stock-type-title"
      title="New certificate type"
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="stock-type-form" className="hz-button hz-button-primary" disabled={commands.pending || classes.isPending}>
            {commands.pending ? 'Saving…' : 'Create type'}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title="The type was not created" />}
      {classes.isError && <ApiErrorAlert error={classes.error} title="The insurance classes could not be loaded" />}
      <form id="stock-type-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="stock-type-code" className={label}>
            Code <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input id="stock-type-code" value={code} maxLength={32} onChange={(event) => setCode(event.target.value.toUpperCase())}
            aria-invalid={!!errorFor('code')} className={`${field(!!errorFor('code'))} font-mono`} />
          <FieldError message={errorFor('code')} />
        </div>
        <div>
          <label htmlFor="stock-type-name" className={label}>
            Name <span className="text-[var(--hz-danger)]">*</span>
          </label>
          <input id="stock-type-name" value={name} maxLength={255} onChange={(event) => setName(event.target.value)}
            aria-invalid={!!errorFor('name')} className={field(!!errorFor('name'))} />
          <FieldError message={errorFor('name')} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="stock-type-category" className={label}>
              Category <span className="text-[var(--hz-danger)]">*</span>
            </label>
            <select id="stock-type-category" value={category} onChange={(event) => setCategory(event.target.value as CertificateCategory | '')}
              aria-invalid={!!errorFor('category')} className={field(!!errorFor('category'))}>
              <option value="">Choose…</option>
              <option value="MOTOR">Motor</option>
              <option value="MARINE">Marine</option>
            </select>
            <FieldError message={errorFor('category')} />
          </div>
          <div>
            <label htmlFor="stock-type-class" className={label}>
              Insurance class <span className="text-[var(--hz-danger)]">*</span>
            </label>
            <select id="stock-type-class" value={classId} onChange={(event) => setClassId(event.target.value)}
              aria-invalid={!!errorFor('insurance_class_id')} className={field(!!errorFor('insurance_class_id'))}>
              <option value="">Choose…</option>
              {active.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code})
                </option>
              ))}
            </select>
            <FieldError message={errorFor('insurance_class_id')} />
          </div>
        </div>
        <p className="text-[13px] text-[var(--hz-text-muted)]">Issuers are offered the active types of their policy's class.</p>
      </form>
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- receive a batch

const PREFIX = /^[A-Z0-9-]{0,12}$/;
const whole = (text: string) => (/^\d+$/.test(text.trim()) ? Number(text.trim()) : null);

const ReceiveDialog: React.FC<{ onClose: () => void; onDone: (batch: Batch) => void }> = ({ onClose, onDone }) => {
  const commands = useStockCommands();
  const insurers = useInsurers();
  const types = useCertificateTypes(true);
  const { branches } = useBranchNames();
  const [insurerId, setInsurerId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [branchId, setBranchId] = useState(branches.length === 1 ? branches[0].id : '');
  const [prefix, setPrefix] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [width, setWidth] = useState('7');
  const [delivery, setDelivery] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});

  const from = whole(first);
  const to = whole(last);
  const digits = whole(width);
  // SD-D: the tenant's batch maximum; the server applies it, the form says so first.
  const settings = useCertificateSettings();
  const batchMax = settings.data?.view.batch_max_serials ?? null;
  const local: Record<string, string | undefined> = {
    insurer_id: insurerId ? undefined : 'Choose the insurer.',
    certificate_type_id: typeId ? undefined : 'Choose the certificate type.',
    branch_id: branchId ? undefined : 'Choose the receiving branch.',
    prefix: PREFIX.test(prefix) ? undefined : 'Up to 12 capital letters, digits or hyphens.',
    first_number: from === null ? 'Enter the first number.' : undefined,
    last_number: to === null ? 'Enter the last number.' : from !== null && to < from ? 'The last number is the same as or after the first.'
      : from !== null && batchMax !== null && to - from + 1 > batchMax ? `A batch is at most ${batchMax.toLocaleString()} certificates.` : undefined,
    number_width: digits === null || digits < 1 || digits > 12 ? 'Between 1 and 12 digits.' : undefined,
  };
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];
  const preview = from !== null && to !== null && to >= from && digits !== null && digits >= 1 && digits <= 12 && PREFIX.test(prefix)
    ? { first: previewSerial(prefix, from, digits), last: previewSerial(prefix, to, digits), count: to - from + 1 }
    : null;

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean) || from === null || to === null || digits === null) return;
    setFailure(null);
    setFields({});
    const outcome = await commands.receive({
      insurer_id: insurerId, certificate_type_id: typeId, branch_id: branchId, prefix,
      first_number: from, last_number: to, number_width: digits, delivery_reference: delivery.trim(),
    });
    if (outcome.ok === true) return onDone(outcome.data);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local) && !stockRefusal(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };
  const loading = insurers.isPending || types.isPending;
  return (
    <DialogFrame
      titleId="stock-receive-title"
      title="Receive a batch"
      subtitle="A numbered range of certificates delivered by an insurer"
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="stock-receive-form" className="hz-button hz-button-primary" disabled={commands.pending || loading}>
            {commands.pending ? 'Receiving…' : 'Receive batch'}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title="The batch was not received" />}
      {insurers.isError && <ApiErrorAlert error={insurers.error} title="The insurers could not be loaded" />}
      {types.isError && <ApiErrorAlert error={types.error} title="The certificate types could not be loaded" />}
      {loading ? (
        <HorizonLoader tip="Loading..." />
      ) : (
        <form id="stock-receive-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor="stock-insurer" className={label}>Insurer <span className="text-[var(--hz-danger)]">*</span></label>
              <select id="stock-insurer" value={insurerId} onChange={(event) => setInsurerId(event.target.value)}
                aria-invalid={!!errorFor('insurer_id')} className={field(!!errorFor('insurer_id'))}>
                <option value="">Choose…</option>
                {(insurers.data ?? []).filter((insurer) => insurer.status === 'ACTIVE').map((insurer) => (
                  <option key={insurer.id} value={insurer.id}>{insurer.name}</option>
                ))}
              </select>
              <FieldError message={errorFor('insurer_id')} />
            </div>
            <div>
              <label htmlFor="stock-type" className={label}>Certificate type <span className="text-[var(--hz-danger)]">*</span></label>
              <select id="stock-type" value={typeId} onChange={(event) => setTypeId(event.target.value)}
                aria-invalid={!!errorFor('certificate_type_id')} className={field(!!errorFor('certificate_type_id'))}>
                <option value="">Choose…</option>
                {(types.data ?? []).filter((t) => t.is_active).map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.code})</option>
                ))}
              </select>
              <FieldError message={errorFor('certificate_type_id')} />
            </div>
            <div>
              <label htmlFor="stock-branch" className={label}>Receiving branch <span className="text-[var(--hz-danger)]">*</span></label>
              <select id="stock-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}
                aria-invalid={!!errorFor('branch_id')} className={field(!!errorFor('branch_id'))}>
                <option value="">Choose…</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.name}</option>
                ))}
              </select>
              <FieldError message={errorFor('branch_id')} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label htmlFor="stock-prefix" className={label}>Prefix</label>
              <input id="stock-prefix" value={prefix} maxLength={12} onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                aria-invalid={!!errorFor('prefix')} className={`${field(!!errorFor('prefix'))} font-mono`} />
              <FieldError message={errorFor('prefix')} />
            </div>
            <div>
              <label htmlFor="stock-first" className={label}>First number <span className="text-[var(--hz-danger)]">*</span></label>
              <input id="stock-first" inputMode="numeric" value={first} onChange={(event) => setFirst(event.target.value)}
                aria-invalid={!!errorFor('first_number')} className={field(!!errorFor('first_number'))} />
              <FieldError message={errorFor('first_number')} />
            </div>
            <div>
              <label htmlFor="stock-last" className={label}>Last number <span className="text-[var(--hz-danger)]">*</span></label>
              <input id="stock-last" inputMode="numeric" value={last} onChange={(event) => setLast(event.target.value)}
                aria-invalid={!!errorFor('last_number')} className={field(!!errorFor('last_number'))} />
              {batchMax !== null && !errorFor('last_number') && <p className={hint}>At most {batchMax.toLocaleString()} in one batch.</p>}
              <FieldError message={errorFor('last_number')} />
            </div>
            <div>
              <label htmlFor="stock-width" className={label}>Digits</label>
              <input id="stock-width" inputMode="numeric" value={width} onChange={(event) => setWidth(event.target.value)}
                aria-invalid={!!errorFor('number_width')} className={field(!!errorFor('number_width'))} />
              <FieldError message={errorFor('number_width')} />
            </div>
          </div>
          <div>
            <label htmlFor="stock-delivery" className={label}>Delivery reference</label>
            <input id="stock-delivery" value={delivery} maxLength={64} onChange={(event) => setDelivery(event.target.value)} className={field(false)} />
            <p className={hint}>Optional: the insurer's delivery note or consignment number.</p>
          </div>
          <div role="status" aria-label="Serial preview" className="rounded-md border border-[var(--hz-border-grid)] px-3 py-2 text-sm">
            {preview ? (
              <>
                <span className="font-medium">{preview.count} {preview.count === 1 ? 'certificate' : 'certificates'}</span>:{' '}
                <span className="font-mono">{preview.first}</span> to <span className="font-mono">{preview.last}</span>
              </>
            ) : (
              <span className="text-[var(--hz-text-muted)]">The first and last serial show here once the numbers are entered.</span>
            )}
          </div>
          <p className="text-[13px] text-[var(--hz-text-muted)]">A serial is never reused; the server refuses a range that overlaps one already received.</p>
        </form>
      )}
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- allocate to a branch

const AllocateDialog: React.FC<{ batch: Batch; onClose: () => void; onDone: (result: Allocation) => void }> = ({ batch, onClose, onDone }) => {
  const commands = useStockCommands();
  const { branches, name: branchName } = useBranchNames();
  const [first, setFirst] = useState(String(batch.first_number));
  const [last, setLast] = useState(String(batch.last_number));
  const [branchId, setBranchId] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const from = whole(first);
  const to = whole(last);
  const inBatch = (n: number | null) => n !== null && n >= batch.first_number && n <= batch.last_number;
  const local: Record<string, string | undefined> = {
    branch_id: branchId ? undefined : 'Choose the branch.',
    first_number: inBatch(from) ? undefined : `A number from ${batch.first_number} to ${batch.last_number}.`,
    last_number: !inBatch(to) ? `A number from ${batch.first_number} to ${batch.last_number}.` : from !== null && to! < from ? 'The last number is the same as or after the first.' : undefined,
  };
  const errorFor = (key: string) => (attempted ? local[key] : undefined) ?? fields[key];
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean) || from === null || to === null) return;
    setFailure(null);
    setFields({});
    const outcome = await commands.allocate({ batch_id: batch.id, first_number: from, last_number: to, branch_id: branchId });
    if (outcome.ok === true) return onDone(outcome.data);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(found).some((key) => key in local) && !stockRefusal(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };
  const count = from !== null && to !== null && to >= from ? to - from + 1 : null;
  return (
    <DialogFrame
      titleId="stock-allocate-title"
      title="Allocate to a branch"
      subtitle={`${batch.batch_no} · ${batch.first_serial} – ${batch.last_serial}`}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="stock-allocate-form" className="hz-button hz-button-primary" disabled={commands.pending}>
            {commands.pending ? 'Allocating…' : 'Allocate'}
          </button>
        </>
      }
    >
      {failure !== null && <Refusal error={failure} title="The stock was not allocated" />}
      <form id="stock-allocate-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <DetailGrid
          dense
          columns={2}
          items={[
            { label: 'Type', value: batch.certificate_type.code },
            { label: 'Received at', value: `${branchName(batch.branch_id)}, ${formatDate(batch.received_at?.slice(0, 10) ?? null)}` },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="allocate-first" className={label}>First number <span className="text-[var(--hz-danger)]">*</span></label>
            <input id="allocate-first" inputMode="numeric" value={first} onChange={(event) => setFirst(event.target.value)}
              aria-invalid={!!errorFor('first_number')} className={field(!!errorFor('first_number'))} />
            <FieldError message={errorFor('first_number')} />
          </div>
          <div>
            <label htmlFor="allocate-last" className={label}>Last number <span className="text-[var(--hz-danger)]">*</span></label>
            <input id="allocate-last" inputMode="numeric" value={last} onChange={(event) => setLast(event.target.value)}
              aria-invalid={!!errorFor('last_number')} className={field(!!errorFor('last_number'))} />
            <FieldError message={errorFor('last_number')} />
          </div>
        </div>
        <div>
          <label htmlFor="allocate-branch" className={label}>To branch <span className="text-[var(--hz-danger)]">*</span></label>
          <select id="allocate-branch" value={branchId} onChange={(event) => setBranchId(event.target.value)}
            aria-invalid={!!errorFor('branch_id')} className={field(!!errorFor('branch_id'))}>
            <option value="">Choose…</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>{branch.name}</option>
            ))}
          </select>
          <FieldError message={errorFor('branch_id')} />
        </div>
        {count !== null && from !== null && to !== null && (
          <p className="text-sm text-[var(--hz-text-secondary)]">
            {count} {count === 1 ? 'certificate' : 'certificates'}: <span className="font-mono">{previewSerial(batch.prefix, from, batch.number_width)}</span> to{' '}
            <span className="font-mono">{previewSerial(batch.prefix, to, batch.number_width)}</span>. Only available stock held by one holder moves; the server checks it.
          </p>
        )}
      </form>
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- settings (SD-D)

const SettingsTab: React.FC<{ onSaved: (value: number) => void }> = ({ onSaved }) => {
  const settings = useCertificateSettings();
  const command = useSettingsCommand();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [failure, setFailure] = useState<unknown>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [stale, setStale] = useState(false);
  if (settings.isPending) return <HorizonLoader tip="Loading the settings..." />;
  if (settings.isError) return <ApiErrorAlert error={settings.error} title="The settings could not be loaded" />;
  const { view, etag } = settings.data;
  const typed = Number(value.replace(/,/g, ''));
  const local = !value.trim() || !Number.isInteger(typed) || typed < 1 || typed > view.platform_max_serials
    ? `A whole number from 1 to ${view.platform_max_serials.toLocaleString()}.` : null;
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (local || !etag) return;
    setFailure(null);
    setFieldError(null);
    setStale(false);
    const outcome = await command.change(typed, etag);
    if (outcome.ok === true) {
      setEditing(false);
      onSaved(outcome.data.batch_max_serials);
      return;
    }
    if (outcome.kind === 'stale') {
      setStale(true);
      await settings.refetch();
      return;
    }
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (fields.batch_max_serials) setFieldError(fields.batch_max_serials);
    else setFailure(outcome.error);
  };
  return (
    <DetailGroup title="Settings" description="The tenant's certificate setup. Batches already received are never changed by a new setting.">
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <Refusal error={failure} title="The setting was not changed" />}
      <DetailGrid
        items={[
          { label: 'Largest batch', value: `${view.batch_max_serials.toLocaleString()} certificates` },
          { label: 'Platform ceiling', value: `${view.platform_max_serials.toLocaleString()} certificates` },
        ]}
      />
      {!editing ? (
        <div className="mt-3">
          <button type="button" className="hz-button hz-button-secondary" onClick={() => { setValue(String(view.batch_max_serials)); setEditing(true); }}>
            Change
          </button>
        </div>
      ) : (
        <form noValidate onSubmit={(event) => void save(event)} className="mt-3 flex flex-wrap items-start gap-2" aria-label="Change the largest batch">
          <div>
            <label htmlFor="settings-batch-max" className={label}>Largest batch</label>
            <input id="settings-batch-max" inputMode="numeric" value={value} onChange={(event) => setValue(event.target.value)}
              aria-invalid={!!(local ?? fieldError)} className={field(!!(local ?? fieldError))} />
            <FieldError message={local ?? fieldError ?? undefined} />
          </div>
          <div className="flex gap-2 pt-6">
            <button type="button" className="hz-button hz-button-secondary" onClick={() => setEditing(false)} disabled={command.pending}>Back</button>
            <button type="submit" className="hz-button hz-button-primary" disabled={command.pending || !!local}>{command.pending ? 'Saving…' : 'Save'}</button>
          </div>
        </form>
      )}
    </DetailGroup>
  );
};
