import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useOperationsQuery } from '../operations/data';
import { Grid, Pager, pretty, QueryState, Refresh, Surface, Tabs } from '../operations/ui';

interface EndorsementRow {
  id: string; endorsement_no: string; endorsement_type: string; status: string;
  effective_date: string; premium_delta: string; levy_delta: string; created_at: string;
  policy_id: string; policy_no: string; customer_id: string; customer_name: string;
}
interface Result { results: EndorsementRow[]; count: number; page: number; page_size: number }

const statuses = [
  { value: '', label: 'All' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'REFERRED', label: 'Referred' },
  { value: 'EFFECTIVE', label: 'Effective' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const statusTone = (s: string) => s === 'EFFECTIVE' ? 'success' : s === 'DECLINED' || s === 'CANCELLED' ? 'danger' : s === 'REFERRED' ? 'warning' : 'neutral';

export function EndorsementsListPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(q);
  const filters = new URLSearchParams();
  if (status) filters.set('status', status);
  if (q) filters.set('q', q);
  filters.set('page', String(page));
  const query = useOperationsQuery<Result>(`/endorsements?${filters}`);
  const data = query.isError ? undefined : query.data;
  const apply = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    next.set('page', '1');
    setParams(next);
  };

  return <Surface title="Endorsements" subtitle="Cross-policy endorsement register" actions={<Refresh query={query} />}>
    <Tabs value={status} options={statuses} change={v => apply({ status: v })} />
    <form className="ops-toolbar" onSubmit={e => { e.preventDefault(); apply({ q: search }); }}>
      <input className="hz-field p-2" placeholder="Search by endorsement or policy number" aria-label="Search endorsements"
        value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 260 }} />
      <button className="hz-button hz-button-primary">Search</button>
      {q && <button type="button" className="hz-button hz-button-secondary" onClick={() => { setSearch(''); apply({ q: '' }); }}>Clear</button>}
    </form>
    <QueryState query={query} />
    {data && <>
      <Grid headers={['Endorsement', 'Policy', 'Customer', 'Type', 'Effective', 'Status', 'Premium delta', 'Created']}
        empty={!data.results.length}>
        {data.results.map(r => <tr key={r.id}>
          <td><Link className="ops-link" to={`/policies/list/${r.policy_no}/endorsements/${r.id}`}>{r.endorsement_no}</Link></td>
          <td><Link className="ops-link" to={`/policies/list/${r.policy_no}`}>{r.policy_no}</Link></td>
          <td>{r.customer_name}</td>
          <td>{pretty(r.endorsement_type)}</td>
          <td className="tabular-nums">{r.effective_date}</td>
          <td><span className={`ops-badge ops-badge-${statusTone(r.status)}`}>{pretty(r.status)}</span></td>
          <td className="tabular-nums">{r.premium_delta}</td>
          <td className="tabular-nums">{r.created_at?.slice(0, 10)}</td>
        </tr>)}
      </Grid>
      <Pager page={data.page} count={data.count} size={data.page_size}
        change={p => setParams(prev => { const n = new URLSearchParams(prev); n.set('page', String(p)); return n; })} />
    </>}
  </Surface>;
}
