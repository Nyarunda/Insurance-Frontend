/** Customer shapes as the backend returns them (CLIENTS-1, `apps/clients/selectors.py`). */

export type CustomerType = 'INDIVIDUAL' | 'CORPORATE' | 'GROUP';
export type CustomerStatus = 'PROSPECT' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED' | 'DECEASED' | 'CLOSED';
export type KycStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PENDING_VERIFICATION' | 'VERIFIED' | 'REVIEW_DUE' | 'REJECTED';

export interface CustomerSummary {
  id: string;
  customer_no: string;
  customer_type: CustomerType;
  display_name: string;
  status: CustomerStatus;
  kyc_status: KycStatus;
  primary_phone: string | null;
  primary_email: string | null;
  home_branch: { id: string; code: string; name: string };
}

export interface CustomerPage {
  results: CustomerSummary[];
  count: number;
  page: number;
  page_size: number;
}

export interface CustomerDetail extends CustomerSummary {
  source: string;
  sacco_member_no: string | null;
  /** The individual or organization profile; its fields depend on the type. */
  profile: Record<string, string | null>;
  preferences: Record<string, unknown> | null;
  created_at: string | null;
  updated_at: string | null;
  row_version: number;
}

export interface CustomerContact {
  id: string;
  type: 'MOBILE' | 'PHONE' | 'EMAIL' | 'WHATSAPP';
  value: string;
  normalized_value: string;
  is_primary: boolean;
  is_verified: boolean;
  verified_at: string | null;
  effective_from: string | null;
  effective_to: string | null;
}

export interface CustomerAddress {
  id: string;
  type: string;
  address_line_1: string;
  address_line_2: string;
  town: string;
  county: string;
  postal_code: string;
  country: string;
  is_primary: boolean;
  is_active: boolean;
}

/** Never the stored value: only its type, its last four characters and its verification (C1-D17). */
export interface CustomerIdentifier {
  id: string;
  identifier_type: string;
  masked_value: string;
  issuing_country: string;
  issued_date: string | null;
  expiry_date: string | null;
  verification_status: string;
  verification_source: string;
  verified_at: string | null;
  is_primary: boolean;
}

export interface Customer360 {
  customer: CustomerDetail;
  /** Null when the viewer lacks clients.kyc.view. */
  kyc: {
    status: KycStatus;
    identifiers: number;
    verified_identifiers: number;
    primary_identifier: CustomerIdentifier | null;
  } | null;
  contacts: CustomerContact[];
  addresses: CustomerAddress[];
  insurance_summary: { quotations: number; active_policies: number; open_claims: number; outstanding_premium: string };
  recent_activity: { action: string; at: string; actor_id: string }[];
}

export interface IdentifierList {
  results: CustomerIdentifier[];
}

/** The 409 `CUSTOMER_DUPLICATE_CANDIDATE` details: only the matches the caller may see, the rest counted (C1-D16). */
export interface DuplicateDetails {
  candidates: { customer_no: string; matched: string[] }[];
  hidden_candidates: number;
}

export interface CustomerCreateBody {
  customer_type: CustomerType;
  home_branch_id: string;
  profile: Record<string, string>;
  status?: 'PROSPECT' | 'ACTIVE';
  contacts?: { type: string; value: string; is_primary: boolean }[];
  identifiers?: { identifier_type: string; value: string; is_primary: boolean }[];
  acknowledge_duplicates?: boolean;
  duplicate_reason?: string;
}
