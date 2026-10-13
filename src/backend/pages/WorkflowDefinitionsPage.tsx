import { useOperationsQuery } from '../operations/data';
import { Grid, pretty, QueryState, Refresh, Surface } from '../operations/ui';

interface StageInfo { stage_no: number; name: string; branches: { branch_name: string; eligible_holders: number }[] }
interface DefinitionRow {
  definition_code: string; name: string; resource_type: string;
  installed: boolean; governed: boolean;
  active_version_no: number | null; latest_version_no: number | null;
  checker_role: string; checker_role_id: string;
  ready: boolean; eligible_holders: number;
  gaps: string[]; stages: StageInfo[];
}
interface Result { results: DefinitionRow[] }
interface PendingAssignee {
  kind: 'USER' | 'ROLE_POOL';
  user_id: string | null; email: string | null;
  role_id: string | null; role_name: string | null;
  eligible_users: { user_id: string; email: string | null }[];
}
interface PendingRow {
  assignment_id: string; workflow_instance_id: string; definition_code: string;
  resource_type: string; resource_reference: string; stage: string; stage_label: string;
  slot_no: number; branch_name: string | null; assigned_to: PendingAssignee; assigned_at: string;
}
interface PendingMonitor {
  pending_instances: number; pending_slots: number;
  by_definition: { definition_code: string; pending_instances: number; pending_slots: number }[];
  results: PendingRow[];
}

export function WorkflowDefinitionsPage() {
  const query = useOperationsQuery<Result>('/workflows/standard-definitions');
  const monitor = useOperationsQuery<PendingMonitor>('/workflows/pending-monitor');
  const data = query.isError ? undefined : query.data;
  const pendingFor = (code: string) => monitor.data?.by_definition.find(row => row.definition_code === code);

  const combined = { isFetching: query.isFetching || monitor.isFetching, refetch: () => { query.refetch(); monitor.refetch(); } };

  return <Surface title="Workflow definitions" subtitle="Standard approval workflows, readiness and pending decisions" actions={<Refresh query={combined} />}>
    <QueryState query={query} />
    <QueryState query={monitor} />
    {monitor.data && <dl className="ops-summary" data-testid="workflow-pending-summary">
      <div><dt>Pending workflows</dt><dd>{monitor.data.pending_instances}</dd></div>
      <div><dt>Pending approval slots</dt><dd>{monitor.data.pending_slots}</dd></div>
    </dl>}
    {data && <>
      <Grid headers={['Workflow', 'Resource', 'Status', 'Version', 'Checker role', 'Staffing', 'Pending', 'Gaps']}
        empty={!data.results.length}>
        {data.results.map(r => <tr key={r.definition_code}>
          <td className="font-medium">{r.name}</td>
          <td>{pretty(r.resource_type)}</td>
          <td>{r.governed
            ? <span className="ops-badge ops-badge-success">Active</span>
            : r.installed
              ? <span className="ops-badge ops-badge-warning">Installed</span>
              : <span className="ops-badge ops-badge-neutral">Not installed</span>}
          </td>
          <td className="tabular-nums">{r.active_version_no ? `v${r.active_version_no}` : '—'}{r.latest_version_no && r.latest_version_no !== r.active_version_no ? ` (latest: v${r.latest_version_no})` : ''}</td>
          <td>{r.checker_role}</td>
          <td>{r.ready
            ? <span className="ops-badge ops-badge-success">{r.eligible_holders} holder{r.eligible_holders !== 1 ? 's' : ''}</span>
            : <span className="ops-badge ops-badge-danger">Unstaffed</span>}
          </td>
          <td>{(() => { const p = pendingFor(r.definition_code); return p ? `${p.pending_instances} workflow(s) / ${p.pending_slots} slot(s)` : '0'; })()}</td>
          <td className="text-[13px]">{r.gaps.length ? r.gaps.map((g, i) => <span key={i} className="block text-[var(--hz-text-muted)]">{g}</span>) : '—'}</td>
        </tr>)}
      </Grid>
      {monitor.data && <section className="px-4 py-2">
        <h3 className="ops-subsection-title">Pending approvals</h3>
        <Grid headers={['Workflow', 'Reference', 'Stage', 'Branch', 'Assigned to', 'Waiting since']} empty={!monitor.data.results.length}>
          {monitor.data.results.map(row => {
            const assigned = row.assigned_to.kind === 'USER'
              ? (row.assigned_to.email ?? row.assigned_to.user_id ?? 'Named user')
              : `${row.assigned_to.role_name ?? 'Role pool'}${row.assigned_to.eligible_users.length
                  ? ` — ${row.assigned_to.eligible_users.length} eligible: ${row.assigned_to.eligible_users.map(user => user.email ?? user.user_id).join(', ')}`
                  : ' — no eligible holders'}`;
            return <tr key={row.assignment_id}>
              <td>{row.definition_code}</td>
              <td>{row.resource_reference}</td>
              <td>{row.stage_label}</td>
              <td>{row.branch_name ?? 'Tenant-wide'}</td>
              <td>{assigned}</td>
              <td>{row.assigned_at}</td>
            </tr>;
          })}
        </Grid>
        <p className="ops-muted mt-2">This page is read-only. Approve and Reject are available only on the workflow task/instance action surface.</p>
      </section>}
      {data.results.some(r => r.stages.length > 0) && <details className="px-4 py-2">
        <summary className="cursor-pointer text-sm font-medium">Stage details</summary>
        {data.results.filter(r => r.stages.length > 0).map(r => <div key={r.definition_code} className="mt-3">
          <h4 className="text-sm font-medium mb-1">{r.name}</h4>
          <Grid headers={['Stage', 'Name', 'Branch', 'Eligible holders']}>
            {r.stages.flatMap(s => s.branches.map((b, bi) => <tr key={`${s.stage_no}-${bi}`}>
              {bi === 0 && <td rowSpan={s.branches.length} className="tabular-nums">{s.stage_no}</td>}
              {bi === 0 && <td rowSpan={s.branches.length}>{s.name}</td>}
              <td>{b.branch_name}</td>
              <td className="tabular-nums">{b.eligible_holders}</td>
            </tr>))}
          </Grid>
        </div>)}
      </details>}
    </>}
  </Surface>;
}
