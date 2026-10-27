// types/instrument.ts — Types for Instrument Verification Portal (M1 + M3)

export type UserRole = 'trader' | 'inspector' | 'admin';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessName?: string;
  tradeLicenseNumber?: string;
  address?: string;
  phone?: string;
  badgeNumber?: string;
  division?: string;
}

export type InstrumentCategory =
  | 'electronic_scale'
  | 'weighbridge'
  | 'fuel_dispenser'
  | 'flow_meter'
  | 'platform_scale'
  | 'test_weights'
  | 'other';

export type AccuracyClass = 'Class I' | 'Class II' | 'Class III' | 'Class IV';

export type InstrumentStatus =
  | 'active_verified'
  | 'pending_verification'
  | 'reverification_due'
  | 'expired'
  | 'rejected';

export interface Instrument {
  id: string;
  traderId: string;
  traderName: string;
  businessName: string;
  category: InstrumentCategory;
  categoryLabel: string;
  makeModel: string;
  serialNumber: string;
  capacity: string;
  verificationInterval: string;
  accuracyClass: AccuracyClass;
  premisesLocation: string;
  registrationDate: string;
  status: InstrumentStatus;
  lastVerifiedDate?: string;
  currentCertificateId?: string;
}

export type ApplicationType = 'initial' | 'periodic' | 'post_repair';

export type ApplicationStatus =
  | 'submitted'
  | 'under_review'
  | 'assigned'
  | 'inspection_scheduled'
  | 'verified'
  | 'rejected';

export interface TestReadings {
  zeroLoadError?: string;
  halfCapacityError?: string;
  maxCapacityError?: string;
  mpeLimit?: string;
  sealsIntact?: boolean;
  notes?: string;
}

export interface VerificationApplication {
  id: string;
  traderId: string;
  traderName: string;
  businessName: string;
  instrumentId: string;
  instrumentSnapshot: Instrument;
  applicationType: ApplicationType;
  applicationTypeLabel: string;
  preferredDate: string;
  locationType: 'on_site' | 'laboratory';
  remarks?: string;
  documentUrl?: string;
  documentName?: string;
  status: ApplicationStatus;
  submittedAt: string;
  reviewedAt?: string;
  assignedOfficerId?: string;
  assignedOfficerName?: string;
  assignedOfficerBadge?: string;
  scheduledDate?: string;
  scheduledTimeSlot?: string;
  inspectionNotes?: string;
  inspectionCompletedAt?: string;
  inspectionOutcome?: 'PASSED' | 'FAILED';
  testReadings?: TestReadings;
  certificateId?: string;
}

export type CertificateStatus = 'VALID' | 'EXPIRED' | 'REVOKED' | 'INVALID';

export interface Certificate {
  id: string;
  applicationId: string;
  instrumentId: string;
  serialNumber: string;
  instrumentCategory: string;
  makeModel: string;
  accuracyClass: AccuracyClass;
  capacity: string;
  verificationInterval: string;
  traderName: string;
  businessName: string;
  premisesLocation: string;
  verificationOfficer: string;
  officerBadge: string;
  division: string;
  issueDate: string;
  expiryDate: string;
  status: CertificateStatus;
  statusReason?: string;
  inspectionResult: 'PASSED';
  certificateHash: string; // SHA-256
  verificationUrl: string;
  digitalSeal: string;
  tamperAlert?: boolean;
}

export interface VerificationCheckResult {
  certificate: Certificate | null;
  isValid: boolean;
  isTampered: boolean;
  computedHash: string;
  expectedHash: string;
  statusMessage: string;
  status: CertificateStatus;
}

export interface RagDocumentCitation {
  docId: string;
  title: string;
  section: string;
  snippet: string;
}

export interface RagResponse {
  question: string;
  answer: string;
  citations: RagDocumentCitation[];
  confidence: number;
  disclaimer: string;
  isAnswerable: boolean;
}
