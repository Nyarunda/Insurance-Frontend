import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { Check, ClipboardCheck, Pencil, Plus, Save, Send, ShieldOff, Undo2, X } from 'lucide-react';
import { useMe, usePermission } from '../../lib/auth/me';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { AgentPicker, AgentReference } from '../agents/AgentPicker';
import { PageResult, useOperationsCommand, useOperationsQuery } from '../operations/data';
import { ActionDialog, ActionSpec, Grid, Pager, pretty, QueryState, reason, Refresh, SearchBox, Status, Surface, Tabs } from '../operations/ui';

interface WorkflowBlock { instance_id: string; status: string; stage_label: string | null }
interface Agent extends AgentReference {
  parent: AgentReference | null; email: string; phone: string; licence_no: string; status: string;
  reason: string; contributors: string[]; approved_at: string | null; created_at: string;
  updated_at: string; etag: string; workflow?: WorkflowBlock | null;
}
const statuses = ['DRAFT', 'PENDING', 'ACTIVE', 'REJECTED', 'SUSPENDED'];
const kinds = ['AGENT', 'SUB_AGENT', 'AFFINITY'];
const MANAGE = 'intermediaries.agent.manage';
const profileFields = (agent?: Agent) => [
  { name: 'name', label: 'Name', value: agent?.name, required: true },
  { name: 'email', label: 'Email', value: agent?.email, type: 'email' as const, maxLength: 254 },
  { name: 'phone', label: 'Phone', value: agent?.phone, maxLength: 32 },
  { name: 'licence_no', label: 'Licence number', value: agent?.licence_no, maxLength: 64 },
];

export function AgentsPage() {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Number(params.get('page')) || 1);
  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const kind = params.get('kind') ?? '';
  const query = useOperationsQuery<PageResult<Agent>>(`/agents?${new URLSearchParams({ q, status, kind, page: String(page), page_size: '25' })}`);
  const canManage = usePermission(MANAGE);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const filter = (key: string, value: string) => setParams(p => { const n = new URLSearchParams(p); n.set(key, value); n.delete('page'); return n; });
  return <Surface title="Agents & partners" actions={<><Refresh query={query} />{canManage && <button className="hz-button hz-button-primary" onClick={() => setAdding(true)}><Plus size={15} />New agent</button>}</>}>
    <div className="ops-toolbar"><SearchBox value={q} label="Search name or code" onSearch={v => filter('q', v)} /><select aria-label="Agent status" className="hz-field p-2" value={status} onChange={e => filter('status', e.target.value)}><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{pretty(s)}</option>)}</select><select aria-label="Agent type" className="hz-field p-2" value={kind} onChange={e => filter('kind', e.target.value)}><option value="">All types</option>{kinds.map(k => <option key={k} value={k}>{pretty(k)}</option>)}</select></div>
    <QueryState query={query} />{query.data && <><Grid headers={['Code', 'Name', 'Type', 'Parent agent', 'Email', 'Phone', 'Status']} empty={!query.data.results.length}>{query.data.results.map(a => <tr key={a.id}><td>{a.code}</td><td><Link className="ops-link" to={`/agents/list/${a.id}`}>{a.name}</Link></td><td>{pretty(a.kind)}</td><td>{a.parent?.name ?? '-'}</td><td>{a.email || '-'}</td><td>{a.phone || '-'}</td><td><Status value={a.status} /></td></tr>)}</Grid><Pager page={page} count={query.data.count} size={25} change={p => setParams(previous => { const n = new URLSearchParams(previous); n.set('page', String(p)); return n; })} /></>}
    {adding && <NewAgent close={() => setAdding(false)} done={a => navigate(`/agents/list/${a.id}`)} />}
  </Surface>;
}

