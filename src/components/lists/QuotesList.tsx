import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { QuoteRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, FileText } from 'lucide-react';
import { NewQuoteWizardModal } from '../modals/NewQuoteWizardModal';

interface QuotesListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const QuotesList: React.FC<QuotesListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const [isNewQuoteModalOpen, setIsNewQuoteModalOpen] = useState(false);
  const quotes = recordsStore.getQuotes();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Quotes', count: quotes.length },
    { id: 'QUOTED', label: 'Quoted', count: quotes.filter((q) => q.status === 'QUOTED').length },
    { id: 'BOUND', label: 'Bound', count: quotes.filter((q) => q.status === 'BOUND').length },
    { id: 'REFERRAL', label: 'Referral Required', count: quotes.filter((q) => q.status === 'REFERRAL').length },
  ];

  const columns: ColumnDef<QuoteRecordItem>[] = [
    {
      key: 'quoteNumber',
      header: 'Quote Ref',
      sortable: true,
      render: (q) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('quote-360', 'none', q.id);
            }}
            className="font-mono font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{q.quoteNumber}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-sans">{q.lineOfBusiness}</div>
        </div>
      ),
    },
    {
      key: 'customer',
      header: 'Customer / Insured',
      render: (q) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('customer-360', 'none', q.customerId);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer"
          >
            {q.customerName}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">{q.customerId}</div>
        </div>
      ),
    },
    {
      key: 'broker',
      header: 'Intermediary',
      render: (q) => (
        <span
          onClick={(e) => {
            if (q.brokerId) {
              e.stopPropagation();
              onNavigate('broker-360', 'none', q.brokerId);
            }
          }}
          className={`text-xs ${q.brokerId ? 'text-teal-700 hover:underline cursor-pointer' : 'text-slate-600'}`}
        >
          {q.brokerName}
        </span>
      ),
    },
    {
      key: 'sumInsured',
      header: 'Sum Insured',
      align: 'right',
      render: (q) => (
        <span className="font-mono font-semibold text-slate-900">
          KES {q.sumInsuredKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'premium',
      header: 'Annual Premium',
      align: 'right',
      render: (q) => (
        <span className="font-mono font-bold text-teal-700">
          KES {q.premiumKes.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      align: 'center',
      render: (q) => (
        <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-100 font-bold text-slate-700">
          {q.riskScore}/100
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (q) => {
        let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';
        if (q.status === 'BOUND') badgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        if (q.status === 'QUOTED') badgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
        if (q.status === 'REFERRAL') badgeClass = 'bg-amber-50 text-amber-700 border-amber-200';

        return (
          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold border ${badgeClass}`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current" />
            {q.status}
          </span>
        );
      },
    },
  ];

  return (
    <>
      <EnterpriseListPage<QuoteRecordItem>
        title="Quotation Register & Pipeline"
        subtitle="Horizon Sales & Rating Ledger: Technical underwriting pricing, broker submissions, and conversion tracking."
        primaryActionLabel="+ New Quotation"
        onPrimaryAction={() => setIsNewQuoteModalOpen(true)}
        statusTabs={statusTabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        data={quotes}
        columns={columns}
        searchPlaceholder="Search quote number, customer, broker, line of business..."
        searchFilter={(q, query) =>
          q.quoteNumber.toLowerCase().includes(query.toLowerCase()) ||
          q.customerName.toLowerCase().includes(query.toLowerCase()) ||
          q.brokerName.toLowerCase().includes(query.toLowerCase()) ||
          q.lineOfBusiness.toLowerCase().includes(query.toLowerCase())
        }
        tabFilter={(q, tab) => (tab === 'ALL' ? true : q.status === tab)}
        onRowClick={(q) => onNavigate('quote-360', 'none', q.id)}
        densityMode={densityMode}
        keyExtractor={(q) => q.id}
      />

      <NewQuoteWizardModal
        isOpen={isNewQuoteModalOpen}
        onClose={() => setIsNewQuoteModalOpen(false)}
        onSuccess={(quoteId) => onNavigate('quote-360', 'none', quoteId)}
      />
    </>
  );
};
