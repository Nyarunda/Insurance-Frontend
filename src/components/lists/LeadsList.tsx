import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { LeadRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ArrowRightCircle, Building2, CheckCircle2, PhoneCall, Sparkles, User, XCircle } from 'lucide-react';
import { MODAL_IDS, useModalWrapper } from '../../store/modalStore';
import { NewLeadModal } from '../modals/NewLeadModal';
import { HorizonToast, Money, StatusBadge, StatusMeta } from '../horizon';

const STAGE_META: Record<LeadRecordItem['stage'], StatusMeta> = {
  NEW: { tone: 'info', icon: Sparkles },
  CONTACTED: { tone: 'info', icon: PhoneCall },
  QUALIFIED: { tone: 'warning', icon: CheckCircle2 },
  CONVERTED: { tone: 'success', icon: CheckCircle2 },
  LOST: { tone: 'danger', icon: XCircle },
};

interface LeadsListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const LeadsList: React.FC<LeadsListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [, forceRefresh] = useState(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const newLeadModal = useModalWrapper(MODAL_IDS.NEW_LEAD);
  const leads = recordsStore.getLeads();

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteLead = (lead: LeadRecordItem) => {
    recordsStore.deleteLead(lead.id);
    forceRefresh((n) => n + 1);
  };

  const handleConvert = (lead: LeadRecordItem) => {
    const customer = recordsStore.convertLeadToCustomer(lead.id);
    forceRefresh((n) => n + 1);
    if (customer) {
      showToast(`${lead.name} converted to customer ${customer.id}. Pending KYC review.`);
    }
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Leads', count: leads.length },
    { id: 'NEW', label: 'New', count: leads.filter((l) => l.stage === 'NEW').length },
    { id: 'CONTACTED', label: 'Contacted', count: leads.filter((l) => l.stage === 'CONTACTED').length },
    { id: 'QUALIFIED', label: 'Qualified', count: leads.filter((l) => l.stage === 'QUALIFIED').length },
    { id: 'CONVERTED', label: 'Converted', count: leads.filter((l) => l.stage === 'CONVERTED').length },
    { id: 'LOST', label: 'Lost', count: leads.filter((l) => l.stage === 'LOST').length },
  ];

  const columns: ColumnDef<LeadRecordItem>[] = [
    {
      key: 'name',
      header: 'Lead / Prospect',
      sortable: true,
      hideable: false,
      render: (l) => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
            {l.customerType === 'Corporate' ? <Building2 className="w-3.5 h-3.5 text-teal-600" /> : <User className="w-3.5 h-3.5 text-blue-600" />}
          </div>
          <div>
            <div className="font-bold text-slate-900">{l.name}</div>
            <div className="text-[11px] text-slate-500">{l.contactPerson}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Source',
      render: (l) => <span className="text-xs text-slate-600">{l.source}</span>,
    },
    {
      key: 'interest',
      header: 'Line of Business Interest',
      render: (l) => <span className="text-xs text-slate-600">{l.lineOfBusinessInterest}</span>,
    },
    {
      key: 'estimatedPremium',
      header: 'Est. Premium',
      align: 'right',
      render: (l) => <Money amount={l.estimatedPremiumKes} className="font-semibold text-teal-700" />,
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      render: (l) => <span className="text-xs text-slate-600">{l.assignedTo}</span>,
    },
    {
      key: 'stage',
      header: 'Stage',
      align: 'center',
      render: (l) => {
        const meta = STAGE_META[l.stage];
        return (
          <div className="flex items-center justify-center gap-2">
            <StatusBadge label={l.stage} tone={meta.tone} icon={meta.icon} />
            {(l.stage === 'NEW' || l.stage === 'CONTACTED' || l.stage === 'QUALIFIED') && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleConvert(l);
                }}
                title="Convert to Customer"
                className="p-1 rounded hover:bg-teal-50 text-teal-600 hover:text-teal-800 transition-colors"
              >
                <ArrowRightCircle className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<LeadRecordItem>
        title="Sales Pipeline & Leads"
        subtitle="Prospects not yet onboarded as customers — track stage, ownership, and convert once qualified."
        primaryActionLabel="Capture Lead"
        onPrimaryAction={() => newLeadModal.open()}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={leads}
        columns={columns}
        searchPlaceholder="Search lead name, contact person, line of business..."
        searchFilter={(l, query) =>
          l.name.toLowerCase().includes(query.toLowerCase()) ||
          l.contactPerson.toLowerCase().includes(query.toLowerCase()) ||
          l.lineOfBusinessInterest.toLowerCase().includes(query.toLowerCase())
        }
        tabFilter={(l, tab) => (tab === 'ALL' ? true : l.stage === tab)}
        densityMode={densityMode}
        keyExtractor={(l) => l.id}
        onDeleteItem={handleDeleteLead}
        getItemLabel={(l) => `lead ${l.name}`}
        deleteConfirmTitle="Delete this lead?"
        deleteModuleId="customers"
      />

      <NewLeadModal
        isOpen={newLeadModal.isOpen}
        onClose={newLeadModal.close}
        onSuccess={(lead) => {
          recordsStore.addLead(lead);
          forceRefresh((n) => n + 1);
          showToast(`${lead.name} added to the pipeline.`);
        }}
      />

      <HorizonToast message={toastMessage} tone="success" />
    </>
  );
};
