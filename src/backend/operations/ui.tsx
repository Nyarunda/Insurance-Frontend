import React, { useEffect, useId, useState } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, Save, Search } from 'lucide-react';
import { useLocation } from 'react-router';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { HorizonLoader, HorizonPage, HorizonPageTitle, StatusBadge } from '../../components/horizon';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { useOperationsCommand, useOperationsScope } from './data';
import './operations.css';

export const pretty = (text: string) => text.replaceAll('_', ' ').toLowerCase().replace(/^./, c => c.toUpperCase());
export const Status = ({ value }: { value: string }) => <StatusBadge square label={pretty(value)} tone={['ACTIVE', 'APPROVED', 'ACCEPTED'].includes(value) ? 'success' : value === 'PENDING' ? 'warning' : 'neutral'} />;
export function OperationsBoundary({ children }: { children: React.ReactNode }) {
  const scope = useOperationsScope();
  const location = useLocation();
  return <React.Fragment key={`${scope}:${location.pathname}`}>{children}</React.Fragment>;
}
export function Surface({ title, children, actions, back, subtitle }: { title: string; children: React.ReactNode; actions?: React.ReactNode; back?: () => void; subtitle?: React.ReactNode }) {
  return <HorizonPage id="operations"><div className="ops" data-testid="operations-workspace"><HorizonPageTitle title={title} subtitle={subtitle} actions={actions} onBack={back} /><div className="ops-content">{children}</div></div></HorizonPage>;
}
export function Refresh({ query }: { query: { isFetching: boolean; refetch: () => unknown } }) {
  return <button data-testid="operations-refresh" className="hz-icon-button" title="Refresh" aria-label="Refresh" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={16} className={query.isFetching ? 'animate-spin' : ''} /></button>;
}
export function QueryState({ query }: { query: { isPending: boolean; isError: boolean; error: unknown } }) {
  return <>{query.isPending && <HorizonLoader tip="Loading..." />}{query.isError && <ApiErrorAlert error={query.error} />}</>;
}
export function Grid({ headers, children, empty }: { headers: string[]; children: React.ReactNode; empty?: boolean }) {
  return <div className="ops-table" data-testid="operations-table"><table className="hz-grid"><thead><tr>{headers.map((h, i) => <th key={i} scope="col">{h}</th>)}</tr></thead><tbody>{empty ? <tr><td colSpan={headers.length}>No records found.</td></tr> : children}</tbody></table></div>;
}
export function Pager({ page, count, size, change }: { page: number; count: number; size: number; change: (page: number) => void }) {
  return <div className="ops-pager"><span>{count} records</span><button className="hz-icon-button" title="Previous page" disabled={page <= 1} onClick={() => change(page - 1)}><ChevronLeft size={16} /></button><span>Page {page} of {Math.max(1, Math.ceil(count / size))}</span><button className="hz-icon-button" title="Next page" disabled={page * size >= count} onClick={() => change(page + 1)}><ChevronRight size={16} /></button></div>;
}
export function SearchBox({ value, onSearch, label = 'Search' }: { value: string; onSearch: (value: string) => void; label?: string }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => { setDraft(value); }, [value]);
  return <form className="ops-search" data-testid="operations-search" onSubmit={e => { e.preventDefault(); onSearch(draft.trim()); }}><input aria-label={label} className="hz-field" value={draft} placeholder={label} maxLength={254} onChange={e => setDraft(e.target.value)} /><button className="hz-icon-button" title={label}><Search size={16} /></button></form>;
}
export function Tabs({ value, options, change }: { value: string; options: { value: string; label: string }[]; change: (value: string) => void }) {
  return <div className="ops-tabs" role="tablist">{options.map(o => <button key={o.value} data-testid={`operations-tab-${o.value}`} role="tab" aria-selected={value === o.value} onClick={() => change(o.value)}>{o.label}</button>)}</div>;
}
export interface FormField { name: string; label: string; value?: string; required?: boolean; type?: 'text' | 'email' | 'date' | 'number' | 'textarea' | 'checkbox'; maxLength?: number; options?: { value: string; label: string }[] }
export interface ActionSpec { title: string; path: string; fields: FormField[]; method?: 'POST' | 'PATCH'; ifMatch?: string; body?: object; confirm?: string; message?: string; transform?: (data: Record<string, string>) => object }
export function ActionDialog({ spec, close, done }: { spec: ActionSpec; close: () => void; done: (data: unknown) => void }) {
  const command = useOperationsCommand();
  const id = useId();
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(spec.fields.map(f => [f.name, f.value ?? ''])));
  return <DialogFrame titleId={`${id}-title`} title={spec.title} onClose={() => { if (!command.pending) close(); }} dismissOnBackdrop={false} size="lg" footer={<><button data-testid="operations-action-cancel" className="hz-button hz-button-secondary" disabled={command.pending} onClick={close}>Cancel</button><button data-testid="operations-action-submit" className="hz-button hz-button-primary" form={id} type="submit" disabled={command.pending}><Save size={14} />{command.pending ? 'Saving...' : spec.confirm ?? 'Save'}</button></>}>
    {command.error != null && <ApiErrorAlert error={command.error} />}
    {spec.message && <p className="mb-3 text-sm">{spec.message}</p>}
    <form id={id} className="ops-form" onSubmit={async e => { e.preventDefault(); const result = await command.run(spec.path, { ...spec.body, ...(spec.transform ? spec.transform(values) : values) }, spec.method, spec.ifMatch); if (result !== undefined) done(result); }}>
      <fieldset disabled={command.pending}>{spec.fields.map(f => f.type === 'checkbox'
        ? <label key={f.name} htmlFor={`${id}-${f.name}`} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}><input id={`${id}-${f.name}`} type="checkbox" checked={values[f.name] === 'true'} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.checked ? 'true' : '' }))} />{f.label}</label>
        : <label key={f.name} htmlFor={`${id}-${f.name}`}>{f.label}{f.required && ' *'}{f.options ? <select id={`${id}-${f.name}`} className="hz-field" required={f.required} value={values[f.name]} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))}><option value="">Select...</option>{f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select> : f.type === 'textarea' ? <textarea id={`${id}-${f.name}`} className="hz-field" required={f.required} maxLength={f.maxLength ?? 500} value={values[f.name]} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} /> : <input id={`${id}-${f.name}`} className="hz-field" type={f.type ?? 'text'} required={f.required} maxLength={f.maxLength ?? 255} value={values[f.name]} onChange={e => setValues(v => ({ ...v, [f.name]: e.target.value }))} />}</label>)}</fieldset>
    </form>
  </DialogFrame>;
}
export const reason: FormField = { name: 'reason', label: 'Reason', type: 'textarea', required: true };
