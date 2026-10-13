import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Plus } from 'lucide-react';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ActionDialog, ActionSpec, Grid, QueryState, Refresh, Status, Surface, Tabs, pretty } from '../operations/ui';
import { useOperationsQuery, useOperationsResultQuery } from '../operations/data';
import {
  COMMISSION_MANAGE,
  COMMISSION_VIEW,
  CONFIG_PUBLISH,
  INSURER_MANAGE,
  INSURER_VIEW,
  LEVY_MANAGE,
  PRODUCT_MANAGE,
} from '../permissions';

interface InsurerSummary { id: string; code: string; name: string; short_name: string; insurer_type: string; status: string }
interface InsurerBranch { id: string; code: string; name: string; city: string; address: string; phone: string; email: string; is_head_office: boolean; is_active: boolean }
interface InsurerContact { id: string; contact_type: string; full_name: string; job_title: string; email: string; phone: string; branch_id: string | null; is_primary: boolean; is_active: boolean }
interface InsurerAgreement { id: string; agreement_type: string; reference_no: string; effective_from: string; effective_to: string | null; status: string; binder_limit: string | null; notes: string }
interface InsurerDetail extends InsurerSummary {
  licence_no: string; tax_pin: string; email: string; phone: string; website: string; address: string;
  status_reason: string; row_version: number; branches: InsurerBranch[]; contacts: InsurerContact[]; agreements: InsurerAgreement[];
}
interface ClassRow { id: string; code: string; name: string; line: string; is_active: boolean }
interface LevyRow { id: string; code: string; name: string; basis: string; rate: string; lines: string[]; currency: string; remittance_party: string; status: string; effective_from: string; effective_to: string | null; created_by: string; published_by: string | null }
interface CommissionRow { id: string; insurer_id: string; insurance_class_id: string | null; product_id: string | null; rate_percent: string; status: string; effective_from: string; effective_to: string | null; created_by: string; published_by: string | null }
interface ProductRow { id: string; code: string; name: string; insurer: { id: string; code: string; name: string }; insurance_class: { id: string; code: string; line: string } }

const insurerTypes = ['GENERAL', 'LIFE', 'COMPOSITE', 'MEDICAL'].map(value => ({ value, label: pretty(value) }));
const contactTypes = ['UNDERWRITING', 'CLAIMS', 'ACCOUNTS', 'RELATIONSHIP', 'GENERAL'].map(value => ({ value, label: pretty(value) }));
const agreementTypes = ['AGENCY', 'BROKERAGE', 'BINDER'].map(value => ({ value, label: pretty(value) }));

export function InsurersPage() {
  const { insurerId } = useParams();
  return insurerId ? <InsurerWorkspace insurerId={insurerId} /> : <InsurerList />;
}

function InsurerList() {
  const me = useMe().data;
  const manage = hasPermission(me, INSURER_MANAGE);
  const query = useOperationsQuery<{ results: InsurerSummary[] }>('/insurers');
  const [action, setAction] = useState<ActionSpec | null>(null);
  return <Surface title="Insurers" subtitle="Insurer panel, contacts, branches and agreements" actions={<>
    <Refresh query={query} />
    {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'New insurer', path: '/insurers', confirm: 'Create insurer', fields: [
        { name: 'code', label: 'Code', required: true },
        { name: 'name', label: 'Name', required: true },
        { name: 'short_name', label: 'Short name' },
        { name: 'insurer_type', label: 'Type', required: true, options: insurerTypes },
        { name: 'licence_no', label: 'Licence number' },
        { name: 'tax_pin', label: 'Tax PIN' },
        { name: 'email', label: 'Email', type: 'email' },
        { name: 'phone', label: 'Phone' },
        { name: 'website', label: 'Website' },
        { name: 'address', label: 'Address', type: 'textarea' },
      ],
    })}><Plus size={15} />New insurer</button>}
  </>}>
    <QueryState query={query} />
    {query.data && <Grid headers={['Code', 'Name', 'Type', 'Status']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}>
        <td>{row.code}</td>
        <td><Link className="ops-link" to={`/setup/insurers/${row.id}`}>{row.name}</Link></td>
        <td>{pretty(row.insurer_type)}</td>
        <td><Status value={row.status} /></td>
      </tr>)}
    </Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

