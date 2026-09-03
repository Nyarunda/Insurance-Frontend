import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  Download,
  Plus,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  SlidersHorizontal,
  RefreshCw,
  Eye,
  FileSpreadsheet
} from 'lucide-react';
import { DensityMode } from '../types';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
}

export interface StatusTab {
  id: string;
  label: string;
  count?: number;
}

interface EnterpriseListPageProps<T> {
  title: string;
  subtitle: string;
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
  statusTabs: StatusTab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  data: T[];
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchFilter: (item: T, query: string) => boolean;
  tabFilter: (item: T, activeTab: string) => boolean;
  onRowClick?: (item: T) => void;
  densityMode: DensityMode;
  keyExtractor: (item: T) => string;
}

export function EnterpriseListPage<T>({
  title,
  subtitle,
  primaryActionLabel,
  onPrimaryAction,
  statusTabs,
  activeTab,
  onTabChange,
  data,
  columns,
  searchPlaceholder = 'Search records...',
  searchFilter,
  tabFilter,
  onRowClick,
  densityMode,
  keyExtractor,
}: EnterpriseListPageProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showExportToast, setShowExportToast] = useState(false);

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      const matchesTab = tabFilter(item, activeTab);
      if (!matchesTab) return false;
      if (!searchQuery.trim()) return true;
      return searchFilter(item, searchQuery);
    });
  }, [data, activeTab, searchQuery, tabFilter, searchFilter]);

  // Paginated dataset
  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('asc');
    }
  };

  const handleExport = () => {
    setShowExportToast(true);
    setTimeout(() => setShowExportToast(false), 3000);
  };

  const cellPadding =
    densityMode === 'compact'
      ? 'py-2 px-3 text-xs'
      : densityMode === 'spacious'
      ? 'py-3.5 px-4 text-sm'
      : 'py-2.5 px-3.5 text-xs';

  return (
    <div className="space-y-4 pb-12 animate-in fade-in duration-150">
      {/* Toast */}
      {showExportToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-bottom-2">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span>Exporting {filteredData.length} records to CSV/Excel...</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold font-mono tracking-tight text-slate-900 uppercase">{title}</h1>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              {data.length.toLocaleString()} Records
            </span>
          </div>
          <p className="text-xs text-slate-500 font-sans mt-0.5">{subtitle}</p>
        </div>

        {primaryActionLabel && onPrimaryAction && (
          <button
            onClick={onPrimaryAction}
            className="px-3.5 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{primaryActionLabel}</span>
          </button>
        )}
      </div>

      {/* Controls Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-3 space-y-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-slate-100 scrollbar-none">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  onTabChange(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-slate-800 text-slate-200' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search, Filters, and Export */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 font-sans"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setSearchQuery('')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1 cursor-pointer"
              title="Reset search"
            >
              <RefreshCw className="w-3 h-3 text-slate-500" />
              <span>Reset</span>
            </button>

            <button
              onClick={handleExport}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export</span>
            </button>
          </div>
        </div>

        {/* Horizon Interactive Data Table */}
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-mono uppercase text-slate-500">
                {columns.map((col) => (
                  <th
                    key={col.key}
                    onClick={() => col.sortable && handleSort(col.key)}
                    className={`${cellPadding} font-semibold ${
                      col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                    } ${col.sortable ? 'cursor-pointer hover:bg-slate-100 transition-colors' : ''}`}
                  >
                    <div
                      className={`inline-flex items-center gap-1.5 ${
                        col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'
                      }`}
                    >
                      <span>{col.header}</span>
                      {col.sortable && <ArrowUpDown className="w-3 h-3 text-slate-400" />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-xs font-mono">
                    No matching records found. Try adjusting your search query or status filter.
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const key = keyExtractor(item);
                  return (
                    <tr
                      key={key}
                      onClick={() => onRowClick && onRowClick(item)}
                      className={`hover:bg-slate-50/90 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      }`}
                    >
                      {columns.map((col) => (
                        <td
                          key={`${key}-${col.key}`}
                          className={`${cellPadding} ${
                            col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'
                          }`}
                        >
                          {col.render(item)}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Summary Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>
              Showing {filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}–
              {Math.min(currentPage * pageSize, filteredData.length)} of {filteredData.length}
            </span>
            <span className="text-slate-300">•</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-xs text-slate-700 focus:outline-none"
            >
              <option value={5}>5 / page</option>
              <option value={10}>10 / page</option>
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono text-xs px-2 text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-slate-200 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
