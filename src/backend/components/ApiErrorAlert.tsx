import React from 'react';
import { HorizonAlert } from '../../components/horizon';
import { describeError } from '../../lib/api/errorText';

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
        {reference && (
          <span className="mt-0.5 block text-[12px] text-[var(--hz-text-secondary)]">
            Reference <span className="font-mono" data-correlation-id>{reference}</span>
          </span>
        )}
      </HorizonAlert>
    </div>
  );
};
