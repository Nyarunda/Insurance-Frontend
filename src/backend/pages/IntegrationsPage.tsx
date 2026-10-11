import React, { useState } from 'react';
import { Circle, Pencil, Plus, RotateCcw, Save } from 'lucide-react';
import { ApiError } from '../../lib/api/errors';
import { DialogFrame } from '../../components/modals/DialogFrame';
import { ApiErrorAlert } from '../components/ApiErrorAlert';
import { PageResult, useOperationsCommand, useOperationsQuery } from '../operations/data';
import { Pager, pretty, QueryState, Refresh, SearchBox, Surface } from '../operations/ui';

interface ProviderField { name: string; label: string; type?: string; options?: string[]; optional?: boolean }
interface Provider { code: string; name: string; categories: string[]; secret_label: string; fields: ProviderField[] }
interface Catalog { providers: Provider[]; categories: string[] }
export interface IntegrationConnection {
  id: string; name: string; category: string; provider: string; configuration: Record<string, string | number>;
  has_secret: boolean; is_active: boolean; connectivity: string; etag: string; updated_at: string;
}

const healthDot = (connectivity: string) =>
  connectivity === 'CONNECTED' ? 'var(--hz-success, #15803d)'
  : connectivity === 'ERROR' ? 'var(--hz-danger, #dc2626)'
  : 'var(--hz-warning, #ca8a04)';

export function IntegrationsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [editing, setEditing] = useState<IntegrationConnection | 'new' | null>(null);
  const catalogue = useOperationsQuery<Catalog>('/admin/integrations/catalog');
  const connections = useOperationsQuery<PageResult<IntegrationConnection>>(`/admin/integrations?${new URLSearchParams({ q, category, status, page: String(page) })}`);
  return <Surface title="Integrations" actions={<><Refresh query={connections} />
    <button className="hz-button hz-button-primary" disabled={!catalogue.data} onClick={() => setEditing('new')}><Plus size={15} />Add integration</button>
  </>}>
    <div className="ops-toolbar"><SearchBox value={q} label="Search integrations" onSearch={value => { setQ(value); setPage(1); }} />
      <label>Service<select className="hz-field p-2" value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}>
        <option value="">All services</option>{catalogue.data?.categories.map(value => <option key={value} value={value}>{pretty(value)}</option>)}
      </select></label>
      <label>Setup status<select className="hz-field p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
        <option value="">All statuses</option><option value="ENABLED">Enabled</option><option value="DISABLED">Disabled</option>
      </select></label>
    </div>
    <QueryState query={catalogue} /><QueryState query={connections} />
    {connections.data && <>
      {!connections.data.results.length && <p className="ops-muted" style={{ padding: '24px 0' }}>No integrations configured. Add an integration to connect to external services.</p>}
      <div className="ops-integration-grid">{connections.data.results.map(connection => {
        const provider = catalogue.data?.providers.find(p => p.code === connection.provider);
        const needsSecret = connection.provider !== 'HTTP_API' || connection.configuration.authentication !== 'NONE';
        const endpoint = connection.configuration.base_url ?? connection.configuration.host ?? '';
        return <article key={connection.id} className={`ops-integration-card${connection.is_active ? '' : ' ops-integration-disabled'}`} data-testid="integration-card">
          <header>
            <Circle size={10} fill={healthDot(connection.connectivity)} color={healthDot(connection.connectivity)} style={{ flexShrink: 0 }} />
            <h2>{connection.name}</h2>
            <span className="ops-integration-badge">{connection.is_active ? 'Enabled' : 'Disabled'}</span>
            <button className="hz-icon-button" title={`Edit ${connection.name}`} disabled={!provider} onClick={() => setEditing(connection)}><Pencil size={15} /></button>
          </header>
          <div className="ops-integration-meta">
            <span>{provider?.name ?? pretty(connection.provider)}</span>
            <span className="ops-integration-dot" />
            <span>{pretty(connection.category)}</span>
          </div>
          {endpoint && <div className="ops-integration-endpoint" title={String(endpoint)}>{String(endpoint)}</div>}
          <dl>
            <div><dt>Health</dt><dd>{pretty(connection.connectivity)}</dd></div>
            <div><dt>Credentials</dt><dd>{connection.has_secret ? 'Stored securely' : needsSecret ? 'Required' : 'Not required'}</dd></div>
            {connection.updated_at && <div><dt>Updated</dt><dd>{new Date(connection.updated_at).toLocaleDateString()}</dd></div>}
          </dl>
        </article>;
      })}</div>
      <Pager page={page} count={connections.data.count} size={25} change={setPage} />
    </>}
    {editing && catalogue.data && <IntegrationForm key={editing === 'new' ? 'new' : editing.etag}
      initial={editing === 'new' ? undefined : editing} catalog={catalogue.data} close={() => setEditing(null)} reload={setEditing} />}
  </Surface>;
}

