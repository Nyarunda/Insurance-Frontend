import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, FilePlus2, Pencil } from 'lucide-react';
import { useMe } from '../../lib/auth/me';
import { ActionDialog, ActionSpec, Grid, Pager, pretty, QueryState, Refresh, SearchBox, Status, Surface } from '../operations/ui';
import { PageResult, useOperationsQuery } from '../operations/data';

interface Agreement { id: string; reference: string; insurer: string; status: string }
interface Setting {
  agreement_id: string; premium_collection: string; settlement_method: string; etag: string;
  collection_authority: { reference: string | null; effective_from: string | null; effective_to: string | null; recorded_by: string | null; approved: boolean };
}
export function BillingAgreementsPage() {
  const { agreementId } = useParams();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') ?? '';
  const navigate = useNavigate();
  const actor = useMe().data?.user.id;
  const list = useOperationsQuery<PageResult<Agreement>>(`/billing/agreements?${new URLSearchParams({ q, page: String(page) })}`, !agreementId);
  const record = useOperationsQuery<Setting>(`/billing/agreements/${agreementId}`, !!agreementId);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState('');
  const r = record.data;
  const authority = r?.collection_authority;
  const path = `/billing/agreements/${agreementId}`;
  return <Surface title={agreementId ? 'Agreement billing' : 'Collection agreements'} back={agreementId ? () => navigate('/billing/agreements/list') : undefined} actions={<Refresh query={agreementId ? record : list} />}>
    {notice && <div role="status" className="ops-notice">{notice}</div>}
    {!agreementId ? <><div className="ops-toolbar"><SearchBox value={q} label="Search insurer or agreement" onSearch={v => setParams({ q: v })} /></div><QueryState query={list} />{list.data && <><Grid headers={['Agreement', 'Insurer', 'Status']} empty={!list.data.results.length}>{list.data.results.map(a => <tr key={a.id}><td><Link className="ops-link" to={`/billing/agreements/list/${a.id}`}>{a.reference}</Link></td><td>{a.insurer}</td><td><Status value={a.status} /></td></tr>)}</Grid><Pager page={page} count={list.data.count} size={25} change={p => setParams({ q, page: String(p) })} /></>}</> : <><QueryState query={record} />{r && authority && <><dl className="ops-summary"><div><dt>Premium collection</dt><dd>{pretty(r.premium_collection)}</dd></div><div><dt>Settlement method</dt><dd>{pretty(r.settlement_method)}</dd></div><div><dt>Authority</dt><dd>{authority.approved ? 'Approved' : authority.reference ? 'Awaiting approval' : 'Not recorded'}</dd></div><div><dt>Reference</dt><dd>{authority.reference ?? '-'}</dd></div><div><dt>Effective from</dt><dd>{authority.effective_from ?? '-'}</dd></div><div><dt>Effective to</dt><dd>{authority.effective_to ?? 'No end date'}</dd></div></dl><div className="ops-toolbar">
      <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Edit collection settings', path, method: 'PATCH', ifMatch: r.etag, fields: [{ name: 'premium_collection', label: 'Premium collection', value: r.premium_collection, required: true, options: [{ value: 'INSURER_DIRECT', label: 'Insurer direct' }, { value: 'INTERMEDIARY', label: 'Intermediary' }] }, { name: 'settlement_method', label: 'Settlement method', value: r.settlement_method, required: true, options: [{ value: 'NET', label: 'Net' }, { value: 'GROSS', label: 'Gross' }] }] })}><Pencil size={15} />Edit settings</button>
      <button className="hz-button hz-button-secondary" disabled={r.premium_collection === 'INTERMEDIARY' && authority.approved} onClick={() => setAction({ title: 'Record collection authority', path: `${path}/collection-authority`, ifMatch: r.etag, fields: [{ name: 'reference', label: 'Authority reference', required: true }, { name: 'effective_from', label: 'Effective from', type: 'date', required: true }, { name: 'effective_to', label: 'Effective to', type: 'date' }], transform: v => ({ ...v, effective_to: v.effective_to || null }) })}><FilePlus2 size={15} />Record authority</button>
      {authority.reference && !authority.approved && authority.recorded_by !== actor && <button className="hz-button hz-button-primary" onClick={() => setAction({ title: 'Approve collection authority', path: `${path}/collection-authority/approve`, ifMatch: r.etag, fields: [], confirm: 'Approve authority', message: `${authority.reference} - effective from ${authority.effective_from}` })}><Check size={15} />Approve authority</button>}
    </div></>}</>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setAction(null); setNotice('Agreement billing saved.'); }} />}
  </Surface>;
}
