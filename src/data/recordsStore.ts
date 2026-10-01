// Centralized In-Memory Store & Query Service for InsureERP Records
// Powers dynamic List -> Workspace -> Action -> Audit flows without hardcoded static views.

import { UserRole } from '../types';
import { UserPermissionOverrides } from './roleRights';

export interface UserAccountRecordItem {
  id: string;
  name: string;
  email: string;
  jobTitle: string;
  department: string;
  branch: string;
  status: 'Active' | 'Inactive';
  lastLogin: string;
  assignedRoleCenters: UserRole[];
  permissionOverrides?: UserPermissionOverrides;
}

export interface CustomerRecord {
  id: string;
  name: string;
  customerType: 'Individual' | 'Corporate';
  kraPin: string;
  nationalId?: string;
  phone: string;
  email: string;
  branch: string;
  relationshipSince: number;
  relationshipValueKes: number;
  lifetimeClaimsKes: number;
  lossRatioPct: number;
  outstandingKes: number;
  riskProfile: 'LOW' | 'MEDIUM' | 'HIGH';
  activePoliciesCount: number;
  assignedUnderwriter: string;
  headquarters: string;
  status: 'ACTIVE' | 'KYC REVIEW' | 'INACTIVE';
}

export interface LeadRecordItem {
  id: string;
  name: string;
  customerType: 'Individual' | 'Corporate';
  contactPerson: string;
  phone: string;
  email: string;
  source: 'Referral' | 'Website' | 'Broker' | 'Cold Call' | 'Marketing Campaign';
  lineOfBusinessInterest: string;
  estimatedPremiumKes: number;
  assignedTo: string;
  createdDate: string;
  stage: 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'CONVERTED' | 'LOST';
  convertedCustomerId?: string;
}

export interface QuoteRecordItem {
  id: string;
  quoteNumber: string;
  customerId: string;
  customerName: string;
  lineOfBusiness: string;
  productName: string;
  sumInsuredKes: number;
  premiumKes: number;
  brokerId?: string;
  brokerName: string;
  effectiveDate: string;
  expiryDate: string;
  status: 'QUOTED' | 'DRAFT' | 'REFERRAL' | 'BOUND' | 'DECLINED';
  riskScore: number;
  lossRatioPct: number;
  createdDate: string;
}

export interface PolicyRecordItem {
  id: string;
  policyNumber: string;
  customerId: string;
  customerName: string;
  productId: string;
  productName: string;
  lineOfBusiness: string;
  brokerId?: string;
  brokerName: string;
  sumInsuredKes: number;
  annualPremiumKes: number;
  paidToDateKes: number;
  effectiveStart: string;
  effectiveEnd: string;
  status: 'IN FORCE' | 'PENDING RENEWAL' | 'LAPSED' | 'CANCELLED';
  underwriter: string;
  branch: string;
  endorsementsCount: number;
  claimsCount: number;
  vehicleReg?: string;
}

export interface ClaimRecordItem {
  id: string;
  claimNumber: string;
  policyNumber: string;
  customerId: string;
  customerName: string;
  lossDate: string;
  reportDate: string;
  lossType: string;
  location: string;
  status: 'FNOL' | 'ASSESSMENT' | 'VALIDATION' | 'APPROVAL' | 'SETTLEMENT' | 'CLOSED';
  initialReserveKes: number;
  outstandingReserveKes: number;
  totalIncurredKes: number;
  amountPaidKes: number;
  deductibleAppliedKes: number;
  assessorId?: string;
  assessorName: string;
  garageName?: string;
  siuFraudScore: number;
  slaRemainingHours: number;
}

export interface BrokerRecordItem {
  id: string;
  name: string;
  licenseNumber: string;
  type: 'Wholesale Broker' | 'Corporate Broker' | 'Retail Broker' | 'Bancassurance' | 'Principal Agent';
  contactPerson: string;
  phone: string;
  email: string;
  inForcePoliciesCount: number;
  annualGwpKes: number;
  commissionEarnedKes: number;
  lossRatioPct: number;
  complianceStatus: 'ACCREDITED' | 'PROVISIONAL' | 'AUDIT REQUIRED';
  iraRenewalDate: string;
  piCoverageKes: number;
}

export interface ProductRecordItem {
  id: string;
  productCode: string;
  name: string;
  category: 'Commercial Motor' | 'Personal Lines' | 'Property & Fire' | 'Health & Medical' | 'Marine & Transit';
  baseRatePct: number;
  inForcePoliciesCount: number;
  annualGwpKes: number;
  lossRatioPct: number;
  combinedRatioPct: number;
  status: 'ACTIVE' | 'DRAFT' | 'REVISED' | 'SUNSET';
  iraFilingReference: string;
  productManager: string;
}

export interface ProviderRecordItem {
  id: string;
  name: string;
  providerType: 'Motor Loss Assessor' | 'Authorized Garage' | 'Medical Provider' | 'Fraud Investigator';
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  averageTatHours: number;
  activeWorkOrdersCount: number;
  totalInspectionsCount: number;
  slaCompliancePct: number;
  status: 'ACTIVE' | 'ON PROBATION' | 'SUSPENDED';
  location: string;
}

export interface TreatyRecordItem {
  id: string;
  treatyCode: string;
  title: string;
  underwritingYear: number;
  type: 'Quota Share' | 'Excess of Loss' | 'Surplus' | 'Facultative';
  lineOfBusiness: string;
  capacityLimitKes: number;
  companyRetentionPct: number;
  treatyCessionPct: number;
  leadReinsurer: string;
  status: 'ACTIVE' | 'IN RENEWAL' | 'EXPIRED';
  quarterlySettlementKes: number;
}

