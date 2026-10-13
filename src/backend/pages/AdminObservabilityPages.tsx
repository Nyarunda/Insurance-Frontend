import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { hasPermission, useMe } from '../../lib/auth/me';
import { ActionDialog, ActionSpec, Grid, Pager, QueryState, Refresh, SearchBox, Status, Surface } from '../operations/ui';
import { PageResult, useOperationsQuery } from '../operations/data';
import { DELEGATION_MANAGE } from '../permissions';

interface BranchRow {
  id: string; code: string; name: string; is_head_office: boolean; is_active: boolean; default_users: number;
}
interface RegionRow { id: string; code: string; name: string; is_active: boolean; branches: BranchRow[] }
interface HierarchyResult {
  summary: { regions: number; branches: number; active_branches: number; head_office: BranchRow | null };
  regions: RegionRow[]; unassigned_branches: BranchRow[]; read_only: boolean;
}

interface Delegation {
  id: string; delegator_user_id: string; delegator_email: string | null;
  delegate_user_id: string; delegate_email: string | null;
  definition_codes: string[]; max_amount: string | null; currency: string;
  branch_id: string | null; branch_name: string | null;
  effective_from: string; effective_to: string; reason: string; status: string;
  created_by: string; created_by_email: string | null; created_at: string;
  revoked_by: string | null; revoked_by_email: string | null; revoked_at: string | null;
}
interface DelegationOptions {
  members: { id: string; email: string }[];
  definitions: { code: string; name: string }[];
  branches: { id: string; code: string; name: string }[];
}

interface AuditEvent {
  id: string; timestamp: string; actor_id: string; actor_email: string | null;
  ip_address: string | null; correlation_id: string; action: string;
  resource_type: string; resource_id: string;
}
interface AuditResult extends PageResult<AuditEvent> { payloads_exposed: false }

export function BranchHierarchyPage() {
  const query = useOperationsQuery<HierarchyResult>('/admin/branch-hierarchy');
  const data = query.data;
  const rows = useMemo(() => {
    if (!data) return [] as { region: string; row: BranchRow }[];
    const grouped = data.regions.flatMap(region =>
      region.branches.map(row => ({ region: `${region.code} — ${region.name}`, row })));
    return [...grouped, ...data.unassigned_branches.map(row => ({ region: 'Unassigned', row }))];
  }, [data]);

  return <Surface title="Branch hierarchy" subtitle="Authoritative tenant regions and branches. Changes remain operator-controlled." actions={<Refresh query={query} />}>
    <QueryState query={query} />
    {data && <>
      <dl className="ops-summary">
        <div><dt>Regions</dt><dd>{data.summary.regions}</dd></div>
        <div><dt>Branches</dt><dd>{data.summary.branches}</dd></div>
        <div><dt>Active branches</dt><dd>{data.summary.active_branches}</dd></div>
        <div><dt>Head office</dt><dd>{data.summary.head_office ? `${data.summary.head_office.code} — ${data.summary.head_office.name}` : 'Not configured'}</dd></div>
      </dl>
      <Grid headers={['Region','Code','Branch','Head office','Status','Default users']} empty={!rows.length}>
        {rows.map(({ region, row }) => <tr key={row.id}>
          <td>{region}</td><td>{row.code}</td><td>{row.name}</td>
          <td>{row.is_head_office ? 'Yes' : 'No'}</td>
          <td>{row.is_active ? 'Active' : 'Inactive'}</td>
          <td>{row.default_users}</td>
        </tr>)}
      </Grid>
      <p className="ops-muted">This surface is read-only by design. Branch creation remains an operator-controlled organization setup action.</p>
    </>}
  </Surface>;
}

