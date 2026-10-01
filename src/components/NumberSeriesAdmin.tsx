import React, { useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { recordsStore, NumberSeriesConfig } from '../data/recordsStore';
import { useHasPermission } from '../store/permissionStore';
import { HorizonPage, HorizonPageContent, HorizonPageTitle, HorizonToast, StatusBadge } from './horizon';

interface NumberSeriesAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

interface Draft {
  label: string;
  prefix: string;
  padWidth: string;
  nextSequence: string;
}

const toDraft = (config: NumberSeriesConfig): Draft => ({
  label: config.label,
  prefix: config.prefix,
  padWidth: String(config.padWidth),
  nextSequence: String(config.nextSequence),
});

export const NumberSeriesAdmin: React.FC<NumberSeriesAdminProps> = ({ onNavigate }) => {
  const canManage = useHasPermission('regulatory-admin', 'edit');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const series = recordsStore.getNumberSeries();

  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => {
    const map: Record<string, Draft> = {};
    series.forEach((s) => {
      map[s.id] = toDraft(s);
    });
    return map;
  });

  const refresh = () => forceRefresh((n) => n + 1);
  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const updateDraft = (id: string, patch: Partial<Draft>) => {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  };

  const commitText = (config: NumberSeriesConfig, field: 'label' | 'prefix') => {
    if (!canManage) return;
    const value = drafts[config.id]?.[field]?.trim();
    if (!value) return;
    recordsStore.updateNumberSeriesConfig(config.id, { [field]: value });
    refresh();
  };

  const commitNumber = (config: NumberSeriesConfig, field: 'padWidth' | 'nextSequence') => {
    if (!canManage) return;
    const raw = drafts[config.id]?.[field];
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) {
      updateDraft(config.id, { [field]: String(config[field]) });
      return;
    }
    recordsStore.updateNumberSeriesConfig(config.id, { [field]: Math.round(value) });
    refresh();
  };

  const toggleIncludeYear = (config: NumberSeriesConfig) => {
    if (!canManage) return;
    recordsStore.updateNumberSeriesConfig(config.id, { includeYear: !config.includeYear });
    refresh();
  };

  const updateResetCadence = (config: NumberSeriesConfig, resetCadence: NumberSeriesConfig['resetCadence']) => {
    if (!canManage) return;
    recordsStore.updateNumberSeriesConfig(config.id, { resetCadence });
    refresh();
  };

  const toggleStatus = (config: NumberSeriesConfig) => {
    if (!canManage) return;
    recordsStore.updateNumberSeriesConfig(config.id, { status: config.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' });
    refresh();
  };

  const handleAdd = () => {
    if (!canManage) return;
    const created = recordsStore.addNumberSeriesConfig({
      label: 'New Series',
      prefix: 'DOC',
      includeYear: false,
      padWidth: 5,
      nextSequence: 1,
      resetCadence: 'NEVER',
      status: 'ACTIVE',
    });
    setDrafts((prev) => ({ ...prev, [created.id]: toDraft(created) }));
    refresh();
    showToast(`${created.label} added — configure its format below.`);
  };

  const handleDelete = (config: NumberSeriesConfig) => {
    if (!canManage) return;
    recordsStore.deleteNumberSeriesConfig(config.id);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[config.id];
      return next;
    });
    refresh();
    showToast(`${config.label} deleted.`);
  };

  return (
    <HorizonPage id="number-series-admin-view">
      <HorizonPageTitle
        title="Number Series"
        subtitle="Administration"
        onBack={() => onNavigate('regulatory-admin')}
        actions={
          <button
            onClick={handleAdd}
            disabled={!canManage}
            className="hz-button hz-button-primary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canManage ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>New Series</span>
          </button>
        }
      />

      <HorizonPageContent>
        <div className="p-5 space-y-4">
          <p className="text-xs text-[var(--hz-text-subtle)] max-w-2xl">
            Every generated document number (quotations, policies, claims, receipts, journal vouchers) is driven by one of
            these series. Format is <span className="font-mono">PREFIX-#####</span> or, with year included,{' '}
            <span className="font-mono">PREFIX/YYYY/#####</span>. Deleting or disabling a series doesn't block document
            creation — its generator falls back to a timestamp-based number instead.
          </p>

          <div className="overflow-x-auto border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)] text-[10px] font-bold text-[var(--hz-text-subtle)] uppercase font-mono">
                  <th className="px-3 py-2.5">Series</th>
                  <th className="px-3 py-2.5">Prefix</th>
                  <th className="px-3 py-2.5">Include Year</th>
                  <th className="px-3 py-2.5">Digits</th>
                  <th className="px-3 py-2.5">Next Sequence</th>
                  <th className="px-3 py-2.5">Reset</th>
                  <th className="px-3 py-2.5">Next Number</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-3 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hz-divider)]">
                {series.map((config) => {
                  const draft = drafts[config.id] ?? toDraft(config);
                  return (
                    <tr key={config.id} className="hover:bg-[var(--hz-hover)]">
                      <td className="px-3 py-2">
                        <input
                          value={draft.label}
                          onChange={(e) => updateDraft(config.id, { label: e.target.value })}
                          onBlur={() => commitText(config, 'label')}
                          disabled={!canManage}
                          className="hz-field px-2 py-1 text-xs w-full min-w-[140px]"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          value={draft.prefix}
                          onChange={(e) => updateDraft(config.id, { prefix: e.target.value.toUpperCase() })}
                          onBlur={() => commitText(config, 'prefix')}
                          disabled={!canManage}
                          className="hz-field px-2 py-1 text-xs w-20 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input type="checkbox" checked={config.includeYear} onChange={() => toggleIncludeYear(config)} disabled={!canManage} />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={draft.padWidth}
                          onChange={(e) => updateDraft(config.id, { padWidth: e.target.value })}
                          onBlur={() => commitNumber(config, 'padWidth')}
                          disabled={!canManage}
                          className="hz-field px-2 py-1 text-xs w-16 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number"
                          value={draft.nextSequence}
                          onChange={(e) => updateDraft(config.id, { nextSequence: e.target.value })}
                          onBlur={() => commitNumber(config, 'nextSequence')}
                          disabled={!canManage}
                          className="hz-field px-2 py-1 text-xs w-24 font-mono"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={config.resetCadence}
                          onChange={(e) => updateResetCadence(config, e.target.value as NumberSeriesConfig['resetCadence'])}
                          disabled={!canManage}
                          className="hz-field px-2 py-1 text-xs"
                        >
                          <option value="NEVER">Never</option>
                          <option value="ANNUAL">Annual</option>
                        </select>
                      </td>
                      <td className="px-3 py-2 font-mono font-bold text-[var(--hz-primary)]">
                        {recordsStore.previewNumberSeries(config)}
                      </td>
                      <td className="px-3 py-2">
                        <button onClick={() => toggleStatus(config)} disabled={!canManage}>
                          <StatusBadge label={config.status} tone={config.status === 'ACTIVE' ? 'success' : 'neutral'} />
                        </button>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => handleDelete(config)}
                          disabled={!canManage}
                          className="hz-icon-button disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Delete series"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {series.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-3 py-6 text-center text-[var(--hz-text-subtle)]">
                      No number series configured — generators will fall back to timestamp-based numbers.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </HorizonPageContent>

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};
