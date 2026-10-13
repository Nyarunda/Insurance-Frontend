import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, Download, Pencil, Plus, Save, Send, Upload, X } from 'lucide-react';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { useMe, usePermission } from '../../lib/auth/me';
import { api } from '../../lib/api/instance';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { PageResult, useOperationsCommand, useOperationsQuery } from '../operations/data';
import { ActionDialog, ActionSpec, Grid, Pager, pretty, QueryState, reason, Refresh, SearchBox, Status, Surface, Tabs } from '../operations/ui';

type Kind = 'leads' | 'followups' | 'campaigns' | 'targets' | 'agreements' | 'payouts';
interface SalesRow {
  id: string; name?: string; reference?: string; status?: string; etag: string; contributors?: string[];
  email?: string; phone?: string; source?: string; notes?: string; note?: string;
  agent_id?: string | null; agent_name?: string; sub_agent_id?: string | null; sub_agent_name?: string;
  branch_id?: string | null; branch_name?: string; metric?: string; premium_goal?: string; goal?: string; progress_percent?: string;
  lead_count?: number; qualified_count?: number; lost_count?: number; quotation_count?: number; policy_count?: number;
  campaign_id?: string | null; campaign_name?: string; product_id?: string | null; product_name?: string;
  lead_id?: string; lead_name?: string; agreement_id?: string; agreement_name?: string; policy_name?: string;
  starts_on?: string; ends_on?: string; due_on?: string; completed_at?: string | null;
  channel?: string; description?: string; lead_goal?: number; achieved?: number | string;
  agent_percent?: string; sub_agent_percent?: string; withholding_percent?: string;
  currency?: string; gross_commission?: string; retained_amount?: string; settlement_reference?: string; settled_on?: string;
  splits?: { agent_id: string; name: string; gross: string; withheld: string; net: string; percent: string }[];
}
interface Field { key: string; label: string; type?: 'email' | 'date' | 'number' | 'textarea'; required?: boolean; lookup?: string; choices?: string[]; max?: number }
const field = (key: string, label: string, extra: Omit<Field, 'key' | 'label'> = {}): Field => ({ key, label, ...extra });
const name = field('name', 'Name', { required: true });
const dates = [field('starts_on', 'Start date', { type: 'date', required: true }), field('ends_on', 'End date', { type: 'date', required: true })];
const agent = field('agent_id', 'Agent', { lookup: 'agents', required: true });
const definitions: Record<Kind, { title: string; singular: string; fields: Field[] }> = {
  leads: { title: 'Leads', singular: 'lead', fields: [field('reference', 'Source reference', { required: true, max: 64 }), name,
    field('email', 'Email', { type: 'email' }), field('phone', 'Phone', { max: 32 }), field('source', 'Source', { required: true, max: 80 }),
    field('status', 'Stage', { choices: ['NEW', 'CONTACTED', 'QUALIFIED', 'LOST'] }), { ...agent, required: false }, field('branch_id', 'Branch', { lookup: 'branches' }),
    field('product_id', 'Product interest', { lookup: 'products' }), field('campaign_id', 'Campaign', { lookup: 'campaigns' }), field('notes', 'Notes', { type: 'textarea' })] },
  followups: { title: 'Follow-ups', singular: 'follow-up', fields: [field('lead_id', 'Lead', { lookup: 'leads', required: true }), field('note', 'Note', { type: 'textarea', required: true }), field('due_on', 'Due date', { type: 'date', required: true })] },
  campaigns: { title: 'Campaigns', singular: 'campaign', fields: [name, ...dates, field('channel', 'Channel', { required: true, max: 80 }), field('description', 'Description', { type: 'textarea' })] },
  targets: { title: 'Sales targets', singular: 'target', fields: [name, agent, field('branch_id', 'Branch', { lookup: 'branches', required: true }), ...dates,
    field('metric', 'Measure', { choices: ['LEADS', 'POLICIES', 'PREMIUM'], required: true }),
    field('lead_goal', 'Count goal', { type: 'number', required: true }), field('premium_goal', 'Premium goal', { type: 'number', required: true }), field('currency', 'Currency', { required: true, max: 3 })] },
  agreements: { title: 'Commission agreements', singular: 'agreement', fields: [name, agent,
    field('sub_agent_id', 'Sub-agent', { lookup: 'agents' }), field('product_id', 'Product', { lookup: 'products', required: true }), ...dates,
    field('agent_percent', 'Agent share (%)', { type: 'number', required: true }), field('sub_agent_percent', 'Sub-agent share (%)', { type: 'number', required: true }),
    field('withholding_percent', 'Withholding (%)', { type: 'number', required: true })] },
  payouts: { title: 'Commission payouts', singular: 'payout request', fields: [field('agreement_id', 'Agreement', { lookup: 'agreements', required: true }), field('policy_id', 'Policy', { lookup: 'policies', required: true })] },
};
const financial = (kind: Kind) => ['agreements', 'payouts'].includes(kind);
const prefix = (kind: Kind) => `intermediaries.${financial(kind) ? 'commission' : 'sales'}`;
const nav = (kind: Kind) => (financial(kind) ? ['agreements', 'payouts'] : ['leads', 'followups', 'campaigns', 'targets']).map(k => ({ value: k, label: definitions[k as Kind].title }));

