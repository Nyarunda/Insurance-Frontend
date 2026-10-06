/**
 * The customer record (NB1-A): `GET /clients/{id}` (with its ETag) and `GET /clients/{id}/360`.
 *
 * Tabs: Overview (profile and what the customer holds), Contacts (contacts and addresses) and KYC
 * (the KYC state, its moves, and the identifiers, masked). Actions appear only to users whose
 * permissions could use them; the server decides every one:
 * - edit the profile, add a contact or an address: clients.customer.edit;
 * - add an identifier and move KYC through its working states: clients.kyc.manage;
 * - verify or reject an identifier, and verify or reject KYC: clients.kyc.verify. The customer's
 *   creator, and whoever added an identifier, may never verify it (KYC_SELF_VERIFICATION): the
 *   server's refusal is shown in words.
 * A 412 reloads the customer; what was typed in a dialog is kept for another try.
 */

import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { ArrowLeft, Building2, CircleCheck, FilePlus2, Pencil, Plus, UserRound } from 'lucide-react';
import {
  DetailDivider,
  DetailGrid,
  DetailGroup,
  EmptyState,
  FieldError,
  HorizonAlert,
  HorizonLoader,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  HorizonToast,
  OutlineTag,
  RecordHeader,
  StatusBadge,
  SummaryList,
  WorkspaceTabs,
} from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { NOT_FOUND_TEXT, STALE_TEXT } from '../../lib/api/commandErrors';
import { ApiError } from '../../lib/api/errors';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { usePermission } from '../../lib/auth/me';
import { ApiErrorAlert, ErrorReference, referenceOf } from '../components/ApiErrorAlert';
import { CUSTOMER_TYPE_LABEL, identifierLabel, IDENTIFIER_TYPES, KYC_LABEL, KYC_MOVES, KYC_TONE, STATUS_TONE } from '../customers/format';
import type { KycMove } from '../customers/format';
import { useCustomer, useCustomer360, useCustomerIdentifiers } from '../customers/queries';
import { DuplicateAcknowledgement, DuplicateNotice, duplicatesOf } from '../customers/duplicates';
import { useCustomerId } from '../customers/refs';
import type { CustomerDetail, CustomerIdentifier, CustomerType, DuplicateDetails } from '../customers/types';
import { CustomerOutcome, useCustomerCommands } from '../customers/useCustomerCommands';
import { CUSTOMER_EDIT, KYC_MANAGE, KYC_VERIFY, QUOTATION_CREATE } from '../permissions';
import { formatDate } from '../policies/format';
import { formatDateTime, humanize } from '../workflow/format';
import { customersFrom } from './CustomersPage';

type TabId = 'overview' | 'contacts' | 'kyc';
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'contacts', label: 'Contacts' },
  { id: 'kyc', label: 'KYC' },
];
const isTab = (value: string | null): value is TabId => TABS.some((tab) => tab.id === value);

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;

type Dialog =
  | { kind: 'profile' }
  | { kind: 'contact' }
  | { kind: 'address' }
  | { kind: 'identifier' }
  | { kind: 'kyc'; move: KycMove }
  | { kind: 'review'; identifier: CustomerIdentifier; status: 'VERIFIED' | 'REJECTED' }
  | null;

