import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { PageResult, useOperationsQuery } from '../operations/data';
import { Pager, QueryState } from '../operations/ui';

export interface AgentReference { id: string; code: string; name: string; kind: string }

export function AgentPicker({ label, value, onChange, parentId, register = false }: {
  label: string; value: AgentReference | null; onChange: (value: AgentReference | null) => void;
  parentId?: string; register?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const params = new URLSearchParams({ q: search, page: String(page), page_size: '10',
    ...(parentId ? { parent_id: parentId } : {}), ...(register ? { status: 'ACTIVE', kind: 'AGENT' } : {}) });
  const query = useOperationsQuery<PageResult<AgentReference>>(`/agents${register ? '' : '/options'}?${params}`, open);
  return <div className="agent-picker">
    <span className="block mb-1 text-sm font-medium">{label}</span>
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm">{value ? `${value.name} (${value.code})` : 'Not assigned'}</span>
      <button type="button" className="hz-button hz-button-secondary" onClick={() => setOpen(!open)}><Search size={14} />{open ? 'Close search' : `Choose ${label.toLowerCase()}`}</button>
      {value && <button type="button" className="hz-icon-button" aria-label={`Clear ${label.toLowerCase()}`} title={`Clear ${label.toLowerCase()}`} onClick={() => onChange(null)}><X size={14} /></button>}
    </div>
    {open && <div className="mt-2">
      <div className="flex gap-2"><input className="hz-field min-w-0 flex-1" aria-label={`Search ${label.toLowerCase()}`} maxLength={100} value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); setSearch(draft.trim()); setPage(1); } }} /><button type="button" className="hz-icon-button" title={`Find ${label.toLowerCase()}`} onClick={() => { setSearch(draft.trim()); setPage(1); }}><Search size={15} /></button></div>
      <QueryState query={query} />
      {query.data && <><ul className="divide-y">{query.data.results.map(row => <li key={row.id}><button type="button" className="w-full text-left py-2 text-sm" onClick={() => { onChange(row); setOpen(false); }}>{row.name} <span className="text-[var(--hz-text-muted)]">{row.code}</span></button></li>)}</ul>{!query.data.results.length && <p className="text-sm py-2">No active agents found.</p>}<Pager page={page} count={query.data.count} size={10} change={setPage} /></>}
    </div>}
  </div>;
}
