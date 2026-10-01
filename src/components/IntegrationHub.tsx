import React, { useState } from 'react';
import { Activity, Check, Edit3, Lock, Plus, RefreshCw, Server, X } from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { ApiEndpointRecordItem, recordsStore } from '../data/recordsStore';
import { useHasPermission } from '../store/permissionStore';
import {
  FieldError,
  HorizonPage,
  HorizonPageContent,
  HorizonPageTitle,
  HorizonToast,
  StatusBadge,
  StatusTone,
  ValidationSummary,
} from './horizon';

interface IntegrationHubProps {
  onNavigate?: (screen: ScreenId) => void;
  densityMode: DensityMode;
  mode?: 'operations' | 'admin';
}

type EndpointFormValues = Pick<
  ApiEndpointRecordItem,
  'name' | 'provider' | 'category' | 'method' | 'endpointUrl' | 'direction' | 'environment' | 'authType' | 'status' | 'owner' | 'notes'
>;

const CATEGORIES: ApiEndpointRecordItem['category'][] = ['Core Banking', 'Payments', 'Regulatory', 'Communication', 'ERP', 'Telematics'];
const METHODS: ApiEndpointRecordItem['method'][] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
const DIRECTIONS: ApiEndpointRecordItem['direction'][] = ['Inbound', 'Outbound', 'Bidirectional'];
const ENVIRONMENTS: ApiEndpointRecordItem['environment'][] = ['Production', 'Sandbox', 'Disabled'];
const AUTH_TYPES: ApiEndpointRecordItem['authType'][] = ['mTLS', 'OAuth2', 'API Key', 'Basic Auth', 'None'];
const STATUSES: ApiEndpointRecordItem['status'][] = ['Healthy', 'Warning', 'Disabled', 'Not Configured'];

const blankEndpoint: EndpointFormValues = {
  name: '',
  provider: '',
  category: 'Payments',
  method: 'POST',
  endpointUrl: '',
  direction: 'Bidirectional',
  environment: 'Sandbox',
  authType: 'OAuth2',
  status: 'Not Configured',
  owner: '',
  notes: '',
};

const statusTone: Record<ApiEndpointRecordItem['status'], StatusTone> = {
  Healthy: 'success',
  Warning: 'warning',
  Disabled: 'danger',
  'Not Configured': 'neutral',
};

const methodTone: Record<ApiEndpointRecordItem['method'], string> = {
  GET: 'bg-blue-50 text-blue-700 border-blue-200',
  POST: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  PUT: 'bg-amber-50 text-amber-700 border-amber-200',
  PATCH: 'bg-violet-50 text-violet-700 border-violet-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
};

const toFormValues = (endpoint?: ApiEndpointRecordItem): EndpointFormValues => {
  if (!endpoint) return blankEndpoint;
  return {
    name: endpoint.name,
    provider: endpoint.provider,
    category: endpoint.category,
    method: endpoint.method,
    endpointUrl: endpoint.endpointUrl,
    direction: endpoint.direction,
    environment: endpoint.environment,
    authType: endpoint.authType,
    status: endpoint.status,
    owner: endpoint.owner,
    notes: endpoint.notes,
  };
};