function ReferencePicker({ label, kind, value, choose, required }: { label: string; kind: string; value: { id: string; name: string } | null; choose: (v: { id: string; name: string } | null) => void; required?: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const query = useOperationsQuery<PageResult<{ id: string; name: string }>>(`/sales/options?${new URLSearchParams({ kind, q, page: String(page) })}`, open);
  return <div className="ops-reference"><span>{label}{required && ' *'}</span><div className="ops-toolbar"><button className="hz-button hz-button-secondary" type="button" onClick={() => setOpen(!open)}>{value?.name ?? `Select ${label.toLowerCase()}`}</button>{value && <button className="hz-icon-button" type="button" aria-label={`Clear ${label}`} onClick={() => choose(null)}><X size={14} /></button>}</div>
    {open && <><div className="ops-toolbar"><input className="hz-field" aria-label={`Find ${label.toLowerCase()}`} value={search} maxLength={100} onChange={e => setSearch(e.target.value)} /><button type="button" className="hz-button hz-button-secondary" onClick={() => { setQ(search); setPage(1); }}>Search</button></div><QueryState query={query} />{query.data && <><Grid headers={[label, '']} empty={!query.data.results.length}>{query.data.results.map(item => <tr key={item.id}><td>{item.name}</td><td><button type="button" className="hz-button hz-button-secondary" onClick={() => { choose(item); setOpen(false); }}>Select</button></td></tr>)}</Grid><Pager page={page} count={query.data.count} size={25} change={setPage} /></>}</>}
  </div>;
}

function SalesForm({ kind, row, close, done, lead }: { kind: Kind; row?: SalesRow; close: () => void; done: (row: SalesRow) => void; lead?: SalesRow }) {
  const definition = definitions[kind];
  const command = useOperationsCommand();
  const [original] = useState(row);
  const [targetOwner, setTargetOwner] = useState(row?.branch_id ? 'BRANCH' : 'AGENT');
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.map(f => [f.key, String((row as unknown as Record<string, unknown>)?.[f.key] ?? (f.key === 'lead_id' ? lead?.id ?? '' : f.key === 'status' ? 'NEW' : f.key === 'metric' ? 'LEADS' : f.key.endsWith('_percent') ? '0' : ''))])));
  const [labels, setLabels] = useState<Record<string, string>>(() => Object.fromEntries(definition.fields.filter(f => f.lookup).map(f => [f.key, String((row as unknown as Record<string, unknown>)?.[f.key.replace('_id', '_name')] ?? (f.key === 'lead_id' ? lead?.name ?? '' : ''))])));
  const visibleFields = definition.fields.filter(f => kind !== 'targets' ||
    !((f.key === 'agent_id' && targetOwner === 'BRANCH') || (f.key === 'branch_id' && targetOwner === 'AGENT') ||
      (f.key === 'lead_goal' && values.metric === 'PREMIUM') || (['premium_goal', 'currency'].includes(f.key) && values.metric !== 'PREMIUM')));
  const incomplete = visibleFields.some(f => f.required && !values[f.key]);
  const save = async () => {
    const body = Object.fromEntries(definition.fields.map(f => [f.key, f.lookup ? values[f.key] || null : f.key === 'lead_goal' ? Number(values[f.key]) : values[f.key]]));
    if (kind === 'targets') {
      body[targetOwner === 'AGENT' ? 'branch_id' : 'agent_id'] = null;
      if (values.metric === 'PREMIUM') body.lead_goal = 0;
      else { body.premium_goal = '0'; body.currency = ''; }
    }
    const result = await command.run<SalesRow>(`/sales/${kind}${original ? '/' + original.id : ''}`, body, original ? 'PATCH' : 'POST', original?.etag);
    if (result) done(result);
  };
  return <DialogFrame titleId="sales-form-title" title={`${row ? 'Edit' : 'New'} ${definition.singular}`} onClose={() => { if (!command.pending) close(); }} dismissOnBackdrop={false} size="lg" footer={<><button className="hz-button hz-button-secondary" disabled={command.pending} onClick={close}>Cancel</button><button className="hz-button hz-button-primary" type="submit" form="sales-form" disabled={command.pending || incomplete}><Save size={14} />{command.pending ? 'Saving...' : 'Save'}</button></>}>
    {command.error != null && <ApiErrorAlert error={command.error} />}
    <form id="sales-form" className="ops-form" onSubmit={e => { e.preventDefault(); void save(); }}><fieldset disabled={command.pending}>
      {kind === 'targets' && <label>Assignment<select className="hz-field" value={targetOwner} onChange={e => setTargetOwner(e.target.value)}><option value="AGENT">Agent</option><option value="BRANCH">Branch</option></select></label>}
      {visibleFields.map(f => f.lookup ? <ReferencePicker key={f.key} label={f.label} kind={f.lookup} required={f.required} value={values[f.key] ? { id: values[f.key], name: labels[f.key] || f.label } : null} choose={value => { setValues(v => ({ ...v, [f.key]: value?.id ?? '', ...(f.key === 'agent_id' ? { sub_agent_id: '' } : {}) })); setLabels(v => ({ ...v, [f.key]: value?.name ?? '' })); }} /> : <label key={f.key}>{f.label}{f.required && ' *'}{f.choices ? <select className="hz-field" value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}>{f.choices.map(c => <option key={c} value={c}>{pretty(c)}</option>)}</select> : f.type === 'textarea' ? <textarea className="hz-field" maxLength={2000} required={f.required} value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} /> : <input className="hz-field" type={f.type ?? 'text'} maxLength={f.max ?? 255} min={f.key === 'lead_goal' ? 1 : f.key === 'premium_goal' ? '.01' : 0} max={f.key.endsWith('_percent') ? 100 : undefined} step={f.key.endsWith('_percent') ? '.0001' : f.key === 'premium_goal' ? '.01' : '1'} required={f.required} value={values[f.key]} onChange={e => setValues(v => ({ ...v, [f.key]: f.key === 'currency' ? e.target.value.toUpperCase() : e.target.value }))} />}</label>)}
    </fieldset></form>
  </DialogFrame>;
}

