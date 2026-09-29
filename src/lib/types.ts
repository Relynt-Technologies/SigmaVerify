export type UserRole = 'hr' | 'admin' | 'bgv_team'
export type SubscriptionStatus = 'pending' | 'active' | 'suspended'
export type EmployeeStatus = 'pending_initiation' | 'invited' | 'docs_submitted' | 'under_review' | 'completed' | 'failed'
export type DocType = 'pan' | 'aadhaar_court' | 'aadhaar_address' | 'experience_letter' | 'education_certificate'
export type VerificationStatus = 'pending' | 'in_progress' | 'verified' | 'failed'

export interface Profile {
  id: string
  full_name: string
  company_name: string | null
  email: string | null
  email_verified: boolean
  email_verified_at: string | null
  email_verified_override: boolean
  email_verified_overridden_at: string | null
  role: UserRole
  subscription_status: SubscriptionStatus
  bgv_seats_total: number
  bgv_seats_used: number
  created_at: string
}

export interface Employee {
  id: string
  hr_id: string
  full_name: string
  email: string
  phone: string | null
  status: EmployeeStatus
  invite_token: string
  invite_sent_at: string | null
  submitted_at: string | null
  completed_at: string | null
  created_at: string
}

export interface EmployeeDocument {
  id: string
  employee_id: string
  doc_type: DocType
  file_path: string
  uploaded_at: string
}

export interface Verification {
  id: string
  employee_id: string
  doc_type: DocType
  status: VerificationStatus
  notes: string | null
  verified_by: string | null
  verified_at: string | null
  created_at: string
  updated_at: string
}

export interface Report {
  id: string
  employee_id: string
  report_url: string | null
  generated_at: string | null
  sent_to_hr_at: string | null
  sent_to_employee_at: string | null
  created_at: string
}

export interface AuditLog {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  pan: 'PAN Card',
  aadhaar_court: 'Aadhaar (Court Record)',
  aadhaar_address: 'Aadhaar (Address Verification)',
  experience_letter: 'Experience Letter',
  education_certificate: 'Education Certificate',
}

export const ALL_DOC_TYPES: DocType[] = [
  'pan',
  'aadhaar_court',
  'aadhaar_address',
  'experience_letter',
  'education_certificate',
]