function NewAgent({ close, done, initialParent }: { close: () => void; done: (a: Agent) => void; initialParent?: AgentReference }) {
  const command = useOperationsCommand();
  const [values, setValues] = useState({ name: '', kind: initialParent ? 'SUB_AGENT' : 'AGENT', email: '', phone: '', licence_no: '' });
  const [parent, setParent] = useState<AgentReference | null>(initialParent ?? null);
  return <DialogFrame titleId="new-agent-title" title="New agent" onClose={() => { if (!command.pending) close(); }} dismissOnBackdrop={false} size="lg" footer={<><button className="hz-button hz-button-secondary" disabled={command.pending} onClick={close}>Cancel</button><button className="hz-button hz-button-primary" type="submit" form="new-agent" disabled={command.pending || (values.kind === 'SUB_AGENT' && !parent)}><Save size={14} />{command.pending ? 'Saving...' : 'Create draft'}</button></>}>
    {command.error != null && <ApiErrorAlert error={command.error} />}
    <form id="new-agent" className="ops-form" onSubmit={async e => { e.preventDefault(); const result = await command.run<Agent>('/agents', { ...values, parent_id: values.kind === 'SUB_AGENT' ? parent?.id : null }); if (result) done(result); }}><fieldset disabled={command.pending}>
      <label>Type *<select className="hz-field" value={values.kind} onChange={e => { setValues(v => ({ ...v, kind: e.target.value })); setParent(null); }}>{kinds.map(k => <option key={k} value={k}>{pretty(k)}</option>)}</select></label>
      {values.kind === 'SUB_AGENT' && <AgentPicker label="Parent agent" value={parent} onChange={setParent} register />}
      {profileFields().map(f => <label key={f.name}>{f.label}{f.required ? ' *' : ''}<input className="hz-field" type={f.type ?? 'text'} required={f.required} maxLength={f.maxLength ?? 255} value={values[f.name as keyof typeof values]} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} /></label>)}
    </fieldset></form>
  </DialogFrame>;
}

