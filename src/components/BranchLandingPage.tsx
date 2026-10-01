import React, { useState } from 'react';
import { Check, Lock, Plus, X } from 'lucide-react';
import { ScreenId, DensityMode } from '../types';
import { getBranchLandingConfig, BranchRow } from '../data/branchLandingConfig';
import { recordsStore } from '../data/recordsStore';
import { SCREEN_MODULE_MAP } from '../data/screenModuleMap';
import { useHasPermission } from '../store/permissionStore';
import { FieldError, HorizonPage, HorizonPageContent, HorizonPageTitle, HorizonToast, StatusBadge } from './horizon';

interface BranchLandingPageProps {
  screenId: ScreenId;
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

const kpiToneClass: Record<'success' | 'warning' | 'danger' | 'neutral', string> = {
  success: 'text-[var(--hz-success)]',
  warning: 'text-[var(--hz-warning)]',
  danger: 'text-[var(--hz-danger)]',
  neutral: 'text-[var(--hz-text-primary)]',
};

export const BranchLandingPage: React.FC<BranchLandingPageProps> = ({ screenId, onNavigate }) => {
  const config = getBranchLandingConfig(screenId);
  const createModuleId = SCREEN_MODULE_MAP[screenId] ?? 'regulatory-admin';
  const canAdd = useHasPermission(createModuleId, 'add');
  const [addedRows, setAddedRows] = useState<BranchRow[]>([]);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [fieldValues, setFieldValues] = useState<string[]>([]);
  const [attempted, setAttempted] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!config) {
    return (
      <HorizonPage id="branch-landing-missing">
        <HorizonPageTitle title="Coming Soon" subtitle="Administration" onBack={() => onNavigate('dashboard')} />
        <HorizonPageContent className="p-6 text-xs text-[var(--hz-text-subtle)]">
          This screen doesn't have content configured yet.
        </HorizonPageContent>
      </HorizonPage>
    );
  }

  const openAdd = () => {
    setFieldValues(config.columns.map(() => ''));
    setAttempted(false);
    setIsAddOpen(true);
  };

  const closeAdd = () => setIsAddOpen(false);

  const hasEmptyField = fieldValues.some((value) => !value.trim());

  const submitAdd = () => {
    if (!canAdd || hasEmptyField) {
      setAttempted(true);
      return;
    }
    const firstValue = fieldValues[0].trim();
    const details = config.columns.map((column, index) => `${column}: ${fieldValues[index].trim()}`).join('; ');
    setAddedRows((prev) => [
      { id: `local-${Date.now()}`, cells: fieldValues.map((v) => v.trim()), statusLabel: 'Draft', statusTone: 'neutral' },
      ...prev,
    ]);
    recordsStore.addActivity({
      author: 'System Administrator',
      entityType: 'Configuration',
      entityId: screenId,
      action: `Added ${config.title} Row`,
      details: `${firstValue} added to ${config.title}. ${details}`,
    });
    setIsAddOpen(false);
    setToastMessage(`${firstValue} added.`);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const allRows = [...addedRows, ...config.rows];

  return (
    <HorizonPage id={`branch-landing-${screenId}`}>
      <HorizonPageTitle
        title={config.title}
        subtitle={config.eyebrow}
        onBack={() => onNavigate('dashboard')}
        actions={
          config.addLabel && (
            <button
              onClick={openAdd}
              disabled={!canAdd}
              title={canAdd ? undefined : "You don't have permission to add records here."}
              className="hz-button hz-button-primary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {canAdd ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              <span>{config.addLabel}</span>
            </button>
          )
        }
      />

      <HorizonPageContent>
        <div className="p-5 space-y-5">
          <p className="text-xs text-[var(--hz-text-subtle)] max-w-3xl">{config.subtitle}</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {config.kpis.map((kpi) => (
              <div key={kpi.label} className="border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)] p-3.5 bg-[var(--hz-surface)]">
                <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--hz-text-subtle)]">{kpi.label}</div>
                <div className={`mt-1 font-mono text-lg font-bold ${kpiToneClass[kpi.tone ?? 'neutral']}`}>{kpi.value}</div>
                {kpi.note && <div className="mt-0.5 text-[10px] text-[var(--hz-text-subtle)]">{kpi.note}</div>}
              </div>
            ))}
          </div>

          <div className="overflow-x-auto border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)] text-[10px] font-bold text-[var(--hz-text-subtle)] uppercase font-mono">
                  {config.columns.map((column) => (
                    <th key={column} className="px-4 py-2.5">
                      {column}
                    </th>
                  ))}
                  <th className="px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--hz-divider)]">
                {allRows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + 1} className="px-4 py-8 text-center text-xs text-[var(--hz-text-subtle)]">
                      No records found for this view.
                    </td>
                  </tr>
                ) : (
                  allRows.map((row) => (
                    <tr key={row.id} className="hover:bg-[var(--hz-hover)]">
                      {row.cells.map((cell, index) => (
                        <td
                          key={index}
                          className={index === 0 ? 'px-4 py-2.5 font-bold text-[var(--hz-text-primary)]' : 'px-4 py-2.5 text-[var(--hz-text-secondary)]'}
                        >
                          {cell}
                        </td>
                      ))}
                      <td className="px-4 py-2.5">
                        <StatusBadge label={row.statusLabel} tone={row.statusTone} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <p className="text-[11px] text-[var(--hz-text-subtle)]">{config.footnote}</p>
        </div>
      </HorizonPageContent>

      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-base font-bold text-slate-900">{config.addLabel}</h2>
              <button onClick={closeAdd} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {config.columns.map((column, index) => (
                <div key={column}>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">{column}</label>
                  <input
                    type="text"
                    value={fieldValues[index] ?? ''}
                    onChange={(e) =>
                      setFieldValues((prev) => {
                        const next = [...prev];
                        next[index] = e.target.value;
                        return next;
                      })
                    }
                    className="w-full text-xs p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  {attempted && !fieldValues[index]?.trim() && <FieldError message={`${column} is required.`} />}
                </div>
              ))}
              {attempted && !canAdd && <FieldError message="You don't have permission to add records here." />}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-end gap-2 bg-slate-50/50">
              <button
                type="button"
                onClick={closeAdd}
                className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canAdd}
                onClick={submitAdd}
                className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {canAdd ? <Check className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                <span>Add</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};
