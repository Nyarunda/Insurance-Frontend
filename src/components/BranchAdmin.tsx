import React, { useState } from 'react';
import { Ban, CheckCircle2 } from 'lucide-react';
import { ColumnDef, EnterpriseListPage, StatusTab } from './EnterpriseListPage';
import { BranchRecordItem, recordsStore } from '../data/recordsStore';
import { ScreenId, DensityMode } from '../types';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { NewBranchModal } from './modals/NewBranchModal';
import { HorizonToast, StatusBadge, StatusMeta } from './horizon';

interface BranchAdminProps {
  onNavigate: (screen: ScreenId) => void;
  densityMode: DensityMode;
}

const BRANCH_STATUS_META: Record<BranchRecordItem['status'], StatusMeta> = {
  ACTIVE: { tone: 'success', icon: CheckCircle2 },
  INACTIVE: { tone: 'danger', icon: Ban },
};

export const BranchAdmin: React.FC<BranchAdminProps> = ({ densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const newBranchModal = useModalWrapper(MODAL_IDS.NEW_BRANCH);
  const branches = recordsStore.getBranches();
  const users = recordsStore.getUsers();

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 2500);
  };

  const handleDeleteBranch = (branch: BranchRecordItem) => {
    recordsStore.deleteBranch(branch.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Branches', count: branches.length },
    { id: 'ACTIVE', label: 'Active', count: branches.filter((b) => b.status === 'ACTIVE').length },
    { id: 'INACTIVE', label: 'Inactive', count: branches.filter((b) => b.status === 'INACTIVE').length },
  ];

  const columns: ColumnDef<BranchRecordItem>[] = [
    {
      key: 'name',
      header: 'Branch',
      sortable: true,
      hideable: false,
      render: (b) => <span className="font-bold text-slate-900">{b.name}</span>,
    },
    {
      key: 'region',
      header: 'Region',
      render: (b) => <span className="text-xs text-slate-600">{b.region}</span>,
    },
    {
      key: 'staff',
      header: 'Staff Assigned',
      align: 'center',
      render: (b) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
          {users.filter((u) => u.branch === b.name).length}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (b) => {
        const meta = BRANCH_STATUS_META[b.status];
        return <StatusBadge label={b.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<BranchRecordItem>
        title="Branch Network"
        subtitle="Physical and virtual branches this tenant operates across, with staff assigned per branch."
        primaryActionLabel="Add Branch"
        onPrimaryAction={() => newBranchModal.open()}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={branches}
        columns={columns}
        searchPlaceholder="Search branch name or region..."
        searchFilter={(b, query) =>
          b.name.toLowerCase().includes(query.toLowerCase()) || b.region.toLowerCase().includes(query.toLowerCase())
        }
        tabFilter={(b, tab) => (tab === 'ALL' ? true : b.status === tab)}
        densityMode={densityMode}
        keyExtractor={(b) => b.id}
        onDeleteItem={handleDeleteBranch}
        getItemLabel={(b) => `branch ${b.name}`}
        deleteConfirmTitle="Delete this branch?"
        deleteModuleId="regulatory-admin"
      />

      <NewBranchModal
        isOpen={newBranchModal.isOpen}
        onClose={newBranchModal.close}
        existingNames={branches.map((b) => b.name)}
        onSuccess={(branch) => {
          recordsStore.addBranch(branch);
          forceRefresh((n) => n + 1);
          showToast(`${branch.name} added to the branch network.`);
        }}
      />

      <HorizonToast message={toastMessage} tone="success" />
    </>
  );
};
