import React, { useState } from 'react';
import {
  CheckSquare,
  AlertCircle,
  Clock,
  Filter,
  ArrowUpRight,
  ShieldCheck,
  CreditCard,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  UserCheck,
} from 'lucide-react';
import { AuthSession, ScreenId, UserRole, WorkTask, DensityMode } from '../types';
import { mockWorkTasks } from '../data/mockData';
import { recordsStore, WorkflowDocumentType } from '../data/recordsStore';
import { LiveDot, HorizonToast } from './horizon';
import { WorkflowReviewModal } from './modals/WorkflowReviewModal';

interface UniversalWorkQueueProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
  currentRole?: UserRole;
  sessionUser?: AuthSession;
}

const DOCUMENT_TYPE_SCREEN: Record<WorkflowDocumentType, ScreenId> = {
  QUOTE: 'quote-workspace',
  POLICY: 'policy-workspace',
  CLAIM: 'claim-workspace',
  PAYMENT: 'accounting-workbench',
};

const DOCUMENT_TYPE_LABEL: Record<WorkflowDocumentType, string> = {
  QUOTE: 'Quotation',
  POLICY: 'Policy',
  CLAIM: 'Claim',
  PAYMENT: 'Journal Entry',
};

export const UniversalWorkQueue: React.FC<UniversalWorkQueueProps> = ({
  onNavigate,
  densityMode,
  currentRole,
  sessionUser,
}) => {
  const [activeTab, setActiveTab] = useState<'assigned' | 'team' | 'unassigned' | 'approvals'>('assigned');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [tasks, setTasks] = useState<WorkTask[]>(mockWorkTasks);
  const [completedTaskId, setCompletedTaskId] = useState<string | null>(null);
  const [, forceRefresh] = useState(0);
  const [reviewingInstanceId, setReviewingInstanceId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const actorName = sessionUser?.name || 'Approver';
  const actorRole: UserRole = currentRole || 'underwriter';
  const pendingApprovals = recordsStore.getPendingWorkflowInstancesForApprover(actorRole);
  const reviewingInstance = reviewingInstanceId ? recordsStore.getWorkflowInstance(reviewingInstanceId) ?? null : null;

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleApproveInstance = (comment?: string) => {
    if (!reviewingInstance) return;
    if (reviewingInstance.documentType === 'PAYMENT') {
      recordsStore.approveJournalEntry(reviewingInstance.documentId, actorName, actorRole, comment);
    } else {
      recordsStore.approveWorkflowStep(reviewingInstance.id, actorName, actorRole, comment);
    }
    forceRefresh((n) => n + 1);
    setReviewingInstanceId(null);
    showToast(`${reviewingInstance.documentLabel} approved.`);
  };

  const handleRejectInstance = (comment?: string) => {
    if (!reviewingInstance) return;
    if (reviewingInstance.documentType === 'PAYMENT') {
      recordsStore.rejectJournalEntry(reviewingInstance.documentId, actorName, actorRole, comment);
    } else {
      recordsStore.rejectWorkflowStep(reviewingInstance.id, actorName, actorRole, comment);
    }
    forceRefresh((n) => n + 1);
    setReviewingInstanceId(null);
    showToast(`${reviewingInstance.documentLabel} rejected.`);
  };

  const handleOpenRecord = () => {
    if (!reviewingInstance) return;
    const screen = DOCUMENT_TYPE_SCREEN[reviewingInstance.documentType];
    onNavigate(screen, 'none', reviewingInstance.documentType === 'PAYMENT' ? undefined : reviewingInstance.documentId);
    setReviewingInstanceId(null);
  };

  const handleQuickApprove = (taskId: string) => {
    setCompletedTaskId(taskId);
    setTimeout(() => {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'Completed' } : t))
      );
      setCompletedTaskId(null);
    }, 600);
  };

  const handleRouteTask = (task: WorkTask) => {
    switch (task.sourceModule) {
      case 'Underwriting':
        onNavigate('underwriting-workbench');
        break;
      case 'Claims':
        onNavigate('claim-workspace');
        break;
      case 'Finance':
        onNavigate('accounting-workbench');
        break;
      case 'Endorsements':
      case 'Reinsurance':
      case 'KYC':
        onNavigate('policy-workspace');
        break;
      default:
        onNavigate('underwriting-workbench');
    }
  };

  const filteredTasks = tasks.filter((task) => {
    if (activeTab === 'assigned' && task.assignedTo === 'Compliance Team') return false;
    if (activeTab === 'team' && task.status === 'Completed') return false;
    if (activeTab === 'unassigned' && task.assignedTo !== 'Compliance Team') return false;

    if (moduleFilter !== 'all' && task.sourceModule !== moduleFilter) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        task.title.toLowerCase().includes(q) ||
        task.referenceId.toLowerCase().includes(q) ||
        task.insuredName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadge = (priority: WorkTask['priority']) => {
    switch (priority) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <LiveDot tone="danger" />
            HIGH
          </span>
        );
      case 'MED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            MED
          </span>
        );
      case 'NORMAL':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            NORMAL
          </span>
        );
    }
  };

  const paddingClass =
    densityMode === 'compact' ? 'py-2 px-3' : densityMode === 'spacious' ? 'py-4 px-4' : 'py-3 px-4';

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Header Banner */}
      <div className="hz-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-lg bg-teal-50 text-teal-700 border border-teal-200/60">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">Universal Work Queue</h1>
                <span className="px-2 py-0.5 rounded-[3px] text-xs font-mono font-bold bg-rose-100 text-rose-800">
                  23 Pending Tasks
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Centralized multi-disciplinary operational inbox across Underwriting, Claims, Finance, and KYC
              </p>
            </div>
          </div>
        </div>

        {/* Quick Summary Badges */}
        <div className="flex items-center gap-2 text-xs">
          <div className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span className="font-semibold">2 High Priority</span>
            <span className="text-xs text-rose-600">(1 SLA Overdue)</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="font-semibold">2 Medium</span>
          </div>
        </div>
      </div>

      {/* Control Bar: Tabs, Module Filter, Search */}
      <div className="hz-panel p-3 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
        {/* Tab Filters */}
        <div className="flex items-center p-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">
          <button
            onClick={() => setActiveTab('assigned')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'assigned'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Assigned to me (5)
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'team'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            My Team (14)
          </button>
          <button
            onClick={() => setActiveTab('unassigned')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'unassigned'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Unassigned (1)
          </button>
          <button
            onClick={() => setActiveTab('approvals')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              activeTab === 'approvals'
                ? 'bg-white text-slate-900 shadow-2xs'
                : 'hover:text-slate-900'
            }`}
          >
            Requests to Approve ({pendingApprovals.length})
          </button>
        </div>

        {/* Module Filter Pills & Search */}
        {activeTab !== 'approvals' && (
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-slate-400 mr-1" />
              {(['all', 'Underwriting', 'Claims', 'Finance', 'Endorsements', 'Reinsurance', 'KYC'] as const).map(
                (m) => (
                  <button
                    key={m}
                    onClick={() => setModuleFilter(m)}
                    className={`px-2 py-1 rounded text-xs transition-colors ${
                      moduleFilter === m
                        ? 'bg-teal-600 text-white font-semibold'
                        : 'bg-slate-100 hover:bg-slate-200/80 text-slate-600'
                    }`}
                  >
                    {m === 'all' ? 'All Modules' : m}
                  </button>
                )
              )}
            </div>

            <div className="relative min-w-[200px] max-w-xs">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter tasks..."
                className="w-full pl-8 pr-3 py-1.5 rounded-md text-xs border border-slate-200 focus:outline-hidden focus:border-teal-500 bg-slate-50"
              />
            </div>
          </div>
        )}
      </div>

      {/* Requests to Approve */}
      {activeTab === 'approvals' && (
        <div className="hz-panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                  <th className={paddingClass}>Type</th>
                  <th className={paddingClass}>Reference</th>
                  <th className={paddingClass}>Amount</th>
                  <th className={paddingClass}>Branch</th>
                  <th className={paddingClass}>Current Step</th>
                  <th className={paddingClass}>Requested By</th>
                  <th className={`${paddingClass} text-right`}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {pendingApprovals.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="text-sm font-medium text-slate-700">Nothing waiting on your approval</p>
                      <p className="text-xs text-slate-400 mt-1">Requests routed to your Role Center will appear here.</p>
                    </td>
                  </tr>
                ) : (
                  pendingApprovals.map((instance) => {
                    const currentStep = instance.applicableSteps[instance.currentStepIndex];
                    return (
                      <tr key={instance.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className={paddingClass}>
                          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                            {DOCUMENT_TYPE_LABEL[instance.documentType]}
                          </span>
                        </td>
                        <td className={paddingClass}>
                          <span className="font-semibold text-slate-900">{instance.documentLabel}</span>
                        </td>
                        <td className={paddingClass}>
                          <span className="font-mono font-bold text-slate-900">KES {instance.amountKes.toLocaleString()}</span>
                        </td>
                        <td className={paddingClass}>
                          <span className="text-slate-600">{instance.branch}</span>
                        </td>
                        <td className={paddingClass}>
                          <span className="text-teal-700 font-semibold">{currentStep?.name}</span>
                        </td>
                        <td className={paddingClass}>
                          <span className="text-slate-600 font-medium">{instance.initiatedBy}</span>
                        </td>
                        <td className={`${paddingClass} text-right`}>
                          <button
                            onClick={() => setReviewingInstanceId(instance.id)}
                            className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs border border-teal-200/60"
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Task Table */}
      {activeTab !== 'approvals' && (
      <div className="hz-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                <th className={paddingClass}>Priority</th>
                <th className={paddingClass}>Task & Reference</th>
                <th className={paddingClass}>Insured Party</th>
                <th className={paddingClass}>Source Module</th>
                <th className={paddingClass}>Age</th>
                <th className={paddingClass}>SLA Deadline</th>
                <th className={paddingClass}>Assigned To</th>
                <th className={`${paddingClass} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredTasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                    <p className="text-sm font-medium text-slate-700">No pending work items in this view</p>
                    <p className="text-xs text-slate-400 mt-1">All SLAs are healthy and clear</p>
                  </td>
                </tr>
              ) : (
                filteredTasks.map((task) => {
                  const isCompleted = task.status === 'Completed' || completedTaskId === task.id;
                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isCompleted ? 'bg-slate-50/60 opacity-60' : ''
                      }`}
                    >
                      <td className={paddingClass}>{getPriorityBadge(task.priority)}</td>
                      <td className={paddingClass}>
                        <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                          <span>{task.title}</span>
                          {task.amount && (
                            <span className="font-mono text-slate-500 text-xs">
                              (KES {task.amount.toLocaleString()})
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-xs text-teal-700 font-medium">
                          {task.referenceId}
                        </div>
                      </td>
                      <td className={paddingClass}>
                        <span className="font-medium text-slate-800">{task.insuredName}</span>
                      </td>
                      <td className={paddingClass}>
                        <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                          {task.sourceModule}
                        </span>
                      </td>
                      <td className={paddingClass}>
                        <span className="text-slate-500 font-mono text-xs">{task.age}</span>
                      </td>
                      <td className={paddingClass}>
                        <div
                          className={`font-mono text-xs font-semibold flex items-center gap-1 ${
 task.slaOverdue ? 'text-rose-700' : 'text-slate-700'
 }`}
                        >
                          <Clock className="w-3 h-3" />
                          <span>{task.sla}</span>
                        </div>
                      </td>
                      <td className={paddingClass}>
                        <span className="text-slate-600 font-medium">{task.assignedTo}</span>
                      </td>
                      <td className={`${paddingClass} text-right`}>
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleRouteTask(task)}
                            className="px-2.5 py-1 rounded bg-teal-50 hover:bg-teal-100 text-teal-800 font-semibold text-xs flex items-center gap-1 transition-colors border border-teal-200/60"
                          >
                            <span>Open</span>
                            <ArrowUpRight className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleQuickApprove(task.id)}
                            disabled={isCompleted}
                            className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
 isCompleted
 ? 'bg-emerald-100 text-emerald-800'
 : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
 }`}
                          >
                            {isCompleted ? 'Approved ✓' : 'Approve'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      <WorkflowReviewModal
        instance={reviewingInstance}
        onClose={() => setReviewingInstanceId(null)}
        onApprove={handleApproveInstance}
        onReject={handleRejectInstance}
        onOpenRecord={handleOpenRecord}
      />

      <HorizonToast message={toastMessage} tone="success" />
    </div>
  );
};
