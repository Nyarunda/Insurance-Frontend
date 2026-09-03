import React, { useState } from 'react';
import { EnterpriseListPage, ColumnDef, StatusTab } from '../EnterpriseListPage';
import { ProductRecordItem, recordsStore } from '../../data/recordsStore';
import { ScreenId, DensityMode } from '../../types';
import { ExternalLink, Layers } from 'lucide-react';

interface ProductListProps {
  onNavigate: (screen: ScreenId, transition?: 'none' | 'push', recordId?: string) => void;
  densityMode: DensityMode;
}

export const ProductList: React.FC<ProductListProps> = ({ onNavigate, densityMode }) => {
  const [activeTab, setActiveTab] = useState('ALL');
  const products = recordsStore.getProducts();

  const statusTabs: StatusTab[] = [
    { id: 'ALL', label: 'All Products', count: products.length },
    { id: 'Commercial Motor', label: 'Commercial Motor', count: products.filter((p) => p.category === 'Commercial Motor').length },
    { id: 'Personal Lines', label: 'Personal Lines', count: products.filter((p) => p.category === 'Personal Lines').length },
    { id: 'Health & Medical', label: 'Health & Medical', count: products.filter((p) => p.category === 'Health & Medical').length },
    { id: 'Property & Fire', label: 'Property & Fire', count: products.filter((p) => p.category === 'Property & Fire').length },
  ];

  const columns: ColumnDef<ProductRecordItem>[] = [
    {
      key: 'name',
      header: 'Product Name & Code',
      sortable: true,
      render: (p) => (
        <div>
          <div
            onClick={(e) => {
              e.stopPropagation();
              onNavigate('product-360', 'none', p.id);
            }}
            className="font-bold text-slate-900 hover:text-teal-600 transition-colors cursor-pointer flex items-center gap-1"
          >
            <span>{p.name}</span>
            <ExternalLink className="w-3 h-3 text-slate-400" />
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            {p.productCode} • IRA Ref: {p.iraFilingReference}
          </div>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'Line of Business',
      render: (p) => <span className="text-slate-700 font-sans">{p.category}</span>,
    },
    {
      key: 'baseRate',
      header: 'Technical Tariff Rate',
      align: 'right',
      render: (p) => (
        <span className="font-mono font-bold text-slate-800">
          {p.baseRatePct}%
        </span>
      ),
    },
    {
      key: 'policies',
      header: 'In-Force Policies',
      align: 'center',
      render: (p) => (
        <span className="font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-full text-xs">
          {p.inForcePoliciesCount.toLocaleString()}
        </span>
      ),
    },
    {
      key: 'annualGwp',
      header: 'Annual GWP',
      align: 'right',
      render: (p) => (
        <span className="font-mono font-bold text-slate-900">
          KES {(p.annualGwpKes / 1000000).toFixed(1)}M
        </span>
      ),
    },
    {
      key: 'combinedRatio',
      header: 'Combined Ratio',
      align: 'right',
      render: (p) => (
        <span className={`font-mono font-bold ${p.combinedRatioPct > 85 ? 'text-amber-600' : 'text-emerald-700'}`}>
          {p.combinedRatioPct}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      align: 'center',
      render: (p) => (
        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          {p.status}
        </span>
      ),
    },
  ];

  return (
    <EnterpriseListPage<ProductRecordItem>
      title="Product Catalog & Underwriting Rules"
      subtitle="Horizon Insurance Product Factory: Rating models, underwriting guidelines, and regulatory filings."
      primaryActionLabel="+ Define Product Architecture"
      onPrimaryAction={() => onNavigate('product-360', 'none', products[0].id)}
      statusTabs={statusTabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      data={products}
      columns={columns}
      searchPlaceholder="Search product name, code, IRA filing reference..."
      searchFilter={(p, query) =>
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.productCode.toLowerCase().includes(query.toLowerCase()) ||
        p.category.toLowerCase().includes(query.toLowerCase()) ||
        p.iraFilingReference.toLowerCase().includes(query.toLowerCase())
      }
      tabFilter={(p, tab) => (tab === 'ALL' ? true : p.category === tab)}
      onRowClick={(p) => onNavigate('product-360', 'none', p.id)}
      densityMode={densityMode}
      keyExtractor={(p) => p.id}
    />
  );
};
