/**
 * The policy workspace's Certificates tab (CERTIFICATES-SURFACE-1 CS-A).
 *
 * - The list: `GET /policies/{id}/certificates`. A certificate opens by its serial in the address
 *   (`?tab=certificates&certificate=<serial>`), never by an ID; its detail and ETag come from
 *   `GET /certificates/{id}`, with the derived `cover` the server recomputes on every read.
 * - Issue (CS-D3): the types offered are the active ones of the policy's class (from its product);
 *   the server refuses any other. Start today by default, never earlier; an empty end means the end
 *   of continuous cover; an empty serial means the next one the issuer or the branch holds. The
 *   vehicle is asked only when the policy names several; a marine type asks for the shipment.
 * - Print (CS-D4): the print-ready view changes nothing. "Mark as printed" is the user's explicit
 *   attestation after printing, and only it sends `/print`.
 * - Replace (CS-D6): the issue form for the same type and vehicle or shipment, with a reason; the
 *   old certificate is cancelled as replaced in the same transaction.
 * - Cancel and spoil (CS-D7): a reason each; spoil only an issued certificate not yet printed.
 *
 * Buttons show only to users whose permissions could use them; the server decides every one.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useSearchParams } from 'react-router';
import { ArrowLeft, FileBadge, Plus, Printer } from 'lucide-react';
import {
  DetailDivider,
  DetailGrid,
  DetailGroup,
  EmptyState,
  FieldError,
  HorizonAlert,
  HorizonLoader,
  HorizonToast,
  openableRow,
  RecordCell,
  RowChevron,
  StatusBadge,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { CERT_CANCEL, CERT_ISSUE } from '../permissions';
import { formatDate } from '../policies/format';
import type { PolicyDetail } from '../policies/types';
import { OPEN_WORKFLOW } from '../proposals/format';
import { formatDateTime, humanize } from '../workflow/format';
import {
  CERTIFICATE_STATUS_LABEL,
  CERTIFICATE_TONE,
  isLive,
  periodText,
  refusalText,
  REPLACE_OFFERED,
  subjectText,
} from './format';
import { useCertificate, useCertificateTypes, usePolicyCertificates, useProductClass } from './queries';
import type { Certificate, IssueBody, MarineDetails } from './types';
import { useCertificateCommands } from './useCertificateCommands';

export const NO_CERTIFICATES_TEXT = 'No certificates have been issued for this policy.';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const hint = 'mt-1.5 text-[13px] text-[var(--hz-text-muted)]';

/** Today in the browser, as YYYY-MM-DD; the server judges against the tenant's own date. */
export const todayIso = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/** Whether a certificate can still be issued on this policy at all (the server decides). */
export const issuable = (policy: PolicyDetail) =>
  policy.lifecycle_status === 'BOUND' && policy.coverage_status !== 'CANCELLED' && policy.coverage_status !== 'EXPIRED';

const openRequest = (c: Certificate) => !!c.workflow && OPEN_WORKFLOW.includes(c.workflow.status);

/** A refusal in words, with "Replace it" where replacing is the way on. */
const Refusal: React.FC<{
  error: unknown;
  title: string;
  onReplace?: (certificateId: string) => void;
  /** The certificate to replace when the refusal does not name one (a refused print names none). */
  replaceTarget?: string;
}> = ({ error, title, onReplace, replaceTarget }) => {
  const text = refusalText(error);
  if (!text) return <ApiErrorAlert error={error} title={title} />;
  const code = error instanceof ApiError ? error.code : '';
  const target = error instanceof ApiError && typeof error.details.certificate_id === 'string' ? error.details.certificate_id : replaceTarget ?? null;
  return (
    <div role="alert">
      <HorizonAlert tone="warning" title={title}>
        {text}
        {onReplace && REPLACE_OFFERED.has(code) && target && (
          <div className="mt-2">
            <button type="button" className="hz-button hz-button-secondary" onClick={() => onReplace(target)}>
              Replace it
            </button>
          </div>
        )}
        <ErrorReference reference={referenceOf(error)} />
      </HorizonAlert>
    </div>
  );
};

type Dialog =
  | { issue: true; replacing?: Certificate }
  | { reason: 'cancel' | 'spoil'; certificate: Certificate }
  | { printed: Certificate }
  | { print: Certificate }
  | null;

