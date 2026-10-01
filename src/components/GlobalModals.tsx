import React from 'react';
import { MODAL_IDS, useModalWrapper } from '../store/modalStore';
import { CustomerRecord, PolicyRecordItem } from '../data/recordsStore';
import { NewQuoteWizardModal } from './modals/NewQuoteWizardModal';
import { NewClaimWizardModal } from './modals/NewClaimWizardModal';
import { CollectPaymentModal, PayableCustomer } from './modals/CollectPaymentModal';

export interface NewQuoteModalPayload {
  preSelectedCustomer?: CustomerRecord;
  onSuccess: (quoteId: string) => void;
}

export interface NewClaimModalPayload {
  preSelectedCustomer?: CustomerRecord;
  preSelectedPolicy?: PolicyRecordItem;
  onSuccess: (claimId: string) => void;
}

export interface CollectPaymentModalPayload {
  customer: PayableCustomer;
  policyNumber?: string;
  onSuccess: (receiptRef: string) => void;
}

export const GlobalModals: React.FC = () => {
  const newQuote = useModalWrapper<NewQuoteModalPayload>(MODAL_IDS.NEW_QUOTE);
  const newClaim = useModalWrapper<NewClaimModalPayload>(MODAL_IDS.NEW_CLAIM);
  const collectPayment = useModalWrapper<CollectPaymentModalPayload>(MODAL_IDS.COLLECT_PAYMENT);

  return (
    <>
      <NewQuoteWizardModal
        isOpen={newQuote.isOpen}
        onClose={newQuote.close}
        preSelectedCustomer={newQuote.data?.preSelectedCustomer}
        onSuccess={(quoteId) => {
          newQuote.data?.onSuccess(quoteId);
          newQuote.close();
        }}
      />

      <NewClaimWizardModal
        isOpen={newClaim.isOpen}
        onClose={newClaim.close}
        preSelectedCustomer={newClaim.data?.preSelectedCustomer}
        preSelectedPolicy={newClaim.data?.preSelectedPolicy}
        onSuccess={(claimId) => {
          newClaim.data?.onSuccess(claimId);
          newClaim.close();
        }}
      />

      {collectPayment.data && (
        <CollectPaymentModal
          isOpen={collectPayment.isOpen}
          onClose={collectPayment.close}
          customer={collectPayment.data.customer}
          policyNumber={collectPayment.data.policyNumber}
          onSuccess={(receiptRef) => {
            collectPayment.data?.onSuccess(receiptRef);
            collectPayment.close();
          }}
        />
      )}
    </>
  );
};