function ListRows({ kind, rows }: { kind: Kind; rows: SalesRow[] }) {
  const headers: Record<Kind, string[]> = { leads: ['Reference', 'Name', 'Contact', 'Agent', 'Branch', 'Campaign', 'Stage'], followups: ['Lead', 'Note', 'Due', 'Status'], campaigns: ['Name', 'Channel', 'Start', 'End', 'Leads', 'Qualified', 'Lost', 'Status'], targets: ['Name', 'Assigned to', 'Measure', 'Start', 'End', 'Currency', 'Goal', 'Achieved', 'Progress (%)'], agreements: ['Name', 'Agent', 'Product', 'Start', 'End', 'Status'], payouts: ['Policy', 'Agreement', 'Currency', 'Commission', 'Status'] };
  const link = (r: SalesRow, text?: string) => <Link className="ops-link" to={`/sales/${kind}/${r.id}`}>{text || '-'}</Link>;
  return <Grid headers={headers[kind]} empty={!rows.length}>{rows.map(r => <tr key={r.id}>
    {kind === 'leads' && <><td>{r.reference}</td><td>{link(r, r.name)}</td><td>{r.email || r.phone}</td><td>{r.agent_name || '-'}</td><td>{r.branch_name || '-'}</td><td>{r.campaign_name || '-'}</td><td><Status value={r.status!} /></td></>}
    {kind === 'followups' && <><td>{link(r, r.lead_name)}</td><td>{r.note}</td><td>{r.due_on}</td><td><Status value={r.completed_at ? 'COMPLETED' : 'OPEN'} /></td></>}
    {kind === 'campaigns' && <><td>{link(r, r.name)}</td><td>{r.channel}</td><td>{r.starts_on}</td><td>{r.ends_on}</td><td>{r.lead_count ?? 0}</td><td>{r.qualified_count ?? 0}</td><td>{r.lost_count ?? 0}</td><td><Status value={r.status!} /></td></>}
    {kind === 'targets' && <><td>{link(r, r.name)}</td><td>{r.agent_name || r.branch_name}</td><td>{pretty(r.metric || 'LEADS')}</td><td>{r.starts_on}</td><td>{r.ends_on}</td><td>{r.currency || '-'}</td><td>{r.goal ?? r.lead_goal}</td><td>{r.achieved ?? 0}</td><td>{r.progress_percent ?? '0'}</td></>}
    {kind === 'agreements' && <><td>{link(r, r.name)}</td><td>{r.agent_name}</td><td>{r.product_name}</td><td>{r.starts_on}</td><td>{r.ends_on}</td><td><Status value={r.status!} /></td></>}
    {kind === 'payouts' && <><td>{link(r, r.policy_name)}</td><td>{r.agreement_name}</td><td>{r.currency}</td><td>{r.gross_commission}</td><td><Status value={r.status!} /></td></>}
  </tr>)}</Grid>;
}

