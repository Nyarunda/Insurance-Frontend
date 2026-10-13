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

export function WorkflowDefinitionsPage() {
  const query = useOperationsQuery<Result>('/workflows/standard-definitions');
  const data = query.isError ? undefined : query.data;

  return <Surface title="Workflow definitions" subtitle="Standard approval workflows and their readiness" actions={<Refresh query={query} />}>
    <QueryState query={query} />
    {data && <>
      <Grid headers={['Workflow', 'Resource', 'Status', 'Version', 'Checker role', 'Staffing', 'Gaps']}
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
          <td className="text-[13px]">{r.gaps.length ? r.gaps.map((g, i) => <span key={i} className="block text-[var(--hz-text-muted)]">{g}</span>) : '—'}</td>
        </tr>)}
      </Grid>
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