function InsurerWorkspace({ insurerId }: { insurerId: string }) {
  const navigate = useNavigate();
  const me = useMe().data;
  const manage = hasPermission(me, INSURER_MANAGE);
  const query = useOperationsResultQuery<InsurerDetail>(`/insurers/${insurerId}`);
  const insurer = query.data?.data;
  const etag = query.data?.etag ?? undefined;
  const [tab, setTab] = useState('overview');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const edit = insurer && etag ? {
    title: 'Edit insurer', path: `/insurers/${insurerId}`, method: 'PATCH' as const, ifMatch: etag, fields: [
      { name: 'name', label: 'Name', required: true, value: insurer.name },
      { name: 'short_name', label: 'Short name', value: insurer.short_name },
      { name: 'insurer_type', label: 'Type', required: true, value: insurer.insurer_type, options: insurerTypes },
      { name: 'licence_no', label: 'Licence number', value: insurer.licence_no },
      { name: 'tax_pin', label: 'Tax PIN', value: insurer.tax_pin },
      { name: 'email', label: 'Email', type: 'email' as const, value: insurer.email },
      { name: 'phone', label: 'Phone', value: insurer.phone },
      { name: 'website', label: 'Website', value: insurer.website },
      { name: 'address', label: 'Address', type: 'textarea' as const, value: insurer.address },
      { name: 'status', label: 'Status', value: insurer.status, options: ['ACTIVE','SUSPENDED','INACTIVE'].map(value => ({ value, label: pretty(value) })) },
      { name: 'status_reason', label: 'Status reason', type: 'textarea' as const, value: insurer.status_reason },
    ],
  } : null;
  return <Surface title={insurer?.name ?? 'Insurer'} subtitle={insurer ? <><code>{insurer.code}</code> · <Status value={insurer.status} /></> : undefined}
    back={() => navigate('/setup/insurers/list')} actions={<><Refresh query={query} />{manage && edit && <button className="hz-button hz-button-secondary" onClick={() => setAction(edit)}>Edit insurer</button>}</>}>
    <QueryState query={query} />
    {insurer && <>
      <Tabs value={tab} change={setTab} options={[
        { value: 'overview', label: 'Overview' }, { value: 'branches', label: 'Branches' },
        { value: 'contacts', label: 'Contacts' }, { value: 'agreements', label: 'Agreements' },
      ]} />
      {tab === 'overview' && <dl className="ops-summary">
        <div><dt>Type</dt><dd>{pretty(insurer.insurer_type)}</dd></div>
        <div><dt>Licence</dt><dd>{insurer.licence_no || '—'}</dd></div>
        <div><dt>Tax PIN</dt><dd>{insurer.tax_pin || '—'}</dd></div>
        <div><dt>Email</dt><dd>{insurer.email || '—'}</dd></div>
        <div><dt>Phone</dt><dd>{insurer.phone || '—'}</dd></div>
        <div><dt>Address</dt><dd>{insurer.address || '—'}</dd></div>
      </dl>}
      {tab === 'branches' && <>
        {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
          title: 'Add insurer branch', path: `/insurers/${insurerId}/branches`, confirm: 'Add branch',
          fields: [
            { name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
            { name: 'city', label: 'City' }, { name: 'address', label: 'Address', type: 'textarea' },
            { name: 'phone', label: 'Phone' }, { name: 'email', label: 'Email', type: 'email' },
            { name: 'is_head_office', label: 'Head office', type: 'checkbox' },
          ], transform: v => ({ ...v, is_head_office: v.is_head_office === 'true' }),
        })}><Plus size={15} />Add branch</button>}
        <Grid headers={['Code','Name','City','Head office','Status']} empty={!insurer.branches.length}>
          {insurer.branches.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{row.city || '—'}</td><td>{row.is_head_office ? 'Yes' : 'No'}</td><td>{row.is_active ? 'Active' : 'Inactive'}</td></tr>)}
        </Grid>
      </>}
      {tab === 'contacts' && <>
        {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
          title: 'Add insurer contact', path: `/insurers/${insurerId}/contacts`, confirm: 'Add contact',
          fields: [
            { name: 'contact_type', label: 'Contact type', required: true, options: contactTypes },
            { name: 'full_name', label: 'Full name', required: true }, { name: 'job_title', label: 'Job title' },
            { name: 'email', label: 'Email', type: 'email' }, { name: 'phone', label: 'Phone' },
            { name: 'branch_id', label: 'Branch', options: insurer.branches.map(b => ({ value: b.id, label: `${b.code} — ${b.name}` })) },
            { name: 'is_primary', label: 'Primary contact', type: 'checkbox' },
          ], transform: v => ({ ...v, branch_id: v.branch_id || null, is_primary: v.is_primary === 'true' }),
        })}><Plus size={15} />Add contact</button>}
        <Grid headers={['Type','Name','Title','Email','Phone','Primary']} empty={!insurer.contacts.length}>
          {insurer.contacts.map(row => <tr key={row.id}><td>{pretty(row.contact_type)}</td><td>{row.full_name}</td><td>{row.job_title || '—'}</td><td>{row.email || '—'}</td><td>{row.phone || '—'}</td><td>{row.is_primary ? 'Yes' : 'No'}</td></tr>)}
        </Grid>
      </>}
      {tab === 'agreements' && <>
        {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
          title: 'Add insurer agreement', path: `/insurers/${insurerId}/agreements`, confirm: 'Add agreement',
          fields: [
            { name: 'agreement_type', label: 'Type', required: true, options: agreementTypes },
            { name: 'reference_no', label: 'Reference number', required: true },
            { name: 'effective_from', label: 'Effective from', type: 'date', required: true },
            { name: 'effective_to', label: 'Effective to', type: 'date' },
            { name: 'binder_limit', label: 'Binder limit', type: 'number' },
            { name: 'notes', label: 'Notes', type: 'textarea' },
          ], transform: v => ({ ...v, effective_to: v.effective_to || null, binder_limit: v.binder_limit || null }),
        })}><Plus size={15} />Add agreement</button>}
        <Grid headers={['Type','Reference','Effective','Status','Binder limit']} empty={!insurer.agreements.length}>
          {insurer.agreements.map(row => <tr key={row.id}><td>{pretty(row.agreement_type)}</td><td>{row.reference_no}</td><td>{row.effective_from}{row.effective_to ? ` – ${row.effective_to}` : ''}</td><td><Status value={row.status} /></td><td>{row.binder_limit ?? '—'}</td></tr>)}
        </Grid>
      </>}
    </>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

