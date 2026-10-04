import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * The decision dialogs' shared frame: title row, scrollable body, footer. Escape and the close
 * button call `onClose`; a click on the backdrop does too unless `dismissOnBackdrop` is false
 * (for example while the user has typed something that would be lost).
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
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--hz-scrim)] p-4"
      onMouseDown={(event) => {
        if (dismissOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-[6px] border border-[var(--hz-border-default)] bg-[var(--hz-surface-main)] shadow-xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--hz-border-grid)] px-4 py-3">
          <div className="min-w-0">
            <h2 id={titleId} className="text-[15px] font-semibold text-[var(--hz-text-primary)]">
              {title}
            </h2>
            {subtitle && <p className="mt-0.5 truncate text-xs text-[var(--hz-text-secondary)]">{subtitle}</p>}
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
