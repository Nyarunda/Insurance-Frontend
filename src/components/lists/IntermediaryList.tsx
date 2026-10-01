import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { BrokerRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { AlertTriangle, Building2, CheckCircle2, Clock, ExternalLink } from 'lucide-react';
import { Money, StatusBadge, StatusMeta } from '../horizon';

const BROKER_COMPLIANCE_META: Record<BrokerRecordItem['complianceStatus'], StatusMeta> = {
  ACCREDITED: { tone: 'success', icon: CheckCircle2 },
  PROVISIONAL: { tone: 'warning', icon: Clock },
  'AUDIT REQUIRED': { tone: 'danger', icon: AlertTriangle },
};

interface IntermediaryListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const IntermediaryList: React.FC<IntermediaryListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [, forceRefresh] = useState(0);
  const brokers = recordsStore.getBrokers();

  const handleDeleteBroker = (broker: BrokerRecordItem) => {
    recordsStore.deleteBroker(broker.id);
    forceRefresh((n) => n + 1);
  };

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Intermediaries', count: brokers.length },
    { id: 'Wholesale Broker', label: 'Wholesale Brokers', count: brokers.filter((b) => b.type === 'Wholesale Broker').length },
    { id: 'Corporate Broker', label: 'Corporate Brokers', count: brokers.filter((b) => b.type === 'Corporate Broker').length },
    { id: 'Bancassurance', label: 'Bancassurance', count: brokers.filter((b) => b.type === 'Bancassurance').length },
  ];

  const columns: ColumnDef<BrokerRecordItem>[] = [
    {
      key: 'name',
      header: 'Intermediary Organization',
      sortable: true,
      hideable: false,
      render: (b) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('broker-workspace', 'none', b.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{b.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {b.id} • IRA Lic: {b.licenseNumber}
          </div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Channel Type',
      render: (b) => <span className="text-slate-700 font-sans">{b.type}</span>,
    },
    {
      key: 'policies',
      header: 'In-Force Book',
      align: 'center',
      render: (b) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-[3px] text-xs">
          {b.inForcePoliciesCount} Policies
        </span>
      ),
    },
    {
      key: 'annualGwp',
      header: 'Annual GWP',
      align: 'right',
      render: (b) => (
        <Money amount={b.annualGwpKes} compact className="font-bold text-slate-900" />
      ),
    },
    {
      key: 'lossRatio',
      header: 'Portfolio Loss Ratio',
      align: 'right',
      render: (b) => (
        <span className={`font-mono font-semibold ${b.lossRatioPct > 45 ? 'text-amber-600' : 'text-slate-700'}`}>
          {b.lossRatioPct}%
        </span>
      ),
    },
    {
      key: 'commission',
      header: 'Commission YTD',
      align: 'right',
      render: (b) => (
        <Money amount={b.commissionEarnedKes} compact className="font-semibold text-teal-700" />
      ),
    },
    {
      key: 'status',
      header: 'IRA Status',
      align: 'center',
      render: (b) => {
        const meta = BROKER_COMPLIANCE_META[b.complianceStatus];
        return <StatusBadge label={b.complianceStatus} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <EnterpriseListPage<BrokerRecordItem>
      title="Intermediary Network & Distribution"
      subtitle="Horizon Broker Ledger: Insurance Regulatory Authority (IRA) licensed brokers, agencies, and bancassurance partners."
      primaryActionLabel="Onboard Intermediary"
      onPrimaryAction={() => onNavigate('broker-workspace', 'none', brokers[0].id)}
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={brokers}
      columns={columns}
      searchPlaceholder="Search broker name, license number, channel type..."
      searchFilter={(b, query) =>
        b.name.toLowerCase().includes(query.toLowerCase()) ||
        b.licenseNumber.toLowerCase().includes(query.toLowerCase()) ||
        b.type.toLowerCase().includes(query.toLowerCase()) ||
        b.contactPerson.toLowerCase().includes(query.toLowerCase())
      }
      tabFilter={(b, tab) => (tab === 'ALL' ? true : b.type === tab)}
      onRowClick={(b) => onNavigate('broker-workspace', 'none', b.id)}
      densityMode={densityMode}
      keyExtractor={(b) => b.id}
      onDeleteItem={handleDeleteBroker}
      getItemLabel={(b) => `intermediary ${b.name}`}
      deleteConfirmTitle="Delete this intermediary?"
      deleteModuleId="intermediaries"
    />
  );
};
