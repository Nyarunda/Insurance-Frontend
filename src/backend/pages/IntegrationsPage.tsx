import React, { useState } from 'react';
import { Pencil, PlugZap, Plus, Save } from 'lucide-react';
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

export function IntegrationsPage() {
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<IntegrationConnection | 'new' | null>(null);
  const catalogue = useOperationsQuery<Catalog>('/admin/integrations/catalog');
  const connections = useOperationsQuery<PageResult<IntegrationConnection>>(`/admin/integrations?${new URLSearchParams({ q, page: String(page) })}`);
  return <Surface title="Integrations" actions={<><Refresh query={connections} />
    <button className="hz-button hz-button-primary" disabled={!catalogue.data} onClick={() => setEditing('new')}><Plus size={15} />Add integration</button>
  </>}>
    <div className="ops-toolbar"><SearchBox value={q} label="Search integrations" onSearch={value => { setQ(value); setPage(1); }} /></div>
    <QueryState query={catalogue} /><QueryState query={connections} />
    {connections.data && <>
      {!connections.data.results.length && <p>No integrations found.</p>}
      <div className="ops-integration-grid">{connections.data.results.map(connection => {
        const provider = catalogue.data?.providers.find(p => p.code === connection.provider);
        const needsSecret = connection.provider !== 'HTTP_API' || connection.configuration.authentication !== 'NONE';
        return <article key={connection.id} className="ops-integration-card" data-testid="integration-card">
          <header><PlugZap size={18} /><h2>{connection.name}</h2>
            <button className="hz-icon-button" title={`Edit ${connection.name}`} disabled={!provider} onClick={() => setEditing(connection)}><Pencil size={15} /></button>
          </header>
          <p>{provider?.name ?? pretty(connection.provider)}</p>
          <dl>
            <div><dt>Service</dt><dd>{pretty(connection.category)}</dd></div>
            <div><dt>Setup</dt><dd>{connection.is_active ? 'Enabled' : 'Disabled'}</dd></div>
            <div><dt>Credentials</dt><dd>{connection.has_secret ? 'Stored securely' : needsSecret ? 'Required' : 'Not required'}</dd></div>
            <div><dt>Connection</dt><dd>{pretty(connection.connectivity)}</dd></div>
            {provider?.fields.filter(field => ['base_url', 'host', 'environment'].includes(field.name)).map(field =>
              <div key={field.name}><dt>{field.label}</dt><dd>{connection.configuration[field.name]}</dd></div>)}
          </dl>
        </article>;
      })}</div>
      <Pager page={page} count={connections.data.count} size={25} change={setPage} />
    </>}
    {editing && catalogue.data && <IntegrationForm initial={editing === 'new' ? undefined : editing} catalog={catalogue.data} close={() => setEditing(null)} />}
  </Surface>;
}

function IntegrationForm({ initial, catalog, close }: { initial?: IntegrationConnection; catalog: Catalog; close: () => void }) {
  const [name, setName] = useState(initial?.name ?? '');
  const [providerCode, setProvider] = useState(initial?.provider ?? catalog.providers[0].code);
  const provider = catalog.providers.find(p => p.code === providerCode)!;
  const [category, setCategory] = useState(initial?.category ?? provider.categories[0]);
  const [config, setConfig] = useState<Record<string, string>>(Object.fromEntries(Object.entries(initial?.configuration ?? {}).map(([key, value]) => [key, String(value)])));
  const [secret, setSecret] = useState('');
  const [clearSecret, setClearSecret] = useState(false);
  const [active, setActive] = useState(initial?.is_active ?? true);
  const command = useOperationsCommand();
  const hasStoredSecret = initial?.has_secret && initial.provider === providerCode;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const configuration = Object.fromEntries(provider.fields.filter(f => config[f.name]?.trim()).map(f =>
      [f.name, f.type === 'number' ? Number(config[f.name]) : config[f.name].trim()]));
    const body = { name, provider: providerCode, category, configuration, is_active: active,
      ...(secret ? { secret } : {}), clear_secret: clearSecret };
    const result = await command.run<IntegrationConnection>(initial ? `/admin/integrations/${initial.id}` : '/admin/integrations', body, initial ? 'PUT' : 'POST', initial?.etag);
    if (result) { setSecret(''); close(); }
  };
  return <DialogFrame titleId="integration-form-title" title={initial ? `Edit ${initial.name}` : 'Add integration'} size="lg" dismissOnBackdrop={false}
    onClose={() => { if (!command.pending) close(); }} footer={<>
      <button className="hz-button hz-button-secondary" disabled={command.pending} onClick={close}>Cancel</button>
      <button className="hz-button hz-button-primary" form="integration-form" disabled={command.pending}><Save size={15} />{command.pending ? 'Saving...' : 'Save'}</button>
    </>}>
    <div className="ops">
      {command.error != null && <ApiErrorAlert error={command.error} />}
      <form id="integration-form" className="ops-form" onSubmit={e => void submit(e)}><fieldset disabled={command.pending}>
        <label>Name *<input className="hz-field" required maxLength={128} value={name} onChange={e => setName(e.target.value)} /></label>
        <label>Provider *<select className="hz-field" value={providerCode} onChange={e => {
          setProvider(e.target.value); setCategory(catalog.providers.find(p => p.code === e.target.value)!.categories[0]);
          setConfig({}); setSecret(''); setClearSecret(false);
        }}>{catalog.providers.map(p => <option key={p.code} value={p.code}>{p.name}</option>)}</select></label>
        <label>Service *<select className="hz-field" value={category} onChange={e => setCategory(e.target.value)}>
          {provider.categories.map(value => <option key={value} value={value}>{pretty(value)}</option>)}
        </select></label>
        {provider.fields.map(field => <label key={field.name}>{field.label}{!field.optional && ' *'}
          {field.options ? <select className="hz-field" required={!field.optional} value={config[field.name] ?? ''} onChange={e => setConfig(v => {
            const next = { ...v, [field.name]: e.target.value };
            if (field.name === 'authentication' && e.target.value !== 'API_KEY') delete next.api_key_header;
            return next;
          })}><option value="">Select...</option>{field.options.map(value => <option key={value} value={value}>{pretty(value)}</option>)}</select>
            : <input className="hz-field" type={field.type ?? 'text'} required={!field.optional || (field.name === 'api_key_header' && config.authentication === 'API_KEY')}
                disabled={field.name === 'api_key_header' && config.authentication !== 'API_KEY'} maxLength={500}
                min={field.type === 'number' ? 1 : undefined} max={field.type === 'number' ? 65535 : undefined}
                value={config[field.name] ?? ''} onChange={e => setConfig(v => ({ ...v, [field.name]: e.target.value }))} />}
        </label>)}
        <label>{provider.secret_label}{hasStoredSecret ? ' (replace)' : ''}<input className="hz-field" type="password" autoComplete="new-password" maxLength={4096} value={secret} disabled={clearSecret} onChange={e => setSecret(e.target.value)} /></label>
      </fieldset>
      <div className="ops-toolbar">
        <label><input type="checkbox" checked={active} disabled={command.pending} onChange={e => setActive(e.target.checked)} /> Setup enabled</label>
        {hasStoredSecret && <label><input type="checkbox" checked={clearSecret} disabled={command.pending} onChange={e => { setClearSecret(e.target.checked); setSecret(''); }} /> Clear stored credential</label>}
      </div></form>
    </div>
  </DialogFrame>;
}