export function AgentWorkspace() {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') === 'activity' ? 'activity' : params.get('tab') === 'sub-agents' ? 'sub-agents' : 'overview';
  const path = `/agents/${agentId}`;
  const query = useOperationsQuery<Agent>(path);
  const a = query.data;
  const manage = usePermission(MANAGE);
  const approve = usePermission('intermediaries.agent.approve');
  const actor = useMe().data?.user.id;
  const [addingChild, setAddingChild] = useState(false);
  const [action, setAction] = useState<ActionSpec | null>(null);
  const [notice, setNotice] = useState('');
  const activity = useOperationsQuery<{ results: { id: string; action: string; at: string; reason: string }[] }>(`${path}/activity`, tab === 'activity');
  const childPage = Math.max(1, Number(params.get('page')) || 1);
  const children = useOperationsQuery<PageResult<Agent>>(`/agents?parent_id=${agentId}&page=${childPage}&page_size=25`, tab === 'sub-agents' && a?.kind === 'AGENT');
  const start = (verb: string, title: string) => setAction({ title, path: `${path}/${verb}`, fields: [reason], ifMatch: a!.etag, confirm: title });
  return <Surface title={a?.name ?? 'Agent'} subtitle={a && <span>{a.code} | {pretty(a.kind)} <Status value={a.status} /></span>} back={() => navigate('/agents/list')} actions={<><Refresh query={query} />{a && <>
    {manage && ['DRAFT', 'REJECTED'].includes(a.status) && <button className="hz-button hz-button-secondary" onClick={() => setAction({ title: 'Edit agent', path, method: 'PATCH', ifMatch: a.etag, fields: profileFields(a) })}><Pencil size={14} />Edit</button>}
    {manage && ['DRAFT', 'REJECTED', 'SUSPENDED'].includes(a.status) && <button className="hz-button hz-button-primary" onClick={() => start('submit', 'Submit for approval')}><Send size={14} />Submit for approval</button>}
    {manage && a.status === 'PENDING' && <button className="hz-button hz-button-secondary" onClick={() => start('withdraw', 'Withdraw submission')}><Undo2 size={14} />Withdraw</button>}
    {a.status === 'PENDING' && a.workflow?.instance_id && <button className="hz-button hz-button-secondary" onClick={() => navigate(`/my-work/list/${encodeURIComponent(a.workflow!.instance_id)}`)}><ClipboardCheck size={14} />Open approval</button>}
    {approve && a.status === 'PENDING' && !a.workflow?.instance_id && !a.contributors.includes(actor ?? '') && <><button className="hz-button hz-button-primary" onClick={() => start('approve', 'Approve agent')}><Check size={14} />Approve</button><button className="hz-button hz-button-secondary" onClick={() => start('reject', 'Reject agent')}><X size={14} />Reject</button></>}
    {manage && a.status === 'ACTIVE' && <button className="hz-button hz-button-secondary" onClick={() => start('suspend', 'Suspend agent')}><ShieldOff size={14} />Suspend</button>}
    {manage && a.status === 'ACTIVE' && a.kind === 'AGENT' && <button className="hz-button hz-button-primary" onClick={() => setAddingChild(true)}><Plus size={14} />New sub-agent</button>}
  </>}</>}>
    <QueryState query={query} />{notice && <div className="ops-notice" role="status">{notice}</div>}
    <Tabs value={tab} options={[{ value: 'overview', label: 'Overview' }, ...(a?.kind === 'AGENT' ? [{ value: 'sub-agents', label: 'Sub-agents' }] : []), { value: 'activity', label: 'Activity' }]} change={v => setParams({ tab: v })} />
    {tab === 'overview' && a && <dl className="ops-summary">
      <div><dt>Email</dt><dd>{a.email || '-'}</dd></div><div><dt>Phone</dt><dd>{a.phone || '-'}</dd></div><div><dt>Licence number</dt><dd>{a.licence_no || '-'}</dd></div>
      <div><dt>Parent agent</dt><dd>{a.parent ? <Link className="ops-link" to={`/agents/list/${a.parent.id}`}>{a.parent.name}</Link> : '-'}</dd></div>
      <div><dt>Approved</dt><dd>{a.approved_at ? new Date(a.approved_at).toLocaleString() : '-'}</dd></div><div><dt>Last updated</dt><dd>{new Date(a.updated_at).toLocaleString()}</dd></div>
      <div><dt>Latest reason</dt><dd>{a.reason || '-'}</dd></div>
      {a.workflow && <div><dt>Approval</dt><dd><Link className="ops-link" to={`/my-work/list/${encodeURIComponent(a.workflow.instance_id)}`}>{pretty(a.workflow.status)}{a.workflow.stage_label ? ` · ${a.workflow.stage_label}` : ''}</Link></dd></div>}
    </dl>}
    {tab === 'sub-agents' && a?.kind === 'AGENT' && <><QueryState query={children} />{children.data && <><Grid headers={['Code', 'Name', 'Status']} empty={!children.data.results.length}>{children.data.results.map(child => <tr key={child.id}><td>{child.code}</td><td><Link className="ops-link" to={`/agents/list/${child.id}`}>{child.name}</Link></td><td><Status value={child.status} /></td></tr>)}</Grid><Pager page={childPage} count={children.data.count} size={25} change={p => setParams({ tab, page: String(p) })} /></>}</>}
    {tab === 'activity' && <><QueryState query={activity} />{activity.data && <><p className="text-sm mb-2">Latest 100 events</p><Grid headers={['Time', 'Action', 'Reason']} empty={!activity.data.results.length}>{activity.data.results.map(event => <tr key={event.id}><td>{new Date(event.at).toLocaleString()}</td><td>{pretty(event.action)}</td><td>{event.reason || '-'}</td></tr>)}</Grid></>}</>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => { setAction(null); setNotice('Agent saved.'); }} />}
    {addingChild && a && <NewAgent initialParent={a} close={() => setAddingChild(false)} done={child => navigate(`/agents/list/${child.id}`)} />}
  </Surface>;
}
