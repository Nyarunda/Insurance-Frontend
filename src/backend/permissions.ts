/** Permission codes the integrated screens need. They only shape the interface; the backend checks every call. */

export const TASK_VIEW = 'workflow.task.view';
export const POLICY_VIEW = 'policies.policy.view';
export const ENDORSEMENT_CREATE = 'policies.endorsement.create';

// NB1-A: customers (CLIENTS-1). The backend judges each at the customer's home branch.
export const CUSTOMER_VIEW = 'clients.customer.view';
export const CUSTOMER_CREATE = 'clients.customer.create';
export const CUSTOMER_EDIT = 'clients.customer.edit';
export const KYC_VIEW = 'clients.kyc.view';
export const KYC_MANAGE = 'clients.kyc.manage';
export const KYC_VERIFY = 'clients.kyc.verify';

// NB1-B: quotations (QUOTATIONS-1). Pricing and risk entry are quotations.quotation.edit.
export const QUOTATION_VIEW = 'quotations.quotation.view';
export const QUOTATION_CREATE = 'quotations.quotation.create';
export const QUOTATION_EDIT = 'quotations.quotation.edit';
export const QUOTATION_ISSUE = 'quotations.quotation.issue';
export const QUOTATION_DECIDE = 'quotations.quotation.decide';
export const QUOTATION_CANCEL = 'quotations.quotation.cancel';
export const QUOTATION_CHECK = 'quotations.quotation.check';
