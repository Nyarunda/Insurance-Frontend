// Centralized In-Memory Store & Query Service for InsureERP Records
// Powers dynamic List -> 360 -> Action -> Audit flows without hardcoded static views.

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
  type: 'Wholesale Broker' | 'Retail Broker' | 'Bancassurance' | 'Principal Agent';
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

export interface ActivityEvent {
  id: string;
  timestamp: string;
  author: string;
  entityType: 'Customer' | 'Policy' | 'Quote' | 'Claim' | 'Payment' | 'Reserve';
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
  private activities: ActivityEvent[] = [...INITIAL_ACTIVITIES];

  // CUSTOMERS
  getCustomers(): CustomerRecord[] {
    return this.customers;
  }
  getCustomer(id: string): CustomerRecord | undefined {
    return this.customers.find((c) => c.id === id || c.kraPin === id);
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

  // PRODUCTS
  getProducts(): ProductRecordItem[] {
    return this.products;
  }
  getProduct(id: string): ProductRecordItem | undefined {
    return this.products.find((p) => p.id === id || p.productCode === id);
  }

  // PROVIDERS
  getProviders(): ProviderRecordItem[] {
    return this.providers;
  }
  getProvider(id: string): ProviderRecordItem | undefined {
    return this.providers.find((p) => p.id === id || p.registrationNumber === id);
  }

  // TREATIES
  getTreaties(): TreatyRecordItem[] {
    return this.treaties;
  }
  getTreaty(id: string): TreatyRecordItem | undefined {
    return this.treaties.find((t) => t.id === id || t.treatyCode === id);
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
