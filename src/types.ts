export type ScreenId =
  // OVERVIEW
  | 'dashboard'
  | 'my-work'
  | 'notifications'
  // CUSTOMERS
  | 'customers'
  | 'organizations'
  | 'leads'
  | 'kyc-compliance'
  | 'intermediaries'
  | 'providers'
  | 'customer-workspace'
  | 'broker-workspace'
  | 'provider-workspace'
  // SALES & DISTRIBUTION
  | 'quotations'
  // Backend mode (NEW-BUSINESS-1): own ids, so no demo-era alias folds them into Quotations.
  | 'proposals'
  | 'new-policy'
  | 'applications'
  | 'brokers'
  | 'agents'
  | 'bancassurance'
  | 'quote-workspace'
  // UNDERWRITING
  | 'underwriting-workbench'
  | 'referrals'
  | 'risk-assessments'
  | 'inspections'
  | 'authority-doa'
  // POLICIES
  | 'policies'
  | 'endorsements'
  | 'renewals'
  | 'cancellations'
  | 'certificates'
  // Backend mode (CERTIFICATES-SURFACE-1 CS-C): its own id beside Certificates.
  | 'certificate-stock'
  // Backend mode (SETUP-DRIVEN-1 SD-C): the tenant's vehicle makes and models.
  | 'vehicle-makes'
  // Backend mode (SETUP-DRIVEN-1 SD-E): the tenant's renewal settings.
  | 'renewal-settings'
  | 'policy-workspace'
  // CLAIMS
  | 'claims-landing'
  | 'fnol'
  | 'claims'
  | 'claim-workspace'
  | 'assessments'
  | 'reserves'
  | 'settlements'
  | 'recoveries'
  | 'salvage'
  // FINANCE
  | 'finance-landing'
  | 'billing'
  | 'receivables'
  | 'payments'
  | 'reconciliation'
  | 'commissions'
  | 'accounting'
  | 'accounting-workbench'
  | 'period-close'
  // REINSURANCE
  | 'reinsurance-treaties'
  | 'treaty-workspace'
  | 'reinsurance-facultative'
  | 'reinsurance-cessions'
  | 'reinsurance-recoveries'
  | 'reinsurance-bordereaux'
  // PRODUCTS
  | 'products'
  | 'product-studio'
  | 'product-workspace'
  | 'product-versions'
  | 'rating'
  | 'underwriting-rules'
  | 'product-sandbox'
  | 'product-factory'
  // OPERATIONS
  | 'integration-hub'
  | 'workflows'
  | 'background-jobs'
  | 'failed-transactions'
  | 'activity-logs'
  // REPORTING
  | 'reporting-operational'
  | 'reporting-financial'
  | 'reporting-claims'
  | 'reporting-underwriting'
  | 'reporting-regulatory'
  | 'reporting-bi'
  // ADMINISTRATION
  | 'admin-organization'
  | 'admin-branches'
  | 'admin-users-roles'
  | 'admin-doa'
  | 'admin-workflows'
  | 'admin-documents'
  | 'admin-number-series'
  | 'regulatory-admin'
  | 'admin-integrations'
  | 'admin-audit'
  | 'admin-subscription'
  // Backward compatibility anchors
  | 'underwriter-dashboard'
  | 'product-factory-designer'
  | 'user-permissions-workflows'
  | 'my-profile';

export type UserRole = 'executive' | 'underwriter' | 'claims' | 'finance' | 'agent';

export type DensityMode = 'compact' | 'comfortable' | 'spacious';

export interface AuthSession {
  email: string;
  name: string;
  tenant: string;
  role: UserRole;
  assignedRoleCenters: UserRole[];
  authenticatedAt: string;
}

export interface WorkTask {
  id: string;
  title: string;
  referenceId: string;
  sourceModule: 'Underwriting' | 'Claims' | 'Finance' | 'Endorsements' | 'Reinsurance' | 'KYC';
  priority: 'HIGH' | 'MED' | 'NORMAL';
  age: string;
  sla: string;
  slaOverdue?: boolean;
  assignedTo: string;
  status: 'Pending' | 'In Review' | 'Escalated' | 'Completed';
  insuredName: string;
  amount?: number;
}

export interface CustomerRelationship {
  id: string;
  relationType: 'Spouse' | 'Director' | 'Fleet Asset' | 'Beneficiary' | 'Subsidiary';
  name: string;
  detail: string;
  status: 'Active' | 'Verified' | 'Pending';
}

export interface PolicyVersionRecord {
  version: string;
  date: string;
  changeDescription: string;
  isCurrent: boolean;
  author: string;
  premiumAtVersion: number;
  sumInsuredAtVersion: number;
  coveragesAdded?: string[];
}

export interface InsurerQuoteComparison {
  insurer: string;
  logoColor: string;
  premium: number;
  excess: string;
  benefitsCount: number;
  benefits: string[];
  decision: 'ACCEPT' | 'REFER' | 'DECLINE';
  ratingScore: number;
}

