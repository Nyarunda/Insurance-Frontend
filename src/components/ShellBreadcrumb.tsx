import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ScreenId } from '../types';
import { RECORD_WORKSPACE_SCREENS, findNavLocation } from '../data/navigation';

interface ShellBreadcrumbProps {
  currentScreen: ScreenId;
  recordId?: string;
  onNavigate: (screen: ScreenId) => void;
}

/**
 * Permanent breadcrumb row at the top of the workspace container:
 * Group / Item / Record reference. Derived from the navigation registry so it never drifts
 * from the sidebar.
 */
export const ShellBreadcrumb: React.FC<ShellBreadcrumbProps> = ({ currentScreen, recordId, onNavigate }) => {
  const location = findNavLocation(currentScreen);
  const isRecordWorkspace = RECORD_WORKSPACE_SCREENS.has(currentScreen);

  const crumbs: Array<{ label: string; screen?: ScreenId }> = [];
  if (location) {
    if (location.group.title !== location.item.label) crumbs.push({ label: location.group.title });
    crumbs.push({ label: location.item.label, screen: isRecordWorkspace ? location.item.id : undefined });
  }
  if (isRecordWorkspace) {
    crumbs.push({ label: recordId ?? 'New record' });
  }
  if (crumbs.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex h-8 shrink-0 items-center border-b border-[var(--hz-border-grid)] bg-[var(--hz-surface-main)] px-4 text-[12px]"
    >
      <ol className="flex min-w-0 items-center gap-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--hz-text-disabled)]" aria-hidden />}
              {crumb.screen && !last ? (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.screen!)}
                  className="truncate text-[var(--hz-primary-700)] hover:underline"
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={`truncate ${last ? 'font-semibold text-[var(--hz-text-primary)]' : 'text-[var(--hz-text-muted)]'}`}
                  aria-current={last ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};