export const CustomerPage: React.FC = () => {
  const customerId = useCustomerId();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const tab: TabId = isTab(params.get('tab')) ? (params.get('tab') as TabId) : 'overview';
  const customer = useCustomer(customerId);
  const view360 = useCustomer360(customerId);
  const canSeeKyc = !!view360.data?.kyc;
  const identifiers = useCustomerIdentifiers(customerId, canSeeKyc && tab === 'kyc');
  const canEdit = usePermission(CUSTOMER_EDIT);
  const canManageKyc = usePermission(KYC_MANAGE);
  const canVerify = usePermission(KYC_VERIFY);
  const canQuote = usePermission(QUOTATION_CREATE);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const back = () => navigate(customersFrom(location.state));

  if (customer.isPending) return <HorizonLoader tip="Loading the customer..." />;
  if (customer.isError) {
    const missing = customer.error instanceof ApiError && customer.error.status === 404;
    return (
      <HorizonPage id="customer-record">
        <HorizonPageTitle title="Customer" onBack={back} backLabel="Back to Customers" />
        <HorizonPageContent className="p-4">
          {missing ? (
            <HorizonAlert tone="warning" title={NOT_FOUND_TEXT}>
              It does not exist, or it is outside the branches you can see.
              <ErrorReference reference={referenceOf(customer.error)} />
            </HorizonAlert>
          ) : (
            <ApiErrorAlert error={customer.error} title="The customer could not be loaded" />
          )}
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const { view, etag } = customer.data;
  const summary = view360.data;
  const moves = (KYC_MOVES[view.kyc_status] ?? []).filter((move) => (move.needs === 'verify' ? canVerify : canManageKyc));
  const done = (text: string) => {
    setDialog(null);
    setToast(text);
  };

  return (
    <HorizonPage id="customer-record" className="flex flex-col gap-4 !space-y-0">
      <HorizonToast message={toast} />
      <RecordHeader
        icon={view.customer_type === 'INDIVIDUAL' ? UserRound : Building2}
        title={view.display_name}
        subtitle={`${view.customer_no} · ${CUSTOMER_TYPE_LABEL[view.customer_type] ?? humanize(view.customer_type)}`}
        badges={
          <>
            <StatusBadge square label={humanize(view.status)} tone={STATUS_TONE[view.status] ?? 'neutral'} />
            <StatusBadge square label={KYC_LABEL[view.kyc_status] ?? humanize(view.kyc_status)} tone={KYC_TONE[view.kyc_status] ?? 'neutral'} />
            <OutlineTag>{view.home_branch.name}</OutlineTag>
          </>
        }
        actions={
          <>
            {canQuote && (
              <button
                type="button"
                className="hz-button hz-button-primary"
                // NB-D2: the guide hands the customer over to the quotation's own create dialog; nothing else is kept.
                onClick={() =>
                  navigate('/quotations/list/new', {
                    state: { customer: { id: view.id, customer_no: view.customer_no, display_name: view.display_name } },
                  })
                }
              >
                <FilePlus2 className="h-3.5 w-3.5" />
                New quotation
              </button>
            )}
            {canEdit && (
              <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog({ kind: 'profile' })}>
                <Pencil className="h-3.5 w-3.5" />
                Edit profile
              </button>
            )}
            <button type="button" className="hz-button hz-button-secondary" onClick={back} aria-label="Back to Customers" title="Back to Customers">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </>
        }
      />
      <div>
        <WorkspaceTabs
          tabs={TABS}
          activeTab={tab}
          label="Customer sections"
          variant="line"
          onChange={(next) => {
            const changed = new URLSearchParams(params);
            if (next === 'overview') changed.delete('tab');
            else changed.set('tab', next);
            setParams(changed, { replace: true, state: location.state });
          }}
        />
        <div role="tabpanel" aria-label={TABS.find((t) => t.id === tab)?.label} className="hz-record-body">
          {tab === 'overview' && (
            <div className="grid lg:grid-cols-[minmax(0,1fr)_auto_18rem]">
              <div className="py-4 lg:pr-6">
                <Profile view={view} />
              </div>
              <DetailDivider vertical />
              <aside aria-label="Customer summary" className="border-t border-[var(--hz-divider)] py-4 lg:border-t-0 lg:pl-6">
                <h2 className="mb-3 text-sm font-medium text-[var(--hz-text-primary)]">Holdings</h2>
                {summary ? (
                  <SummaryList
                    items={[
                      { label: 'Quotations', value: summary.insurance_summary.quotations },
                      { label: 'Active policies', value: summary.insurance_summary.active_policies },
                      { label: 'Created', value: view.created_at ? formatDateTime(view.created_at) : '—' },
                      { label: 'Last changed', value: view.updated_at ? formatDateTime(view.updated_at) : '—' },
                    ]}
                  />
                ) : view360.isError ? (
                  <ApiErrorAlert error={view360.error} title="The summary could not be loaded" />
                ) : (
                  <HorizonLoader tip="Loading..." />
                )}
              </aside>
            </div>
          )}

          {tab === 'contacts' && (
            <div className="flex flex-col py-4">
              <DetailGroup
                title="Contacts"
                action={
                  canEdit && (
                    <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog({ kind: 'contact' })}>
                      <Plus className="h-3.5 w-3.5" />
                      Add contact
                    </button>
                  )
                }
              >
                {summary && summary.contacts.length > 0 ? (
                  <div className="hz-table-box overflow-x-auto">
                    <table className="hz-grid w-full" aria-label="Contacts">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Contact</th>
                          <th>Primary</th>
                          <th>Verified</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.contacts.map((contact) => (
                          <tr key={contact.id}>
                            <td>{humanize(contact.type)}</td>
                            <td>{contact.value}</td>
                            <td>{contact.is_primary ? 'Primary' : '—'}</td>
                            <td>{contact.is_verified ? 'Verified' : 'Not verified'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={UserRound} role="note" title="No contacts yet" />
                )}
              </DetailGroup>
              <DetailDivider />
              <DetailGroup
                title="Addresses"
                action={
                  canEdit && (
                    <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog({ kind: 'address' })}>
                      <Plus className="h-3.5 w-3.5" />
                      Add address
                    </button>
                  )
                }
              >
                {summary && summary.addresses.length > 0 ? (
                  <div className="hz-table-box overflow-x-auto">
                    <table className="hz-grid w-full" aria-label="Addresses">
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Address</th>
                          <th>Primary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.addresses.map((address) => (
                          <tr key={address.id}>
                            <td>{humanize(address.type)}</td>
                            <td>
                              {[address.address_line_1, address.address_line_2, address.town, address.county, address.postal_code, address.country]
                                .filter(Boolean)
                                .join(', ')}
                            </td>
                            <td>{address.is_primary ? 'Primary' : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <EmptyState icon={Building2} role="note" title="No addresses yet" />
                )}
              </DetailGroup>
            </div>
          )}

          {tab === 'kyc' && (
            <div className="flex flex-col py-4">
              {!summary ? (
                <HorizonLoader tip="Loading..." />
              ) : !summary.kyc ? (
                <HorizonAlert tone="info" title="KYC is not shown">
                  Your access does not include this customer's KYC.
                </HorizonAlert>
              ) : (
                <>
                  <DetailGroup
                    title="KYC status"
                    action={
                      moves.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {moves.map((move) => (
                            <button
                              key={move.to}
                              type="button"
                              className={`hz-button ${move.needs === 'verify' && move.to === 'VERIFIED' ? 'hz-button-primary' : 'hz-button-secondary'}`}
                              onClick={() => setDialog({ kind: 'kyc', move })}
                            >
                              {move.label}
                            </button>
                          ))}
                        </div>
                      )
                    }
                  >
                    <DetailGrid
                      items={[
                        { label: 'Status', value: <StatusBadge square label={KYC_LABEL[view.kyc_status]} tone={KYC_TONE[view.kyc_status]} /> },
                        { label: 'Identifiers', value: summary.kyc.identifiers },
                        { label: 'Verified identifiers', value: summary.kyc.verified_identifiers },
                      ]}
                    />
                  </DetailGroup>
                  <DetailDivider />
                  <DetailGroup
                    title="Identifiers"
                    description="Only the last 4 characters of each are ever shown."
                    action={
                      canManageKyc && (
                        <button type="button" className="hz-button hz-button-secondary" onClick={() => setDialog({ kind: 'identifier' })}>
                          <Plus className="h-3.5 w-3.5" />
                          Add identifier
                        </button>
                      )
                    }
                  >
                    {identifiers.isPending ? (
                      <HorizonLoader tip="Loading identifiers..." />
                    ) : identifiers.isError ? (
                      <ApiErrorAlert error={identifiers.error} title="The identifiers could not be loaded" />
                    ) : identifiers.data.results.length === 0 ? (
                      <EmptyState icon={CircleCheck} role="note" title="No identifiers yet" hint="KYC is verified with a verified primary identifier." />
                    ) : (
                      <div className="hz-table-box overflow-x-auto">
                        <table className="hz-grid w-full" aria-label="Identifiers">
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Number</th>
                              <th>Primary</th>
                              <th>Verification</th>
                              {canVerify && <th aria-label="Actions" />}
                            </tr>
                          </thead>
                          <tbody>
                            {identifiers.data.results.map((identifier) => (
                              <tr key={identifier.id}>
                                <td>{identifierLabel(identifier.identifier_type)}</td>
                                <td className="font-mono">{identifier.masked_value}</td>
                                <td>{identifier.is_primary ? 'Primary' : '—'}</td>
                                <td>
                                  {humanize(identifier.verification_status)}
                                  {identifier.verified_at && (
                                    <span className="block text-[13px] text-[var(--hz-text-muted)]">
                                      {formatDateTime(identifier.verified_at)}
                                      {identifier.verification_source ? ` · ${identifier.verification_source}` : ''}
                                    </span>
                                  )}
                                </td>
                                {canVerify && (
                                  <td className="text-right">
                                    {identifier.verification_status !== 'VERIFIED' && identifier.verification_status !== 'REJECTED' && (
                                      <div className="flex justify-end gap-2">
                                        <button
                                          type="button"
                                          className="hz-button hz-button-secondary"
                                          onClick={() => setDialog({ kind: 'review', identifier, status: 'REJECTED' })}
                                        >
                                          Reject
                                        </button>
                                        <button
                                          type="button"
                                          className="hz-button hz-button-primary"
                                          onClick={() => setDialog({ kind: 'review', identifier, status: 'VERIFIED' })}
                                        >
                                          Verify
                                        </button>
                                      </div>
                                    )}
                                  </td>
                                )}
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
          )}
        </div>
      </div>

      {dialog?.kind === 'profile' && (
        <ProfileDialog view={view} etag={etag} onClose={() => setDialog(null)} onDone={() => done(`Saved: ${view.customer_no}`)} />
      )}
      {dialog?.kind === 'contact' && (
        <ContactDialog customerId={view.id} onClose={() => setDialog(null)} onDone={() => done('Contact added')} />
      )}
      {dialog?.kind === 'address' && (
        <AddressDialog customerId={view.id} onClose={() => setDialog(null)} onDone={() => done('Address added')} />
      )}
      {dialog?.kind === 'identifier' && (
        <IdentifierDialog customerId={view.id} type={view.customer_type} onClose={() => setDialog(null)} onDone={() => done('Identifier added')} />
      )}
      {dialog?.kind === 'kyc' && (
        <KycDialog view={view} etag={etag} move={dialog.move} onClose={() => setDialog(null)} onDone={() => done(KYC_LABEL[dialog.move.to])} />
      )}
      {dialog?.kind === 'review' && (
        <ReviewDialog
          customerId={view.id}
          identifier={dialog.identifier}
          status={dialog.status}
          onClose={() => setDialog(null)}
          onDone={() => done(dialog.status === 'VERIFIED' ? 'Identifier verified' : 'Identifier rejected')}
        />
      )}
    </HorizonPage>
  );
};

const Profile: React.FC<{ view: CustomerDetail }> = ({ view }) => {
  const p = view.profile ?? {};
  const value = (key: string) => (p[key] ? String(p[key]) : '—');
  const items =
    view.customer_type === 'INDIVIDUAL'
      ? [
          { label: 'First name', value: value('first_name') },
          { label: 'Middle name', value: value('middle_name') },
          { label: 'Last name', value: value('last_name') },
          { label: 'Date of birth', value: p.date_of_birth ? formatDate(String(p.date_of_birth)) : '—' },
          { label: 'Gender', value: p.gender ? humanize(String(p.gender)) : '—' },
          { label: 'Occupation', value: value('occupation') },
        ]
      : [
          { label: 'Legal name', value: value('legal_name') },
          { label: 'Trading name', value: value('trading_name') },
          { label: 'Registration number', value: value('registration_number') },
          { label: 'Tax PIN', value: value('tax_pin') },
          { label: 'Industry', value: value('industry') },
        ];
  return (
    <div className="flex flex-col">
      <DetailGroup title="Profile">
        <DetailGrid items={items} />
      </DetailGroup>
      <DetailDivider />
      <DetailGroup title="Customer">
        <DetailGrid
          items={[
            { label: 'Customer number', value: <span className="font-mono">{view.customer_no}</span> },
            { label: 'Home branch', value: `${view.home_branch.name} (${view.home_branch.code})` },
            { label: 'Mobile', value: view.primary_phone ?? '—' },
            { label: 'E-mail', value: view.primary_email ?? '—' },
            { label: 'Source', value: view.source || '—' },
          ]}
        />
      </DetailGroup>
    </div>
  );
};

/** A small form dialog: the command's refusal in words, a 412 noted, field errors on the fields. */
function useDialogCommand() {
  const [attempted, setAttempted] = useState(false);
  const [failure, setFailure] = useState<unknown>(null);
  const [stale, setStale] = useState(false);
  const [fields, setFields] = useState<Record<string, string>>({});
  const handle = (outcome: CustomerOutcome<unknown>, onDone: () => void) => {
    if (outcome.ok === true) return onDone();
    setStale(outcome.kind === 'stale');
    const found = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    setFields(found);
    setFailure(outcome.kind === 'stale' || Object.keys(found).length ? null : outcome.error);
  };
  const start = () => {
    setAttempted(true);
    setFailure(null);
    setStale(false);
    setFields({});
  };
  return { attempted, failure, stale, fields, handle, start };
}

const Notices: React.FC<{ failure: unknown; stale: boolean; title: string }> = ({ failure, stale, title }) => (
  <>
    {stale && (
      <div role="status">
        <HorizonAlert tone="warning">{STALE_TEXT}</HorizonAlert>
      </div>
    )}
    {failure !== null && <ApiErrorAlert error={failure} title={title} />}
  </>
);

const Footer: React.FC<{ form: string; pending: boolean; onClose: () => void; text: string; busy: string }> = ({ form, pending, onClose, text, busy }) => (
  <>
    <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
      Cancel
    </button>
    <button type="submit" form={form} className="hz-button hz-button-primary" disabled={pending}>
      {pending ? busy : text}
    </button>
  </>
);

const Field: React.FC<{
  id: string;
  text: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  required?: boolean;
}> = ({ id, text, value, onChange, error, type = 'text', required }) => (
  <div>
    <label htmlFor={id} className={label}>
      {text} {required && <span className="text-[var(--hz-danger)]">*</span>}
    </label>
    <input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={!!error} className={field(!!error)} />
    <FieldError message={error} />
  </div>
);

const PROFILE_FIELDS: Record<'INDIVIDUAL' | 'ORG', { key: string; text: string; type?: string; required?: boolean }[]> = {
  INDIVIDUAL: [
    { key: 'first_name', text: 'First name', required: true },
    { key: 'middle_name', text: 'Middle name' },
    { key: 'last_name', text: 'Last name', required: true },
    { key: 'date_of_birth', text: 'Date of birth', type: 'date' },
    { key: 'occupation', text: 'Occupation' },
    { key: 'employer', text: 'Employer' },
  ],
  ORG: [
    { key: 'legal_name', text: 'Legal name', required: true },
    { key: 'trading_name', text: 'Trading name' },
    { key: 'registration_number', text: 'Registration number' },
    { key: 'tax_pin', text: 'Tax PIN' },
    { key: 'industry', text: 'Industry' },
  ],
};

const ProfileDialog: React.FC<{ view: CustomerDetail; etag: string | null; onClose: () => void; onDone: () => void }> = ({ view, etag, onClose, onDone }) => {
  const { update, pending } = useCustomerCommands();
  const spec = PROFILE_FIELDS[view.customer_type === 'INDIVIDUAL' ? 'INDIVIDUAL' : 'ORG'];
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(spec.map((item) => [item.key, view.profile?.[item.key] ? String(view.profile[item.key]) : ''])),
  );
  const command = useDialogCommand();
  const missing = (key: string) => spec.find((item) => item.key === key)?.required && !values[key]?.trim();

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    if (spec.some((item) => missing(item.key)) || !etag) return;
    // Only what changed is sent; a cleared optional field is sent empty.
    const changed = Object.fromEntries(
      spec
        .map((item) => [item.key, values[item.key].trim()] as const)
        .filter(([key, next]) => next !== (view.profile?.[key] ? String(view.profile[key]) : '')),
    );
    if (!Object.keys(changed).length) return onClose();
    command.handle(await update(view.id, { profile: changed }, etag), onDone);
  };

  return (
    <DialogFrame
      titleId="customer-profile-title"
      title="Edit profile"
      subtitle={view.customer_no}
      onClose={onClose}
      dismissOnBackdrop={false}
      size="lg"
      footer={<Footer form="customer-profile-form" pending={pending} onClose={onClose} text="Save changes" busy="Saving…" />}
    >
      <Notices failure={command.failure} stale={command.stale} title="The profile was not saved" />
      {!etag && <HorizonAlert tone="warning">This record could not be checked for changes. Reload it and try again.</HorizonAlert>}
      <form id="customer-profile-form" noValidate onSubmit={(event) => void onSubmit(event)} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        {spec.map((item) => (
          <Field
            key={item.key}
            id={`profile-${item.key}`}
            text={item.text}
            type={item.type}
            required={item.required}
            value={values[item.key]}
            onChange={(next) => setValues((current) => ({ ...current, [item.key]: next }))}
            error={(command.attempted && missing(item.key) ? `Give the ${item.text.toLowerCase()}.` : undefined) ?? command.fields[item.key]}
          />
        ))}
      </form>
    </DialogFrame>
  );
};

const ContactDialog: React.FC<{ customerId: string; onClose: () => void; onDone: () => void }> = ({ customerId, onClose, onDone }) => {
  const { addContact, pending } = useCustomerCommands();
  const [type, setType] = useState('MOBILE');
  const [value, setValue] = useState('');
  const [primary, setPrimary] = useState(false);
  const command = useDialogCommand();
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    if (!value.trim()) return;
    command.handle(await addContact(customerId, { type, value: value.trim(), is_primary: primary }), onDone);
  };
  return (
    <DialogFrame
      titleId="customer-contact-title"
      title="Add contact"
      onClose={onClose}
      dismissOnBackdrop={!value}
      size="md"
      footer={<Footer form="customer-contact-form" pending={pending} onClose={onClose} text="Add contact" busy="Adding…" />}
    >
      <Notices failure={command.failure} stale={command.stale} title="The contact was not added" />
      <form id="customer-contact-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <div>
          <label htmlFor="contact-type" className={label}>
            Type
          </label>
          <select id="contact-type" value={type} onChange={(event) => setType(event.target.value)} className={field(false)}>
            <option value="MOBILE">Mobile</option>
            <option value="PHONE">Phone</option>
            <option value="EMAIL">E-mail</option>
            <option value="WHATSAPP">WhatsApp</option>
          </select>
        </div>
        <Field
          id="contact-value"
          text={type === 'EMAIL' ? 'E-mail' : 'Number'}
          required
          value={value}
          onChange={setValue}
          error={(command.attempted && !value.trim() ? 'Give the contact.' : undefined) ?? command.fields.value}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--hz-text-primary)]">
          <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} />
          Make it the primary {type === 'EMAIL' ? 'e-mail' : 'contact of this type'}
        </label>
      </form>
    </DialogFrame>
  );
};

const AddressDialog: React.FC<{ customerId: string; onClose: () => void; onDone: () => void }> = ({ customerId, onClose, onDone }) => {
  const { addAddress, pending } = useCustomerCommands();
  const [values, setValues] = useState({ type: 'RESIDENTIAL', address_line_1: '', address_line_2: '', town: '', county: '', postal_code: '' });
  const [primary, setPrimary] = useState(false);
  const command = useDialogCommand();
  const set = (key: keyof typeof values) => (next: string) => setValues((current) => ({ ...current, [key]: next }));
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    if (!values.address_line_1.trim()) return;
    const body = Object.fromEntries(Object.entries(values).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
    command.handle(await addAddress(customerId, { ...body, is_primary: primary }), onDone);
  };
  return (
    <DialogFrame
      titleId="customer-address-title"
      title="Add address"
      onClose={onClose}
      dismissOnBackdrop={!values.address_line_1}
      size="lg"
      footer={<Footer form="customer-address-form" pending={pending} onClose={onClose} text="Add address" busy="Adding…" />}
    >
      <Notices failure={command.failure} stale={command.stale} title="The address was not added" />
      <form id="customer-address-form" noValidate onSubmit={(event) => void onSubmit(event)} className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
        <div>
          <label htmlFor="address-type" className={label}>
            Type
          </label>
          <select id="address-type" value={values.type} onChange={(event) => set('type')(event.target.value)} className={field(false)}>
            {['RESIDENTIAL', 'POSTAL', 'BUSINESS', 'REGISTERED_OFFICE', 'OTHER'].map((type) => (
              <option key={type} value={type}>
                {humanize(type)}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="address-line-1"
          text="Address line 1"
          required
          value={values.address_line_1}
          onChange={set('address_line_1')}
          error={(command.attempted && !values.address_line_1.trim() ? 'Give the first address line.' : undefined) ?? command.fields.address_line_1}
        />
        <Field id="address-line-2" text="Address line 2" value={values.address_line_2} onChange={set('address_line_2')} error={command.fields.address_line_2} />
        <Field id="address-town" text="Town" value={values.town} onChange={set('town')} error={command.fields.town} />
        <Field id="address-county" text="County" value={values.county} onChange={set('county')} error={command.fields.county} />
        <Field id="address-postal" text="Postal code" value={values.postal_code} onChange={set('postal_code')} error={command.fields.postal_code} />
        <label className="flex items-center gap-2 text-sm text-[var(--hz-text-primary)] sm:col-span-2">
          <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} />
          Make it the primary address
        </label>
      </form>
    </DialogFrame>
  );
};

const IdentifierDialog: React.FC<{ customerId: string; type: CustomerType; onClose: () => void; onDone: () => void }> = ({ customerId, type, onClose, onDone }) => {
  const { addIdentifier, pending } = useCustomerCommands();
  const types = IDENTIFIER_TYPES.filter((item) => item.for.includes(type));
  const [identifierType, setIdentifierType] = useState(types[0]?.id ?? 'OTHER');
  const [value, setValue] = useState('');
  const [primary, setPrimary] = useState(true);
  // NB1-A-R1 (A1): the server's duplicate evidence, shown before any acknowledgement.
  const [duplicates, setDuplicates] = useState<DuplicateDetails | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [reason, setReason] = useState('');
  const command = useDialogCommand();
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    if (!value.trim() || (duplicates && (!acknowledged || !reason.trim()))) return;
    const outcome = await addIdentifier(customerId, {
      identifier_type: identifierType,
      value: value.trim(),
      is_primary: primary,
      ...(duplicates && acknowledged ? { acknowledge_duplicates: true, duplicate_reason: reason.trim() } : {}),
    });
    const found = outcome.ok === false ? duplicatesOf(outcome.error) : null;
    if (found) {
      setDuplicates(found);
      setAcknowledged(false);
      return;
    }
    command.handle(outcome, onDone);
  };
  return (
    <DialogFrame
      titleId="customer-identifier-title"
      title="Add identifier"
      subtitle="Stored encrypted; only its last 4 characters are shown"
      onClose={onClose}
      dismissOnBackdrop={!value}
      size="md"
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={onClose} disabled={pending}>
            Cancel
          </button>
          <button type="submit" form="customer-identifier-form" className="hz-button hz-button-primary" disabled={pending || (!!duplicates && !acknowledged)}>
            {pending ? 'Adding…' : duplicates ? 'Add anyway' : 'Add identifier'}
          </button>
        </>
      }
    >
      <Notices failure={command.failure} stale={command.stale} title="The identifier was not added" />
      {duplicates && <DuplicateNotice duplicates={duplicates} />}
      <form id="customer-identifier-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <div>
          <label htmlFor="identifier-type" className={label}>
            Type
          </label>
          <select id="identifier-type" value={identifierType} onChange={(event) => setIdentifierType(event.target.value)} className={field(false)}>
            {types.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <Field
          id="identifier-value"
          text="Number"
          required
          value={value}
          onChange={setValue}
          error={(command.attempted && !value.trim() ? 'Give the number.' : undefined) ?? command.fields.value}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--hz-text-primary)]">
          <input type="checkbox" checked={primary} onChange={(event) => setPrimary(event.target.checked)} />
          Primary identifier
        </label>
        {duplicates && (
          <DuplicateAcknowledgement
            idPrefix="identifier"
            acknowledged={acknowledged}
            onAcknowledged={setAcknowledged}
            reason={reason}
            onReason={setReason}
            error={command.attempted && acknowledged && !reason.trim() ? 'Say why this is not the same customer.' : undefined}
          />
        )}
      </form>
    </DialogFrame>
  );
};

const KycDialog: React.FC<{ view: CustomerDetail; etag: string | null; move: KycMove; onClose: () => void; onDone: () => void }> = ({
  view,
  etag,
  move,
  onClose,
  onDone,
}) => {
  const { update, pending } = useCustomerCommands();
  const [reason, setReason] = useState('');
  const command = useDialogCommand();
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    if ((move.reason && !reason.trim()) || !etag) return;
    command.handle(await update(view.id, { kyc_status: move.to, ...(reason.trim() ? { kyc_reason: reason.trim() } : {}) }, etag), onDone);
  };
  return (
    <DialogFrame
      titleId="customer-kyc-title"
      title={move.label}
      subtitle={`${view.customer_no} · ${KYC_LABEL[view.kyc_status]}`}
      onClose={onClose}
      size="md"
      footer={<Footer form="customer-kyc-form" pending={pending} onClose={onClose} text={move.label} busy="Saving…" />}
    >
      <Notices failure={command.failure} stale={command.stale} title="KYC was not changed" />
      <form id="customer-kyc-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <p className="text-sm text-[var(--hz-text-secondary)]">
          The customer's KYC becomes <strong>{KYC_LABEL[move.to].replace(/^KYC /, '')}</strong>.
          {move.to === 'VERIFIED' && ' It needs a verified primary identifier, and the person who created the customer cannot verify it.'}
        </p>
        <div>
          <label htmlFor="kyc-reason" className={label}>
            Reason {move.reason ? <span className="text-[var(--hz-danger)]">*</span> : '(optional)'}
          </label>
          <textarea id="kyc-reason" rows={2} maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} className="hz-field w-full px-3 py-2 text-sm" />
          <FieldError message={(command.attempted && move.reason && !reason.trim() ? 'Give the reason.' : undefined) ?? command.fields.kyc_reason} />
        </div>
      </form>
    </DialogFrame>
  );
};

const ReviewDialog: React.FC<{
  customerId: string;
  identifier: CustomerIdentifier;
  status: 'VERIFIED' | 'REJECTED';
  onClose: () => void;
  onDone: () => void;
}> = ({ customerId, identifier, status, onClose, onDone }) => {
  const { reviewIdentifier, pending } = useCustomerCommands();
  const [source, setSource] = useState('MANUAL');
  const command = useDialogCommand();
  const verb = status === 'VERIFIED' ? 'Verify' : 'Reject';
  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    command.start();
    command.handle(await reviewIdentifier(customerId, identifier.id, { verification_status: status, verification_source: source }), onDone);
  };
  return (
    <DialogFrame
      titleId="customer-review-title"
      title={`${verb} identifier`}
      subtitle={`${identifierLabel(identifier.identifier_type)} ${identifier.masked_value}`}
      onClose={onClose}
      size="md"
      footer={<Footer form="customer-review-form" pending={pending} onClose={onClose} text={verb} busy="Saving…" />}
    >
      <Notices failure={command.failure} stale={command.stale} title={`The identifier was not ${status === 'VERIFIED' ? 'verified' : 'rejected'}`} />
      <form id="customer-review-form" noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="review-source" className={label}>
            Checked against
          </label>
          <select id="review-source" value={source} onChange={(event) => setSource(event.target.value)} className={field(false)}>
            <option value="MANUAL">The document, by hand</option>
            <option value="IPRS">IPRS</option>
            <option value="KRA">KRA</option>
            <option value="BRS">BRS</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <p className="text-[13px] text-[var(--hz-text-muted)]">Whoever added an identifier cannot verify it.</p>
      </form>
    </DialogFrame>
  );
};