export function SalesListPage({ kind }: { kind: Kind }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') ?? '';
  const queue = params.get('queue') ?? (kind === 'followups' ? 'OPEN' : '');
  const query = useOperationsQuery<PageResult<SalesRow>>(`/sales/${kind}?${new URLSearchParams({ q, page: String(page), queue })}`);
  const canManage = usePermission(`${prefix(kind)}.manage`);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  return <Surface title={definitions[kind].title} actions={<><Refresh query={query} />{canManage && <>{kind === 'leads' && <button className="hz-button hz-button-secondary" onClick={() => setImporting(true)}><Upload size={14} />Import Excel</button>}<button className="hz-button hz-button-primary" onClick={() => setAdding(true)}><Plus size={14} />New {definitions[kind].singular}</button></>}</>}>
    <Tabs value={kind} options={nav(kind)} change={k => navigate(`/sales/${k}`)} />
    <div className="ops-toolbar"><SearchBox value={q} label={kind === 'payouts' ? 'Search policy number' : 'Search'} onSearch={text => setParams({ q: text, queue })} />{kind === 'followups' && <select className="hz-field" aria-label="Follow-up queue" value={queue} onChange={e => setParams({ q, queue: e.target.value })}><option value="">All follow-ups</option>{['OPEN', 'OVERDUE', 'COMPLETED'].map(v => <option key={v} value={v}>{pretty(v)}</option>)}</select>}</div>
    <QueryState query={query} />{query.data && <><ListRows kind={kind} rows={query.data.results} /><Pager page={page} count={query.data.count} size={25} change={p => setParams({ q, queue, page: String(p) })} /></>}
    {adding && <SalesForm key={kind} kind={kind} close={() => setAdding(false)} done={r => navigate(`/sales/${kind}/${r.id}`)} />}
    {importing && <ImportLeads close={() => setImporting(false)} />}
  </Surface>;
}