export function InsuranceClassesPage() {
  const me = useMe().data;
  const manage = hasPermission(me, PRODUCT_MANAGE);
  const query = useOperationsQuery<{ results: ClassRow[] }>('/insurance-classes');
  const [action, setAction] = useState<ActionSpec | null>(null);
  return <Surface title="Insurance classes" subtitle="Classes used by products and commission setup" actions={<>
    <Refresh query={query} />
    {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'New insurance class', path: '/insurance-classes', confirm: 'Create class',
      fields: [
        { name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
        { name: 'line', label: 'Line', required: true, options: ['GENERAL','LIFE','MEDICAL'].map(value => ({ value, label: pretty(value) })) },
      ],
    })}><Plus size={15} />New class</button>}
  </>}>
    <QueryState query={query} />
    {query.data && <Grid headers={['Code','Name','Line','Status','']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{pretty(row.line)}</td><td>{row.is_active ? 'Active' : 'Inactive'}</td><td>
        {manage && <button className="hz-button hz-button-secondary" onClick={() => setAction({
          title: `Edit ${row.code}`, path: `/insurance-classes/${row.id}`, method: 'PATCH',
          fields: [
            { name: 'name', label: 'Name', required: true, value: row.name },
            { name: 'is_active', label: 'Active', type: 'checkbox', value: row.is_active ? 'true' : '' },
          ], transform: v => ({ name: v.name, is_active: v.is_active === 'true' }),
        })}>Edit</button>}
      </td></tr>)}
    </Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

