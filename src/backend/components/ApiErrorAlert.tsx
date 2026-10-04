import React from 'react';
import { HorizonAlert } from '../../components/horizon';
import { ApiError } from '../../lib/api/errors';
import { describeError } from '../../lib/api/errorText';

/** The backend's correlation ID of an error, as a support reference (FI1-A-D10). */
export const referenceOf = (error: unknown): string | null => (error instanceof ApiError ? error.correlationId : null);

/** "Reference <correlation_id>", shown with every handled error message. Renders nothing without one. */
export const ErrorReference: React.FC<{ reference: string | null | undefined }> = ({ reference }) =>
  reference ? (
    <span className="mt-0.5 block text-[12px] text-[var(--hz-text-secondary)]">
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
