import React from 'react';
import { ChevronRight } from 'lucide-react';
import { ScreenId } from '../types';
import { NavGroup, RECORD_WORKSPACE_SCREENS, findNavLocation } from '../data/navigation';

interface ShellBreadcrumbProps {
  /** The navigation registry the shell uses; defaults to the full registry. */
  groups?: NavGroup[];
  currentScreen: ScreenId;
  recordId?: string;
  onNavigate: (screen: ScreenId) => void;
  /** `row`: a bordered strip above the workspace; `inline`: plain crumbs inside the page. */
  variant?: 'row' | 'inline';
}

/**
 * Permanent breadcrumb row at the top of the workspace container:
 * Group / Item / Record reference. Derived from the navigation registry so it never drifts
 * from the sidebar.
 */
export const ShellBreadcrumb: React.FC<ShellBreadcrumbProps> = ({ groups, currentScreen, recordId, onNavigate, variant = 'row' }) => {
  const location = findNavLocation(currentScreen, groups);
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
      className={
        variant === 'inline'
          ? 'mb-4 flex shrink-0 items-center text-[13px]'
          : 'flex h-9 shrink-0 items-center border-b border-[var(--hz-border-grid)] bg-[var(--hz-surface-main)] px-4 text-[13px]'
      }
    >
      <ol className="flex min-w-0 items-center gap-1">
        {crumbs.map((crumb, index) => {
          const last = index === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {index > 0 && <ChevronRight className="h-3 w-3 shrink-0 text-[var(--hz-text-muted)]" aria-hidden />}
              {crumb.screen && !last ? (
                <button
                  type="button"
                  onClick={() => onNavigate(crumb.screen!)}
                  className="truncate text-[var(--hz-text-muted)] hover:text-[var(--hz-text-primary)]"
                >
                  {crumb.label}
                </button>
              ) : (
                <span
                  className={`truncate ${last ? 'font-medium text-[var(--hz-text-primary)]' : 'text-[var(--hz-text-muted)]'}`}
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
