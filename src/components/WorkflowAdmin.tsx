import React, { useEffect, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { ScreenId, DensityMode, UserRole } from '../types';
import {
  recordsStore,
  WorkflowDefinitionRecord,
  WorkflowDocumentType,
  WorkflowStepDef,
} from '../data/recordsStore';
import { ALL_ROLES, ROLE_LABELS } from '../data/roleRights';
import { useHasPermission } from '../store/permissionStore';
import { HorizonPage, HorizonPageContent, HorizonPageTitle, HorizonToast, StatusBadge } from './horizon';

interface WorkflowAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

const DOCUMENT_TYPES: WorkflowDocumentType[] = ['QUOTE', 'POLICY', 'CLAIM', 'PAYMENT'];
const DOCUMENT_TYPE_LABELS: Record<WorkflowDocumentType, string> = {
  QUOTE: 'Quotation',
  POLICY: 'Policy',
  CLAIM: 'Claim',
  PAYMENT: 'Payment',
};

export const WorkflowAdmin: React.FC<WorkflowAdminProps> = ({ onNavigate }) => {
  const canManage = useHasPermission('regulatory-admin', 'edit');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const definitions = recordsStore.getWorkflowDefinitions();
  const [selectedId, setSelectedId] = useState<string>(definitions[0]?.id ?? '');
  const selected = definitions.find((d) => d.id === selectedId) ?? definitions[0];
  const branches = recordsStore.getBranches();

  // Local drafts for free-text/number fields, so typing doesn't write (and log) on every
  // keystroke — those only commit to the store on blur. Discrete controls (selects,
  // checkboxes) commit immediately since a single change event is a real, complete edit.
  const [nameDraft, setNameDraft] = useState(selected?.name ?? '');
  const [stepsDraft, setStepsDraft] = useState<WorkflowStepDef[]>(selected?.steps ?? []);

  useEffect(() => {
    setNameDraft(selected?.name ?? '');
    setStepsDraft(selected?.steps ?? []);
  }, [selectedId]);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2000);
  };

  const refresh = () => forceRefresh((n) => n + 1);

  const handleCreateDefinition = () => {
    if (!canManage) return;
    const created = recordsStore.addWorkflowDefinition({
      name: 'New Approval Workflow',
      documentType: 'QUOTE',
      enabled: false,
      steps: [],
    });
    setSelectedId(created.id);
    refresh();
    showToast(`${created.name} created — configure its steps below.`);
  };

  const handleDeleteDefinition = (def: WorkflowDefinitionRecord) => {
    if (!canManage) return;
    recordsStore.deleteWorkflowDefinition(def.id);
    if (selectedId === def.id) setSelectedId(definitions.find((d) => d.id !== def.id)?.id ?? '');
    refresh();
    showToast(`${def.name} deleted.`);
  };

  const toggleEnabled = (def: WorkflowDefinitionRecord) => {
    if (!canManage) return;
    recordsStore.updateWorkflowDefinition(def.id, { enabled: !def.enabled });
    refresh();
  };

  const commitName = () => {
    if (!canManage || !selected || nameDraft.trim() === selected.name) return;
    recordsStore.updateWorkflowDefinition(selected.id, { name: nameDraft.trim() || selected.name });
    refresh();
  };

  const updateDefType = (def: WorkflowDefinitionRecord, documentType: WorkflowDocumentType) => {
    if (!canManage) return;
    recordsStore.updateWorkflowDefinition(def.id, { documentType });
    refresh();
  };

  const commitSteps = (nextSteps: WorkflowStepDef[]) => {
    if (!canManage || !selected) return;
    // Blur fires on every field a user tabs through, changed or not — skip no-op writes
    // so we don't log an activity entry (or re-render) for edits that didn't happen.
    if (JSON.stringify(nextSteps) === JSON.stringify(selected.steps)) return;
    recordsStore.updateWorkflowDefinition(selected.id, { steps: nextSteps });
    refresh();
  };

  const updateStepDraft = (stepId: string, patch: Partial<WorkflowStepDef>) => {
    setStepsDraft((prev) => prev.map((s) => (s.id === stepId ? { ...s, ...patch } : s)));
  };

  const updateStepImmediate = (stepId: string, patch: Partial<WorkflowStepDef>) => {
    const next = stepsDraft.map((s) => (s.id === stepId ? { ...s, ...patch } : s));
    setStepsDraft(next);
    commitSteps(next);
  };

  const addStep = () => {
    if (!canManage || !selected) return;
    const newStep: WorkflowStepDef = {
      id: `step-${Date.now()}`,
      order: stepsDraft.length + 1,
      name: `Step ${stepsDraft.length + 1}`,
      approverRole: 'underwriter',
    };
    const next = [...stepsDraft, newStep];
    setStepsDraft(next);
    commitSteps(next);
  };

  const removeStep = (stepId: string) => {
    if (!canManage) return;
    const next = stepsDraft.filter((s) => s.id !== stepId).map((s, index) => ({ ...s, order: index + 1 }));
    setStepsDraft(next);
    commitSteps(next);
  };

  return (
    <HorizonPage id="workflow-admin-view">
      <HorizonPageTitle
        title="Workflow & Approval Rules"
        subtitle="Administration"
        onBack={() => onNavigate('regulatory-admin')}
        actions={
          <button
            onClick={handleCreateDefinition}
            disabled={!canManage}
            className="hz-button hz-button-primary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {canManage ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            <span>New Workflow</span>
          </button>
        }
      />

      <HorizonPageContent>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_minmax(0,1fr)]">
          {/* Definitions list */}
          <div className="border-b lg:border-b-0 lg:border-r border-[var(--hz-divider)]">
            {definitions.map((def) => (
              <button
                key={def.id}
                onClick={() => setSelectedId(def.id)}
                className={`w-full text-left px-4 py-3 border-b border-[var(--hz-divider)] transition-colors ${
                  selected?.id === def.id ? 'bg-[var(--hz-selected)]' : 'hover:bg-[var(--hz-hover)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-[var(--hz-text-primary)] truncate">{def.name}</span>
                  <StatusBadge label={def.enabled ? 'Enabled' : 'Disabled'} tone={def.enabled ? 'success' : 'neutral'} />
                </div>
                <div className="mt-1 text-[11px] text-[var(--hz-text-subtle)]">
                  {DOCUMENT_TYPE_LABELS[def.documentType]} • {def.steps.length} step{def.steps.length === 1 ? '' : 's'}
                </div>
              </button>
            ))}
            {definitions.length === 0 && (
              <div className="p-4 text-xs text-[var(--hz-text-subtle)]">No workflows configured yet.</div>
            )}
          </div>

          {/* Selected definition editor */}
          <div className="p-5">
            {!selected ? (
              <div className="text-xs text-[var(--hz-text-subtle)]">Select or create a workflow to configure its approval steps.</div>
            ) : (
              <div className="space-y-5">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hz-text-subtle)]">Workflow Name</span>
                      <input
                        value={nameDraft}
                        onChange={(e) => setNameDraft(e.target.value)}
                        onBlur={commitName}
                        disabled={!canManage}
                        className="hz-field px-3 py-1.5 text-xs w-64"
                      />
                    </label>
                    <label className="space-y-1">
                      <span className="block text-[11px] font-medium text-[var(--hz-text-subtle)]">Applies To</span>
                      <select
                        value={selected.documentType}
                        onChange={(e) => updateDefType(selected, e.target.value as WorkflowDocumentType)}
                        disabled={!canManage}
                        className="hz-field px-3 py-1.5 text-xs"
                      >
                        {DOCUMENT_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {DOCUMENT_TYPE_LABELS[type]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-2 pb-1.5">
                      <input
                        type="checkbox"
                        checked={selected.enabled}
                        onChange={() => toggleEnabled(selected)}
                        disabled={!canManage}
                      />
                      <span className="text-xs font-semibold text-[var(--hz-text-primary)]">Enabled</span>
                    </label>
                  </div>

                  <button
                    onClick={() => handleDeleteDefinition(selected)}
                    disabled={!canManage}
                    className="hz-button hz-button-secondary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Delete Workflow</span>
                  </button>
                </div>

                {!selected.enabled && (
                  <p className="text-[11px] text-[var(--hz-warning)]">
                    This workflow is disabled — {DOCUMENT_TYPE_LABELS[selected.documentType].toLowerCase()} documents will not be
                    routed through it and will proceed without approval.
                  </p>
                )}

                <div className="overflow-x-auto border border-[var(--hz-border)] rounded-[var(--hz-radius-lg)]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[var(--hz-surface-subtle)] border-b border-[var(--hz-divider)] text-[10px] font-bold text-[var(--hz-text-subtle)] uppercase font-mono">
                        <th className="px-3 py-2.5">#</th>
                        <th className="px-3 py-2.5">Step Name</th>
                        <th className="px-3 py-2.5">Approver Role</th>
                        <th className="px-3 py-2.5">Branch Scope</th>
                        <th className="px-3 py-2.5">Min Amount (KES)</th>
                        <th className="px-3 py-2.5">Max Amount (KES)</th>
                        <th className="px-3 py-2.5" />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--hz-divider)]">
                      {stepsDraft.map((step) => (
                        <tr key={step.id} className="hover:bg-[var(--hz-hover)]">
                          <td className="px-3 py-2 font-mono font-bold text-[var(--hz-text-subtle)]">{step.order}</td>
                          <td className="px-3 py-2">
                            <input
                              value={step.name}
                              onChange={(e) => updateStepDraft(step.id, { name: e.target.value })}
                              onBlur={() => commitSteps(stepsDraft)}
                              disabled={!canManage}
                              className="hz-field px-2 py-1 text-xs w-full min-w-[160px]"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={step.approverRole}
                              onChange={(e) => updateStepImmediate(step.id, { approverRole: e.target.value as UserRole })}
                              disabled={!canManage}
                              className="hz-field px-2 py-1 text-xs"
                            >
                              {ALL_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <select
                              value={step.branchScope ?? ''}
                              onChange={(e) => updateStepImmediate(step.id, { branchScope: e.target.value || undefined })}
                              disabled={!canManage}
                              className="hz-field px-2 py-1 text-xs min-w-[160px]"
                            >
                              <option value="">Any Branch</option>
                              {branches.map((b) => (
                                <option key={b.id} value={b.name}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={step.minAmountKes ?? ''}
                              onChange={(e) =>
                                updateStepDraft(step.id, { minAmountKes: e.target.value ? Number(e.target.value) : undefined })
                              }
                              onBlur={() => commitSteps(stepsDraft)}
                              disabled={!canManage}
                              placeholder="No minimum"
                              className="hz-field px-2 py-1 text-xs w-32 font-mono"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="number"
                              value={step.maxAmountKes ?? ''}
                              onChange={(e) =>
                                updateStepDraft(step.id, { maxAmountKes: e.target.value ? Number(e.target.value) : undefined })
                              }
                              onBlur={() => commitSteps(stepsDraft)}
                              disabled={!canManage}
                              placeholder="No maximum"
                              className="hz-field px-2 py-1 text-xs w-32 font-mono"
                            />
                          </td>
                          <td className="px-3 py-2 text-right">
                            <button
                              onClick={() => removeStep(step.id)}
                              disabled={!canManage}
                              className="hz-icon-button disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Remove step"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                      {stepsDraft.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-3 py-6 text-center text-[var(--hz-text-subtle)]">
                            No steps configured — this workflow auto-approves every document.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <button
                  onClick={addStep}
                  disabled={!canManage}
                  className="hz-button hz-button-secondary !min-h-8 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Add Step</span>
                </button>

                <p className="text-[11px] text-[var(--hz-text-subtle)] max-w-2xl">
                  A step only applies when the document's amount falls within its Min/Max range (leave blank for no limit) and,
                  if a branch is set, only for documents from that branch. Steps run in order — if a document matches no steps
                  at all, it proceeds without approval. If it's rejected at any step, it does not proceed.
                </p>
              </div>
            )}
          </div>
        </div>
      </HorizonPageContent>

      <HorizonToast message={toastMessage} tone="success" />
    </HorizonPage>
  );
};
