import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { QuoteRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Send, XCircle } from 'lucide-react';
import { MODAL_IDS, useModalWrapper } from '../../store/modalStore';
import { NewQuoteModalPayload } from '../GlobalModals';
import { Money, StatusBadge, StatusMeta } from '../horizon';

const QUOTE_STATUS_META: Record<QuoteRecordItem['status'], StatusMeta> = {
  DRAFT: { tone: 'neutral', icon: FileText },
  QUOTED: { tone: 'info', icon: Send },
  REFERRAL: { tone: 'warning', icon: AlertTriangle },
  BOUND: { tone: 'success', icon: CheckCircle2 },
  DECLINED: { tone: 'danger', icon: XCircle },
};

interface QuotesListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const QuotesList: React.FC<QuotesListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const newQuoteModal = useModalWrapper<NewQuoteModalPayload>(MODAL_IDS.NEW_QUOTE);
  const [, forceRefresh] = useState(0);
  const quotes = recordsStore.getQuotes();

  const handleDeleteQuote = (quote: QuoteRecordItem) => {
    recordsStore.deleteQuote(quote.id);
    forceRefresh((n) => n + 1);
  };

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
      hideable: false,
      render: (q) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('quote-workspace', 'none', q.id);
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
              onNavigate('customer-workspace', 'none', q.customerId);
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
              onNavigate('broker-workspace', 'none', q.brokerId);
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
        <Money amount={q.sumInsuredKes} className="font-semibold text-slate-900" />
      ),
    },
    {
      key: 'premium',
      header: 'Annual Premium',
      align: 'right',
      render: (q) => (
        <Money amount={q.premiumKes} className="font-bold text-teal-700" />
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
        const meta = QUOTE_STATUS_META[q.status];
        return <StatusBadge label={q.status} tone={meta.tone} icon={meta.icon} />;
      },
    },
  ];

  return (
    <EnterpriseListPage<QuoteRecordItem>
      title="Quotation Register & Pipeline"
      subtitle="Horizon Sales & Rating Ledger: Technical underwriting pricing, broker submissions, and conversion tracking."
      primaryActionLabel="New Quotation"
      onPrimaryAction={() =>
        newQuoteModal.open({ onSuccess: (quoteId) => onNavigate('quote-workspace', 'none', quoteId) })
      }
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
      onRowClick={(q) => onNavigate('quote-workspace', 'none', q.id)}
      densityMode={densityMode}
      keyExtractor={(q) => q.id}
      onDeleteItem={handleDeleteQuote}
      getItemLabel={(q) => `quotation ${q.quoteNumber}`}
      deleteConfirmTitle="Delete this quotation?"
      deleteModuleId="quotations"
    />
  );
};
