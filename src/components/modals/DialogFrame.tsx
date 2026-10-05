import React, { useEffect, useRef, useState } from 'react';
import { Maximize2, Minimize2, X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The decision dialogs' shared frame: title row, scrollable body, footer. Escape and the close
 * button call `onClose`; a click on the backdrop does too unless `dismissOnBackdrop` is false
 * (for example while the user has typed something that would be lost).
 *
 * Focus is trapped while it is open (FI1-E, from PR #1): it moves into the dialog on opening, Tab
 * and Shift+Tab cycle within it, and it returns to what had it before when the dialog closes.
 *
 * `size="lg"` suits a form; `expandable` adds a toggle that grows the dialog to nearly the whole
 * window and back, remembered per browser.
 */

const EXPANDED_KEY = 'hz-dialog-expanded';

const readExpanded = () => {
  try {
    return window.localStorage.getItem(EXPANDED_KEY) === '1';
  } catch {
    return false;
  }
};

const writeExpanded = (value: boolean) => {
  try {
    window.localStorage.setItem(EXPANDED_KEY, value ? '1' : '0');
  } catch {
    // Storage unavailable: the choice just isn't remembered.
  }
};

const WIDTH = { md: 'max-w-md', lg: 'max-w-2xl', xl: 'max-w-5xl' } as const;
export const DialogFrame: React.FC<{
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  dismissOnBackdrop?: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
  size?: keyof typeof WIDTH;
  expandable?: boolean;
  /** Names the close button (its label and tooltip); "Close" by default. */
  closeLabel?: string;
  /** A small icon shown before the title. */
  icon?: React.ReactNode;
  /** A status badge shown beside the title. */
  badge?: React.ReactNode;
}> = ({
  titleId,
  title,
  subtitle,
  onClose,
  dismissOnBackdrop = true,
  footer,
  children,
  size = 'md',
  expandable = false,
  closeLabel = 'Close',
  icon,
  badge,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(() => expandable && readExpanded());
  const toggleExpanded = () =>
    setExpanded((value) => {
      writeExpanded(!value);
      return !value;
    });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // A dialog under another one is inert: only the topmost closes.
      if (event.key === 'Escape' && !dialogRef.current?.closest('[inert]')) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;
    if (dialog && !dialog.contains(document.activeElement)) {
      const first = dialog.querySelector<HTMLElement>(
        'input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      );
      (first ?? dialog).focus();
    }
    return () => previous?.focus();
  }, []);

  const trapTab = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !dialogRef.current) return;
    const items: HTMLElement[] = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (items.length === 0) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !dialogRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !dialogRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--hz-scrim)] p-4 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={trapTab}
        className={`hz-dialog-enter flex w-full flex-col overflow-hidden rounded-xl border border-[var(--hz-border-default)] bg-[var(--hz-surface-main)] shadow-2xl transition-[max-width,height] duration-200 ease-out ${
          expanded ? 'h-[calc(100vh-2rem)] max-w-[min(1280px,100%)]' : `max-h-[90vh] ${WIDTH[size]}`
        }`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hz-border-grid)] px-5 py-4">
          <div className="flex min-w-0 items-start gap-3">
            {icon && (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] text-[var(--hz-text-secondary)]">
                {icon}
              </span>
            )}
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id={titleId} className="text-base font-semibold text-[var(--hz-text-primary)]">
                  {title}
                </h2>
                {badge}
              </div>
              {subtitle && <p className="mt-0.5 truncate text-[13px] text-[var(--hz-text-muted)]">{subtitle}</p>}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {expandable && (
              <button
                type="button"
                onClick={toggleExpanded}
                className="hz-icon-button"
                aria-label={expanded ? 'Restore size' : 'Expand'}
                aria-pressed={expanded}
                title={expanded ? 'Restore size' : 'Expand'}
              >
                {expanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
              </button>
            )}
            <button type="button" onClick={onClose} className="hz-icon-button" aria-label={closeLabel} title={closeLabel}>
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto px-5 py-5">{children}</div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] px-5 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
};
