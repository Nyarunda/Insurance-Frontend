/**
 * New customer (NB1-A): `POST /clients`, as an expandable dialog over the Customers list at its own
 * address (`/customers/list/new`).
 *
 * The form holds the profile for the chosen type (an individual or a company), the home branch
 * (one the user's access covers), a mobile number and an e-mail, and, for a user who also holds
 * clients.kyc.manage, optionally the primary identifier (the server refuses an identifier from
 * anyone else, NB1-A-R1). The server normalizes, numbers and checks everything. When an identifier already
 * belongs to another customer it answers 409 `CUSTOMER_DUPLICATE_CANDIDATE` with the matches the
 * user may see and a count of the rest (C1-D16): the form shows them, and continuing needs an
 * explicit acknowledgement with a reason, sent with the same request (a changed body, so a new
 * idempotency key). Records are never merged.
 */

import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { UserPlus } from 'lucide-react';
import { DetailDivider, FieldError } from '../../components/horizon';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { fieldErrorsOf } from '../../lib/api/fieldErrors';
import { usePermission } from '../../lib/auth/me';
import { useBranchStore } from '../../lib/context/branchStore';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { IDENTIFIER_TYPES } from '../customers/format';
import { customerHref } from '../customers/refs';
import { DuplicateAcknowledgement, DuplicateNotice, duplicatesOf } from '../customers/duplicates';
import type { CustomerCreateBody, CustomerType, DuplicateDetails } from '../customers/types';
import { KYC_MANAGE } from '../permissions';
import { useCustomerCommands } from '../customers/useCustomerCommands';
import { customersFrom } from './CustomersPage';

const label = 'mb-1.5 block text-[13px] font-medium text-[var(--hz-text-primary)]';
const field = (invalid: boolean) => `hz-field h-9 w-full px-3 text-sm ${invalid ? 'hz-field-invalid' : ''}`;
const Required = () => <span className="text-[var(--hz-danger)]">*</span>;

const FORM_ID = 'customer-create-form';
const TITLE_ID = 'customer-create-title';

