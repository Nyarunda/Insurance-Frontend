import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The decision dialogs' shared frame: title row, scrollable body, footer. Escape and the close
 * button call `onClose`; a click on the backdrop does too unless `dismissOnBackdrop` is false
 * (for example while the user has typed something that would be lost).
 *
 * Focus is trapped while it is open (FI1-E, from PR #1): it moves into the dialog on opening, Tab
 * and Shift+Tab cycle within it, and it returns to what had it before when the dialog closes.
 */
export const DialogFrame: React.FC<{
  titleId: string;
  title: string;
  subtitle?: string;
  onClose: () => void;
  dismissOnBackdrop?: boolean;
  footer: React.ReactNode;
  children: React.ReactNode;
}> = ({ titleId, title, subtitle, onClose, dismissOnBackdrop = true, footer, children }) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--hz-scrim)] p-4"
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
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-xl border border-[var(--hz-border-default)] bg-[var(--hz-surface-main)] shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hz-border-grid)] px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-[var(--hz-text-primary)]">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-[13px] text-[var(--hz-text-secondary)]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="hz-icon-button shrink-0" aria-label="Close">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-4 py-4">{children}</div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--hz-border-grid)] bg-[var(--hz-surface-subtle)] px-4 py-3">
          {footer}
        </div>
      </div>
    </div>
  );
};