export const PolicyCertificatesTab: React.FC<{ policy: PolicyDetail; policyEtag: string | null }> = ({ policy, policyEtag }) => {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const canIssue = usePermission(CERT_ISSUE);
  const canCancel = usePermission(CERT_CANCEL);
  const certificates = usePolicyCertificates(policy.id, true);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 4000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const update = (change: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(params);
    change(next);
    setParams(next, { replace: true, state: location.state });
  };
  const select = (serial: string | null) => update((next) => (serial ? next.set('certificate', serial) : next.delete('certificate')));

  // "Issue certificate" from the Overview (or after a bind) opens the form here once.
  const wantsIssue = params.get('issue') === '1';
  useEffect(() => {
    if (!wantsIssue) return;
    update((next) => next.delete('issue'));
    if (canIssue && issuable(policy)) setDialog({ issue: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wantsIssue]);

  const list = certificates.data?.results ?? [];
  const serial = params.get('certificate');
  const selected = serial ? list.find((c) => c.serial_no === serial) ?? null : null;
  const replace = (certificateId: string) => {
    const old = list.find((c) => c.id === certificateId);
    if (old) setDialog({ issue: true, replacing: old });
  };
  const issued = (c: Certificate, replaced?: Certificate) => {
    setDialog(null);
    setToast(replaced ? `Certificate ${c.serial_no} issued; ${replaced.serial_no} is cancelled as replaced` : `Certificate ${c.serial_no} issued`);
    select(c.serial_no);
  };

  return (
    <>
      <HorizonToast message={toast} />
      {serial && certificates.isSuccess ? (
        selected ? (
          <CertificateDetail
            key={selected.id}
            certificate={selected}
            policy={policy}
            canIssue={canIssue}
            canCancel={canCancel}
            onBack={() => select(null)}
            onOpen={(other) => select(other)}
            onDialog={setDialog}
            onReplace={replace}
          />
        ) : (
          <div className="flex flex-col gap-3">
            <HorizonAlert tone="warning" title="Certificate not found">
              Certificate {serial} is not one of this policy's certificates.
            </HorizonAlert>
            <div>
              <button type="button" className="hz-button hz-button-secondary" onClick={() => select(null)}>
                <ArrowLeft className="h-3.5 w-3.5" />
                All certificates
              </button>
            </div>
          </div>
        )
      ) : (
        <DetailGroup
          title="Certificates"
          description="Motor and marine certificates issued for this policy, from numbered stock."
          action={
            canIssue && issuable(policy) && (
              <button type="button" className="hz-button hz-button-primary" onClick={() => setDialog({ issue: true })}>
                <Plus className="h-3.5 w-3.5" />
                Issue certificate
              </button>
            )
          }
        >
          {certificates.isPending && <HorizonLoader tip="Loading the certificates..." />}
          {certificates.isError && <ApiErrorAlert error={certificates.error} title="The certificates could not be loaded" />}
          {certificates.isSuccess && list.length === 0 && (
            <EmptyState
              icon={FileBadge}
              title={NO_CERTIFICATES_TEXT}
              hint={canIssue && issuable(policy) ? 'Use Issue certificate to issue one from your stock.' : undefined}
            />
          )}
          {list.length > 0 && (
            <div className="overflow-x-auto">
              <table className="hz-grid w-full" aria-label="Certificates">
                <thead>
                  <tr>
                    <th>Certificate</th>
                    <th>Certifies</th>
                    <th>Valid</th>
                    <th>Status</th>
                    <th aria-hidden="true" />
                  </tr>
                </thead>
                <tbody>
                  {list.map((c) => (
                    <tr key={c.id} {...openableRow(() => select(c.serial_no))}>
                      <td>
                        <RecordCell icon={FileBadge} mono title={c.serial_no} detail={c.certificate_type.code} />
                      </td>
                      <td>{subjectText(c)}</td>
                      <td>{periodText(c)}</td>
                      <td>
                        <StatusBadge square label={CERTIFICATE_STATUS_LABEL[c.status] ?? humanize(c.status)} tone={CERTIFICATE_TONE[c.status] ?? 'neutral'} />
                      </td>
                      <RowChevron />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DetailGroup>
      )}

      {dialog && 'issue' in dialog && (
        <IssueDialog
          // A fresh form for a replacement: nothing typed for a new certificate carries over.
          key={dialog.replacing?.id ?? 'new'}
          policy={policy}
          policyEtag={policyEtag}
          replacing={dialog.replacing}
          onClose={() => setDialog(null)}
          onIssued={issued}
          onReplace={replace}
        />
      )}
      {dialog && 'reason' in dialog && (
        <ReasonDialog
          kind={dialog.reason}
          certificate={dialog.certificate}
          policyId={policy.id}
          onClose={() => setDialog(null)}
          onDone={(after) => {
            setDialog(null);
            setToast(`Certificate ${after.serial_no} ${dialog.reason === 'cancel' ? 'cancelled' : 'spoilt'}`);
          }}
        />
      )}
      {dialog && 'printed' in dialog && (
        <MarkPrintedDialog
          certificate={dialog.printed}
          policyId={policy.id}
          canReplace={canIssue}
          onClose={() => setDialog(null)}
          onDone={(after) => {
            setDialog(null);
            setToast(`Certificate ${after.serial_no} marked as printed`);
          }}
          onReplace={(old) => setDialog({ issue: true, replacing: old })}
        />
      )}
      {dialog && 'print' in dialog && <PrintSheet certificate={dialog.print} policy={policy} onClose={() => setDialog(null)} />}
    </>
  );
};

// ---------------------------------------------------------------------------- the certificate

const CertificateDetail: React.FC<{
  certificate: Certificate;
  policy: PolicyDetail;
  canIssue: boolean;
  canCancel: boolean;
  onBack: () => void;
  onOpen: (serial: string) => void;
  onDialog: (dialog: Dialog) => void;
  onReplace: (certificateId: string) => void;
}> = ({ certificate, policy, canIssue, canCancel, onBack, onOpen, onDialog }) => {
  const loaded = useCertificate(certificate.id);
  const c = loaded.data?.view ?? certificate;
  const live = isLive(c);
  const requested = openRequest(c);
  const uncovered = live && c.cover && !c.cover.fully_covered;

  const actions: React.ReactNode[] = [];
  if (live) {
    actions.push(
      <button key="print" type="button" className="hz-button hz-button-secondary" onClick={() => onDialog({ print: c })}>
        <Printer className="h-3.5 w-3.5" />
        Print view
      </button>,
    );
  }
  if (c.status === 'ISSUED' && canIssue) {
    actions.push(
      <button key="printed" type="button" className="hz-button hz-button-primary" disabled={!loaded.data?.etag} onClick={() => onDialog({ printed: c })}>
        Mark as printed
      </button>,
    );
  }
  if (live && canIssue && issuable(policy)) {
    actions.push(
      <button key="replace" type="button" className="hz-button hz-button-secondary" onClick={() => onDialog({ issue: true, replacing: c })}>
        Replace
      </button>,
    );
  }
  if (live && canCancel && !requested) {
    actions.push(
      <button key="cancel" type="button" className="hz-button hz-button-secondary" disabled={!loaded.data?.etag} onClick={() => onDialog({ reason: 'cancel', certificate: c })}>
        Cancel certificate
      </button>,
    );
  }
  if (c.status === 'ISSUED' && canCancel) {
    actions.push(
      <button key="spoil" type="button" className="hz-button hz-button-secondary" disabled={!loaded.data?.etag} onClick={() => onDialog({ reason: 'spoil', certificate: c })}>
        Spoil
      </button>,
    );
  }

  const subject =
    c.marine_details
      ? [
          { label: 'Shipment reference', value: c.marine_details.shipment_reference },
          { label: 'Conveyance', value: c.marine_details.conveyance },
          { label: 'Voyage', value: `${c.marine_details.voyage_from} to ${c.marine_details.voyage_to}` },
          { label: 'Goods', value: c.marine_details.goods_description },
        ]
      : c.vehicle
        ? [
            { label: 'Registration', value: c.vehicle.registration || '—' },
            { label: 'Chassis number', value: c.vehicle.chassis_number || '—' },
            { label: 'Engine number', value: c.vehicle.engine_number || '—' },
          ]
        : [];

  return (
    <section aria-label={`Certificate ${c.serial_no}`} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" className="hz-button hz-button-secondary" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" />
            All certificates
          </button>
          <h2 className="font-mono text-base font-medium text-[var(--hz-text-primary)]">{c.serial_no}</h2>
          <StatusBadge square label={CERTIFICATE_STATUS_LABEL[c.status] ?? humanize(c.status)} tone={CERTIFICATE_TONE[c.status] ?? 'neutral'} />
        </div>
        {actions.length > 0 && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>

      {loaded.isError && <ApiErrorAlert error={loaded.error} title="The certificate could not be reloaded" />}
      {uncovered && (
        <HorizonAlert tone="warning" title="The policy no longer covers this certificate's whole validity">
          Covered through {formatDate(c.cover?.covered_through ?? null)}. It cannot be printed; cancel it or replace it.
        </HorizonAlert>
      )}
      {requested && c.workflow && (
        <HorizonAlert tone="info" title="Cancellation requested">
          {c.cancellation_request?.reason ? `“${c.cancellation_request.reason}”. ` : ''}
          {c.workflow.waiting_on?.length ? `Waiting for: ${c.workflow.waiting_on.join(', ')}.` : 'Waiting for an approver.'}
        </HorizonAlert>
      )}
      {!requested && c.workflow?.status === 'REJECTED' && (
        <HorizonAlert tone="info" title="Cancellation not approved">
          The last request to cancel this certificate was rejected. It stays {CERTIFICATE_STATUS_LABEL[c.status].toLowerCase()}.
        </HorizonAlert>
      )}

      <DetailGroup title="Certificate">
        <DetailGrid
          items={[
            { label: 'Type', value: `${c.certificate_type.code} · ${humanize(c.certificate_type.category)}` },
            { label: 'Valid', value: periodText(c) },
            { label: 'Policy version', value: c.version_no ? `Version ${c.version_no}` : '—' },
            { label: 'Insured', value: c.insured_name || '—' },
            { label: 'Insurer', value: policy.insurer.name },
            { label: 'Batch', value: c.batch_no },
          ]}
        />
      </DetailGroup>
      {subject.length > 0 && (
        <>
          <DetailDivider />
          <DetailGroup title={c.marine_details ? 'Shipment' : 'Vehicle'}>
            <DetailGrid items={subject} />
          </DetailGroup>
        </>
      )}
      <DetailDivider />
      <DetailGroup title="History">
        <DetailGrid
          items={[
            { label: 'Issued', value: formatDateTime(c.issued_at) },
            { label: 'Marked as printed', value: c.printed_at ? formatDateTime(c.printed_at) : 'Not yet' },
            ...(c.replaces
              ? [{ label: 'Replaces', value: <button type="button" className="font-mono text-[var(--hz-primary)] hover:underline" onClick={() => onOpen(c.replaces!.serial_no)}>{c.replaces.serial_no}</button> }]
              : []),
            ...(c.replaced_by
              ? [{ label: 'Replaced by', value: <button type="button" className="font-mono text-[var(--hz-primary)] hover:underline" onClick={() => onOpen(c.replaced_by!.serial_no)}>{c.replaced_by.serial_no}</button> }]
              : []),
            ...(c.closed_at
              ? [
                  { label: c.status === 'SPOILT' ? 'Spoilt' : 'Cancelled', value: formatDateTime(c.closed_at) },
                  { label: 'Reason', value: c.closed_reason || '—' },
                ]
              : []),
          ]}
        />
      </DetailGroup>
    </section>
  );
};

// ---------------------------------------------------------------------------- issue and replace

const MARINE_FIELDS: { name: keyof MarineDetails; label: string }[] = [
  { name: 'shipment_reference', label: 'Shipment reference' },
  { name: 'conveyance', label: 'Conveyance' },
  { name: 'voyage_from', label: 'Voyage from' },
  { name: 'voyage_to', label: 'Voyage to' },
  { name: 'goods_description', label: 'Goods' },
];
const NO_MARINE: MarineDetails = { shipment_reference: '', conveyance: '', voyage_from: '', voyage_to: '', goods_description: '' };

const IssueDialog: React.FC<{
  policy: PolicyDetail;
  policyEtag: string | null;
  replacing?: Certificate;
  onClose: () => void;
  onIssued: (c: Certificate, replaced?: Certificate) => void;
  onReplace: (certificateId: string) => void;
}> = ({ policy, policyEtag, replacing, onClose, onIssued, onReplace }) => {
  const commands = useCertificateCommands(policy.id);
  const productClass = useProductClass(policy.product.id, !replacing);
  const types = useCertificateTypes(!replacing);
  const offered = useMemo(
    () => (types.data ?? []).filter((t) => t.is_active && productClass.data && t.insurance_class.id === productClass.data.id),
    [types.data, productClass.data],
  );
  const registrations = (policy.current_version.risk.identifiers ?? [])
    .filter((identifier) => identifier.identifier_type === 'VEHICLE_REGISTRATION')
    .map((identifier) => identifier.value);

  const [typeId, setTypeId] = useState(replacing?.certificate_type.id ?? '');
  useEffect(() => {
    if (!replacing && !typeId && offered.length === 1) setTypeId(offered[0].id);
  }, [offered, replacing, typeId]);
  const category = replacing?.certificate_type.category ?? offered.find((t) => t.id === typeId)?.category;
  const [from, setFrom] = useState(replacing ? '' : todayIso());
  const [to, setTo] = useState('');
  const [serial, setSerial] = useState('');
  const [vehicle, setVehicle] = useState(replacing?.vehicle?.registration ?? '');
  const [marine, setMarine] = useState<MarineDetails>(replacing?.marine_details ?? NO_MARINE);
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [fields, setFields] = useState<Record<string, string>>({});
  const [stale, setStale] = useState(false);

  const askVehicle = category === 'MOTOR' && registrations.length > 1;
  const local: Record<string, string | undefined> = {
    certificate_type_id: typeId ? undefined : 'Choose the certificate type.',
    vehicle_registration: askVehicle && !vehicle ? 'Choose the vehicle to certify.' : undefined,
    reason: replacing && !reason.trim() ? 'Give the reason for the replacement.' : undefined,
    ...(category === 'MARINE'
      ? Object.fromEntries(MARINE_FIELDS.map((f) => [f.name, marine[f.name].trim() ? undefined : `Enter the ${f.label.toLowerCase()}.`]))
      : {}),
  };
  const errorFor = (name: string) => (attempted ? local[name] : undefined) ?? fields[name];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(local).some(Boolean) || !policyEtag) return;
    setFailure(null);
    setFields({});
    setStale(false);
    const body: IssueBody = { certificate_type_id: typeId };
    if (from) body.effective_from = from;
    if (to) body.effective_to = to;
    if (serial.trim()) body.serial_no = serial.trim();
    if (category === 'MOTOR' && askVehicle) body.vehicle_registration = vehicle;
    if (category === 'MARINE') body.marine_details = Object.fromEntries(MARINE_FIELDS.map((f) => [f.name, marine[f.name].trim()])) as unknown as MarineDetails;
    if (replacing) {
      body.replaces_certificate_id = replacing.id;
      body.reason = reason.trim();
    }
    const outcome = await commands.issue(body, policyEtag);
    if (outcome.ok === true) return onIssued(outcome.view, replacing);
    if (outcome.kind === 'stale') return setStale(true);
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    const known = ['effective_from', 'effective_to', 'serial_no', 'vehicle_registration', 'reason', 'certificate_type_id', ...MARINE_FIELDS.map((f) => f.name)];
    if (Object.keys(found).some((name) => known.includes(name)) && !refusalText(outcome.error)) setFields(found);
    else setFailure(outcome.error);
  };

  const loadingTypes = !replacing && (productClass.isPending || types.isPending);
  const typesFailed = !replacing && (productClass.isError || types.isError);
  const title = replacing ? 'Replace the certificate' : 'Issue a certificate';

  return (
    <DialogFrame
      titleId="certificate-issue-title"
      title={title}
      subtitle={replacing ? `${replacing.serial_no} · ${policy.policy_no}` : `${policy.policy_no} · ${policy.customer.display_name}`}
      onClose={onClose}
      size="lg"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="certificate-issue-form" className="hz-button hz-button-primary" disabled={commands.pending || loadingTypes || !policyEtag}>
            {commands.pending ? 'Issuing…' : replacing ? 'Issue replacement' : 'Issue certificate'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && <Refusal error={failure} title="The certificate was not issued" onReplace={replacing ? undefined : onReplace} />}
      {typesFailed && <ApiErrorAlert error={productClass.error ?? types.error} title="The certificate types could not be loaded" />}
      {loadingTypes ? (
        <HorizonLoader tip="Loading the certificate types..." />
      ) : (
        <form id="certificate-issue-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
          {replacing ? (
            <p className="text-sm text-[var(--hz-text-secondary)]">
              A new {replacing.certificate_type.code} certificate for {subjectText(replacing)}. Certificate {replacing.serial_no} is cancelled as replaced when it is issued.
            </p>
          ) : (
            <div>
              <label htmlFor="certificate-type" className={label}>
                Certificate type <span className="text-[var(--hz-danger)]">*</span>
              </label>
              {offered.length === 0 && !typesFailed ? (
                <p className="text-sm text-[var(--hz-text-secondary)]">
                  No active certificate type is set up for this policy's class of insurance. Ask your stock manager.
                </p>
              ) : (
                <select id="certificate-type" value={typeId} onChange={(event) => setTypeId(event.target.value)}
                  aria-invalid={!!errorFor('certificate_type_id')} className={field(!!errorFor('certificate_type_id'))}>
                  <option value="">Choose…</option>
                  {offered.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code})
                    </option>
                  ))}
                </select>
              )}
              <FieldError message={errorFor('certificate_type_id')} />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="certificate-from" className={label}>Valid from</label>
              <input id="certificate-from" type="date" min={todayIso()} value={from} onChange={(event) => setFrom(event.target.value)}
                aria-invalid={!!errorFor('effective_from')} className={field(!!errorFor('effective_from'))} />
              {!errorFor('effective_from') && (
                <p className={hint}>{replacing ? "Empty: from today, or the replaced certificate's start if later." : 'Today or later; never backdated.'}</p>
              )}
              <FieldError message={errorFor('effective_from')} />
            </div>
            <div>
              <label htmlFor="certificate-to" className={label}>Valid to</label>
              <input id="certificate-to" type="date" min={from || todayIso()} value={to} onChange={(event) => setTo(event.target.value)}
                aria-invalid={!!errorFor('effective_to')} className={field(!!errorFor('effective_to'))} />
              {!errorFor('effective_to') && <p className={hint}>Empty: to the end of the policy's continuous cover.</p>}
              <FieldError message={errorFor('effective_to')} />
            </div>
          </div>

          {askVehicle && (
            <div>
              <label htmlFor="certificate-vehicle" className={label}>
                Vehicle <span className="text-[var(--hz-danger)]">*</span>
              </label>
              <select id="certificate-vehicle" value={vehicle} disabled={!!replacing} onChange={(event) => setVehicle(event.target.value)}
                aria-invalid={!!errorFor('vehicle_registration')} className={field(!!errorFor('vehicle_registration'))}>
                <option value="">Choose…</option>
                {registrations.map((registration) => (
                  <option key={registration} value={registration}>{registration}</option>
                ))}
              </select>
              <FieldError message={errorFor('vehicle_registration')} />
            </div>
          )}

          {category === 'MARINE' && (
            <fieldset className="grid gap-4 sm:grid-cols-2">
              <legend className="mb-2 text-sm font-medium text-[var(--hz-text-primary)]">Shipment</legend>
              {MARINE_FIELDS.map((f) => (
                <div key={f.name} className={f.name === 'goods_description' ? 'sm:col-span-2' : ''}>
                  <label htmlFor={`certificate-${f.name}`} className={label}>
                    {f.label} <span className="text-[var(--hz-danger)]">*</span>
                  </label>
                  <input id={`certificate-${f.name}`} value={marine[f.name]} maxLength={255} readOnly={!!replacing}
                    onChange={(event) => setMarine((before) => ({ ...before, [f.name]: event.target.value }))}
                    aria-invalid={!!errorFor(f.name)} className={field(!!errorFor(f.name))} />
                  <FieldError message={errorFor(f.name)} />
                </div>
              ))}
            </fieldset>
          )}

          <div>
            <label htmlFor="certificate-serial" className={label}>Serial number</label>
            <input id="certificate-serial" value={serial} maxLength={32} onChange={(event) => setSerial(event.target.value)}
              aria-invalid={!!errorFor('serial_no')} className={`${field(!!errorFor('serial_no'))} font-mono`} />
            {!errorFor('serial_no') && <p className={hint}>Optional. Empty: the next certificate held by you, or by the policy's branch.</p>}
            <FieldError message={errorFor('serial_no')} />
          </div>

          {replacing && (
            <div>
              <label htmlFor="certificate-reason" className={label}>
                Reason for the replacement <span className="text-[var(--hz-danger)]">*</span>
              </label>
              <textarea id="certificate-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)}
                aria-invalid={!!errorFor('reason')} className="hz-field w-full px-3 py-2 text-sm" />
              <FieldError message={errorFor('reason')} />
            </div>
          )}
        </form>
      )}
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- cancel, spoil, mark printed

const REASON_COPY = {
  cancel: {
    title: 'Cancel the certificate',
    hint: 'A cancelled certificate no longer certifies cover. It stays on record with its serial.',
    submit: 'Cancel certificate',
    failed: 'The certificate was not cancelled',
  },
  spoil: {
    title: 'Spoil the certificate',
    hint: 'For a certificate that was issued but not printed, for example damaged in the printer. It stays on record with its serial.',
    submit: 'Spoil',
    failed: 'The certificate was not spoilt',
  },
} as const;

/** Said when the tenant governs certificate cancellation (CS-D7); the request path is not on this screen. */
export const CANCELLATION_GOVERNED_TEXT =
  'Cancelling a certificate needs approval at your company, so it cannot be cancelled directly. Requesting a cancellation for approval is not available on this screen yet.';

const ReasonDialog: React.FC<{ kind: 'cancel' | 'spoil'; certificate: Certificate; policyId: string; onClose: () => void; onDone: (after: Certificate) => void }> = ({
  kind,
  certificate,
  policyId,
  onClose,
  onDone,
}) => {
  const commands = useCertificateCommands(policyId);
  const loaded = useCertificate(certificate.id);
  const [reason, setReason] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const copy = REASON_COPY[kind];
  const etag = loaded.data?.etag ?? null;
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (!reason.trim() || !etag) return;
    setFailure(null);
    setStale(false);
    const outcome = await commands[kind](certificate.id, reason.trim(), etag);
    if (outcome.ok === true) return onDone(outcome.view);
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };
  const governed = failure instanceof ApiError && failure.code === 'WORKFLOW_APPROVAL_REQUIRED';
  return (
    <DialogFrame
      titleId="certificate-reason-title"
      title={copy.title}
      subtitle={certificate.serial_no}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="submit" form="certificate-reason-form" className="hz-button hz-button-primary" disabled={commands.pending || !etag || governed}>
            {commands.pending ? 'Saving…' : copy.submit}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {governed ? (
        <div role="alert">
          <HorizonAlert tone="warning" title={copy.failed}>
            {CANCELLATION_GOVERNED_TEXT}
            <ErrorReference reference={referenceOf(failure)} />
          </HorizonAlert>
        </div>
      ) : (
        failure !== null && <Refusal error={failure} title={copy.failed} />
      )}
      <form id="certificate-reason-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-2">
        <p className="text-sm text-[var(--hz-text-secondary)]">{copy.hint}</p>
        <label htmlFor="certificate-close-reason" className={label}>
          Reason <span className="text-[var(--hz-danger)]">*</span>
        </label>
        <textarea id="certificate-close-reason" rows={3} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
        <FieldError message={attempted && !reason.trim() ? 'Give the reason.' : undefined} />
      </form>
    </DialogFrame>
  );
};

const MarkPrintedDialog: React.FC<{
  certificate: Certificate;
  policyId: string;
  canReplace: boolean;
  onClose: () => void;
  onDone: (after: Certificate) => void;
  onReplace: (old: Certificate) => void;
}> = ({ certificate, policyId, canReplace, onClose, onDone, onReplace }) => {
  const commands = useCertificateCommands(policyId);
  const loaded = useCertificate(certificate.id);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const etag = loaded.data?.etag ?? null;
  const confirm = async () => {
    if (!etag) return;
    setFailure(null);
    setStale(false);
    const outcome = await commands.print(certificate.id, etag);
    if (outcome.ok === true) return onDone(outcome.view);
    if (outcome.kind === 'stale') setStale(true);
    else setFailure(outcome.error);
  };
  return (
    <DialogFrame
      titleId="certificate-printed-title"
      title="Mark as printed"
      subtitle={certificate.serial_no}
      onClose={onClose}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={commands.pending}>
            Back
          </button>
          <button type="button" className="hz-button hz-button-primary" onClick={() => void confirm()} disabled={commands.pending || !etag}>
            {commands.pending ? 'Saving…' : 'Mark as printed'}
          </button>
        </>
      }
    >
      {stale && (
        <div role="status">
          <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
        </div>
      )}
      {failure !== null && (
        <Refusal error={failure} title="The certificate was not marked as printed" replaceTarget={certificate.id}
          onReplace={canReplace ? () => onReplace(certificate) : undefined} />
      )}
      <p className="text-sm text-[var(--hz-text-secondary)]">
        Confirm that certificate {certificate.serial_no} was printed. This records its one print; the system cannot see the paper, so it records your confirmation.
        A further copy needs a replacement certificate.
      </p>
    </DialogFrame>
  );
};

// ---------------------------------------------------------------------------- the print-ready view

/**
 * The print-ready view (CS-D4): the certificate record laid out for the browser to print. Opening
 * it, and printing from it, change nothing; only "Mark as printed" records the print.
 */
const PrintSheet: React.FC<{ certificate: Certificate; policy: PolicyDetail; onClose: () => void }> = ({ certificate: c, policy, onClose }) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  const rows: [string, string][] = [
    ['Certificate number', c.serial_no],
    ['Insured', c.insured_name],
    ['Policy number', policy.policy_no],
    ['Insurer', policy.insurer.name],
    ['Valid from', formatDate(c.effective_from)],
    ['Valid to', formatDate(c.effective_to)],
    ...(c.vehicle
      ? ([
          ['Registration', c.vehicle.registration || '—'],
          ['Chassis number', c.vehicle.chassis_number || '—'],
          ['Engine number', c.vehicle.engine_number || '—'],
        ] as [string, string][])
      : []),
    ...(c.marine_details
      ? ([
          ['Shipment reference', c.marine_details.shipment_reference],
          ['Conveyance', c.marine_details.conveyance],
          ['Voyage', `${c.marine_details.voyage_from} to ${c.marine_details.voyage_to}`],
          ['Goods', c.marine_details.goods_description],
        ] as [string, string][])
      : []),
    ['Policy version', c.version_no ? `Version ${c.version_no}` : '—'],
  ];
  return createPortal(
    <div className="hz-print-sheet fixed inset-0 z-50 overflow-y-auto bg-[var(--hz-bg-app,#fff)] p-4 sm:p-8" role="dialog" aria-modal="true" aria-labelledby="certificate-print-title">
      <style>{'@media print { body > *:not(.hz-print-sheet) { display: none !important; } .hz-print-sheet { position: static !important; } .hz-no-print { display: none !important; } }'}</style>
      <div className="mx-auto flex max-w-2xl flex-col gap-6">
        <div className="hz-no-print flex flex-wrap items-center justify-between gap-2">
          <p className="text-[13px] text-[var(--hz-text-muted)]">
            Opening or printing this view changes nothing. After printing, use Mark as printed on the certificate.
          </p>
          <div className="flex gap-2">
            <button type="button" className="hz-button hz-button-secondary" onClick={onClose}>
              Close
            </button>
            <button type="button" className="hz-button hz-button-primary" onClick={() => window.print()}>
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          </div>
        </div>
        <article className="flex flex-col gap-4 border border-[var(--hz-border-grid)] p-6 text-[var(--hz-text-primary)]">
          <h1 id="certificate-print-title" className="text-lg font-semibold">
            {c.certificate_type.category === 'MARINE' ? 'Marine certificate of insurance' : 'Certificate of motor insurance'}
          </h1>
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-[12rem_1fr]">
            {rows.map(([name, value]) => (
              <React.Fragment key={name}>
                <dt className="text-[13px] text-[var(--hz-text-secondary)]">{name}</dt>
                <dd className={name === 'Certificate number' ? 'font-mono text-sm' : 'text-sm'}>{value}</dd>
              </React.Fragment>
            ))}
          </dl>
        </article>
      </div>
    </div>,
    document.body,
  );
};
