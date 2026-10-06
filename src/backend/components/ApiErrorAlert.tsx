import React, { useEffect } from 'react';
import { X, XCircle } from 'lucide-react';
import { HorizonAlert, playToastSound } from '../../components/horizon';
import { ApiError } from '../../lib/api/errors';
import { describeError } from '../../lib/api/errorText';

/** The backend's correlation ID of an error, as a support reference (FI1-A-D10). */
export const referenceOf = (error: unknown): string | null => (error instanceof ApiError ? error.correlationId : null);

/** "Reference <correlation_id>", shown with every handled error message. Renders nothing without one. */
export const ErrorReference: React.FC<{ reference: string | null | undefined }> = ({ reference }) =>
  reference ? (
    <span className="mt-0.5 block text-[13px] text-[var(--hz-text-secondary)]">
      Reference <span className="font-mono" data-correlation-id>{reference}</span>
    </span>
  ) : null;

/** An error from the backend, with its correlation ID as a support reference. */
export const ApiErrorAlert: React.FC<{ error: unknown; title?: string; action?: React.ReactNode }> = ({
  error,
  title,
  action,
}) => {
  const { message, reference } = describeError(error);
  return (
    <div role="alert">
      <HorizonAlert tone="danger" title={title} action={action}>
        {message}
        <ErrorReference reference={reference} />
      </HorizonAlert>
    </div>
  );
};

export const ERROR_TOAST_MS = 8000;

/**
 * An error as a toast: red, with the error sound, the message and its reference, a close button,
 * and gone after a few seconds. Each new error object shows and sounds again, even with the same text.
 */
export const ApiErrorToast: React.FC<{ error: unknown; title?: string; onClose: () => void }> = ({ error, title, onClose }) => {
  useEffect(() => {
    if (!error) return;
    playToastSound('danger');
    const timer = window.setTimeout(onClose, ERROR_TOAST_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  if (!error) return null;
  const { message, reference } = describeError(error);
  return (
    <div
      role="alert"
      className="hz-toast-enter fixed top-4 right-4 left-4 z-50 ml-auto flex max-w-sm items-start gap-3 rounded-lg bg-[var(--hz-danger)] px-4 py-3 text-sm text-white shadow-lg sm:left-auto"
    >
      <XCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        {title && <p className="font-medium leading-5">{title}</p>}
        <p className="leading-5">{message}</p>
        {reference && (
          <p className="mt-1 text-[13px] text-white/80">
            Reference <span className="font-mono" data-correlation-id>{reference}</span>
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss"
        className="-mr-1 rounded-md p-1 text-white/80 transition-colors hover:bg-white/15 hover:text-white"
      >
        <X className="size-4" />
      </button>
    </div>
  );
};
