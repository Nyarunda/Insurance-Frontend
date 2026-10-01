import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ClaimRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { MODAL_IDS, useModalWrapper } from '../../store/modalStore';
import { NewClaimModalPayload } from '../GlobalModals';
import { Money, StatusBadge, StatusTone } from '../horizon';

/** Color carries business state only: pending work is blue, completed is green. */
const CLAIM_STATUS_TONE: Record<ClaimRecordItem['status'], StatusTone> = {
  FNOL: 'info',
  ASSESSMENT: 'info',
  VALIDATION: 'info',
  APPROVAL: 'info',
  SETTLEMENT: 'info',
  CLOSED: 'success',
};

const formatLossDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' });
};

const linkClass = 'text-[var(--hz-primary-700)] hover:underline cursor-pointer';

interface ClaimsListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const ClaimsList: React.FC<ClaimsListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const newClaimModal = useModalWrapper<NewClaimModalPayload>(MODAL_IDS.NEW_CLAIM);
  const [, forceRefresh] = useState(0);
  const claims = recordsStore.getClaims();

  const handleDeleteClaim = (claim: ClaimRecordItem) => {
    recordsStore.deleteClaim(claim.id);
    forceRefresh((n) => n + 1);
  };

  const countBy = (status: ClaimRecordItem['status']) => claims.filter((c) => c.status === status).length;

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All', count: claims.length },
    { id: 'FNOL', label: 'FNOL', count: countBy('FNOL') },
    { id: 'ASSESSMENT', label: 'Assessing', count: countBy('ASSESSMENT') },
    { id: 'VALIDATION', label: 'Validation', count: countBy('VALIDATION') },
    { id: 'APPROVAL', label: 'Pending Approval', count: countBy('APPROVAL') },
    { id: 'CLOSED', label: 'Settled', count: countBy('CLOSED') },
  ];

  const columns: ColumnDef<ClaimRecordItem>[] = [
    {
      key: 'claimNumber',
      header: 'Claim No.',
      sortable: true,
      hideable: false,
      sortValue: (c) => c.claimNumber,
      render: (c) => <span className="font-semibold text-[var(--hz-primary-700)]">{c.claimNumber}</span>,
    },
    {
      key: 'policy',
      header: 'Policy',
      render: (c) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('policy-workspace', 'none', c.policyNumber);
          }}
          className={linkClass}
        >
          {c.policyNumber}
        </span>
      ),
    },
    {
      key: 'customer',
      header: 'Insured',
      sortable: true,
      sortValue: (c) => c.customerName,
      render: (c) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('customer-workspace', 'none', c.customerId);
          }}
          className="block max-w-[220px] cursor-pointer truncate hover:underline"
          title={c.customerName}
        >
          {c.customerName}
        </span>
      ),
    },
    {
      key: 'lossType',
      header: 'Loss Type',
      render: (c) => (
        <span className="block max-w-[200px] truncate text-[var(--hz-text-secondary)]" title={c.lossType}>
          {c.lossType}
        </span>
      ),
    },
    {
      key: 'reserve',
      header: 'Reserve KES',
      align: 'right',
      sortable: true,
      sortValue: (c) => c.outstandingReserveKes,
      render: (c) => <Money amount={c.outstandingReserveKes} currency="" className="font-semibold" />,
    },
    {
      key: 'lossDate',
      header: 'Loss Date',
      sortable: true,
      sortValue: (c) => c.lossDate,
      render: (c) => <span className="tabular-nums">{formatLossDate(c.lossDate)}</span>,
    },
    {
      key: 'assessor',
      header: 'Assessor',
      defaultHidden: true,
      render: (c) =>
        c.assessorId ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('provider-workspace', 'none', c.assessorId);
            }}
            className={`${linkClass} block max-w-[160px] truncate`}
            title={c.assessorName}
          >
            {c.assessorName}
          </span>
        ) : (
          <span className="block max-w-[160px] truncate text-[var(--hz-text-muted)]" title={c.assessorName}>
            {c.assessorName}
          </span>
        ),
    },
    {
      key: 'sla',
      header: 'SLA',
      align: 'right',
      sortable: true,
      sortValue: (c) => c.slaRemainingHours,
      render: (c) => (
        <span
          className={`tabular-nums ${
            c.slaRemainingHours <= 4 && c.status !== 'CLOSED' ? 'font-semibold text-[var(--hz-danger-text)]' : 'text-[var(--hz-text-secondary)]'
          }`}
        >
          {c.status === 'CLOSED' ? '—' : `${c.slaRemainingHours}h left`}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (c) => <StatusBadge label={c.status} tone={CLAIM_STATUS_TONE[c.status]} />,
    },
  ];

  return (
    <EnterpriseListPage<ClaimRecordItem>
      title="Claims"
      subtitle="Manage notification, assessment, reserves and settlement."
      primaryActionLabel="New FNOL"
      onPrimaryAction={() =>
        newClaimModal.open({ onSuccess: (claimId) => onNavigate('claim-workspace', 'none', claimId) })
      }
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={claims}
      columns={columns}
      searchPlaceholder="Search claims…"
      searchFilter={(c, query) => {
        const q = query.toLowerCase();
        return (
          c.claimNumber.toLowerCase().includes(q) ||
          c.policyNumber.toLowerCase().includes(q) ||
          c.customerName.toLowerCase().includes(q) ||
          c.lossType.toLowerCase().includes(q) ||
          c.assessorName.toLowerCase().includes(q)
        );
      }}
      tabFilter={(c, tab) => (tab === 'ALL' ? true : c.status === tab)}
      onRowClick={(c) => onNavigate('claim-workspace', 'none', c.id)}
      densityMode={densityMode}
      keyExtractor={(c) => c.id}
      onDeleteItem={handleDeleteClaim}
      getItemLabel={(c) => `claim ${c.claimNumber}`}
      deleteConfirmTitle="Delete this claim?"
      deleteModuleId="claims"
      footerSummary={(rows) => (
        <>
          Total Reserve: <Money amount={rows.reduce((sum, c) => sum + c.outstandingReserveKes, 0)} />
        </>
      )}
    />
  );
};
