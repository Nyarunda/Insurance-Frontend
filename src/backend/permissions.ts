/** Permission codes the integrated screens need. They only shape the interface; the backend checks every call. */

export const TASK_VIEW = 'workflow.task.view';
export const POLICY_VIEW = 'policies.policy.view';
export const POLICY_BIND = 'policies.policy.bind';
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

// NB1-C: underwriting proposals (UNDERWRITING-1), judged at the quoting branch the proposal inherits.
export const PROPOSAL_VIEW = 'underwriting.proposal.view';
export const PROPOSAL_CREATE = 'underwriting.proposal.create';
export const PROPOSAL_EDIT = 'underwriting.proposal.edit';
export const PROPOSAL_DECLINE = 'underwriting.proposal.decline';
export const PROPOSAL_CANCEL = 'underwriting.proposal.cancel';
export const PROPOSAL_EXCEPTION_APPROVE = 'underwriting.exception.approve';

// CERTIFICATES-SURFACE-1 (CS-A): certificates, judged on the certificate's policy.
export const CERT_VIEW = 'certificates.cert.view';
export const CERT_ISSUE = 'certificates.cert.issue';
export const CERT_CANCEL = 'certificates.cert.cancel';
// CS-C: certificate types, batches, stock and allocation.
export const CERT_STOCK = 'certificates.stock.manage';

// SETUP-DRIVEN-1 SD-C: the tenant's vehicle makes and models (tenant-wide; the server refuses a branch grant).
export const REFERENCE_MANAGE = 'products.reference.manage';

// RENEWALS-SURFACE-1 RS-A: renewals, judged on the renewal's policy.
export const RENEWAL_CREATE = 'policies.renewal.create';
export const RENEWAL_APPROVE = 'policies.renewal.approve';

// Endorsements of every type (after FI1-D's change-limit): cancelling a policy needs its own permission.
export const POLICY_CANCEL = 'policies.policy.cancel';