export function LevyRatesPage() {
  const me = useMe().data;
  const manage = hasPermission(me, LEVY_MANAGE);
  const publish = hasPermission(me, CONFIG_PUBLISH);
  const query = useOperationsQuery<{ results: LevyRow[] }>('/levy-rates');
  const [action, setAction] = useState<ActionSpec | null>(null);
  return <Surface title="Levy rates" subtitle="Effective-dated taxes and levies. Publish is maker–publisher, not an approval." actions={<>
    <Refresh query={query} />
    {manage && <button className="hz-button hz-button-primary" onClick={() => setAction({
      title: 'New levy draft', path: '/levy-rates', confirm: 'Create draft',
      fields: [
        { name: 'code', label: 'Code', required: true }, { name: 'name', label: 'Name', required: true },
        { name: 'basis', label: 'Basis', required: true, options: [{ value: 'PERCENT', label: 'Percent of basic premium' }, { value: 'FIXED', label: 'Fixed amount per policy' }] },
        { name: 'rate', label: 'Rate', type: 'number', required: true },
        { name: 'lines', label: 'Lines (GENERAL,LIFE,MEDICAL)', required: true, value: 'GENERAL' },
        { name: 'currency', label: 'Currency', value: 'KES' },
        { name: 'remittance_party', label: 'Remittance party', required: true, options: [{ value: 'INSURER', label: 'Insurer' }, { value: 'AUTHORITY', label: 'Authority' }] },
        { name: 'effective_from', label: 'Effective from', type: 'date', required: true },
      ], transform: v => ({ ...v, code: v.code.trim().toUpperCase(), currency: v.currency.trim().toUpperCase(), lines: v.lines.split(',').map(x => x.trim().toUpperCase()).filter(Boolean) }),
    })}><Plus size={15} />New levy</button>}
  </>}>
    <QueryState query={query} />
    {query.data && <Grid headers={['Code','Name','Basis','Rate','Lines','Effective','Status','']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}><td>{row.code}</td><td>{row.name}</td><td>{pretty(row.basis)}</td><td>{row.rate}{row.basis === 'PERCENT' ? '%' : ` ${row.currency}`}</td><td>{row.lines.join(', ')}</td><td>{row.effective_from}</td><td><Status value={row.status} /></td><td>
        {publish && row.status === 'DRAFT' && <button className="hz-button hz-button-secondary" onClick={() => setAction({
          title: `Publish ${row.code}`, path: `/levy-rates/${row.id}/publish`, confirm: 'Publish', fields: [],
          message: 'Publishing makes this effective-dated setup live. The publisher must be different from the maker.',
        })}>Publish</button>}
      </td></tr>)}
    </Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

export function CommissionRatesPage() {
  const me = useMe().data;
  const manage = hasPermission(me, COMMISSION_MANAGE);
  const publish = hasPermission(me, CONFIG_PUBLISH);
  const query = useOperationsQuery<{ results: CommissionRow[] }>('/commission-rates');
  const insurers = useOperationsQuery<{ results: InsurerSummary[] }>('/insurers', manage);
  const classes = useOperationsQuery<{ results: ClassRow[] }>('/insurance-classes', manage);
  const products = useOperationsQuery<{ results: ProductRow[] }>('/products', manage);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const insurerName = (id: string) => insurers.data?.results.find(x => x.id === id)?.name ?? id;
  const targetName = (row: CommissionRow) => row.product_id ? products.data?.results.find(x => x.id === row.product_id)?.name ?? 'Product'
    : row.insurance_class_id ? classes.data?.results.find(x => x.id === row.insurance_class_id)?.name ?? 'Class' : 'All products';
  return <Surface title="Commission rates" subtitle="Effective-dated insurer/class/product commission setup" actions={<>
    <Refresh query={query} />
    {manage && <button className="hz-button hz-button-primary" disabled={!insurers.data} onClick={() => setAction({
      title: 'New commission draft', path: '/commission-rates', confirm: 'Create draft',
      fields: [
        { name: 'insurer_id', label: 'Insurer', required: true, options: (insurers.data?.results ?? []).map(x => ({ value: x.id, label: x.name })) },
        { name: 'insurance_class_id', label: 'Class (optional)', options: (classes.data?.results ?? []).map(x => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
        { name: 'product_id', label: 'Product (optional)', options: (products.data?.results ?? []).map(x => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
        { name: 'rate_percent', label: 'Rate %', type: 'number', required: true },
        { name: 'effective_from', label: 'Effective from', type: 'date', required: true },
      ], transform: v => ({ insurer_id: v.insurer_id, insurance_class_id: v.insurance_class_id || null, product_id: v.product_id || null, rate_percent: v.rate_percent, effective_from: v.effective_from }),
      message: 'Choose either a class or a product, not both. Leave both blank for an insurer-wide rate.',
    })}><Plus size={15} />New commission</button>}
  </>}>
    <QueryState query={query} />
    {query.data && <Grid headers={['Insurer','Target','Rate','Effective','Status','']} empty={!query.data.results.length}>
      {query.data.results.map(row => <tr key={row.id}><td>{insurerName(row.insurer_id)}</td><td>{targetName(row)}</td><td>{row.rate_percent}%</td><td>{row.effective_from}</td><td><Status value={row.status} /></td><td>
        {publish && row.status === 'DRAFT' && <button className="hz-button hz-button-secondary" onClick={() => setAction({
          title: 'Publish commission rate', path: `/commission-rates/${row.id}/publish`, confirm: 'Publish', fields: [],
          message: 'Publishing makes this effective-dated setup live. The publisher must be different from the maker.',
        })}>Publish</button>}
      </td></tr>)}
    </Grid>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}
