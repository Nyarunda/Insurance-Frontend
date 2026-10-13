import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useOperationsQuery } from '../operations/data';
import { Grid, pretty, QueryState, Refresh, Surface, Tabs } from '../operations/ui';

interface ProductRow {
  id: string; code: string; name: string; description: string;
  insurer: { id: string; code: string; name: string };
  insurance_class: { id: string; code: string; line: string };
  currency: string; status: string; row_version: number;
}
interface Result { results: ProductRow[] }

const statuses = [
  { value: '', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'DRAFT', label: 'Draft' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const statusTone = (s: string) => s === 'ACTIVE' ? 'success' : s === 'DRAFT' ? 'warning' : 'neutral';

export function ProductsCatalogPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? '';
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  const filters = new URLSearchParams();
  if (status) filters.set('status', status);
  if (q) filters.set('q', q);
  const query = useOperationsQuery<Result>(`/products?${filters}`);
  const data = query.isError ? undefined : query.data;
  const apply = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) { if (v) next.set(k, v); else next.delete(k); }
    setParams(next);
  };

  return <Surface title="Products" subtitle="Insurance product catalog" actions={<Refresh query={query} />}>
    <Tabs value={status} options={statuses} change={v => apply({ status: v })} />
    <form className="ops-toolbar" onSubmit={e => { e.preventDefault(); apply({ q: search }); }}>
      <input className="hz-field p-2" placeholder="Search by code or name" aria-label="Search products"
        value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth: 220 }} />
      <button className="hz-button hz-button-primary">Search</button>
      {q && <button type="button" className="hz-button hz-button-secondary" onClick={() => { setSearch(''); apply({ q: '' }); }}>Clear</button>}
    </form>
    <QueryState query={query} />
    {data && <>
      <Grid headers={['Code', 'Name', 'Insurer', 'Class', 'Currency', 'Status']}
        empty={!data.results.length}>
        {data.results.map(r => <tr key={r.id}>
          <td className="font-medium">{r.code}</td>
          <td>{r.name}</td>
          <td>{r.insurer.name}</td>
          <td>{r.insurance_class.line} ({r.insurance_class.code})</td>
          <td>{r.currency}</td>
          <td><span className={`ops-badge ops-badge-${statusTone(r.status)}`}>{pretty(r.status)}</span></td>
        </tr>)}
      </Grid>
    </>}
  </Surface>;
}