export function SalesWorkspace({ kind }: { kind: Kind }) {
  const params = useParams();
  const navigate = useNavigate();
  const path = `/sales/${kind}/${params.recordId}`;
  const query = useOperationsQuery<SalesRow>(path);
  const row = query.data;
  const manage = usePermission(`${prefix(kind)}.manage`);
  const canQuote = usePermission('quotations.quotation.create');
  const approve = usePermission(`${prefix(kind)}.approve`);
  const settle = usePermission('intermediaries.commission.settle');
  const actor = useMe().data?.user.id;
  const [editing, setEditing] = useState(false);
  const [addingFollowUp, setAddingFollowUp] = useState(false);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [page, setPage] = useState(1);
  const followups = useOperationsQuery<PageResult<SalesRow>>(`/sales/followups?lead_id=${params.recordId}&page=${page}`, kind === 'leads');
  const review = ['campaigns', 'agreements', 'payouts'].includes(kind);
  const start = (verb: string, title: string) => setAction({ title, path: `${path}/${verb}`, fields: [reason], ifMatch: row!.etag });
  return <Surface title={row?.name || row?.policy_name || row?.lead_name || definitions[kind].singular} subtitle={row?.status && <Status value={row.status} />} back={() => navigate(`/sales/${kind}`)} actions={<><Refresh query={query} />{row && <>
    {kind === 'leads' && manage && canQuote && row.status !== 'LOST' && <button className="hz-button hz-button-primary" onClick={() => navigate(`/quotations/list/new?lead=${row.id}`)}><Plus size={14} />Create quotation</button>}
    {manage && !['followups', 'payouts'].includes(kind) && (!review || ['DRAFT', 'REJECTED'].includes(row.status!)) && <button className="hz-button hz-button-secondary" onClick={() => setEditing(true)}><Pencil size={14} />Edit</button>}
    {manage && review && ['DRAFT', 'REJECTED'].includes(row.status!) && <button className="hz-button hz-button-primary" onClick={() => start('submit', 'Submit for approval')}><Send size={14} />Submit for approval</button>}
    {manage && review && row.status === 'PENDING' && <button className="hz-button hz-button-secondary" onClick={() => start('withdraw', 'Withdraw')}>Withdraw</button>}
    {approve && row.status === 'PENDING' && !row.contributors?.includes(actor ?? '') && <><button className="hz-button hz-button-primary" onClick={() => start('approve', 'Approve')}><Check size={14} />Approve</button><button className="hz-button hz-button-secondary" onClick={() => start('reject', 'Reject')}><X size={14} />Reject</button></>}
    {manage && kind === 'followups' && !row.completed_at && <button className="hz-button hz-button-primary" onClick={() => start('complete', 'Complete follow-up')}><Check size={14} />Complete</button>}
    {kind === 'payouts' && settle && row.status === 'APPROVED' && !row.contributors?.includes(actor ?? '') && <button className="hz-button hz-button-primary" onClick={() => setAction({ title: 'Record external settlement', path: `${path}/settle`, ifMatch: row.etag, message: 'Confirm a payment already completed outside InsureERP. This does not send money or post a bank journal.', fields: [{ name: 'settlement_reference', label: 'Bank or provider reference', required: true, maxLength: 128 }, { name: 'settled_on', label: 'Settlement date', type: 'date', required: true }, reason] })}><Check size={14} />Record external settlement</button>}
  </>}</>}>
    <QueryState query={query} />{row && <><dl className="ops-summary">{definitions[kind].fields.map(f => <div key={f.key}><dt>{f.label}</dt><dd>{String((row as unknown as Record<string, unknown>)[f.lookup ? f.key.replace('_id', '_name') : f.key] || '-')}</dd></div>)}</dl>
      {kind === 'targets' && <dl className="ops-summary"><div><dt>Achieved</dt><dd>{row.achieved ?? 0}</dd></div><div><dt>Progress</dt><dd>{row.progress_percent ?? 0}%</dd></div><div><dt>Policy measure basis</dt><dd>Original-bound policies still bound, by binding date; premium includes levies.</dd></div></dl>}
      {kind === 'campaigns' && <dl className="ops-summary"><div><dt>Leads</dt><dd>{row.lead_count ?? 0}</dd></div><div><dt>Qualified</dt><dd>{row.qualified_count ?? 0}</dd></div><div><dt>Lost</dt><dd>{row.lost_count ?? 0}</dd></div><div><dt>Quotations</dt><dd>{row.quotation_count ?? 0}</dd></div><div><dt>Bound policies</dt><dd>{row.policy_count ?? 0}</dd></div></dl>}
      {kind === 'payouts' && <><dl className="ops-summary"><div><dt>Currency</dt><dd>{row.currency}</dd></div><div><dt>Recorded commission</dt><dd>{row.gross_commission}</dd></div><div><dt>Agency retained</dt><dd>{row.retained_amount}</dd></div><div><dt>External settlement</dt><dd>{row.settlement_reference || 'Not settled'}</dd></div><div><dt>Settlement date</dt><dd>{row.settled_on || '-'}</dd></div></dl><Grid headers={['Beneficiary', 'Share (%)', 'Gross', 'Withheld', 'Net']}>{row.splits?.map(s => <tr key={s.agent_id}><td>{s.name}</td><td>{s.percent}</td><td>{s.gross}</td><td>{s.withheld}</td><td>{s.net}</td></tr>)}</Grid></>}
      {kind === 'leads' && <><div className="ops-toolbar"><h2 className="text-sm font-semibold">Follow-ups</h2>{manage && <button className="hz-button hz-button-secondary" onClick={() => setAddingFollowUp(true)}><Plus size={14} />Add follow-up</button>}</div><QueryState query={followups} />{followups.data && <><ListRows kind="followups" rows={followups.data.results} /><Pager page={page} count={followups.data.count} size={25} change={setPage} /></>}</>}
    </>}
    {editing && row && <SalesForm kind={kind} row={row} close={() => setEditing(false)} done={() => setEditing(false)} />}
    {addingFollowUp && row && <SalesForm kind="followups" lead={row} close={() => setAddingFollowUp(false)} done={() => setAddingFollowUp(false)} />}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

interface Preview { id: string; etag: string; rows: { row: number; values: Record<string, string> }[]; errors: { row: number; message: string }[] }
function ImportLeads({ close }: { close: () => void }) {
  const command = useOperationsCommand();
  const [preview, setPreview] = useState<Preview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [localError, setLocalError] = useState('');
  const [reading, setReading] = useState(false);
  const [imported, setImported] = useState<number | null>(null);
  const download = async () => {
    setReading(true); setLocalError('');
    try {
      const result = (await api.request<{ filename: string; content: string }>('/sales/imports/template')).data;
      const url = URL.createObjectURL(new Blob([Uint8Array.from(atob(result.content), c => c.charCodeAt(0))], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a'); anchor.href = url; anchor.download = result.filename; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch { setLocalError('The template could not be downloaded. Try again.'); } finally { setReading(false); }
  };
  const inspect = async () => {
    if (!file) return;
    setReading(true); setLocalError('');
    try {
      if (file.size > 2_000_000 || !file.name.toLowerCase().endsWith('.xlsx')) throw new Error('Select an .xlsx file under 2 MB.');
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
      const result = await command.run<Preview>('/sales/imports/preview', { content: btoa(binary) });
      if (result) setPreview(result);
    } catch (error) { setLocalError(error instanceof Error ? error.message : 'Could not read workbook.'); } finally { setReading(false); }
  };
  const busy = command.pending || reading;
  return <DialogFrame titleId="lead-import-title" title="Import leads" size="xl" dismissOnBackdrop={false} onClose={() => { if (!busy) close(); }} footer={<><button className="hz-button hz-button-secondary" disabled={busy} onClick={close}>Close</button>{imported === null && <button className="hz-button hz-button-primary" disabled={busy || !preview || preview.errors.length > 0} onClick={async () => { if (!preview) return; const result = await command.run<{ count: number }>(`/sales/imports/${preview.id}/commit`, {}, 'POST', preview.etag); if (result) setImported(result.count); }}><Upload size={14} />Import {preview?.rows.length ?? 0} leads</button>}</>}>
    {command.error != null && <ApiErrorAlert error={command.error} />}{localError && <p role="alert">{localError}</p>}
    {imported !== null ? <p role="status">{imported} leads imported.</p> : <><div className="ops-toolbar"><button className="hz-button hz-button-secondary" disabled={busy} onClick={() => void download()}><Download size={14} />Excel template</button><input type="file" aria-label="Excel workbook" accept=".xlsx" disabled={busy} onChange={e => { setFile(e.target.files?.[0] ?? null); setPreview(null); }} /><button className="hz-button hz-button-secondary" disabled={busy || !file} onClick={() => void inspect()}>Validate</button></div><p className="text-sm mb-3">Maximum 200 leads, 2 MB. Source references must be unique. Preview expires after one hour.</p>
    {preview && <>{preview.errors.length > 0 && <Grid headers={['Row', 'Error']}>{preview.errors.map((e, i) => <tr key={i}><td>{e.row}</td><td>{e.message}</td></tr>)}</Grid>}<Grid headers={['Row', 'Reference', 'Name', 'Email', 'Phone', 'Source']} empty={!preview.rows.length}>{preview.rows.map(r => <tr key={r.row}><td>{r.row}</td><td>{r.values.reference}</td><td>{r.values.name}</td><td>{r.values.email}</td><td>{r.values.phone}</td><td>{r.values.source}</td></tr>)}</Grid></>}
    </>}
  </DialogFrame>;
}