export interface TenantRecordItem {
  id: string;
  name: string;
  code: string;
  domain: string;
  region: string;
  regulator: string;
  currency: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface BranchRecordItem {
  id: string;
  name: string;
  region: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface ApiEndpointRecordItem {
  id: string;
  name: string;
  provider: string;
  category: 'Core Banking' | 'Payments' | 'Regulatory' | 'Communication' | 'ERP' | 'Telematics';
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpointUrl: string;
  direction: 'Inbound' | 'Outbound' | 'Bidirectional';
  environment: 'Production' | 'Sandbox' | 'Disabled';
  authType: 'mTLS' | 'OAuth2' | 'API Key' | 'Basic Auth' | 'None';
  status: 'Healthy' | 'Warning' | 'Disabled' | 'Not Configured';
  lastPing: string;
  latencyMs: number;
  uptime90d: number;
  activeTps: number;
  owner: string;
  notes: string;
}

export type WorkflowDocumentType = 'QUOTE' | 'POLICY' | 'CLAIM' | 'PAYMENT';

/**
 * One node in an approval chain. A step only applies to a given document if the
 * document's branch matches `branchScope` (or `branchScope` is unset, meaning any
 * branch) AND its amount falls within [minAmountKes, maxAmountKes]. Steps that don't
 * apply are skipped entirely — this is how branch- and amount-based routing works.
 */
export interface WorkflowStepDef {
  id: string;
  order: number;
  name: string;
  approverRole: UserRole;
  branchScope?: string;
  minAmountKes?: number;
  maxAmountKes?: number;
}

export interface WorkflowDefinitionRecord {
  id: string;
  name: string;
  documentType: WorkflowDocumentType;
  enabled: boolean;
  steps: WorkflowStepDef[];
}

export interface WorkflowActionEntry {
  stepId: string;
  stepName: string;
  action: 'APPROVE' | 'REJECT';
  actor: string;
  comment?: string;
  timestamp: string;
}

export interface WorkflowInstanceRecord {
  id: string;
  definitionId: string;
  definitionName: string;
  documentType: WorkflowDocumentType;
  documentId: string;
  documentLabel: string;
  amountKes: number;
  branch: string;
  initiatedBy: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  applicableSteps: WorkflowStepDef[];
  currentStepIndex: number;
  history: WorkflowActionEntry[];
  createdAt: string;
  updatedAt: string;
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'INCOME' | 'EXPENSE';

export interface ChartOfAccountItem {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  normalBalance: 'DEBIT' | 'CREDIT';
  status: 'ACTIVE' | 'INACTIVE';
}

export interface JournalLineItem {
  accountId: string;
  accountCode: string;
  accountName: string;
  debitKes: number;
  creditKes: number;
}

export interface JournalEntryRecord {
  id: string;
  voucherNumber: string;
  date: string;
  description: string;
  reference?: string;
  branch: string;
  lines: JournalLineItem[];
  totalKes: number;
  status: 'PENDING_APPROVAL' | 'POSTED' | 'REJECTED';
  workflowInstanceId?: string;
  postedBy: string;
  createdAt: string;
}

/**
 * A configurable document-numbering scheme (Quotation, Policy, Claim, Receipt, Journal
 * Voucher, ...). `id` is a stable key that generator call sites reference directly
 * (e.g. getNextNumber('journal-voucher')) — renaming the label never breaks that lookup.
 */
export interface NumberSeriesConfig {
  id: string;
  label: string;
  prefix: string;
  includeYear: boolean;
  padWidth: number;
  nextSequence: number;
  resetCadence: 'NEVER' | 'ANNUAL';
  lastResetYear?: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export type ActivityEntityType =
  | 'Customer'
  | 'Policy'
  | 'Quote'
  | 'Claim'
  | 'Payment'
  | 'Reserve'
  | 'Broker'
  | 'Product'
  | 'Provider'
  | 'Treaty'
  | 'Tenant'
  | 'Lead'
  | 'UserAccount'
  | 'Branch'
  | 'Integration'
  | 'Configuration'
  | 'Workflow'
  | 'Account'
  | 'JournalEntry'
  | 'NumberSeries';

export interface ActivityEvent {
  id: string;
  timestamp: string;
  author: string;
  entityType: ActivityEntityType;
  entityId: string;
  action: string;
  details: string;
}

// Initial Mock Datasets
const INITIAL_CUSTOMERS: CustomerRecord[] = [
  {
    id: 'CUST-ABC-9910',
    name: 'ABC Logistics Ltd',
    customerType: 'Corporate',
    kraPin: 'P051294820Z',
    phone: '+254 722 889 900',
    email: 'operations@abclogistics.co.ke',
    branch: 'Nairobi Commercial Hub',
    relationshipSince: 2021,
    relationshipValueKes: 18500000,
    lifetimeClaimsKes: 1400000,
    lossRatioPct: 41.2,
    outstandingKes: 125000,
    riskProfile: 'MEDIUM',
    activePoliciesCount: 12,
    assignedUnderwriter: 'Marcus Vance (Chief UW)',
    headquarters: 'Mombasa Road Logistics Park, Godown 14, Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-23456789',
    name: 'John Kamau',
    customerType: 'Individual',
    nationalId: '23456789',
    kraPin: 'A001928472B',
    phone: '+254 712 345 678',
    email: 'john.kamau@kamauholdings.co.ke',
    branch: 'Westlands Premier Branch',
    relationshipSince: 2019,
    relationshipValueKes: 1824500,
    lifetimeClaimsKes: 640000,
    lossRatioPct: 35.1,
    outstandingKes: 42500,
    riskProfile: 'LOW',
    activePoliciesCount: 4,
    assignedUnderwriter: 'Jane Mwangi (Senior Commercial UW)',
    headquarters: 'Upper Hill Chambers, 8th Floor, Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-NRB-1092',
    name: 'Nairobi Bottlers & Distributing Ltd',
    customerType: 'Corporate',
    kraPin: 'P051883912X',
    phone: '+254 720 114 558',
    email: 'finance@nairobibottlers.co.ke',
    branch: 'Industrial Area Hub',
    relationshipSince: 2018,
    relationshipValueKes: 34200000,
    lifetimeClaimsKes: 6200000,
    lossRatioPct: 38.5,
    outstandingKes: 0,
    riskProfile: 'LOW',
    activePoliciesCount: 8,
    assignedUnderwriter: 'Jane Mwangi (Senior Commercial UW)',
    headquarters: 'Enterprise Road, Plot 42, Industrial Area, Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-KQ-8812',
    name: 'Kenya Express Air Cargo Haulage',
    customerType: 'Corporate',
    kraPin: 'P059281944Q',
    phone: '+254 733 900 120',
    email: 'cargo-ops@ke-express.co.ke',
    branch: 'Embakasi Airport Branch',
    relationshipSince: 2020,
    relationshipValueKes: 48900000,
    lifetimeClaimsKes: 12400000,
    lossRatioPct: 44.8,
    outstandingKes: 540000,
    riskProfile: 'MEDIUM',
    activePoliciesCount: 19,
    assignedUnderwriter: 'Marcus Vance (Chief UW)',
    headquarters: 'Cargo Terminal 2, JKIA, Nairobi',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-JANE-4491',
    name: 'Jane Njeri Wanjiku',
    customerType: 'Individual',
    nationalId: '29810423',
    kraPin: 'A009841299J',
    phone: '+254 711 928 340',
    email: 'jane.njeri@wanjikuadvisors.co.ke',
    branch: 'Kisumu Mega City Branch',
    relationshipSince: 2024,
    relationshipValueKes: 420000,
    lifetimeClaimsKes: 0,
    lossRatioPct: 0.0,
    outstandingKes: 15000,
    riskProfile: 'LOW',
    activePoliciesCount: 2,
    assignedUnderwriter: 'David Ochieng (Retail UW)',
    headquarters: 'Oginga Odinga Street, Kisumu',
    status: 'KYC REVIEW',
  },
  {
    id: 'CUST-ELD-3310',
    name: 'Rift Valley Grain Millers Corp',
    customerType: 'Corporate',
    kraPin: 'P051029384W',
    phone: '+254 722 349 100',
    email: 'admin@riftvalleymillers.co.ke',
    branch: 'Eldoret Regional Hub',
    relationshipSince: 2017,
    relationshipValueKes: 22100000,
    lifetimeClaimsKes: 8500000,
    lossRatioPct: 48.2,
    outstandingKes: 280000,
    riskProfile: 'MEDIUM',
    activePoliciesCount: 6,
    assignedUnderwriter: 'Marcus Vance (Chief UW)',
    headquarters: 'Silos Way, Industrial Zone, Eldoret',
    status: 'ACTIVE',
  },
  {
    id: 'CUST-TITAN-0012',
    name: 'Titan Bulk Fuel Transport Ltd',
    customerType: 'Corporate',
    kraPin: 'P058819201T',
    phone: '+254 731 445 670',
    email: 'fleet@titanfuel.co.ke',
    branch: 'Mombasa Port Branch',
    relationshipSince: 2022,
    relationshipValueKes: 68400000,
    lifetimeClaimsKes: 19800000,
    lossRatioPct: 56.4,
    outstandingKes: 1450000,
    riskProfile: 'HIGH',
    activePoliciesCount: 14,
    assignedUnderwriter: 'Marcus Vance (Chief UW)',
    headquarters: 'Shimanzi Oil Terminal Road, Mombasa',
    status: 'ACTIVE',
  },
];

const INITIAL_QUOTES: QuoteRecordItem[] = [
  {
    id: 'Q-MTR-2026-00821',
    quoteNumber: 'MTR/Q/2026/00821',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd',
    lineOfBusiness: 'Commercial Motor',
    productName: 'Commercial Motor Comprehensive (Mercedes Actros)',
    sumInsuredKes: 18500000,
    premiumKes: 832500,
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    effectiveDate: '2026-10-01',
    expiryDate: '2027-09-30',
    status: 'QUOTED',
    riskScore: 78,
    lossRatioPct: 41.2,
    createdDate: '2026-09-02',
  },
  {
    id: 'Q-MTR-2026-00912',
    quoteNumber: 'MTR/Q/2026/00912',
    customerId: 'CUST-23456789',
    customerName: 'John Kamau',
    lineOfBusiness: 'Private Motor',
    productName: 'Motor Comprehensive (Toyota Prado)',
    sumInsuredKes: 8400000,
    premiumKes: 182450,
    brokerName: 'Direct Online',
    effectiveDate: '2026-09-15',
    expiryDate: '2027-09-14',
    status: 'BOUND',
    riskScore: 92,
    lossRatioPct: 35.1,
    createdDate: '2026-08-28',
  },
  {
    id: 'Q-MED-2026-00412',
    quoteNumber: 'MED/Q/2026/00412',
    customerId: 'CUST-NRB-1092',
    customerName: 'Nairobi Bottlers & Distributing Ltd',
    lineOfBusiness: 'Health & Medical',
    productName: 'Corporate Executive Health Scheme (180 Staff)',
    sumInsuredKes: 45000000,
    premiumKes: 4200000,
    brokerId: 'BRK-00104',
    brokerName: 'Aon Minet Risk Services',
    effectiveDate: '2026-11-01',
    expiryDate: '2027-10-31',
    status: 'REFERRAL',
    riskScore: 84,
    lossRatioPct: 38.5,
    createdDate: '2026-09-01',
  },
  {
    id: 'Q-FIR-2026-00199',
    quoteNumber: 'FIR/Q/2026/00199',
    customerId: 'CUST-ELD-3310',
    customerName: 'Rift Valley Grain Millers Corp',
    lineOfBusiness: 'Property & Fire',
    productName: 'Industrial All Risks & Silo Fire Cover',
    sumInsuredKes: 120000000,
    premiumKes: 1450000,
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    effectiveDate: '2026-10-15',
    expiryDate: '2027-10-14',
    status: 'QUOTED',
    riskScore: 74,
    lossRatioPct: 48.2,
    createdDate: '2026-08-30',
  },
  {
    id: 'Q-GIT-2026-00331',
    quoteNumber: 'GIT/Q/2026/00331',
    customerId: 'CUST-TITAN-0012',
    customerName: 'Titan Bulk Fuel Transport Ltd',
    lineOfBusiness: 'Marine & Transit',
    productName: 'HazMat Petroleum Cargo Open Cover',
    sumInsuredKes: 85000000,
    premiumKes: 2150000,
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    effectiveDate: '2026-10-01',
    expiryDate: '2027-09-30',
    status: 'REFERRAL',
    riskScore: 61,
    lossRatioPct: 56.4,
    createdDate: '2026-09-02',
  },
];

const INITIAL_POLICIES: PolicyRecordItem[] = [
  {
    id: 'POL-MTR-2026-001239',
    policyNumber: 'POL/MTR/2026/001239',
    customerId: 'CUST-23456789',
    customerName: 'John Kamau',
    productId: 'PRD-MTR-COMP',
    productName: 'Commercial Motor Comprehensive (Toyota Prado)',
    lineOfBusiness: 'Commercial Motor',
    brokerName: 'Direct Online',
    sumInsuredKes: 8400000,
    annualPremiumKes: 182450,
    paidToDateKes: 182450,
    effectiveStart: '2026-09-01',
    effectiveEnd: '2027-08-31',
    status: 'IN FORCE',
    underwriter: 'Jane Mwangi',
    branch: 'Westlands Premier',
    endorsementsCount: 3,
    claimsCount: 1,
    vehicleReg: 'KDJ 123A',
  },
  {
    id: 'POL-FLEET-2026-0082',
    policyNumber: 'POL/FLEET/2026/0082',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd',
    productId: 'PRD-MTR-COMP',
    productName: 'Commercial Fleet & Haulage Umbrella',
    lineOfBusiness: 'Commercial Motor',
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    sumInsuredKes: 148000000,
    annualPremiumKes: 4200000,
    paidToDateKes: 3150000,
    effectiveStart: '2026-04-01',
    effectiveEnd: '2027-03-31',
    status: 'IN FORCE',
    underwriter: 'Marcus Vance',
    branch: 'Nairobi Commercial Hub',
    endorsementsCount: 5,
    claimsCount: 4,
    vehicleReg: 'KDG 123Z Fleet (14 Prime Movers)',
  },
  {
    id: 'POL-MED-2026-00492',
    policyNumber: 'POL/MED/2026/00492',
    customerId: 'CUST-23456789',
    customerName: 'John Kamau Family',
    productId: 'PRD-MED-CORP',
    productName: 'Medical Family Executive Care (4 Members)',
    lineOfBusiness: 'Health & Medical',
    brokerId: 'BRK-00388',
    brokerName: 'Britam Bancassurance',
    sumInsuredKes: 10000000,
    annualPremiumKes: 245000,
    paidToDateKes: 245000,
    effectiveStart: '2026-07-01',
    effectiveEnd: '2027-06-30',
    status: 'IN FORCE',
    underwriter: 'Dr. Anne Kilonzo',
    branch: 'Westlands Premier',
    endorsementsCount: 1,
    claimsCount: 2,
  },
  {
    id: 'POL-MAR-2026-00412',
    policyNumber: 'POL/MAR/2026/00412',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd',
    productId: 'PRD-MAR-CARGO',
    productName: 'Marine Cargo Transit (Open Cover)',
    lineOfBusiness: 'Marine & Transit',
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    sumInsuredKes: 80000000,
    annualPremiumKes: 1120000,
    paidToDateKes: 1120000,
    effectiveStart: '2025-11-15',
    effectiveEnd: '2026-11-14',
    status: 'PENDING RENEWAL',
    underwriter: 'Marcus Vance',
    branch: 'Mombasa Port Hub',
    endorsementsCount: 2,
    claimsCount: 1,
  },
  {
    id: 'POL-FIRE-2026-0199',
    policyNumber: 'POL/FIRE/2026/0199',
    customerId: 'CUST-23456789',
    customerName: 'Kamau Holdings Ltd',
    productId: 'PRD-FIR-IND',
    productName: 'Commercial Property & Warehousing Fire',
    lineOfBusiness: 'Property & Fire',
    brokerId: 'BRK-00104',
    brokerName: 'Aon Minet Risk Services',
    sumInsuredKes: 50000000,
    annualPremiumKes: 380000,
    paidToDateKes: 380000,
    effectiveStart: '2025-10-01',
    effectiveEnd: '2026-09-30',
    status: 'PENDING RENEWAL',
    underwriter: 'Peter Ndegwa',
    branch: 'Nairobi Commercial Hub',
    endorsementsCount: 0,
    claimsCount: 0,
  },
  {
    id: 'POL-GIT-2026-00084',
    policyNumber: 'POL/GIT/2026/00084',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd',
    productId: 'PRD-MAR-CARGO',
    productName: 'Goods In Transit (All Risks Containerized)',
    lineOfBusiness: 'Marine & Transit',
    brokerId: 'BRK-00291',
    brokerName: 'Marsh McLennan Wholesale',
    sumInsuredKes: 50000000,
    annualPremiumKes: 580000,
    paidToDateKes: 580000,
    effectiveStart: '2026-01-01',
    effectiveEnd: '2026-12-31',
    status: 'IN FORCE',
    underwriter: 'Marcus Vance',
    branch: 'Nairobi Commercial Hub',
    endorsementsCount: 1,
    claimsCount: 1,
  },
];

const INITIAL_CLAIMS: ClaimRecordItem[] = [
  {
    id: 'CLM-MTR-2026-0081',
    claimNumber: 'CLM/MTR/2026/0081',
    policyNumber: 'POL/MTR/2026/001239',
    customerId: 'CUST-23456789',
    customerName: 'John Kamau',
    lossDate: '2026-08-28',
    reportDate: '2026-08-29',
    lossType: 'Motor Collision - Front Bumper & Radiator',
    location: 'Waiyaki Way, Westlands, Nairobi',
    status: 'ASSESSMENT',
    initialReserveKes: 450000,
    outstandingReserveKes: 150000,
    totalIncurredKes: 450000,
    amountPaidKes: 300000,
    deductibleAppliedKes: 15000,
    assessorId: 'PRV-ASSESS-0042',
    assessorName: 'Peter Githinji (Automotive Engineers Ltd)',
    garageName: 'DT Dobie Nairobi',
    siuFraudScore: 8,
    slaRemainingHours: 4,
  },
  {
    id: 'CLM-MTR-2026-8291',
    claimNumber: 'CLM/MTR/2026/8291',
    policyNumber: 'POL/FLEET/2026/0082',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd (Actros KDG 123Z)',
    lossDate: '2026-09-01',
    reportDate: '2026-09-02',
    lossType: 'Highway Rollover & Partial Cargo Loss',
    location: 'Salgaa Corridors, Nakuru County',
    status: 'VALIDATION',
    initialReserveKes: 570000,
    outstandingReserveKes: 570000,
    totalIncurredKes: 570000,
    amountPaidKes: 0,
    deductibleAppliedKes: 50000,
    assessorId: 'PRV-ASSESS-0042',
    assessorName: 'Peter Githinji (Automotive Engineers Ltd)',
    garageName: 'Simba Corp Nakuru Heavy',
    siuFraudScore: 19,
    slaRemainingHours: 1,
  },
  {
    id: 'CLM-MED-2026-0411',
    claimNumber: 'CLM/MED/2026/0411',
    policyNumber: 'POL/MED/2026/00492',
    customerId: 'CUST-23456789',
    customerName: 'Jane Njeri Kamau',
    lossDate: '2026-08-10',
    reportDate: '2026-08-11',
    lossType: 'Inpatient Emergency Surgery',
    location: 'The Nairobi Hospital, Argwings Kodhek Rd',
    status: 'CLOSED',
    initialReserveKes: 190000,
    outstandingReserveKes: 0,
    totalIncurredKes: 190000,
    amountPaidKes: 190000,
    deductibleAppliedKes: 0,
    assessorName: 'MediCare TPA Medical Desk',
    garageName: 'The Nairobi Hospital',
    siuFraudScore: 4,
    slaRemainingHours: 0,
  },
  {
    id: 'CLM-FIR-2026-0419',
    claimNumber: 'CLM/FIR/2026/0419',
    policyNumber: 'POL/FIRE/2026/0199',
    customerId: 'CUST-ELD-3310',
    customerName: 'Rift Valley Grain Millers Corp',
    lossDate: '2026-08-25',
    reportDate: '2026-08-26',
    lossType: 'Grain Dryer Electrical Flare-up & Smoke Damage',
    location: 'Silos Zone, Eldoret',
    status: 'VALIDATION',
    initialReserveKes: 8500000,
    outstandingReserveKes: 8500000,
    totalIncurredKes: 8500000,
    amountPaidKes: 0,
    deductibleAppliedKes: 250000,
    assessorName: 'Topline Adjusters Kenya Ltd',
    siuFraudScore: 12,
    slaRemainingHours: 18,
  },
  {
    id: 'CLM-GIT-2026-0991',
    claimNumber: 'CLM/GIT/2026/0991',
    policyNumber: 'POL/GIT/2026/00084',
    customerId: 'CUST-ABC-9910',
    customerName: 'ABC Logistics Ltd',
    lossDate: '2026-09-02',
    reportDate: '2026-09-03',
    lossType: 'Tampered Container Seals & Stolen High-Value Electronics',
    location: 'Sultan Hamud Transit Depot',
    status: 'FNOL',
    initialReserveKes: 620000,
    outstandingReserveKes: 620000,
    totalIncurredKes: 620000,
    amountPaidKes: 0,
    deductibleAppliedKes: 30000,
    assessorName: 'Falcon Loss Adjusters',
    siuFraudScore: 14,
    slaRemainingHours: 12,
  },
];

const INITIAL_BROKERS: BrokerRecordItem[] = [
  {
    id: 'BRK-00291',
    name: 'Marsh McLennan Wholesale',
    licenseNumber: 'IRA/BRK/2026/041',
    type: 'Wholesale Broker',
    contactPerson: 'Sarah Jenkins (Chief Broking Officer)',
    phone: '+254 722 555 101',
    email: 'sarah.jenkins@marshmclennan.co.ke',
    inForcePoliciesCount: 428,
    annualGwpKes: 148500000,
    commissionEarnedKes: 22275000,
    lossRatioPct: 44.2,
    complianceStatus: 'ACCREDITED',
    iraRenewalDate: '31 Dec 2026',
    piCoverageKes: 100000000,
  },
  {
    id: 'BRK-00104',
    name: 'Aon Minet Risk Services Kenya',
    licenseNumber: 'IRA/BRK/2026/012',
    type: 'Corporate Broker',
    contactPerson: 'David Chen (Executive Director)',
    phone: '+254 722 888 200',
    email: 'commercial@minet.co.ke',
    inForcePoliciesCount: 612,
    annualGwpKes: 210200000,
    commissionEarnedKes: 31530000,
    lossRatioPct: 38.6,
    complianceStatus: 'ACCREDITED',
    iraRenewalDate: '31 Dec 2026',
    piCoverageKes: 250000000,
  },
  {
    id: 'BRK-00388',
    name: 'Britam Bancassurance Intermediary',
    licenseNumber: 'IRA/BAN/2026/005',
    type: 'Bancassurance',
    contactPerson: 'Mercy Gathoni (Head of Bank Channel)',
    phone: '+254 711 444 888',
    email: 'bancassurance@britam.com',
    inForcePoliciesCount: 1120,
    annualGwpKes: 94000000,
    commissionEarnedKes: 9400000,
    lossRatioPct: 32.1,
    complianceStatus: 'ACCREDITED',
    iraRenewalDate: '31 Dec 2026',
    piCoverageKes: 50000000,
  },
  {
    id: 'AGT-00921',
    name: 'Baraka Direct Agency Ltd',
    licenseNumber: 'IRA/AGT/2026/911',
    type: 'Principal Agent',
    contactPerson: 'Samson Baraka',
    phone: '+254 733 112 233',
    email: 'samson@barakaagency.co.ke',
    inForcePoliciesCount: 142,
    annualGwpKes: 18200000,
    commissionEarnedKes: 1820000,
    lossRatioPct: 49.0,
    complianceStatus: 'PROVISIONAL',
    iraRenewalDate: '30 Sep 2026',
    piCoverageKes: 20000000,
  },
];

const INITIAL_PRODUCTS: ProductRecordItem[] = [
  {
    id: 'PRD-MTR-COMP',
    productCode: 'PRD-MTR-COMP',
    name: 'Commercial Motor Comprehensive v2.4',
    category: 'Commercial Motor',
    baseRatePct: 4.5,
    inForcePoliciesCount: 1482,
    annualGwpKes: 384200000,
    lossRatioPct: 48.6,
    combinedRatioPct: 82.4,
    status: 'ACTIVE',
    iraFilingReference: 'IRA/PRD/2025/11',
    productManager: 'Jane Mwangi (Motor Underwriting Desk)',
  },
  {
    id: 'PRD-MTR-PVT',
    productCode: 'PRD-MTR-PVT',
    name: 'Private Motor Comprehensive v3.1',
    category: 'Personal Lines',
    baseRatePct: 4.0,
    inForcePoliciesCount: 3820,
    annualGwpKes: 412000000,
    lossRatioPct: 42.0,
    combinedRatioPct: 76.5,
    status: 'ACTIVE',
    iraFilingReference: 'IRA/PRD/2025/08',
    productManager: 'David Ochieng (Retail Portfolio)',
  },
  {
    id: 'PRD-MED-CORP',
    productCode: 'PRD-MED-CORP',
    name: 'Corporate Executive Health Scheme v1.8',
    category: 'Health & Medical',
    baseRatePct: 6.8,
    inForcePoliciesCount: 214,
    annualGwpKes: 520000000,
    lossRatioPct: 58.2,
    combinedRatioPct: 88.2,
    status: 'ACTIVE',
    iraFilingReference: 'IRA/PRD/2024/49',
    productManager: 'Dr. Anne Kilonzo (Health Solutions)',
  },
  {
    id: 'PRD-FIR-IND',
    productCode: 'PRD-FIR-IND',
    name: 'Industrial Fire & Special Perils v4.0',
    category: 'Property & Fire',
    baseRatePct: 0.125,
    inForcePoliciesCount: 680,
    annualGwpKes: 295000000,
    lossRatioPct: 34.1,
    combinedRatioPct: 64.1,
    status: 'ACTIVE',
    iraFilingReference: 'IRA/PRD/2023/102',
    productManager: 'Peter Ndegwa (Property Lead)',
  },
  {
    id: 'PRD-MAR-CARGO',
    productCode: 'PRD-MAR-CARGO',
    name: 'Marine Cargo & Transit Open Cover v2.0',
    category: 'Marine & Transit',
    baseRatePct: 0.35,
    inForcePoliciesCount: 410,
    annualGwpKes: 165000000,
    lossRatioPct: 31.5,
    combinedRatioPct: 58.0,
    status: 'ACTIVE',
    iraFilingReference: 'IRA/PRD/2025/02',
    productManager: 'Marcus Vance (Marine & Specialty)',
  },
];

const INITIAL_PROVIDERS: ProviderRecordItem[] = [
  {
    id: 'PRV-ASSESS-0042',
    name: 'Peter Githinji (Automotive Engineers Ltd)',
    providerType: 'Motor Loss Assessor',
    registrationNumber: 'EBK/ENG/8192',
    contactPerson: 'Eng. Peter Githinji',
    phone: '+254 722 994 001',
    email: 'peter@autoengineers.co.ke',
    averageTatHours: 18.2,
    activeWorkOrdersCount: 6,
    totalInspectionsCount: 312,
    slaCompliancePct: 98.4,
    status: 'ACTIVE',
    location: 'Nairobi & Central Region',
  },
  {
    id: 'PRV-GAR-0019',
    name: 'DT Dobie Authorized Workshop Nairobi',
    providerType: 'Authorized Garage',
    registrationNumber: 'NTSA/GAR/2025/11',
    contactPerson: 'Harrison Mwema (Service Director)',
    phone: '+254 720 001 222',
    email: 'bodyshop@dtdobie.co.ke',
    averageTatHours: 124.0,
    activeWorkOrdersCount: 14,
    totalInspectionsCount: 520,
    slaCompliancePct: 96.0,
    status: 'ACTIVE',
    location: 'Lusaka Road, Industrial Area, Nairobi',
  },
  {
    id: 'PRV-MED-0081',
    name: 'The Nairobi Hospital Premier Healthcare',
    providerType: 'Medical Provider',
    registrationNumber: 'KMPDC/MED/004',
    contactPerson: 'Corporate Credit Desk',
    phone: '+254 703 082 000',
    email: 'insurance-liaison@nairobihospital.org',
    averageTatHours: 1.5,
    activeWorkOrdersCount: 22,
    totalInspectionsCount: 1420,
    slaCompliancePct: 99.1,
    status: 'ACTIVE',
    location: 'Argwings Kodhek Road, Nairobi',
  },
  {
    id: 'PRV-INV-0012',
    name: 'Falcon Special Investigation Unit',
    providerType: 'Fraud Investigator',
    registrationNumber: 'CID/SIU/2024/88',
    contactPerson: 'Major (Rtd) James Opondo',
    phone: '+254 733 800 911',
    email: 'investigations@falconsiu.co.ke',
    averageTatHours: 44.0,
    activeWorkOrdersCount: 3,
    totalInspectionsCount: 88,
    slaCompliancePct: 94.5,
    status: 'ACTIVE',
    location: 'Corridor Security Coverage (Mombasa-Busia)',
  },
];

const INITIAL_TREATIES: TreatyRecordItem[] = [
  {
    id: 'TRT-2026-MTR-QS',
    treatyCode: 'TRT-2026-MTR-QS',
    title: 'Commercial Motor Quota Share Treaty 2026',
    underwritingYear: 2026,
    type: 'Quota Share',
    lineOfBusiness: 'Commercial Motor',
    capacityLimitKes: 250000000,
    companyRetentionPct: 60,
    treatyCessionPct: 40,
    leadReinsurer: 'Kenya Re (20%) / East Africa Re (12.5%) / Zep-Re (7.5%)',
    status: 'ACTIVE',
    quarterlySettlementKes: 38400000,
  },
  {
    id: 'TRT-2026-PROP-XOL',
    treatyCode: 'TRT-2026-PROP-XOL',
    title: 'Property Risk Excess of Loss 2026',
    underwritingYear: 2026,
    type: 'Excess of Loss',
    lineOfBusiness: 'Property & Industrial Fire',
    capacityLimitKes: 500000000,
    companyRetentionPct: 20,
    treatyCessionPct: 80,
    leadReinsurer: 'East Africa Reinsurance Co.',
    status: 'ACTIVE',
    quarterlySettlementKes: 18500000,
  },
  {
    id: 'TRT-2026-CAT-XOL',
    treatyCode: 'TRT-2026-CAT-XOL',
    title: 'Catastrophe Excess of Loss (Clash & Flood)',
    underwritingYear: 2026,
    type: 'Excess of Loss',
    lineOfBusiness: 'All Non-Life Lines',
    capacityLimitKes: 1000000000,
    companyRetentionPct: 10,
    treatyCessionPct: 90,
    leadReinsurer: 'Africa Re / Zep-Re Consortium',
    status: 'ACTIVE',
    quarterlySettlementKes: 24000000,
  },
];

const INITIAL_TENANTS: TenantRecordItem[] = [
  {
    id: 'APX-KE',
    name: 'Apex Insurance Kenya Ltd',
    code: 'APX-KE',
    domain: 'apex.co.ke',
    region: 'Nairobi HQ • Primary Underwriter',
    regulator: 'IRA (Kenya)',
    currency: 'KES',
    status: 'ACTIVE',
  },
  {
    id: 'JBL-BA',
    name: 'Jubilee Allianz Bancassurance',
    code: 'JBL-BA',
    domain: 'jubileeallianz.co.ke',
    region: 'East Africa Retail Syndicate',
    regulator: 'IRA (Kenya)',
    currency: 'KES',
    status: 'ACTIVE',
  },
  {
    id: 'BRT-INT',
    name: 'Britam General Intermediary',
    code: 'BRT-INT',
    domain: 'britam.co.ke',
    region: 'Commercial Broker Gateway',
    regulator: 'IRA (Kenya)',
    currency: 'KES',
    status: 'ACTIVE',
  },
];

const INITIAL_BRANCHES: BranchRecordItem[] = [
  { id: 'BR-NBO-COMM', name: 'Nairobi Commercial Hub', region: 'Nairobi HQ', status: 'ACTIVE' },
  { id: 'BR-WLD-PREM', name: 'Westlands Premier Branch', region: 'Nairobi HQ', status: 'ACTIVE' },
  { id: 'BR-IND-AREA', name: 'Industrial Area Hub', region: 'Nairobi HQ', status: 'ACTIVE' },
  { id: 'BR-EMB-AIRP', name: 'Embakasi Airport Branch', region: 'Nairobi HQ', status: 'ACTIVE' },
  { id: 'BR-KSM-MEGA', name: 'Kisumu Mega City Branch', region: 'Nyanza', status: 'ACTIVE' },
  { id: 'BR-ELD-REG', name: 'Eldoret Regional Hub', region: 'Rift Valley', status: 'ACTIVE' },
  { id: 'BR-MSA-PORT', name: 'Mombasa Port Branch', region: 'Coast', status: 'ACTIVE' },
];

const INITIAL_API_ENDPOINTS: ApiEndpointRecordItem[] = [
  {
    id: 'INT-FCB',
    name: 'Oracle Flexcube Core Banking',
    provider: 'Oracle Flexcube',
    category: 'Core Banking',
    method: 'POST',
    endpointUrl: 'https://api.flexcube.local/v2/standing-orders/sync',
    direction: 'Bidirectional',
    environment: 'Production',
    authType: 'mTLS',
    status: 'Healthy',
    lastPing: '3s ago',
    latencyMs: 42,
    uptime90d: 99.98,
    activeTps: 18,
    owner: 'Finance Operations',
    notes: 'Standing orders, auto-debits, escrow account synchronization',
  },
  {
    id: 'INT-MPESA',
    name: 'Safaricom M-Pesa Daraja B2C/C2B',
    provider: 'Safaricom',
    category: 'Payments',
    method: 'POST',
    endpointUrl: 'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
    direction: 'Bidirectional',
    environment: 'Production',
    authType: 'OAuth2',
    status: 'Healthy',
    lastPing: '1s ago',
    latencyMs: 128,
    uptime90d: 99.95,
    activeTps: 142,
    owner: 'Treasury',
    notes: 'Real-time paybill STK push and automated claims payout disbursement',
  },
  {
    id: 'INT-IRA',
    name: 'Insurance Regulatory Authority Gateway',
    provider: 'IRA Kenya',
    category: 'Regulatory',
    method: 'POST',
    endpointUrl: 'https://gateway.ira.go.ke/api/v1/certificates/verify',
    direction: 'Outbound',
    environment: 'Production',
    authType: 'API Key',
    status: 'Healthy',
    lastPing: '1m ago',
    latencyMs: 190,
    uptime90d: 99.4,
    activeTps: 3,
    owner: 'Compliance',
    notes: 'Motor digital certificate verification and quarterly return filing',
  },
  {
    id: 'INT-KRA',
    name: 'Kenya Revenue Authority iTax',
    provider: 'KRA',
    category: 'Regulatory',
    method: 'GET',
    endpointUrl: 'https://itax.kra.go.ke/api/v1/pin/validate',
    direction: 'Outbound',
    environment: 'Production',
    authType: 'API Key',
    status: 'Warning',
    lastPing: '45s ago',
    latencyMs: 240,
    uptime90d: 99.1,
    activeTps: 5,
    owner: 'Customer Compliance',
    notes: 'Real-time PIN tax compliance validation and withholding certificates',
  },
  {
    id: 'INT-SMS',
    name: "Africa's Talking SMS Gateway",
    provider: "Africa's Talking",
    category: 'Communication',
    method: 'POST',
    endpointUrl: 'https://api.africastalking.com/version1/messaging',
    direction: 'Outbound',
    environment: 'Production',
    authType: 'API Key',
    status: 'Healthy',
    lastPing: '4s ago',
    latencyMs: 95,
    uptime90d: 99.94,
    activeTps: 64,
    owner: 'Customer Experience',
    notes: 'Instant claim acknowledgement, policy expiry notices, and OTP',
  },
  {
    id: 'INT-SAP',
    name: 'SAP S/4HANA Enterprise Connector',
    provider: 'SAP',
    category: 'ERP',
    method: 'PATCH',
    endpointUrl: 'https://sap-gateway.local/insurance/treasury/posting',
    direction: 'Outbound',
    environment: 'Disabled',
    authType: 'mTLS',
    status: 'Not Configured',
    lastPing: 'Inactive',
    latencyMs: 0,
    uptime90d: 0,
    activeTps: 0,
    owner: 'Enterprise Architecture',
    notes: 'Enterprise treasury module optional extension',
  },
];

const INITIAL_WORKFLOW_DEFINITIONS: WorkflowDefinitionRecord[] = [
  {
    id: 'WF-QUOTE-REFERRAL',
    name: 'Quotation Referral Approval',
    documentType: 'QUOTE',
    enabled: true,
    steps: [
      { id: 'step-1', order: 1, name: 'Senior Underwriter Review', approverRole: 'underwriter', minAmountKes: 5000000 },
      { id: 'step-2', order: 2, name: 'CEO / Executive Sign-Off', approverRole: 'executive', minAmountKes: 20000000 },
    ],
  },
  {
    id: 'WF-POLICY-ENDORSEMENT',
    name: 'Policy Endorsement Approval',
    documentType: 'POLICY',
    enabled: true,
    steps: [
      { id: 'step-1', order: 1, name: 'Senior Underwriter Review', approverRole: 'underwriter', minAmountKes: 2000000 },
      {
        id: 'step-2',
        order: 2,
        name: 'CEO Sign-Off (Nairobi HQ Only)',
        approverRole: 'executive',
        minAmountKes: 10000000,
        branchScope: 'Nairobi Commercial Hub',
      },
    ],
  },
  {
    id: 'WF-CLAIM-SETTLEMENT',
    name: 'Claim Settlement Approval',
    documentType: 'CLAIM',
    enabled: true,
    steps: [
      { id: 'step-1', order: 1, name: 'Claims Manager Review', approverRole: 'claims', minAmountKes: 500000 },
      { id: 'step-2', order: 2, name: 'CEO / Executive Sign-Off', approverRole: 'executive', minAmountKes: 5000000 },
    ],
  },
  {
    id: 'WF-JOURNAL-APPROVAL',
    name: 'Journal Entry Approval',
    documentType: 'PAYMENT',
    enabled: true,
    steps: [
      { id: 'step-1', order: 1, name: 'Finance Officer Review', approverRole: 'finance', minAmountKes: 1000000 },
      { id: 'step-2', order: 2, name: 'CEO / Executive Sign-Off', approverRole: 'executive', minAmountKes: 10000000 },
    ],
  },
];

const INITIAL_CHART_OF_ACCOUNTS: ChartOfAccountItem[] = [
  { id: 'ACC-1000', code: '1000', name: 'Cash & Bank', type: 'ASSET', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-1010', code: '1010', name: 'M-Pesa Float', type: 'ASSET', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-1100', code: '1100', name: 'Premium Receivable', type: 'ASSET', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-1200', code: '1200', name: 'Reinsurance Recoverable', type: 'ASSET', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-2000', code: '2000', name: 'Claims Payable', type: 'LIABILITY', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-2100', code: '2100', name: 'Reinsurance Payable', type: 'LIABILITY', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-2200', code: '2200', name: 'Unearned Premium Reserve', type: 'LIABILITY', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-3000', code: '3000', name: 'Share Capital', type: 'EQUITY', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-3100', code: '3100', name: 'Retained Earnings', type: 'EQUITY', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-4000', code: '4000', name: 'Gross Written Premium', type: 'INCOME', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-4100', code: '4100', name: 'Commission Income', type: 'INCOME', normalBalance: 'CREDIT', status: 'ACTIVE' },
  { id: 'ACC-5000', code: '5000', name: 'Claims Incurred', type: 'EXPENSE', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-5100', code: '5100', name: 'Commission Expense', type: 'EXPENSE', normalBalance: 'DEBIT', status: 'ACTIVE' },
  { id: 'ACC-5200', code: '5200', name: 'Reinsurance Premium Ceded', type: 'EXPENSE', normalBalance: 'DEBIT', status: 'ACTIVE' },
];

const INITIAL_JOURNAL_ENTRIES: JournalEntryRecord[] = [
  {
    id: 'JE-000001',
    voucherNumber: 'JV/2026/000001',
    date: '2026-09-01',
    description: 'M-Pesa premium receipt — POL/MTR/2026/00182',
    reference: 'POL/MTR/2026/00182',
    branch: 'Nairobi Commercial Hub',
    lines: [
      { accountId: 'ACC-1010', accountCode: '1010', accountName: 'M-Pesa Float', debitKes: 182450, creditKes: 0 },
      { accountId: 'ACC-1100', accountCode: '1100', accountName: 'Premium Receivable', debitKes: 0, creditKes: 182450 },
    ],
    totalKes: 182450,
    status: 'POSTED',
    postedBy: 'David Ochieng (Finance Officer)',
    createdAt: '2026-09-01T09:12:00.000Z',
  },
  {
    id: 'JE-000002',
    voucherNumber: 'JV/2026/000002',
    date: '2026-09-02',
    description: 'Recognize gross written premium — POL/MTR/2026/00182',
    reference: 'POL/MTR/2026/00182',
    branch: 'Nairobi Commercial Hub',
    lines: [
      { accountId: 'ACC-1100', accountCode: '1100', accountName: 'Premium Receivable', debitKes: 182450, creditKes: 0 },
      { accountId: 'ACC-4000', accountCode: '4000', accountName: 'Gross Written Premium', debitKes: 0, creditKes: 182450 },
    ],
    totalKes: 182450,
    status: 'POSTED',
    postedBy: 'David Ochieng (Finance Officer)',
    createdAt: '2026-09-02T08:40:00.000Z',
  },
  {
    id: 'JE-000003',
    voucherNumber: 'JV/2026/000003',
    date: '2026-09-03',
    description: 'Claim disbursement — CLM/MTR/2026/0081',
    reference: 'CLM/MTR/2026/0081',
    branch: 'Nairobi Commercial Hub',
    lines: [
      { accountId: 'ACC-5000', accountCode: '5000', accountName: 'Claims Incurred', debitKes: 420000, creditKes: 0 },
      { accountId: 'ACC-1010', accountCode: '1010', accountName: 'M-Pesa Float', debitKes: 0, creditKes: 420000 },
    ],
    totalKes: 420000,
    status: 'POSTED',
    postedBy: 'Amanda Wright (Claims Manager)',
    createdAt: '2026-09-03T11:05:00.000Z',
  },
];

const INITIAL_NUMBER_SERIES: NumberSeriesConfig[] = [
  { id: 'quotation', label: 'Quotation', prefix: 'Q', includeYear: false, padWidth: 5, nextSequence: 10493, resetCadence: 'NEVER', status: 'ACTIVE' },
  { id: 'policy', label: 'Policy', prefix: 'POL', includeYear: true, padWidth: 5, nextSequence: 4821, resetCadence: 'ANNUAL', lastResetYear: 2026, status: 'ACTIVE' },
  { id: 'claim', label: 'Claim', prefix: 'CLM', includeYear: true, padWidth: 4, nextSequence: 8292, resetCadence: 'ANNUAL', lastResetYear: 2026, status: 'ACTIVE' },
  { id: 'receipt', label: 'Receipt', prefix: 'RCT', includeYear: false, padWidth: 7, nextSequence: 1048231, resetCadence: 'NEVER', status: 'ACTIVE' },
  { id: 'journal-voucher', label: 'Journal Voucher', prefix: 'JV', includeYear: true, padWidth: 6, nextSequence: 4, resetCadence: 'ANNUAL', lastResetYear: 2026, status: 'ACTIVE' },
];

const INITIAL_LEADS: LeadRecordItem[] = [
  {
    id: 'LEAD-001',
    name: 'Savannah Freight Movers Ltd',
    customerType: 'Corporate',
    contactPerson: 'Peter Mwaura',
    phone: '+254 722 445 981',
    email: 'peter.mwaura@savannahfreight.co.ke',
    source: 'Broker',
    lineOfBusinessInterest: 'Commercial Motor Fleet',
    estimatedPremiumKes: 3200000,
    assignedTo: 'Jane Mwangi (Senior Underwriter)',
    createdDate: '2026-08-20',
    stage: 'QUALIFIED',
  },
  {
    id: 'LEAD-002',
    name: 'Grace Wanjiru',
    customerType: 'Individual',
    contactPerson: 'Grace Wanjiru',
    phone: '+254 711 908 224',
    email: 'grace.wanjiru@gmail.com',
    source: 'Website',
    lineOfBusinessInterest: 'Private Motor Comprehensive',
    estimatedPremiumKes: 145000,
    assignedTo: 'David Ochieng (Finance Officer)',
    createdDate: '2026-08-28',
    stage: 'CONTACTED',
  },
  {
    id: 'LEAD-003',
    name: 'Lakeview Estates Management Co.',
    customerType: 'Corporate',
    contactPerson: 'Susan Achieng',
    phone: '+254 733 210 456',
    email: 'susan.achieng@lakeviewestates.co.ke',
    source: 'Referral',
    lineOfBusinessInterest: 'Industrial Fire & Perils',
    estimatedPremiumKes: 980000,
    assignedTo: 'Marcus Vance (Chief UW)',
    createdDate: '2026-09-01',
    stage: 'NEW',
  },
  {
    id: 'LEAD-004',
    name: 'Coastal Traders Cooperative',
    customerType: 'Corporate',
    contactPerson: 'Ahmed Farah',
    phone: '+254 700 553 812',
    email: 'ahmed.farah@coastaltraders.co.ke',
    source: 'Marketing Campaign',
    lineOfBusinessInterest: 'Marine Cargo (Open Cover)',
    estimatedPremiumKes: 640000,
    assignedTo: 'Jane Mwangi (Senior Underwriter)',
    createdDate: '2026-07-15',
    stage: 'LOST',
  },
];

const INITIAL_USER_ACCOUNTS: UserAccountRecordItem[] = [
  {
    id: 'USR-008',
    name: 'Marcus Vance',
    email: 'marcus.vance@apex.co.ke',
    jobTitle: 'Chief Underwriting Officer',
    department: 'Underwriting',
    branch: 'Nairobi HQ',
    status: 'Active',
    lastLogin: 'Today 08:15',
    assignedRoleCenters: ['executive', 'underwriter'],
  },
  {
    id: 'USR-007',
    name: 'Jane Mwangi',
    email: 'jane.mwangi@apex.co.ke',
    jobTitle: 'Senior Underwriter',
    department: 'Underwriting',
    branch: 'Nairobi HQ',
    status: 'Active',
    lastLogin: 'Today 09:02',
    assignedRoleCenters: ['underwriter'],
  },
  {
    id: 'USR-006',
    name: 'Amanda Wright',
    email: 'amanda.wright@apex.co.ke',
    jobTitle: 'Claims Manager',
    department: 'Claims',
    branch: 'Mombasa',
    status: 'Active',
    lastLogin: 'Yesterday 17:44',
    assignedRoleCenters: ['claims'],
  },
  {
    id: 'USR-005',
    name: 'David Ochieng',
    email: 'david.ochieng@apex.co.ke',
    jobTitle: 'Finance Officer',
    department: 'Finance',
    branch: 'Nairobi HQ',
    status: 'Active',
    lastLogin: 'Today 07:58',
    assignedRoleCenters: ['finance'],
  },
  {
    id: 'USR-004',
    name: 'Peter Otieno',
    email: 'peter.otieno@apex.co.ke',
    jobTitle: 'Broker / Field Agent',
    department: 'Sales & Distribution',
    branch: 'Kisumu',
    status: 'Active',
    lastLogin: 'Today 06:40',
    assignedRoleCenters: ['agent'],
  },
];

const INITIAL_ACTIVITIES: ActivityEvent[] = [
  {
    id: 'ACT-001',
    timestamp: 'Today at 14:42 EAT',
    author: 'Jane Mwangi (Commercial UW)',
    entityType: 'Claim',
    entityId: 'CLM-MTR-2026-8291',
    action: 'Dispatched Loss Assessor',
    details: 'Assigned Eng. Peter Githinji for Salgaa vehicle inspection with 24h SLA.',
  },
  {
    id: 'ACT-002',
    timestamp: 'Today at 12:15 EAT',
    author: 'Finance Clearing Engine',
    entityType: 'Payment',
    entityId: 'CUST-23456789',
    action: 'Received Premium via M-Pesa Express',
    details: 'Received KES 182,450.00 via Paybill 891040 (Ref: RK89104JK2) for POL/MTR/2026/001239.',
  },
  {
    id: 'ACT-003',
    timestamp: 'Yesterday at 16:30 EAT',
    author: 'Marcus Vance (Chief UW)',
    entityType: 'Quote',
    entityId: 'Q-MTR-2026-00821',
    action: 'Authorized Underwriting Referral',
    details: 'Approved Actros fleet terms exceeding KES 15M authority subject to Cartrack telematics warranty.',
  },
];

// In-Memory Repository Class
class RecordsStore {
  private customers: CustomerRecord[] = [...INITIAL_CUSTOMERS];
  private quotes: QuoteRecordItem[] = [...INITIAL_QUOTES];
  private policies: PolicyRecordItem[] = [...INITIAL_POLICIES];
  private claims: ClaimRecordItem[] = [...INITIAL_CLAIMS];
  private brokers: BrokerRecordItem[] = [...INITIAL_BROKERS];
  private products: ProductRecordItem[] = [...INITIAL_PRODUCTS];
  private providers: ProviderRecordItem[] = [...INITIAL_PROVIDERS];
  private treaties: TreatyRecordItem[] = [...INITIAL_TREATIES];
  private tenants: TenantRecordItem[] = [...INITIAL_TENANTS];
  private branches: BranchRecordItem[] = [...INITIAL_BRANCHES];
  private apiEndpoints: ApiEndpointRecordItem[] = [...INITIAL_API_ENDPOINTS];
  private workflowDefinitions: WorkflowDefinitionRecord[] = [...INITIAL_WORKFLOW_DEFINITIONS];
  private workflowInstances: WorkflowInstanceRecord[] = [];
  private chartOfAccounts: ChartOfAccountItem[] = [...INITIAL_CHART_OF_ACCOUNTS];
  private journalEntries: JournalEntryRecord[] = [...INITIAL_JOURNAL_ENTRIES];
  private numberSeries: NumberSeriesConfig[] = [...INITIAL_NUMBER_SERIES];
  private leads: LeadRecordItem[] = [...INITIAL_LEADS];
  private userAccounts: UserAccountRecordItem[] = [...INITIAL_USER_ACCOUNTS];
  private activities: ActivityEvent[] = [...INITIAL_ACTIVITIES];

  // USER ACCOUNTS & ROLE CENTER ASSIGNMENTS
  getUsers(): UserAccountRecordItem[] {
    return this.userAccounts;
  }
  getUser(id: string): UserAccountRecordItem | undefined {
    return this.userAccounts.find((u) => u.id === id);
  }
  getUserByEmail(email: string): UserAccountRecordItem | undefined {
    const normalized = email.trim().toLowerCase();
    return this.userAccounts.find((u) => u.email.toLowerCase() === normalized);
  }
  addUser(user: Omit<UserAccountRecordItem, 'id' | 'lastLogin'>): UserAccountRecordItem {
    const highest = this.userAccounts.reduce((max, u) => {
      const match = u.id.match(/(\d+)$/);
      const value = match ? parseInt(match[1], 10) : 0;
      return Math.max(max, value);
    }, 0);
    const newUser: UserAccountRecordItem = {
      ...user,
      id: `USR-${String(highest + 1).padStart(3, '0')}`,
      lastLogin: 'Never',
    };
    this.userAccounts.unshift(newUser);

    this.addActivity({
      author: 'System Administrator',
      entityType: 'UserAccount',
      entityId: newUser.id,
      action: 'Created User Account',
      details: `Onboarded ${newUser.name} (${newUser.jobTitle}) with Role Center access: ${newUser.assignedRoleCenters.join(', ') || 'none'}.`,
    });

    return newUser;
  }
  updateUser(id: string, updates: Partial<Omit<UserAccountRecordItem, 'id'>>): boolean {
    const user = this.getUser(id);
    if (!user) return false;
    Object.assign(user, updates);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'UserAccount',
      entityId: id,
      action: 'Updated User Account',
      details: `Updated ${user.name}'s account. Role Center access: ${user.assignedRoleCenters.join(', ') || 'none'}.`,
    });
    return true;
  }
  deleteUser(id: string): boolean {
    const user = this.getUser(id);
    if (!user) return false;
    this.userAccounts = this.userAccounts.filter((u) => u.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'UserAccount',
      entityId: id,
      action: 'Deleted User Account',
      details: `Removed ${user.name} (${id}) from the directory.`,
    });
    return true;
  }

  // CUSTOMERS
  getCustomers(): CustomerRecord[] {
    return this.customers;
  }
  getCustomer(id: string): CustomerRecord | undefined {
    return this.customers.find((c) => c.id === id || c.kraPin === id);
  }
  addCustomer(customer: Omit<CustomerRecord, 'id'>): CustomerRecord {
    const newCustomer: CustomerRecord = {
      ...customer,
      id: `CUST-${Date.now().toString().slice(-6)}`,
    };
    this.customers.unshift(newCustomer);

    this.addActivity({
      author: 'System Administrator',
      entityType: 'Customer',
      entityId: newCustomer.id,
      action: 'Onboarded New Customer',
      details: `Registered ${newCustomer.customerType.toLowerCase()} customer ${newCustomer.name} (${newCustomer.id}).`,
    });

    return newCustomer;
  }
  deleteCustomer(id: string): boolean {
    const customer = this.getCustomer(id);
    if (!customer) return false;
    this.customers = this.customers.filter((c) => c.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Customer',
      entityId: id,
      action: 'Deleted Customer Record',
      details: `Removed customer ${customer.name} (${id}) from the register.`,
    });
    return true;
  }

  // LEADS
  getLeads(): LeadRecordItem[] {
    return this.leads;
  }
  getLead(id: string): LeadRecordItem | undefined {
    return this.leads.find((l) => l.id === id);
  }
  addLead(lead: Omit<LeadRecordItem, 'id' | 'createdDate' | 'stage' | 'convertedCustomerId'>): LeadRecordItem {
    const newLead: LeadRecordItem = {
      ...lead,
      id: `LEAD-${Date.now().toString().slice(-6)}`,
      createdDate: new Date().toISOString().split('T')[0],
      stage: 'NEW',
    };
    this.leads.unshift(newLead);

    this.addActivity({
      author: 'System Administrator',
      entityType: 'Lead',
      entityId: newLead.id,
      action: 'Captured New Lead',
      details: `Logged lead ${newLead.name} (${newLead.lineOfBusinessInterest}) sourced via ${newLead.source}.`,
    });

    return newLead;
  }
  updateLeadStage(id: string, stage: LeadRecordItem['stage']): boolean {
    const lead = this.getLead(id);
    if (!lead) return false;
    lead.stage = stage;
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Lead',
      entityId: id,
      action: 'Updated Lead Stage',
      details: `${lead.name} moved to stage ${stage}.`,
    });
    return true;
  }
  deleteLead(id: string): boolean {
    const lead = this.getLead(id);
    if (!lead) return false;
    this.leads = this.leads.filter((l) => l.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Lead',
      entityId: id,
      action: 'Deleted Lead Record',
      details: `Removed lead ${lead.name} from the pipeline.`,
    });
    return true;
  }
  convertLeadToCustomer(id: string): CustomerRecord | undefined {
    const lead = this.getLead(id);
    if (!lead || lead.stage === 'CONVERTED') return undefined;

    const newCustomer: CustomerRecord = {
      id: `CUST-${Date.now().toString().slice(-6)}`,
      name: lead.name,
      customerType: lead.customerType,
      kraPin: 'PENDING-KYC',
      phone: lead.phone,
      email: lead.email,
      branch: 'Nairobi HQ',
      relationshipSince: new Date().getFullYear(),
      relationshipValueKes: 0,
      lifetimeClaimsKes: 0,
      lossRatioPct: 0,
      outstandingKes: 0,
      riskProfile: 'MEDIUM',
      activePoliciesCount: 0,
      assignedUnderwriter: lead.assignedTo,
      headquarters: lead.contactPerson,
      status: 'KYC REVIEW',
    };
    this.customers.unshift(newCustomer);

    lead.stage = 'CONVERTED';
    lead.convertedCustomerId = newCustomer.id;

    this.addActivity({
      author: 'System Administrator',
      entityType: 'Lead',
      entityId: id,
      action: 'Converted Lead to Customer',
      details: `${lead.name} converted to customer ${newCustomer.id}; pending KYC review.`,
    });

    return newCustomer;
  }

  // QUOTES
  getQuotes(): QuoteRecordItem[] {
    return this.quotes;
  }
  getQuote(id: string): QuoteRecordItem | undefined {
    return this.quotes.find((q) => q.id === id || q.quoteNumber === id);
  }
  getQuotesForCustomer(customerId: string): QuoteRecordItem[] {
    return this.quotes.filter((q) => q.customerId === customerId);
  }
  deleteQuote(id: string): boolean {
    const quote = this.getQuote(id);
    if (!quote) return false;
    this.quotes = this.quotes.filter((q) => q.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Quote',
      entityId: id,
      action: 'Deleted Quotation',
      details: `Removed quotation ${quote.quoteNumber} for ${quote.customerName}.`,
    });
    return true;
  }
  addQuote(quote: Omit<QuoteRecordItem, 'id' | 'createdDate'>): QuoteRecordItem {
    const newId = `Q-${Date.now().toString().slice(-6)}`;
    const newQuote: QuoteRecordItem = {
      ...quote,
      id: newId,
      createdDate: new Date().toISOString().split('T')[0],
    };
    this.quotes.unshift(newQuote);

    this.addActivity({
      author: 'Jane Mwangi (Underwriter)',
      entityType: 'Quote',
      entityId: newQuote.id,
      action: 'Generated New Quotation',
      details: `Created quotation ${newQuote.quoteNumber} for ${newQuote.customerName} (${newQuote.lineOfBusiness}) - KES ${newQuote.premiumKes.toLocaleString()}.`,
    });

    return newQuote;
  }

  // POLICIES
  getPolicies(): PolicyRecordItem[] {
    return this.policies;
  }
  getPolicy(id: string): PolicyRecordItem | undefined {
    return this.policies.find((p) => p.id === id || p.policyNumber === id);
  }
  getPoliciesForCustomer(customerId: string): PolicyRecordItem[] {
    return this.policies.filter((p) => p.customerId === customerId);
  }
  deletePolicy(id: string): boolean {
    const policy = this.getPolicy(id);
    if (!policy) return false;
    this.policies = this.policies.filter((p) => p.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Policy',
      entityId: id,
      action: 'Deleted Policy Record',
      details: `Removed policy ${policy.policyNumber} for ${policy.customerName}.`,
    });
    return true;
  }

  // CLAIMS
  getClaims(): ClaimRecordItem[] {
    return this.claims;
  }
  getClaim(id: string): ClaimRecordItem | undefined {
    return this.claims.find((c) => c.id === id || c.claimNumber === id);
  }
  getClaimsForCustomer(customerId: string): ClaimRecordItem[] {
    return this.claims.filter((c) => c.customerId === customerId);
  }
  deleteClaim(id: string): boolean {
    const claim = this.getClaim(id);
    if (!claim) return false;
    this.claims = this.claims.filter((c) => c.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Claim',
      entityId: id,
      action: 'Deleted Claim Record',
      details: `Removed claim ${claim.claimNumber} for ${claim.customerName}.`,
    });
    return true;
  }
  addClaim(claim: Omit<ClaimRecordItem, 'id' | 'reportDate' | 'amountPaidKes' | 'siuFraudScore' | 'slaRemainingHours'>): ClaimRecordItem {
    const newId = `CLM-${Date.now().toString().slice(-6)}`;
    const newClaim: ClaimRecordItem = {
      ...claim,
      id: newId,
      reportDate: new Date().toISOString().split('T')[0],
      amountPaidKes: 0,
      siuFraudScore: Math.floor(Math.random() * 15) + 5,
      slaRemainingHours: 24,
    };
    this.claims.unshift(newClaim);

    this.addActivity({
      author: 'Claims Desk Officer',
      entityType: 'Claim',
      entityId: newClaim.id,
      action: 'Registered FNOL Loss Notification',
      details: `Intake of claim ${newClaim.claimNumber} against policy ${newClaim.policyNumber} for ${newClaim.customerName}. Initial reserve: KES ${newClaim.initialReserveKes.toLocaleString()}.`,
    });

    return newClaim;
  }

  adjustClaimReserve(claimId: string, newReserve: number, reason: string): boolean {
    const claim = this.getClaim(claimId);
    if (!claim) return false;
    const oldReserve = claim.outstandingReserveKes;
    claim.outstandingReserveKes = newReserve;
    claim.totalIncurredKes = claim.amountPaidKes + newReserve;

    this.addActivity({
      author: 'Jane Mwangi (Underwriter / Claims Authority)',
      entityType: 'Reserve',
      entityId: claim.id,
      action: 'Adjusted Claims Reserve',
      details: `Updated reserve from KES ${oldReserve.toLocaleString()} to KES ${newReserve.toLocaleString()}. Reason: "${reason}". Authority Limit: Within KES 5,000,000 DOA.`,
    });
    return true;
  }

  // BROKERS
  getBrokers(): BrokerRecordItem[] {
    return this.brokers;
  }
  getBroker(id: string): BrokerRecordItem | undefined {
    return this.brokers.find((b) => b.id === id || b.licenseNumber === id);
  }
  deleteBroker(id: string): boolean {
    const broker = this.getBroker(id);
    if (!broker) return false;
    this.brokers = this.brokers.filter((b) => b.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Broker',
      entityId: id,
      action: 'Deleted Broker Record',
      details: `Removed intermediary ${broker.name} (${id}) from the register.`,
    });
    return true;
  }

  // PRODUCTS
  getProducts(): ProductRecordItem[] {
    return this.products;
  }
  getProduct(id: string): ProductRecordItem | undefined {
    return this.products.find((p) => p.id === id || p.productCode === id);
  }
  deleteProduct(id: string): boolean {
    const product = this.getProduct(id);
    if (!product) return false;
    this.products = this.products.filter((p) => p.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Product',
      entityId: id,
      action: 'Deleted Product Record',
      details: `Removed product ${product.name} (${id}) from the catalog.`,
    });
    return true;
  }

  // PROVIDERS
  getProviders(): ProviderRecordItem[] {
    return this.providers;
  }
  getProvider(id: string): ProviderRecordItem | undefined {
    return this.providers.find((p) => p.id === id || p.registrationNumber === id);
  }
  deleteProvider(id: string): boolean {
    const provider = this.getProvider(id);
    if (!provider) return false;
    this.providers = this.providers.filter((p) => p.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Provider',
      entityId: id,
      action: 'Deleted Provider Record',
      details: `Removed provider ${provider.name} (${id}) from the panel.`,
    });
    return true;
  }

  // TREATIES
  getTreaties(): TreatyRecordItem[] {
    return this.treaties;
  }
  getTreaty(id: string): TreatyRecordItem | undefined {
    return this.treaties.find((t) => t.id === id || t.treatyCode === id);
  }
  deleteTreaty(id: string): boolean {
    const treaty = this.getTreaty(id);
    if (!treaty) return false;
    this.treaties = this.treaties.filter((t) => t.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Treaty',
      entityId: id,
      action: 'Deleted Treaty Record',
      details: `Removed treaty ${treaty.title} (${treaty.treatyCode}) from the reinsurance program.`,
    });
    return true;
  }

  // TENANTS
  getTenants(): TenantRecordItem[] {
    return this.tenants;
  }
  getTenant(id: string): TenantRecordItem | undefined {
    return this.tenants.find((t) => t.id === id || t.code === id);
  }
  getTenantByEmailDomain(email: string): TenantRecordItem | undefined {
    const domain = email.trim().toLowerCase().split('@')[1];
    if (!domain) return undefined;
    return this.tenants.find((t) => domain === t.domain || domain.endsWith(`.${t.domain}`));
  }
  addTenant(tenant: Omit<TenantRecordItem, 'id'>): TenantRecordItem {
    const newTenant: TenantRecordItem = {
      ...tenant,
      id: tenant.code,
    };
    this.tenants.unshift(newTenant);

    this.addActivity({
      author: 'System Administrator',
      entityType: 'Tenant',
      entityId: newTenant.id,
      action: 'Onboarded New Tenant',
      details: `Registered tenant ${newTenant.name} (${newTenant.code}) under ${newTenant.regulator}.`,
    });

    return newTenant;
  }
  deleteTenant(id: string): boolean {
    const tenant = this.getTenant(id);
    if (!tenant) return false;
    this.tenants = this.tenants.filter((t) => t.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Tenant',
      entityId: id,
      action: 'Deleted Tenant Record',
      details: `Removed tenant ${tenant.name} (${tenant.code}) from the platform.`,
    });
    return true;
  }

  // BRANCHES
  getBranches(): BranchRecordItem[] {
    return this.branches;
  }
  getBranch(id: string): BranchRecordItem | undefined {
    return this.branches.find((b) => b.id === id);
  }
  addBranch(branch: Omit<BranchRecordItem, 'id'>): BranchRecordItem {
    const newBranch: BranchRecordItem = {
      ...branch,
      id: `BR-${Date.now()}`,
    };
    this.branches.unshift(newBranch);

    this.addActivity({
      author: 'System Administrator',
      entityType: 'Branch',
      entityId: newBranch.id,
      action: 'Added Branch',
      details: `Registered branch ${newBranch.name} (${newBranch.region}).`,
    });

    return newBranch;
  }
  deleteBranch(id: string): boolean {
    const branch = this.getBranch(id);
    if (!branch) return false;
    this.branches = this.branches.filter((b) => b.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Branch',
      entityId: id,
      action: 'Deleted Branch',
      details: `Removed branch ${branch.name} from the network.`,
    });
    return true;
  }

  // API ENDPOINTS & INTEGRATIONS
  getApiEndpoints(): ApiEndpointRecordItem[] {
    return this.apiEndpoints;
  }
  getApiEndpoint(id: string): ApiEndpointRecordItem | undefined {
    return this.apiEndpoints.find((e) => e.id === id);
  }
  addApiEndpoint(endpoint: Omit<ApiEndpointRecordItem, 'id' | 'lastPing' | 'latencyMs' | 'uptime90d' | 'activeTps'>): ApiEndpointRecordItem {
    const newEndpoint: ApiEndpointRecordItem = {
      ...endpoint,
      id: `INT-${Date.now().toString().slice(-6)}`,
      lastPing: endpoint.status === 'Disabled' || endpoint.status === 'Not Configured' ? 'Inactive' : 'Not pinged',
      latencyMs: 0,
      uptime90d: endpoint.status === 'Healthy' ? 100 : 0,
      activeTps: 0,
    };
    this.apiEndpoints.unshift(newEndpoint);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Integration',
      entityId: newEndpoint.id,
      action: 'Added API Endpoint',
      details: `Registered ${newEndpoint.name} (${newEndpoint.method} ${newEndpoint.endpointUrl}).`,
    });
    return newEndpoint;
  }
  updateApiEndpoint(id: string, patch: Partial<Omit<ApiEndpointRecordItem, 'id'>>): ApiEndpointRecordItem | undefined {
    const endpoint = this.getApiEndpoint(id);
    if (!endpoint) return undefined;
    Object.assign(endpoint, patch);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Integration',
      entityId: id,
      action: 'Updated API Endpoint',
      details: `Updated ${endpoint.name} endpoint configuration.`,
    });
    return endpoint;
  }
  deleteApiEndpoint(id: string): boolean {
    const endpoint = this.getApiEndpoint(id);
    if (!endpoint) return false;
    this.apiEndpoints = this.apiEndpoints.filter((e) => e.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Integration',
      entityId: id,
      action: 'Deleted API Endpoint',
      details: `Removed ${endpoint.name} from configured API endpoints.`,
    });
    return true;
  }
  pingApiEndpoint(id: string): ApiEndpointRecordItem | undefined {
    const endpoint = this.getApiEndpoint(id);
    if (!endpoint) return undefined;
    if (endpoint.environment === 'Disabled' || endpoint.status === 'Disabled' || endpoint.status === 'Not Configured') {
      endpoint.lastPing = 'Inactive';
      endpoint.latencyMs = 0;
      endpoint.activeTps = 0;
      return endpoint;
    }
    endpoint.lastPing = 'Just now';
    endpoint.latencyMs = Math.max(18, Math.round((endpoint.latencyMs || 80) + (Math.random() * 18 - 9)));
    endpoint.activeTps = Math.max(1, Math.round((endpoint.activeTps || 4) + (Math.random() * 5 - 2)));
    endpoint.status = endpoint.latencyMs > 220 ? 'Warning' : 'Healthy';
    this.addActivity({
      author: 'Integration Gateway',
      entityType: 'Integration',
      entityId: id,
      action: 'Pinged API Endpoint',
      details: `${endpoint.name} responded in ${endpoint.latencyMs} ms.`,
    });
    return endpoint;
  }

  // WORKFLOW ENGINE — configurable approval chains with branch and amount routing
  getWorkflowDefinitions(): WorkflowDefinitionRecord[] {
    return this.workflowDefinitions;
  }
  getWorkflowDefinition(id: string): WorkflowDefinitionRecord | undefined {
    return this.workflowDefinitions.find((d) => d.id === id);
  }
  getWorkflowDefinitionForType(documentType: WorkflowDocumentType): WorkflowDefinitionRecord | undefined {
    return this.workflowDefinitions.find((d) => d.documentType === documentType && d.enabled);
  }
  addWorkflowDefinition(def: Omit<WorkflowDefinitionRecord, 'id'>): WorkflowDefinitionRecord {
    const newDef: WorkflowDefinitionRecord = { ...def, id: `WF-${Date.now()}` };
    this.workflowDefinitions.unshift(newDef);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Workflow',
      entityId: newDef.id,
      action: 'Created Workflow Definition',
      details: `Created "${newDef.name}" for ${newDef.documentType} with ${newDef.steps.length} step(s).`,
    });
    return newDef;
  }
  updateWorkflowDefinition(id: string, patch: Partial<Omit<WorkflowDefinitionRecord, 'id'>>): WorkflowDefinitionRecord | undefined {
    const def = this.getWorkflowDefinition(id);
    if (!def) return undefined;

    // Guard at the source, not just in the UI: a patch that doesn't actually change
    // anything (a re-committed value, a redundant call) must never write to the audit
    // log. This holds regardless of what any calling component does or forgets to do.
    const hasRealChange = (Object.keys(patch) as (keyof typeof patch)[]).some(
      (key) => JSON.stringify(def[key]) !== JSON.stringify(patch[key])
    );
    if (!hasRealChange) return def;

    Object.assign(def, patch);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Workflow',
      entityId: id,
      action: 'Updated Workflow Definition',
      details: `Updated "${def.name}".`,
    });
    return def;
  }
  deleteWorkflowDefinition(id: string): boolean {
    const def = this.getWorkflowDefinition(id);
    if (!def) return false;
    this.workflowDefinitions = this.workflowDefinitions.filter((d) => d.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Workflow',
      entityId: id,
      action: 'Deleted Workflow Definition',
      details: `Removed "${def.name}".`,
    });
    return true;
  }

  getWorkflowInstances(): WorkflowInstanceRecord[] {
    return this.workflowInstances;
  }
  getWorkflowInstance(id: string): WorkflowInstanceRecord | undefined {
    return this.workflowInstances.find((i) => i.id === id);
  }
  getWorkflowInstanceForDocument(documentType: WorkflowDocumentType, documentId: string): WorkflowInstanceRecord | undefined {
    const matches = this.workflowInstances.filter((i) => i.documentType === documentType && i.documentId === documentId);
    return matches[matches.length - 1];
  }
  /**
   * Pending instances currently sitting on this role's desk. Steps are already
   * branch-filtered once, at startWorkflow() time (only steps whose branchScope
   * matched the document's branch made it into applicableSteps) — re-checking branch
   * here against the viewer's own branch would wrongly hide approvals for people
   * whose role matches but who don't happen to sit in that branch themselves.
   */
  getPendingWorkflowInstancesForApprover(role: UserRole): WorkflowInstanceRecord[] {
    return this.workflowInstances.filter((instance) => {
      if (instance.status !== 'PENDING') return false;
      const step = instance.applicableSteps[instance.currentStepIndex];
      return !!step && step.approverRole === role;
    });
  }

  /** Does this document still need approval before it can proceed? True if no workflow ran, or it was approved. */
  canDocumentProceed(documentType: WorkflowDocumentType, documentId: string): boolean {
    const instance = this.getWorkflowInstanceForDocument(documentType, documentId);
    return !instance || instance.status === 'APPROVED';
  }

  /**
   * Starts (or auto-completes) an approval workflow for a document. Steps are filtered to
   * those whose branchScope matches (or is unset) and whose amount range contains amountKes —
   * this is the branch- and amount-based routing. If nothing applies, the document is
   * immediately approved with no human step required.
   */
  startWorkflow(
    documentType: WorkflowDocumentType,
    documentId: string,
    documentLabel: string,
    amountKes: number,
    branch: string,
    initiatedBy: string
  ): WorkflowInstanceRecord {
    const definition = this.getWorkflowDefinitionForType(documentType);
    const applicableSteps = (definition?.steps ?? [])
      .filter((step) => !step.branchScope || step.branchScope === branch)
      .filter((step) => (step.minAmountKes === undefined || amountKes >= step.minAmountKes) && (step.maxAmountKes === undefined || amountKes <= step.maxAmountKes))
      .sort((a, b) => a.order - b.order);

    const now = new Date().toISOString();
    const instance: WorkflowInstanceRecord = {
      id: `WFI-${Date.now()}`,
      definitionId: definition?.id ?? 'NONE',
      definitionName: definition?.name ?? 'No workflow configured',
      documentType,
      documentId,
      documentLabel,
      amountKes,
      branch,
      initiatedBy,
      status: applicableSteps.length === 0 ? 'APPROVED' : 'PENDING',
      applicableSteps,
      currentStepIndex: 0,
      history: [],
      createdAt: now,
      updatedAt: now,
    };
    this.workflowInstances.unshift(instance);

    this.addActivity({
      author: initiatedBy,
      entityType: 'Workflow',
      entityId: instance.id,
      action: applicableSteps.length === 0 ? 'Auto-Approved (No Applicable Steps)' : 'Workflow Started',
      details:
        applicableSteps.length === 0
          ? `${documentLabel} (KES ${amountKes.toLocaleString()}) required no approval step and was auto-approved.`
          : `${documentLabel} (KES ${amountKes.toLocaleString()}, ${branch}) routed to ${applicableSteps[0].name}.`,
    });

    return instance;
  }

  approveWorkflowStep(instanceId: string, actor: string, actorRole: UserRole, comment?: string): WorkflowInstanceRecord | undefined {
    const instance = this.getWorkflowInstance(instanceId);
    if (!instance || instance.status !== 'PENDING') return instance;
    const step = instance.applicableSteps[instance.currentStepIndex];
    if (!step || step.approverRole !== actorRole) return instance;

    instance.history.push({ stepId: step.id, stepName: step.name, action: 'APPROVE', actor, comment, timestamp: new Date().toISOString() });

    if (instance.currentStepIndex < instance.applicableSteps.length - 1) {
      instance.currentStepIndex += 1;
      this.addActivity({
        author: actor,
        entityType: 'Workflow',
        entityId: instance.id,
        action: 'Step Approved',
        details: `${step.name} approved for ${instance.documentLabel}. Routed to ${instance.applicableSteps[instance.currentStepIndex].name}.`,
      });
    } else {
      instance.status = 'APPROVED';
      this.addActivity({
        author: actor,
        entityType: 'Workflow',
        entityId: instance.id,
        action: 'Workflow Approved',
        details: `${instance.documentLabel} fully approved after ${step.name}.`,
      });
    }
    instance.updatedAt = new Date().toISOString();
    return instance;
  }

  rejectWorkflowStep(instanceId: string, actor: string, actorRole: UserRole, comment?: string): WorkflowInstanceRecord | undefined {
    const instance = this.getWorkflowInstance(instanceId);
    if (!instance || instance.status !== 'PENDING') return instance;
    const step = instance.applicableSteps[instance.currentStepIndex];
    if (!step || step.approverRole !== actorRole) return instance;

    instance.history.push({ stepId: step.id, stepName: step.name, action: 'REJECT', actor, comment, timestamp: new Date().toISOString() });
    instance.status = 'REJECTED';
    instance.updatedAt = new Date().toISOString();

    this.addActivity({
      author: actor,
      entityType: 'Workflow',
      entityId: instance.id,
      action: 'Workflow Rejected',
      details: `${instance.documentLabel} rejected at ${step.name}.${comment ? ` Reason: ${comment}` : ''}`,
    });
    return instance;
  }

  // CHART OF ACCOUNTS & GENERAL LEDGER
  getChartOfAccounts(): ChartOfAccountItem[] {
    return this.chartOfAccounts;
  }
  getAccount(id: string): ChartOfAccountItem | undefined {
    return this.chartOfAccounts.find((a) => a.id === id);
  }
  addAccount(account: Omit<ChartOfAccountItem, 'id'>): ChartOfAccountItem {
    const newAccount: ChartOfAccountItem = { ...account, id: `ACC-${account.code}` };
    this.chartOfAccounts.push(newAccount);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Account',
      entityId: newAccount.id,
      action: 'Added Account',
      details: `Added ${newAccount.code} — ${newAccount.name} (${newAccount.type}).`,
    });
    return newAccount;
  }
  updateAccount(id: string, patch: Partial<Omit<ChartOfAccountItem, 'id'>>): ChartOfAccountItem | undefined {
    const account = this.getAccount(id);
    if (!account) return undefined;
    const hasRealChange = (Object.keys(patch) as (keyof typeof patch)[]).some(
      (key) => JSON.stringify(account[key]) !== JSON.stringify(patch[key])
    );
    if (!hasRealChange) return account;
    Object.assign(account, patch);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Account',
      entityId: id,
      action: 'Updated Account',
      details: `Updated ${account.code} — ${account.name}.`,
    });
    return account;
  }
  deleteAccount(id: string): boolean {
    const account = this.getAccount(id);
    if (!account) return false;
    const hasLedgerActivity = this.journalEntries.some((entry) => entry.lines.some((line) => line.accountId === id));
    if (hasLedgerActivity) return false;
    this.chartOfAccounts = this.chartOfAccounts.filter((a) => a.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'Account',
      entityId: id,
      action: 'Deleted Account',
      details: `Removed ${account.code} — ${account.name} from the chart of accounts.`,
    });
    return true;
  }

  getJournalEntries(): JournalEntryRecord[] {
    return this.journalEntries;
  }
  getJournalEntry(id: string): JournalEntryRecord | undefined {
    return this.journalEntries.find((e) => e.id === id);
  }

  /**
   * Creates a double-entry journal voucher. Rejects unbalanced entries outright (debits
   * must equal credits). A balanced entry is then routed through the "Journal Entry
   * Approval" workflow (document type PAYMENT) — it only posts to the ledger immediately
   * if no approval step applies at this amount/branch; otherwise it sits PENDING_APPROVAL
   * and the trial balance ignores it until approved.
   */
  createJournalEntry(input: {
    description: string;
    reference?: string;
    branch: string;
    lines: { accountId: string; debitKes: number; creditKes: number }[];
    initiatedBy: string;
  }): JournalEntryRecord | { error: string } {
    if (input.lines.length < 2) return { error: 'A journal entry needs at least two lines.' };
    const totalDebit = input.lines.reduce((sum, l) => sum + l.debitKes, 0);
    const totalCredit = input.lines.reduce((sum, l) => sum + l.creditKes, 0);
    if (totalDebit === 0 && totalCredit === 0) return { error: 'Entry amount cannot be zero.' };
    if (Math.round(totalDebit * 100) !== Math.round(totalCredit * 100)) {
      return { error: `Entry does not balance: debits KES ${totalDebit.toLocaleString()} vs credits KES ${totalCredit.toLocaleString()}.` };
    }

    const resolvedLines: JournalLineItem[] = input.lines.map((line) => {
      const account = this.getAccount(line.accountId);
      return {
        accountId: line.accountId,
        accountCode: account?.code ?? '—',
        accountName: account?.name ?? 'Unknown Account',
        debitKes: line.debitKes,
        creditKes: line.creditKes,
      };
    });

    const sequence = this.journalEntries.length + 1;
    const id = `JE-${String(sequence).padStart(6, '0')}`;
    const voucherNumber = this.getNextNumber('journal-voucher');

    const entry: JournalEntryRecord = {
      id,
      voucherNumber,
      date: new Date().toISOString().slice(0, 10),
      description: input.description,
      reference: input.reference,
      branch: input.branch,
      lines: resolvedLines,
      totalKes: totalDebit,
      status: 'PENDING_APPROVAL',
      postedBy: input.initiatedBy,
      createdAt: new Date().toISOString(),
    };

    const workflowInstance = this.startWorkflow('PAYMENT', id, voucherNumber, totalDebit, input.branch, input.initiatedBy);
    entry.workflowInstanceId = workflowInstance.id;
    entry.status = workflowInstance.status === 'APPROVED' ? 'POSTED' : 'PENDING_APPROVAL';
    this.journalEntries.unshift(entry);

    this.addActivity({
      author: input.initiatedBy,
      entityType: 'JournalEntry',
      entityId: id,
      action: entry.status === 'POSTED' ? 'Journal Entry Posted' : 'Journal Entry Awaiting Approval',
      details: `${voucherNumber}: ${input.description} (KES ${totalDebit.toLocaleString()}).`,
    });

    return entry;
  }

  approveJournalEntry(id: string, actor: string, actorRole: UserRole, comment?: string): JournalEntryRecord | undefined {
    const entry = this.getJournalEntry(id);
    if (!entry || !entry.workflowInstanceId) return entry;
    const instance = this.approveWorkflowStep(entry.workflowInstanceId, actor, actorRole, comment);
    if (instance?.status === 'APPROVED') {
      entry.status = 'POSTED';
      this.addActivity({
        author: actor,
        entityType: 'JournalEntry',
        entityId: id,
        action: 'Journal Entry Posted',
        details: `${entry.voucherNumber} posted to the ledger after final approval.`,
      });
    }
    return entry;
  }

  rejectJournalEntry(id: string, actor: string, actorRole: UserRole, comment?: string): JournalEntryRecord | undefined {
    const entry = this.getJournalEntry(id);
    if (!entry || !entry.workflowInstanceId) return entry;
    const instance = this.rejectWorkflowStep(entry.workflowInstanceId, actor, actorRole, comment);
    if (instance?.status === 'REJECTED') {
      entry.status = 'REJECTED';
    }
    return entry;
  }

  /** Trial balance computed live from POSTED entries only — pending/rejected vouchers never affect it. */
  getTrialBalance(): { account: ChartOfAccountItem; debitKes: number; creditKes: number }[] {
    return this.chartOfAccounts.map((account) => {
      const postedLines = this.journalEntries
        .filter((entry) => entry.status === 'POSTED')
        .flatMap((entry) => entry.lines)
        .filter((line) => line.accountId === account.id);
      const totalDebit = postedLines.reduce((sum, line) => sum + line.debitKes, 0);
      const totalCredit = postedLines.reduce((sum, line) => sum + line.creditKes, 0);
      const net = totalDebit - totalCredit;
      return {
        account,
        debitKes: net > 0 ? net : 0,
        creditKes: net < 0 ? -net : 0,
      };
    });
  }

  // NUMBER SERIES — configurable document numbering
  getNumberSeries(): NumberSeriesConfig[] {
    return this.numberSeries;
  }
  getNumberSeriesConfig(id: string): NumberSeriesConfig | undefined {
    return this.numberSeries.find((s) => s.id === id);
  }
  addNumberSeriesConfig(config: Omit<NumberSeriesConfig, 'id'>): NumberSeriesConfig {
    const id = config.label.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `series-${Date.now()}`;
    const newConfig: NumberSeriesConfig = { ...config, id };
    this.numberSeries.push(newConfig);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'NumberSeries',
      entityId: id,
      action: 'Added Number Series',
      details: `Added "${newConfig.label}" (${this.previewNumberSeries(newConfig)}).`,
    });
    return newConfig;
  }
  updateNumberSeriesConfig(id: string, patch: Partial<Omit<NumberSeriesConfig, 'id'>>): NumberSeriesConfig | undefined {
    const config = this.getNumberSeriesConfig(id);
    if (!config) return undefined;
    const hasRealChange = (Object.keys(patch) as (keyof typeof patch)[]).some(
      (key) => JSON.stringify(config[key]) !== JSON.stringify(patch[key])
    );
    if (!hasRealChange) return config;
    Object.assign(config, patch);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'NumberSeries',
      entityId: id,
      action: 'Updated Number Series',
      details: `Updated "${config.label}" (${this.previewNumberSeries(config)}).`,
    });
    return config;
  }
  deleteNumberSeriesConfig(id: string): boolean {
    const config = this.getNumberSeriesConfig(id);
    if (!config) return false;
    this.numberSeries = this.numberSeries.filter((s) => s.id !== id);
    this.addActivity({
      author: 'System Administrator',
      entityType: 'NumberSeries',
      entityId: id,
      action: 'Deleted Number Series',
      details: `Removed "${config.label}" — generators for this document type will fall back to a timestamp-based number.`,
    });
    return true;
  }

  /** Renders what the *next* number will look like without consuming it — for admin preview. */
  previewNumberSeries(config: NumberSeriesConfig): string {
    const year = new Date().getFullYear();
    const seq = String(config.nextSequence).padStart(config.padWidth, '0');
    return config.includeYear ? `${config.prefix}/${year}/${seq}` : `${config.prefix}-${seq}`;
  }

  /**
   * Consumes and returns the next number for a series (e.g. getNextNumber('journal-voucher')).
   * If the series is missing or inactive, falls back to a timestamp-based number instead of
   * throwing — a misconfigured or deleted series should never block document creation.
   */
  getNextNumber(seriesId: string): string {
    const config = this.getNumberSeriesConfig(seriesId);
    if (!config || config.status !== 'ACTIVE') {
      return `${seriesId.toUpperCase()}-${Date.now()}`;
    }
    const year = new Date().getFullYear();
    if (config.resetCadence === 'ANNUAL' && config.lastResetYear !== year) {
      config.nextSequence = 1;
      config.lastResetYear = year;
    }
    const formatted = this.previewNumberSeries(config);
    config.nextSequence += 1;
    return formatted;
  }

  // PAYMENTS & REVENUE
  recordPayment(customerId: string, amount: number, method: string, reference: string, policyNumber?: string) {
    const customer = this.getCustomer(customerId);
    if (customer) {
      customer.outstandingKes = Math.max(0, customer.outstandingKes - amount);
    }
    const policy = policyNumber ? this.getPolicy(policyNumber) : undefined;
    if (policy) {
      policy.paidToDateKes += amount;
    }

    this.addActivity({
      author: 'Finance & Cashier Services',
      entityType: 'Payment',
      entityId: customerId,
      action: `Payment Cleared (${method})`,
      details: `Remittance of KES ${amount.toLocaleString()} received via ${method} (Ref: ${reference}) for ${customer?.name || customerId}.${policyNumber ? ` Allocated to ${policyNumber}.` : ''}`,
    });
  }

  // ACTIVITIES & AUDIT
  getActivities(entityId?: string): ActivityEvent[] {
    if (entityId) {
      return this.activities.filter((a) => a.entityId === entityId);
    }
    return this.activities;
  }
  addActivity(event: Omit<ActivityEvent, 'id' | 'timestamp'>) {
    const newAct: ActivityEvent = {
      ...event,
      id: `ACT-${Date.now().toString().slice(-6)}`,
      timestamp: 'Just now',
    };
    this.activities.unshift(newAct);
  }
}

export const recordsStore = new RecordsStore();