export const IntegrationHub: React.FC<IntegrationHubProps> = ({ onNavigate, densityMode, mode = 'operations' }) => {
  const accessModule = mode === 'admin' ? 'regulatory-admin' : 'operations';
  const canAdd = useHasPermission(accessModule, 'add');
  const canEdit = useHasPermission(accessModule, 'edit');
  const [endpoints, setEndpoints] = useState(() => recordsStore.getApiEndpoints());
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [editingEndpoint, setEditingEndpoint] = useState<ApiEndpointRecordItem | null>(null);
  const [formValues, setFormValues] = useState<EndpointFormValues>(blankEndpoint);
  const [attempted, setAttempted] = useState(false);
  const [pingingId, setPingingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const refresh = () => setEndpoints([...recordsStore.getApiEndpoints()]);
  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const filteredEndpoints = activeCategory === 'ALL' ? endpoints : endpoints.filter((endpoint) => endpoint.category === activeCategory);
  const healthyCount = endpoints.filter((endpoint) => endpoint.status === 'Healthy').length;
  const activeCount = endpoints.filter((endpoint) => endpoint.environment !== 'Disabled').length;
  const activeLatencyValues = endpoints.filter((endpoint) => endpoint.latencyMs > 0).map((endpoint) => endpoint.latencyMs);
  const avgLatency = Math.round(activeLatencyValues.reduce((sum, latency) => sum + latency, 0) / (activeLatencyValues.length || 1));

  const errors: Record<string, string> = {};
  if (!formValues.name.trim()) errors.name = 'Endpoint name is required.';
  if (!formValues.provider.trim()) errors.provider = 'Provider is required.';
  if (!formValues.owner.trim()) errors.owner = 'Owner is required.';
  if (!formValues.endpointUrl.trim()) errors.endpointUrl = 'Endpoint URL is required.';
  else if (!/^https?:\/\/[^\s]+$/i.test(formValues.endpointUrl.trim())) errors.endpointUrl = 'Enter a valid HTTP or HTTPS URL.';
  const hasErrors = Object.keys(errors).length > 0;

  const openAdd = () => {
    setEditingEndpoint(null);
    setFormValues({ ...blankEndpoint });
    setAttempted(false);
  };

  const openEdit = (endpoint: ApiEndpointRecordItem) => {
    setEditingEndpoint(endpoint);
    setFormValues(toFormValues(endpoint));
    setAttempted(false);
  };

  const closeForm = () => {
    setEditingEndpoint(null);
    setFormValues(blankEndpoint);
    setAttempted(false);
  };

  const isFormOpen = editingEndpoint !== null || formValues !== blankEndpoint;

  const saveEndpoint = () => {
    if ((!editingEndpoint && !canAdd) || (editingEndpoint && !canEdit) || hasErrors) {
      setAttempted(true);
      return;
    }

    const normalized = {
      ...formValues,
      endpointUrl: formValues.endpointUrl.trim(),
      name: formValues.name.trim(),
      provider: formValues.provider.trim(),
      owner: formValues.owner.trim(),
      notes: formValues.notes.trim(),
    };

    if (editingEndpoint) {
      recordsStore.updateApiEndpoint(editingEndpoint.id, normalized);
      showToast(`${normalized.name} updated.`);
    } else {
      recordsStore.addApiEndpoint(normalized);
      showToast(`${normalized.name} added.`);
    }
    refresh();
    closeForm();
  };

  const pingEndpoint = (endpoint: ApiEndpointRecordItem) => {
    setPingingId(endpoint.id);
    window.setTimeout(() => {
      const updated = recordsStore.pingApiEndpoint(endpoint.id);
      refresh();
      setPingingId(null);
      showToast(updated?.latencyMs ? `${endpoint.name} responded in ${updated.latencyMs} ms.` : `${endpoint.name} is inactive.`);
    }, 450);
  };

  return (
    <HorizonPage id="integration-hub-view">
      <HorizonPageTitle
        title={mode === 'admin' ? 'API Endpoints' : 'Integration Hub'}
        subtitle={mode === 'admin' ? 'Administration' : 'Operations'}
        onBack={() => onNavigate?.('dashboard')}
        actions={
          <button
            type="button"
            onClick={openAdd}
            disabled={!canAdd}
            title={canAdd ? undefined : "You don't have permission to add API endpoints."}
            className="hz-button hz-button-primary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canAdd ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>Add Endpoint</span>
          </button>
        }
      />

      <HorizonPageContent>
        <div className={densityMode === 'compact' ? 'p-4 space-y-4' : 'p-5 space-y-4'}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MetricCard label="Configured Endpoints" value={String(endpoints.length)} />
            <MetricCard label="Healthy / Active" value={`${healthyCount} / ${activeCount}`} tone="success" />
            <MetricCard label="Average Latency" value={`${avgLatency} ms`} />
          </div>

          <div className="flex flex-wrap gap-2">
            {['ALL', ...CATEGORIES].map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded-[var(--hz-radius-md)] border text-xs font-semibold ${
                  activeCategory === category
                    ? 'bg-[var(--hz-primary)] text-white border-[var(--hz-primary)]'
                    : 'bg-white text-[var(--hz-text-secondary)] border-[var(--hz-border)] hover:bg-[var(--hz-hover)]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {filteredEndpoints.map((endpoint) => (
              <div key={endpoint.id} className="hz-panel p-4 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`px-2 py-0.5 rounded border text-[10px] font-mono font-bold ${methodTone[endpoint.method]}`}>
                        {endpoint.method}
                      </span>
                      <span className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 text-[10px] font-mono font-bold text-slate-600">
                        {endpoint.environment}
                      </span>
                      <StatusBadge label={endpoint.status} tone={statusTone[endpoint.status]} />
                    </div>
                    <h2 className="mt-2 text-sm font-bold text-[var(--hz-text-primary)]">{endpoint.name}</h2>
                    <p className="mt-1 text-xs text-[var(--hz-text-subtle)]">
                      {endpoint.provider} - {endpoint.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => pingEndpoint(endpoint)}
                      disabled={pingingId === endpoint.id}
                      className="hz-icon-button"
                      title="Ping endpoint"
                    >
                      <RefreshCw className={`h-3.5 w-3.5 ${pingingId === endpoint.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(endpoint)}
                      disabled={!canEdit}
                      className="hz-icon-button disabled:opacity-50 disabled:cursor-not-allowed"
                      title={canEdit ? 'Edit endpoint' : "You don't have permission to edit API endpoints."}
                    >
                      {canEdit ? <Edit3 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="rounded-[var(--hz-radius-md)] border border-[var(--hz-border)] bg-[var(--hz-surface-subtle)] px-3 py-2 font-mono text-xs text-[var(--hz-text-primary)] break-all">
                  {endpoint.endpointUrl}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <EndpointStat label="Auth" value={endpoint.authType} />
                  <EndpointStat label="Direction" value={endpoint.direction} />
                  <EndpointStat label="Latency" value={`${endpoint.latencyMs || '-'} ms`} mono />
                  <EndpointStat label="TPS" value={String(endpoint.activeTps)} mono />
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-[var(--hz-divider)] pt-3">
                  <div className="text-xs text-[var(--hz-text-subtle)]">
                    Owner: <span className="font-semibold text-[var(--hz-text-secondary)]">{endpoint.owner}</span> - Uptime 90d:{' '}
                    <span className="font-mono font-bold">{endpoint.uptime90d.toFixed(2)}%</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate?.('failed-transactions')}
                    className="text-xs font-bold text-[var(--hz-primary)] hover:text-[var(--hz-primary-hover)] inline-flex items-center gap-1"
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Inspect Logs
                  </button>
                </div>

                <div className="text-xs text-[var(--hz-text-secondary)]">{endpoint.notes}</div>
              </div>
            ))}
          </div>
        </div>
      </HorizonPageContent>

      {isFormOpen && (
        <EndpointModal
          values={formValues}
          onChange={setFormValues}
          onClose={closeForm}
          onSave={saveEndpoint}
          attempted={attempted}
          errors={errors}
          canSave={editingEndpoint ? canEdit : canAdd}
          title={editingEndpoint ? 'Edit API Endpoint' : 'Add API Endpoint'}
          actionLabel={editingEndpoint ? 'Save Endpoint' : 'Add Endpoint'}
        />
      )}

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};

const MetricCard: React.FC<{ label: string; value: string; tone?: 'success' | 'neutral' }> = ({ label, value, tone = 'neutral' }) => (
  <div className="hz-panel p-3.5">
    <div className="text-[10px] uppercase font-bold text-[var(--hz-text-subtle)]">{label}</div>
    <div className={`mt-1 text-xl font-mono font-bold ${tone === 'success' ? 'text-[var(--hz-success)]' : 'text-[var(--hz-text-primary)]'}`}>
      {value}
    </div>
  </div>
);

const EndpointStat: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div>
    <div className="text-[10px] uppercase font-bold text-[var(--hz-text-subtle)]">{label}</div>
    <div className={`font-semibold text-[var(--hz-text-primary)] ${mono ? 'font-mono font-bold' : ''}`}>{value}</div>
  </div>
);

interface EndpointModalProps {
  values: EndpointFormValues;
  onChange: (values: EndpointFormValues) => void;
  onClose: () => void;
  onSave: () => void;
  attempted: boolean;
  errors: Record<string, string>;
  canSave: boolean;
  title: string;
  actionLabel: string;
}

const EndpointModal: React.FC<EndpointModalProps> = ({ values, onChange, onClose, onSave, attempted, errors, canSave, title, actionLabel }) => {
  const update = <K extends keyof EndpointFormValues>(key: K, value: EndpointFormValues[K]) => onChange({ ...values, [key]: value });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-[var(--hz-radius-md)] bg-[var(--hz-primary-subtle)] text-[var(--hz-primary)] flex items-center justify-center">
              <Server className="w-4 h-4" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900">{title}</h2>
              <p className="text-xs text-slate-500">Configure endpoint access, ownership, health, and API contract details.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TextField label="Endpoint Name" value={values.name} onChange={(value) => update('name', value)} error={attempted ? errors.name : undefined} />
            <TextField label="Provider" value={values.provider} onChange={(value) => update('provider', value)} error={attempted ? errors.provider : undefined} />
            <SelectField label="Category" value={values.category} options={CATEGORIES} onChange={(value) => update('category', value as ApiEndpointRecordItem['category'])} />
            <TextField label="Owner" value={values.owner} onChange={(value) => update('owner', value)} error={attempted ? errors.owner : undefined} />
          </div>

          <TextField
            label="Endpoint URL"
            value={values.endpointUrl}
            onChange={(value) => update('endpointUrl', value)}
            error={attempted ? errors.endpointUrl : undefined}
            mono
            placeholder="https://api.provider.com/v1/resource"
          />

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <SelectField label="Method" value={values.method} options={METHODS} onChange={(value) => update('method', value as ApiEndpointRecordItem['method'])} />
            <SelectField label="Direction" value={values.direction} options={DIRECTIONS} onChange={(value) => update('direction', value as ApiEndpointRecordItem['direction'])} />
            <SelectField label="Environment" value={values.environment} options={ENVIRONMENTS} onChange={(value) => update('environment', value as ApiEndpointRecordItem['environment'])} />
            <SelectField label="Auth Type" value={values.authType} options={AUTH_TYPES} onChange={(value) => update('authType', value as ApiEndpointRecordItem['authType'])} />
            <SelectField label="Status" value={values.status} options={STATUSES} onChange={(value) => update('status', value as ApiEndpointRecordItem['status'])} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
            <textarea
              value={values.notes}
              onChange={(e) => update('notes', e.target.value)}
              rows={3}
              className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {attempted && !canSave && <FieldError message="You don't have permission to save API endpoints." />}
          {attempted && <ValidationSummary errors={Object.values(errors)} />}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
          <button type="button" onClick={onClose} className="hz-button hz-button-secondary !min-h-8">
            Cancel
          </button>
          <button type="button" disabled={!canSave} onClick={onSave} className="hz-button hz-button-primary !min-h-8 disabled:opacity-60 disabled:cursor-not-allowed">
            {canSave ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{actionLabel}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  mono?: boolean;
  placeholder?: string;
}

const TextField: React.FC<TextFieldProps> = ({ label, value, onChange, error, mono, placeholder }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 ${mono ? 'font-mono' : ''}`}
    />
    <FieldError message={error} />
  </div>
);

interface SelectFieldProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}

const SelectField: React.FC<SelectFieldProps> = ({ label, value, options, onChange }) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
    >
      {options.map((option) => (
        <option key={option}>{option}</option>
      ))}
    </select>
  </div>
);