export function DelegationsPage() {
  const me = useMe().data;
  const canManage = hasPermission(me, DELEGATION_MANAGE);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [action, setAction] = useState<ActionSpec | null>(null);
  const query = useOperationsQuery<PageResult<Delegation>>(
    `/workflows/delegations?page=${page}&page_size=50${status ? `&status=${status}` : ''}`);
  const options = useOperationsQuery<DelegationOptions>('/workflows/delegations/options');

  const createSpec = (): ActionSpec => ({
    title: 'Create delegation', path: '/workflows/delegations', confirm: 'Create delegation',
    fields: [
      { name: 'delegator_user_id', label: 'Delegator', required: true,
        options: (options.data?.members ?? []).map(x => ({ value: x.id, label: x.email })) },
      { name: 'delegate_user_id', label: 'Delegate', required: true,
        options: (options.data?.members ?? []).map(x => ({ value: x.id, label: x.email })) },
      { name: 'definition_codes', label: 'Workflow definition codes (comma separated; blank = all delegable)', type: 'textarea' },
      { name: 'effective_from', label: 'Starts', type: 'datetime-local' },
      { name: 'effective_to', label: 'Ends', type: 'datetime-local', required: true },
      { name: 'branch_id', label: 'Branch limit (optional)',
        options: (options.data?.branches ?? []).map(x => ({ value: x.id, label: `${x.code} — ${x.name}` })) },
      { name: 'max_amount', label: 'Maximum amount (optional)', type: 'number' },
      { name: 'currency', label: 'Currency', value: 'KES', required: true },
      { name: 'reason', label: 'Reason', type: 'textarea', required: true },
    ],
    transform: values => ({
      delegator_user_id: values.delegator_user_id,
      delegate_user_id: values.delegate_user_id,
      definition_codes: values.definition_codes.trim()
        ? values.definition_codes.split(',').map(x => x.trim().toUpperCase()).filter(Boolean)
        : undefined,
      effective_from: values.effective_from || null,
      effective_to: values.effective_to,
      branch_id: values.branch_id || null,
      max_amount: values.max_amount || null,
      currency: values.currency.trim().toUpperCase(),
      reason: values.reason,
    }),
    message: 'The workflow engine enforces eligibility, scope, no chains, overlap, delegation period, authority and SoD.',
  });

  return <Surface title="Delegations" subtitle="Workflow delegation administration" actions={<>
    <Refresh query={query} />
    {canManage && <button className="hz-button hz-button-primary" disabled={!options.data}
      onClick={() => setAction(createSpec())}><Plus size={15} />New delegation</button>}
  </>}>
    <QueryState query={query} />
    <QueryState query={options} />
    <div className="ops-toolbar">
      <label>Status <select className="hz-field" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All</option><option value="ACTIVE">Active</option><option value="REVOKED">Revoked</option>
      </select></label>
    </div>
    {query.data && <>
      <Grid headers={['Delegator','Delegate','Workflows','Limit','Branch','Period','Status','']} empty={!query.data.results.length}>
        {query.data.results.map(row => <tr key={row.id}>
          <td>{row.delegator_email ?? row.delegator_user_id}</td>
          <td>{row.delegate_email ?? row.delegate_user_id}</td>
          <td>{row.definition_codes.join(', ')}</td>
          <td>{row.max_amount ? `${row.currency} ${row.max_amount}` : '—'}</td>
          <td>{row.branch_name ?? 'All covered branches'}</td>
          <td>{row.effective_from} → {row.effective_to}</td>
          <td><Status value={row.status} /></td>
          <td>{canManage && row.status === 'ACTIVE' &&
            <button className="hz-button hz-button-secondary" onClick={() => setAction({
              title: 'Revoke delegation', path: `/workflows/delegations/${row.id}/revoke`,
              confirm: 'Revoke', fields: [{ name: 'reason', label: 'Reason', type: 'textarea', required: true }],
            })}>Revoke</button>}</td>
        </tr>)}
      </Grid>
      <Pager page={query.data.page} count={query.data.count} size={query.data.page_size} change={setPage} />
    </>}
    {options.data && <details className="px-4 py-2"><summary>Delegable workflows</summary>
      <ul>{options.data.definitions.map(row => <li key={row.code}><code>{row.code}</code> — {row.name}</li>)}</ul>
    </details>}
    {action && <ActionDialog spec={action} close={() => setAction(null)} done={() => setAction(null)} />}
  </Surface>;
}

export function AuditLogsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const query = useOperationsQuery<AuditResult>(
    `/admin/audit-logs?page=${page}&page_size=50${q ? `&q=${encodeURIComponent(q)}` : ''}`);
  return <Surface title="Audit logs" subtitle="Append-only tenant audit event metadata" actions={<Refresh query={query} />}>
    <SearchBox value={q} onSearch={value => { setQ(value); setPage(1); }} label="Search action, resource or correlation ID" />
    <QueryState query={query} />
    {query.data && <>
      <Grid headers={['Time','Actor','Action','Resource','Correlation ID','IP']} empty={!query.data.results.length}>
        {query.data.results.map(row => <tr key={row.id}>
          <td>{row.timestamp}</td>
          <td>{row.actor_email ?? row.actor_id}</td>
          <td>{row.action}</td>
          <td>{row.resource_type} · <code>{row.resource_id}</code></td>
          <td><code>{row.correlation_id || '—'}</code></td>
          <td>{row.ip_address ?? '—'}</td>
        </tr>)}
      </Grid>
      <Pager page={query.data.page} count={query.data.count} size={query.data.page_size} change={setPage} />
      <p className="ops-muted">Audit before/after payloads are intentionally not exposed by this viewer.</p>
    </>}
  </Surface>;
}
