import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  ExternalLink,
  Filter,
  HelpCircle,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
} from 'lucide-react';
import { DensityMode } from '../types';
import { HorizonPage, HorizonPageTitle, HorizonToast } from './horizon';
import { ConfirmDeleteModal } from './modals/ConfirmDeleteModal';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { ModuleId } from '../data/roleRights';
import { useHasPermission } from '../store/permissionStore';

export interface ColumnDef<T> {
  key: string;
  header: string;
  align?: 'left' | 'center' | 'right';
  render: (item: T) => React.ReactNode;
  sortable?: boolean;
  hideable?: boolean;
  /** Hidden until the user turns it on from the Columns menu. */
  defaultHidden?: boolean;
  /** Plain value used for sorting when the column is sortable. */
  sortValue?: (item: T) => string | number;
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
  onDeleteItem?: (item: T) => void;
  getItemLabel?: (item: T) => string;
  deleteConfirmTitle?: string;
  deleteModuleId?: ModuleId;
  bulkSyncLabel?: string;
  onBulkSync?: () => void;
  helpText?: string;
  /** Totals row content for the filtered set, e.g. "Total Reserve: KES 1,732,000.00". */
  footerSummary?: (filtered: T[]) => React.ReactNode;
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
  searchPlaceholder = 'Search records…',
  searchFilter,
  tabFilter,
  onRowClick,
  keyExtractor,
  onDeleteItem,
  getItemLabel,
  deleteConfirmTitle = 'Delete this record?',
  deleteModuleId,
  bulkSyncLabel = 'Bulk Sync',
  onBulkSync,
  helpText = 'Search, filter and open records in this list. Column visibility is remembered per list. Use ↑ / ↓ to move the selection and Enter to open a record.',
  footerSummary,
}: EnterpriseListPageProps<T>) {
  const canDelete = useHasPermission(deleteModuleId ?? 'customers', 'delete') && !!deleteModuleId;
  const [searchQuery, setSearchQuery] = useState('');
  const [pageSize, setPageSize] = useState(50);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showExportToast, setShowExportToast] = useState(false);
  const [syncToastMessage, setSyncToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const confirmDeleteModal = useModalWrapper<T>(MODAL_IDS.CONFIRM_DELETE);
  const gridRef = useRef<HTMLDivElement>(null);

  const columnsStorageKey = `hz-list-hidden-columns:${title}`;
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(() => {
    try {
      const stored = window.localStorage.getItem(columnsStorageKey);
      if (stored) return new Set<string>(JSON.parse(stored) as string[]);
    } catch {
      // Fall through to the column defaults.
    }
    return new Set<string>(columns.filter((col) => col.defaultHidden).map((col) => col.key));
  });
  const [isColumnsMenuOpen, setIsColumnsMenuOpen] = useState(false);

  const toggleColumnVisibility = (columnKey: string) => {
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev);
      if (next.has(columnKey)) next.delete(columnKey);
      else next.add(columnKey);
      try {
        window.localStorage.setItem(columnsStorageKey, JSON.stringify([...next]));
      } catch {
        // Ignore write failures (private browsing, storage disabled, etc.)
      }
      return next;
    });
  };

  const visibleColumns = columns.filter((col) => !hiddenColumnKeys.has(col.key));

  const handleConfirmDelete = () => {
    if (!confirmDeleteModal.data || !onDeleteItem) return;
    setIsDeleting(true);
    setTimeout(() => {
      onDeleteItem(confirmDeleteModal.data as T);
      setIsDeleting(false);
      confirmDeleteModal.close();
    }, 300);
  };

  const filteredData = useMemo(() => {
    const filtered = data.filter((item) => {
      if (!tabFilter(item, activeTab)) return false;
      if (!searchQuery.trim()) return true;
      return searchFilter(item, searchQuery);
    });
    const sortColumn = sortKey ? columns.find((col) => col.key === sortKey) : undefined;
    if (!sortColumn?.sortValue) return filtered;
    const direction = sortOrder === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const left = sortColumn.sortValue!(a);
      const right = sortColumn.sortValue!(b);
      if (left < right) return -1 * direction;
      if (left > right) return 1 * direction;
      return 0;
    });
  }, [data, activeTab, searchQuery, tabFilter, searchFilter, sortKey, sortOrder, columns]);

  const totalPages = Math.ceil(filteredData.length / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, currentPage, pageSize]);

  const rangeStart = filteredData.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredData.length);

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

  const handleBulkSync = () => {
    onBulkSync?.();
    setSyncToastMessage(`Syncing ${filteredData.length} records with source systems…`);
    setTimeout(() => setSyncToastMessage(null), 3000);
  };

  // Keyboard-first grid: ↑ / ↓ move the selection, Enter opens the selected record.
  const handleGridKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (paginatedData.length === 0) return;
    const index = paginatedData.findIndex((item) => keyExtractor(item) === selectedKey);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const nextIndex =
        event.key === 'ArrowDown' ? Math.min(paginatedData.length - 1, index + 1) : Math.max(0, index === -1 ? 0 : index - 1);
      const nextKey = keyExtractor(paginatedData[nextIndex]);
      setSelectedKey(nextKey);
      gridRef.current?.querySelector(`[data-row-key="${CSS.escape(nextKey)}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter' && index >= 0 && onRowClick) {
      event.preventDefault();
      onRowClick(paginatedData[index]);
    }
  };

  const colSpan = visibleColumns.length + (onDeleteItem ? 1 : 0);
  const activeTabLabel = statusTabs.find((tab) => tab.id === activeTab)?.label;

  return (
    <HorizonPage>
      <HorizonToast message={showExportToast ? `Exporting ${filteredData.length} records to Excel…` : null} tone="info" />
      <HorizonToast message={syncToastMessage} tone="info" />

      {/* Page header: title, purpose, primary domain action */}
      <HorizonPageTitle
        title={title}
        subtitle={subtitle}
        actions={
          <>
            {onBulkSync && (
              <button type="button" onClick={handleBulkSync} className="hz-button hz-button-secondary">
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{bulkSyncLabel}</span>
              </button>
            )}
            {primaryActionLabel && onPrimaryAction && (
              <button type="button" onClick={onPrimaryAction} className="hz-button hz-button-primary">
                <Plus className="h-3.5 w-3.5" />
                <span>{primaryActionLabel}</span>
              </button>
            )}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsHelpOpen((open) => !open)}
                className="hz-icon-button"
                title="Help with this list"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
              {isHelpOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-72 rounded-xl border border-[var(--hz-border-grid)] bg-white p-3 text-[12px] text-[var(--hz-text-secondary)] shadow-lg">
                  {helpText}
                </div>
              )}
            </div>
          </>
        }
      />

      <section className="hz-panel">
        {/* Quick status filters */}
        <div className="flex items-center gap-4 overflow-x-auto border-b border-[var(--hz-border-grid)] px-3" role="tablist">
          {statusTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  onTabChange(tab.id);
                  setCurrentPage(1);
                }}
                className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 py-2 text-[13px] transition-colors ${
                  isActive
                    ? 'border-[var(--hz-primary-700)] font-semibold text-[var(--hz-primary-700)]'
                    : 'border-transparent text-[var(--hz-text-secondary)] hover:text-[var(--hz-text-primary)]'
                }`}
              >
                <span>{tab.label}</span>
                {tab.count !== undefined && (
                  <span className="tabular-nums text-[12px] text-[var(--hz-text-muted)]">{tab.count.toLocaleString()}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter / action toolbar */}
        <div className="flex flex-col gap-2 border-b border-[var(--hz-border-grid)] px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--hz-text-muted)]" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="hz-field w-full pl-7 pr-2"
            />
          </div>

          <div className="flex items-center gap-1">
            <button type="button" onClick={() => setSearchQuery('')} className="hz-button hz-button-quiet" title="Reset search">
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Reset</span>
            </button>
            <button type="button" className="hz-button hz-button-quiet" title="Filters">
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Filters</span>
            </button>
            <div className="relative hidden sm:block">
              <button
                type="button"
                onClick={() => setIsColumnsMenuOpen((open) => !open)}
                className="hz-button hz-button-quiet"
                title="Choose columns"
              >
                <Columns3 className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Columns</span>
              </button>
              {isColumnsMenuOpen && (
                <div className="absolute right-0 top-full z-20 mt-1 w-60 rounded-xl border border-[var(--hz-border-grid)] bg-white py-1 text-[13px] shadow-lg">
                  <div className="hz-section-label border-b border-[var(--hz-border-grid)] px-3 py-1.5">Show columns</div>
                  <div className="max-h-64 overflow-y-auto py-1">
                    {columns
                      .filter((col) => col.hideable !== false)
                      .map((col) => (
                        <label key={col.key} className="flex cursor-pointer items-center gap-2 px-3 py-1 hover:bg-[var(--hz-surface-subtle)]">
                          <input type="checkbox" checked={!hiddenColumnKeys.has(col.key)} onChange={() => toggleColumnVisibility(col.key)} />
                          <span>{col.header}</span>
                        </label>
                      ))}
                  </div>
                  <div className="border-t border-[var(--hz-border-grid)] px-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsColumnsMenuOpen(false)}
                      className="w-full py-1 text-center text-[12px] font-semibold text-[var(--hz-primary-700)]"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
            <button type="button" onClick={handleExport} className="hz-button hz-button-quiet" title="Export to Excel">
              <Download className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Export</span>
            </button>
          </div>
        </div>

        {/* Data grid */}
        <div
          ref={gridRef}
          tabIndex={0}
          role="grid"
          aria-label={`${title} records`}
          onKeyDown={handleGridKeyDown}
          className="max-h-[calc(100vh-290px)] overflow-auto focus-visible:outline-offset-[-2px]"
        >
          <table className="hz-grid text-left">
            <thead>
              <tr>
                {visibleColumns.map((col) => {
                  const sorted = sortKey === col.key;
                  const SortIcon = sorted ? (sortOrder === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      onClick={() => col.sortable && handleSort(col.key)}
                      aria-sort={sorted ? (sortOrder === 'asc' ? 'ascending' : 'descending') : undefined}
                      className={`${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                        col.sortable ? 'cursor-pointer select-none hover:text-[var(--hz-text-primary)]' : ''
                      }`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {col.header}
                        {col.sortable && <SortIcon className="h-3 w-3 text-[var(--hz-text-disabled)]" />}
                      </span>
                    </th>
                  );
                })}
                {onDeleteItem && (
                  <th scope="col" className="w-20 text-center">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody>
              {paginatedData.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="!h-auto !whitespace-normal py-6 text-left">
                    <div className="px-2 text-[13px] text-[var(--hz-text-primary)]">No records match the current filters.</div>
                    <ul className="mt-1 list-disc px-2 pl-6 text-[12px] text-[var(--hz-text-secondary)]">
                      {activeTabLabel && <li>Status: {activeTabLabel}</li>}
                      {searchQuery && <li>Search: “{searchQuery}”</li>}
                    </ul>
                    <div className="mt-2 flex gap-2 px-2">
                      <button
                        type="button"
                        className="hz-button hz-button-secondary"
                        onClick={() => {
                          setSearchQuery('');
                          if (statusTabs[0]) onTabChange(statusTabs[0].id);
                        }}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => {
                  const key = keyExtractor(item);
                  const selected = key === selectedKey;
                  return (
                    <tr
                      key={key}
                      data-row-key={key}
                      aria-selected={selected}
                      onClick={() => setSelectedKey(key)}
                      onDoubleClick={() => onRowClick?.(item)}
                      className={onRowClick ? 'cursor-pointer' : ''}
                    >
                      {visibleColumns.map((col, colIndex) => {
                        const opensRecord = colIndex === 0 && !!onRowClick;
                        return (
                          <td
                            key={`${key}-${col.key}`}
                            onClick={
                              opensRecord
                                ? (e) => {
                                    e.stopPropagation();
                                    setSelectedKey(key);
                                    onRowClick!(item);
                                  }
                                : undefined
                            }
                            title={opensRecord ? 'Open record' : undefined}
                            className={`${col.align === 'right' ? 'text-right tabular-nums' : col.align === 'center' ? 'text-center' : 'text-left'} ${
                              opensRecord ? 'hz-record-link' : ''
                            }`}
                          >
                            {col.render(item)}
                          </td>
                        );
                      })}
                      {onDeleteItem && (
                        <td className="text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            {onRowClick && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onRowClick(item);
                                }}
                                title="Open record"
                                className="rounded-md p-1 text-[var(--hz-text-secondary)] hover:bg-[var(--hz-surface-muted)] hover:text-[var(--hz-text-primary)]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={!canDelete}
                              onClick={(e) => {
                                e.stopPropagation();
                                confirmDeleteModal.open(item);
                              }}
                              title={canDelete ? 'Delete record' : "You don't have permission to delete this record."}
                              className="rounded-md p-1 text-[var(--hz-text-secondary)] hover:bg-[var(--hz-danger-bg)] hover:text-[var(--hz-danger-text)] disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-[var(--hz-text-secondary)]"
                            >
                              {canDelete ? <Trash2 className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Status / totals / pagination footer */}
        <div className="flex flex-col gap-2 border-t border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] px-3 py-1.5 text-[12px] text-[var(--hz-text-secondary)] sm:flex-row sm:items-center sm:justify-between">
          <div className="font-semibold text-[var(--hz-text-primary)] tabular-nums">{footerSummary?.(filteredData)}</div>
          <div className="flex items-center gap-3">
            <span className="tabular-nums">
              {rangeStart.toLocaleString()}–{rangeEnd.toLocaleString()} of {filteredData.length.toLocaleString()}
            </span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="hz-field !min-h-6 px-1 !text-[12px]"
              aria-label="Rows per page"
            >
              <option value={20}>20 / page</option>
              <option value={50}>50 / page</option>
              <option value={100}>100 / page</option>
            </select>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="hz-icon-button !h-6 !w-6 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-1 tabular-nums">
                {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="hz-icon-button !h-6 !w-6 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {onDeleteItem && (
        <ConfirmDeleteModal
          isOpen={confirmDeleteModal.isOpen}
          title={deleteConfirmTitle}
          description={
            confirmDeleteModal.data
              ? `This will permanently remove ${getItemLabel ? getItemLabel(confirmDeleteModal.data) : 'this record'}.`
              : ''
          }
          isDeleting={isDeleting}
          onConfirm={handleConfirmDelete}
          onClose={confirmDeleteModal.close}
        />
      )}
    </HorizonPage>
  );
}