export interface GeneralJournalEntry {
  id: string;
  date: string;
  description: string;
  account: string;
  debit: number;
  credit: number;
  reference: string;
  status: 'POSTED' | 'DRAFT' | string;
  voucherNumber?: string;
  policyNumber?: string;
  debitAccount?: string;
  creditAccount?: string;
  amountKes?: number;
}

export interface TrialBalanceRow {
  accountCode: string;
  accountName: string;
  category: 'Asset' | 'Liability' | 'Equity' | 'Revenue' | 'Expense';
  debit: number;
  credit: number;
  debitKes?: number;
  creditKes?: number;
}

export interface IntegrationEndpoint {
  id: string;
  name: string;
  category: 'Core Banking' | 'Payments' | 'Regulatory' | 'Communication' | 'ERP';
  status: 'Healthy' | 'Warning' | 'Disabled' | 'Not Configured';
  lastPing: string;
  latencyMs: number;
  uptime90d: number;
  activeTps?: number;
  notes: string;
}

export interface RegulatoryPack {
  countryCode: string;
  countryName: string;
  currency: string;
  flag: string;
  taxConfig: {
    kraPinRequired: boolean;
    vatRate: number;
    trainingLevyPct: number;
    phcfLevyPct: number;
    stampDutyFixed: number;
  };
  supportedPaymentGateways: string[];
  regulatorName: string;
  active: boolean;
}

export interface Submission {
  id: string;
  insuredName: string;
  lineOfBusiness: string;
  broker: string;
  brokerFirm: string;
  effectiveDate: string;
  premium: number;
  lossRatio: number;
  riskScore: number;
  status: 'New' | 'Triage' | 'Underwriting' | 'Referral' | 'Quoted' | 'Bound' | 'Declined';
  priority: 'High' | 'Medium' | 'Low';
  flagCount: number;
  fleetSize?: number;
}

export interface CustomerProfile {
  id: string;
  name: string;
  customerType: 'Individual' | 'Corporate';
  nationalId?: string;
  kraPin: string;
  phone: string;
  email: string;
  relationshipSince: number;
  relationshipValueKes: number;
  lifetimeClaimsKes: number;
  lossRatioPct: number;
  outstandingKes: number;
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  activePoliciesCount: number;
  assignedUnderwriter: string;
  headquarters: string;
  address?: string;
}

export interface QuoteOption {
  id: string;
  name: string;
  description: string;
  premium: number;
  deductible: number;
  combinedSingleLimit: string;
  cargoLimit: string;
  umbrellaLimit: string;
  features: string[];
  recommended?: boolean;
}

export interface PolicyRecord {
  id?: string;
  policyNumber: string;
  insuredName: string;
  productLine: string;
  productName?: string;
  sumInsuredKes?: number;
  premiumKes?: number;
  status: 'In Force' | 'Pending Renewal' | 'Cancelled' | 'Expired' | string;
  effectiveStart: string;
  effectiveEnd: string;
  annualPremium: number;
  paidToDate: number;
  paymentPlan: string;
  underwriter: string;
  broker: string;
  endorsementsCount: number;
  claimsCount: number;
}

export interface ClaimRecord {
  id?: string;
  claimNumber: string;
  policyNumber: string;
  claimant: string;
  description?: string;
  lossAssessor?: string;
  incidentDate?: string;
  claimedAmountKes?: number;
  lossDate: string;
  reportDate: string;
  lossType: string;
  status: 'Reported' | 'Under Investigation' | 'Approved' | 'In Subrogation' | 'Closed' | string;
  totalIncurred: number;
  amountPaid: number;
  outstandingReserve: number;
  deductibleApplied: number;
  adjuster: string;
  siuFraudScore: number;
  faultPercentage: number;
  location?: string;
  initialReserveKes?: number;
  incurredKes?: number;
  garage?: string;
  estimatedRepairKes?: number;
  bettermentDeductionKes?: number;
  assessorFeeKes?: number;
  netLiabilityKes?: number;
  fraudIndicators?: string[];
}

export interface UnderwritingRule {
  id: string;
  name: string;
  category: 'Eligibility' | 'Pricing' | 'Guidelines' | 'Authority';
  severity: 'pass' | 'warning' | 'referral' | 'block';
  description: string;
  currentValue: string;
  threshold: string;
  actionRequired?: string;
}

export interface ReferralItem {
  id: string;
  submissionId: string;
  insuredName: string;
  lineOfBusiness: string;
  requestedBy: string;
  requestedAt: string;
  referredToRole: string;
  reason: string;
  requestedLimit: number;
  underwriterAuthorityLimit: number;
  riskScore: number;
  status: 'Pending Review' | 'Approved' | 'Rejected' | 'Conditions Applied';
  underwriterNotes: string;
  approverComments?: string;
}