export const CustomerCreatePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const branches = useBranchStore((state) => state.branches);
  const activeBranchId = useBranchStore((state) => state.activeBranchId);
  const { create, pending } = useCustomerCommands();
  // An identifier at creation needs clients.kyc.manage as well (the server refuses it otherwise).
  const canIdentify = usePermission(KYC_MANAGE);

  const [type, setType] = useState<CustomerType>('INDIVIDUAL');
  const [branch, setBranch] = useState(activeBranchId ?? (branches.length === 1 ? branches[0].id : ''));
  const [first, setFirst] = useState('');
  const [middle, setMiddle] = useState('');
  const [last, setLast] = useState('');
  const [birth, setBirth] = useState('');
  const [legal, setLegal] = useState('');
  const [trading, setTrading] = useState('');
  const [registration, setRegistration] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [idType, setIdType] = useState('NATIONAL_ID');
  const [idValue, setIdValue] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [serverFields, setServerFields] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState<unknown>(null);
  const [duplicates, setDuplicates] = useState<DuplicateDetails | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [duplicateReason, setDuplicateReason] = useState('');

  const back = () => navigate(customersFrom(location.state));
  const individual = type === 'INDIVIDUAL';
  const idTypes = IDENTIFIER_TYPES.filter((item) => item.for.includes(type));

  const clientErrors: Record<string, string | undefined> = {
    home_branch_id: branch ? undefined : 'Choose the home branch.',
    first_name: individual && !first.trim() ? 'Give the first name.' : undefined,
    last_name: individual && !last.trim() ? 'Give the last name.' : undefined,
    legal_name: !individual && !legal.trim() ? 'Give the legal name.' : undefined,
    duplicate_reason: duplicates && acknowledged && !duplicateReason.trim() ? 'Say why this is not the same customer.' : undefined,
  };
  const errorFor = (name: string) => (attempted ? clientErrors[name] : undefined) ?? serverFields[name];

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setAttempted(true);
    if (Object.values(clientErrors).some(Boolean)) return;
    if (duplicates && !acknowledged) return;
    setFailure(null);
    setServerFields({});
    const profile: Record<string, string> = individual
      ? {
          first_name: first.trim(),
          last_name: last.trim(),
          ...(middle.trim() ? { middle_name: middle.trim() } : {}),
          ...(birth ? { date_of_birth: birth } : {}),
        }
      : {
          legal_name: legal.trim(),
          ...(trading.trim() ? { trading_name: trading.trim() } : {}),
          ...(registration.trim() ? { registration_number: registration.trim() } : {}),
        };
    const contacts = [
      ...(mobile.trim() ? [{ type: 'MOBILE', value: mobile.trim(), is_primary: true }] : []),
      ...(email.trim() ? [{ type: 'EMAIL', value: email.trim(), is_primary: true }] : []),
    ];
    const body: CustomerCreateBody = {
      customer_type: type,
      home_branch_id: branch,
      profile,
      ...(contacts.length ? { contacts } : {}),
      ...(canIdentify && idValue.trim() ? { identifiers: [{ identifier_type: idType, value: idValue.trim(), is_primary: true }] } : {}),
      ...(duplicates && acknowledged ? { acknowledge_duplicates: true, duplicate_reason: duplicateReason.trim() } : {}),
    };
    const outcome = await create(body);
    if (outcome.ok === true) {
      navigate(customerHref(outcome.data.customer_no), { replace: true, state: location.state });
      return;
    }
    const found = duplicatesOf(outcome.error);
    if (found) {
      setDuplicates(found);
      setAcknowledged(false);
      return;
    }
    const fields = outcome.kind === 'invalid' ? fieldErrorsOf(outcome.error) : {};
    if (Object.keys(fields).length) {
      setServerFields(fields);
      return;
    }
    setFailure(outcome.error);
  };

  const typed = Boolean(first || last || legal || mobile || email || (canIdentify && idValue));

  return (
    <DialogFrame
      titleId={TITLE_ID}
      title="New customer"
      subtitle="Saved as a prospect; KYC follows on the customer's record"
      onClose={back}
      closeLabel="Back to Customers"
      dismissOnBackdrop={!typed}
      size="lg"
      expandable
      icon={<UserPlus className="h-4 w-4" />}
      footer={
        <>
          <button type="button" className="hz-button hz-button-secondary" onClick={back} disabled={pending}>
            Cancel
          </button>
          <button
            type="submit"
            form={FORM_ID}
            className="hz-button hz-button-primary"
            disabled={pending || (!!duplicates && !acknowledged)}
          >
            {pending ? 'Creating…' : duplicates ? 'Create anyway' : 'Create customer'}
          </button>
        </>
      }
    >
      {failure !== null && <ApiErrorAlert error={failure} title="The customer was not created" />}
      {duplicates && <DuplicateNotice duplicates={duplicates} />}

      <form id={FORM_ID} noValidate onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5">
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-base font-medium text-[var(--hz-text-primary)]">Customer</legend>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <div>
              <label htmlFor="customer-type" className={label}>
                Type <Required />
              </label>
              <select
                id="customer-type"
                value={type}
                onChange={(event) => {
                  const next = event.target.value as CustomerType;
                  setType(next);
                  setIdType(next === 'INDIVIDUAL' ? 'NATIONAL_ID' : 'KRA_PIN');
                }}
                className={field(false)}
              >
                <option value="INDIVIDUAL">Individual</option>
                <option value="CORPORATE">Company</option>
              </select>
            </div>
            <div>
              <label htmlFor="customer-branch" className={label}>
                Home branch <Required />
              </label>
              <select
                id="customer-branch"
                value={branch}
                onChange={(event) => setBranch(event.target.value)}
                aria-invalid={!!errorFor('home_branch_id')}
                className={field(!!errorFor('home_branch_id'))}
              >
                <option value="">Select a branch…</option>
                {branches.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
              <FieldError message={errorFor('home_branch_id')} />
            </div>
            {individual ? (
              <>
                <TextInput id="customer-first" text="First name" value={first} onChange={setFirst} required error={errorFor('first_name')} />
                <TextInput id="customer-last" text="Last name" value={last} onChange={setLast} required error={errorFor('last_name')} />
                <TextInput id="customer-middle" text="Middle name" value={middle} onChange={setMiddle} error={errorFor('middle_name')} />
                <TextInput id="customer-birth" text="Date of birth" type="date" value={birth} onChange={setBirth} error={errorFor('date_of_birth')} />
              </>
            ) : (
              <>
                <TextInput id="customer-legal" text="Legal name" value={legal} onChange={setLegal} required error={errorFor('legal_name')} />
                <TextInput id="customer-trading" text="Trading name" value={trading} onChange={setTrading} error={errorFor('trading_name')} />
                <TextInput
                  id="customer-registration"
                  text="Registration number"
                  value={registration}
                  onChange={setRegistration}
                  error={errorFor('registration_number')}
                />
              </>
            )}
          </div>
        </fieldset>
        <DetailDivider />
        <fieldset className="flex flex-col gap-4">
          <legend className="mb-2 text-base font-medium text-[var(--hz-text-primary)]">{canIdentify ? 'Contact and identity' : 'Contact'}</legend>
          <div className="grid grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-2">
            <TextInput id="customer-mobile" text="Mobile number" value={mobile} onChange={setMobile} placeholder="0712 345 678" error={errorFor('value')} />
            <TextInput id="customer-email" text="E-mail" type="email" value={email} onChange={setEmail} placeholder="name@example.co.ke" />
            {canIdentify && (
              <>
                <div>
                  <label htmlFor="customer-id-type" className={label}>
                    Primary identifier
                  </label>
                  <select id="customer-id-type" value={idType} onChange={(event) => setIdType(event.target.value)} className={field(false)}>
                    {idTypes.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                </div>
                <TextInput
                  id="customer-id-value"
                  text="Identifier number"
                  value={idValue}
                  onChange={setIdValue}
                  hint="Stored encrypted; only its last 4 characters are shown."
                />
              </>
            )}
          </div>
        </fieldset>
        {duplicates && (
          <DuplicateAcknowledgement
            idPrefix="customer"
            acknowledged={acknowledged}
            onAcknowledged={setAcknowledged}
            reason={duplicateReason}
            onReason={setDuplicateReason}
            error={errorFor('duplicate_reason')}
          />
        )}
      </form>
    </DialogFrame>
  );
};

const TextInput: React.FC<{
  id: string;
  text: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  error?: string;
  type?: string;
  placeholder?: string;
  hint?: string;
}> = ({ id, text, value, onChange, required, error, type = 'text', placeholder, hint }) => (
  <div>
    <label htmlFor={id} className={label}>
      {text} {required && <Required />}
    </label>
    <input
      id={id}
      type={type}
      value={value}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      aria-invalid={!!error}
      className={field(!!error)}
    />
    {hint && !error && <p className="mt-1.5 text-[13px] text-[var(--hz-text-muted)]">{hint}</p>}
    <FieldError message={error} />
  </div>
);
