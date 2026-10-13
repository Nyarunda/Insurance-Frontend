import { useState } from 'react';
import { Link } from 'react-router';
import { useOperationsQuery, useOperationsCommand } from '../operations/data';
import { Grid, pretty, QueryState, Refresh, Surface, Tabs } from '../operations/ui';

interface NotificationRow {
  id: string; event: string; occurred_at: string;
  workflow_instance_id: string; definition_name: string;
  resource_type: string; resource_reference: string;
  reason_code: string | null; reason_label: string | null; reason_text: string | null;
  unread: boolean;
}
interface Result { results: NotificationRow[]; unread_count: number; seen_until: string | null }

const eventTone = (e: string) => e === 'approved' ? 'success' : e === 'rejected' ? 'danger' : 'warning';

const RESOURCE_PATH: Record<string, string> = {
  ENDORSEMENT: '/policies/list',
  PROPOSAL: '/proposals/list',
  RENEWAL: '/policies/list',
};

function resourceLink(row: NotificationRow) {
  const base = RESOURCE_PATH[row.resource_type];
  if (!base) return null;
  return `${base}/${row.resource_reference}`;
}

const tabs = [
  { value: '', label: 'All' },
  { value: 'unread', label: 'Unread' },
];

export function NotificationsCenterPage() {
  const [filter, setFilter] = useState('');
  const query = useOperationsQuery<Result>('/workflows/my-notifications?limit=50');
  const data = query.isError ? undefined : query.data;
  const cmd = useOperationsCommand();

  const filtered = data?.results.filter(r => filter === 'unread' ? r.unread : true);

  const handleMarkAllRead = async () => {
    if (!data?.results.length) return;
    const latest = data.results[0]?.occurred_at;
    if (!latest) return;
    await cmd.run('/workflows/my-notifications/seen', { until: latest });
  };

  return <Surface title="Notifications" subtitle="Approval outcomes for requests you submitted"
    actions={<>
      {(data?.unread_count ?? 0) > 0 && <button className="hz-button hz-button-secondary" onClick={handleMarkAllRead}
        disabled={cmd.pending}>Mark all read</button>}
      <Refresh query={query} />
    </>}>
    <Tabs value={filter} options={tabs} change={setFilter} />
    <QueryState query={query} />
    {data && <>
      <Grid headers={['', 'Outcome', 'Workflow', 'Reference', 'Reason', 'When']}
        empty={!filtered?.length}>
        {filtered?.map(r => <tr key={r.id} className={r.unread ? 'font-medium' : 'opacity-75'}>
          <td style={{ width: 8 }}>{r.unread && <span className="inline-block w-2 h-2 rounded-full bg-blue-500" title="Unread" />}</td>
          <td><span className={`ops-badge ops-badge-${eventTone(r.event)}`}>{pretty(r.event)}</span></td>
          <td>{r.definition_name}</td>
          <td>{resourceLink(r)
            ? <Link className="ops-link" to={resourceLink(r)!}>{r.resource_reference}</Link>
            : r.resource_reference}</td>
          <td className="text-[13px]">{r.reason_label ?? r.reason_code ?? '—'}{r.reason_text && <span className="block text-[var(--hz-text-muted)]">{r.reason_text}</span>}</td>
          <td className="tabular-nums">{r.occurred_at?.slice(0, 16).replace('T', ' ')}</td>
        </tr>)}
      </Grid>
    </>}
  </Surface>;
}
