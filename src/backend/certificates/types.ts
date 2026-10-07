/** Certificate shapes as the backend returns them (`apps/certificates`, CERTIFICATES-1). */

export type CertificateStatus = 'AVAILABLE' | 'ISSUED' | 'PRINTED' | 'CANCELLED' | 'SPOILT';
export type CertificateCategory = 'MOTOR' | 'MARINE';

export interface MarineDetails {
  shipment_reference: string;
  conveyance: string;
  voyage_from: string;
  voyage_to: string;
  goods_description: string;
}

export interface Certificate {
  id: string;
  serial_no: string;
  status: CertificateStatus;
  certificate_type: { id: string; code: string; category: CertificateCategory };
  insurer: { id: string; code: string };
  batch_no: string;
  policy: { id: string; policy_no: string } | null;
  /** The policy version the certificate names: the one governing its start date. */
  version_no: number | null;
  effective_from: string | null;
  effective_to: string | null;
  insured_name: string;
  vehicle: { registration: string; chassis_number: string; engine_number: string } | null;
  marine_details: MarineDetails | null;
  replaces: { id: string; serial_no: string } | null;
  replaced_by: { id: string; serial_no: string } | null;
  issued_at: string | null;
  printed_at: string | null;
  closed_reason: string;
  closed_at: string | null;
  /** Derived on every read for a live certificate: whether the policy still covers its whole validity. */
  cover: { fully_covered: boolean; covered_through: string | null } | null;
  cancellation_request: { reason: string; requested_at: string } | null;
  /** The latest CERTIFICATE_CANCELLATION approval, when the tenant governs it. */
  workflow: {
    instance_id: string;
    status: string;
    stage_label?: string | null;
    waiting_on?: string[];
  } | null;
  row_version: number;
}

export interface CertificateList {
  policy_no: string;
  results: Certificate[];
}

export interface CertificateType {
  id: string;
  code: string;
  name: string;
  category: CertificateCategory;
  insurance_class: { id: string; code: string };
  is_active: boolean;
}

/** `POST /policies/{id}/certificates` (IssueIn). Empty optional fields are left out. */
export interface IssueBody {
  certificate_type_id: string;
  effective_from?: string;
  effective_to?: string;
  serial_no?: string;
  vehicle_registration?: string;
  marine_details?: MarineDetails;
  replaces_certificate_id?: string;
  reason?: string;
}