function IntegrationForm({ initial, catalog, close, reload }: { initial?: IntegrationConnection; catalog: Catalog; close: () => void; reload: (row: IntegrationConnection) => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [providerCode, setProvider] = useState(initial?.provider ?? catalog.providers[0].code);
  const provider = catalog.providers.find(p => p.code === providerCode)!;
  const [category, setCategory] = useState(initial?.category ?? provider.categories[0]);
  const [config, setConfig] = useState<Record<string, string>>(Object.fromEntries(Object.entries(initial?.configuration ?? {}).map(([key, value]) => [key, String(value)])));
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [active, setActive] = useState(initial?.is_active ?? true);
  const command = useOperationsCommand();
  const latest = useOperationsQuery<IntegrationConnection>(`/admin/integrations/${initial?.id ?? ''}`, false);
  const conflict = command.error instanceof ApiError && command.error.status === 412;
  const busy = command.pending || latest.isFetching;
  const noAuth = providerCode === 'HTTP_API' && config.authentication === 'NONE';
  const hasStoredSecret = initial?.has_secret && initial.provider === providerCode;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configuration = Object.fromEntries(provider.fields.filter(f => config[f.name]?.trim()).map(f =>
      [f.name, f.type === 'number' ? Number(config[f.name]) : config[f.name].trim()]));
    const body = { name, provider: providerCode, category, configuration, is_active: active,
      ...(secret && !noAuth ? { secret } : {}), clear_secret: clearSecret };
    const result = await command.run<IntegrationConnection>(initial ? `/admin/integrations/${initial.id}` : '/admin/integrations', body, initial ? 'PUT' : 'POST', initial?.etag);
    if (result) { setSecret(''); close(); }
  };
  return <DialogFrame titleId="integration-form-title" title={initial ? `Edit ${initial.name}` : 'Add integration'} size="lg" dismissOnBackdrop={false}
    onClose={() => { if (!busy) close(); }} footer={<>
      <button className="hz-button hz-button-secondary" disabled={busy} onClick={close}>Cancel</button>
      <button className="hz-button hz-button-primary" form="integration-form" disabled={busy || conflict}><Save size={15} />{command.pending ? 'Saving...' : 'Save'}</button>
    </>}>
    <div className="ops">
      {command.error != null && <ApiErrorAlert error={command.error} />}
      {latest.error != null && <ApiErrorAlert error={latest.error} />}
      {conflict && <button className="hz-button hz-button-secondary" disabled={busy} onClick={() => {
        void latest.refetch().then(result => { if (result.isSuccess) reload(result.data); });
      }}><RotateCcw size={15} />Discard edits and reload</button>}
      <form id="integration-form" className="ops-form" onSubmit={e => void submit(e)}><fieldset disabled={busy}>
        <label>Name *<input className="hz-field" required maxLength={128} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Provider *<select className="hz-field" value={providerCode} onChange={e => {
          setProvider(e.target.value); setCategory(catalog.providers.find(p => p.code === e.target.value)!.categories[0]);
          setConfig({}); setSecret(''); setClearSecret(false);
        }}>{catalog.providers.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
        <label>Service *<select className="hz-field" value={category} onChange={e => setCategory(e.target.value)}>
          {provider.categories.map(value => <option key={value} value={value}>{pretty(value)}</option>)}
        </select></label>
        {provider.fields.map(field => <label key={field.name}>{field.label}{!field.optional && ' *'}
          {field.options ? <select className="hz-field" required={!field.optional} value={config[field.name] ?? ''} onChange={e => {
            if (field.name === 'authentication' && e.target.value === 'NONE') setSecret('');
            setConfig(v => {
            const next = { ...v, [field.name]: e.target.value };
            if (field.name === 'authentication' && e.target.value !== 'API_KEY') delete next.api_key_header;
            return next;
          }); }}><option value="">Select...</option>{field.options.map(value => <option key={value} value={value}>{pretty(value)}</option>)}</select>
            : <input className="hz-field" type={field.type ?? 'text'} required={!field.optional || (field.name === 'api_key_header' && config.authentication === 'API_KEY')}
                disabled={field.name === 'api_key_header' && config.authentication !== 'API_KEY'} maxLength={500}
                min={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? 65535 : undefined}
                value={config[field.name] ?? ''} onChange={e => setConfig(v => ({ ...v, [field.name]: e.target.value }))} />}
        </label>)}
        {!noAuth && <label>{provider.secret_label}{hasStoredSecret ? ' (replace)' : ''}<input className="hz-field" type="password" autoComplete="new-password" maxLength={4096} value={secret} disabled={clearSecret} onChange={e => setSecret(e.target.value)} /></label>}
      </fieldset>
      <div className="ops-toolbar">
        <label><input type="checkbox" checked={active} disabled={busy} onChange={e => setActive(e.target.checked)} /> Setup enabled</label>
        {hasStoredSecret && !noAuth && <label><input type="checkbox" checked={clearSecret} disabled={busy} onChange={e => { setClearSecret(e.target.checked); setSecret(''); }} /> Clear stored credential</label>}
      </div></form>
    </div>
  </DialogFrame>;
}
