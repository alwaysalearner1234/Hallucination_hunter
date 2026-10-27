// services/instrumentService.ts — Core Data, Auth, and Verification Engine for M1 & M3
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  UserProfile,
  UserRole,
  Instrument,
  VerificationApplication,
  Certificate,
  VerificationCheckResult,
  ApplicationStatus,
} from '../types/instrument';
import { computeCanonicalCertificateHash } from './cryptoUtils';

const STORAGE_KEYS = {
  CURRENT_USER: '@ivp_current_user',
  INSTRUMENTS: '@ivp_instruments',
  APPLICATIONS: '@ivp_applications',
  CERTIFICATES: '@ivp_certificates',
  INITIALIZED: '@ivp_initialized_v2',
};

// ── Default Mock Users ──────────────────────────────────────────
export const DEMO_USERS: Record<UserRole, UserProfile> = {
  trader: {
    id: 'USR-TRD-101',
    name: 'Rajesh Agarwal',
    email: 'rajesh.trader@apexretail.com',
    role: 'trader',
    businessName: 'Apex Supermarket & Retail Mart',
    tradeLicenseNumber: 'TL-2024-DEL-89412',
    address: 'Shop 14-16, Sector 18 Commercial Complex, Noida',
    phone: '+91 98112 34567',
  },
  inspector: {
    id: 'USR-INS-202',
    name: 'Insp. Vikram Malhotra',
    email: 'vikram.malhotra@legalmetrology.gov.in',
    role: 'inspector',
    badgeNumber: 'LM-INSP-408',
    division: 'Delhi NCR Standards & Verification Division',
    phone: '+91 98765 43210',
  },
  admin: {
    id: 'USR-ADM-303',
    name: 'Dr. Sunita Deshmukh',
    email: 'sunita.admin@legalmetrology.gov.in',
    role: 'admin',
    badgeNumber: 'LM-DIR-012',
    division: 'Directorate of Legal Metrology, State Headquarters',
    phone: '+91 99999 88888',
  },
};

// ── Initial Seed Data ───────────────────────────────────────────
const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'INST-WM-101',
    traderId: 'USR-TRD-101',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    category: 'electronic_scale',
    categoryLabel: 'Electronic Commercial Counter Scale',
    makeModel: 'Mettler Toledo BBA231',
    serialNumber: 'MT-2024-8849',
    capacity: '30 kg (Min: 100 g)',
    verificationInterval: 'e = 5 g, d = 1 g',
    accuracyClass: 'Class III',
    premisesLocation: 'Billing Counter #2, Main Grocery Hall',
    registrationDate: '2025-11-10',
    status: 'active_verified',
    lastVerifiedDate: '2026-01-15',
    currentCertificateId: 'CERT-2026-WM-4910',
  },
  {
    id: 'INST-WM-102',
    traderId: 'USR-TRD-101',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    category: 'platform_scale',
    categoryLabel: 'Heavy Duty Digital Platform Scale',
    makeModel: 'Avery Weigh-Tronix Pro-300',
    serialNumber: 'AW-2023-4102',
    capacity: '300 kg (Min: 2 kg)',
    verificationInterval: 'e = 50 g, d = 20 g',
    accuracyClass: 'Class III',
    premisesLocation: 'Warehouse Inward Goods Bay',
    registrationDate: '2025-12-01',
    status: 'pending_verification',
  },
  {
    id: 'INST-WM-103',
    traderId: 'USR-TRD-101',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    category: 'fuel_dispenser',
    categoryLabel: 'Dual Nozzle Motor Fuel Dispensing Unit',
    makeModel: 'Tokheim Quantium 510',
    serialNumber: 'TK-2022-9011',
    capacity: '50 L/min',
    verificationInterval: 'e = 0.05 L',
    accuracyClass: 'Class II',
    premisesLocation: 'Commercial Fleet Fueling Pump 1',
    registrationDate: '2024-06-15',
    status: 'reverification_due',
    lastVerifiedDate: '2025-02-10',
    currentCertificateId: 'CERT-2025-WM-1102',
  },
];

const INITIAL_CERTIFICATES: Certificate[] = [
  {
    id: 'CERT-2026-WM-4910',
    applicationId: 'APP-2026-WM-7001',
    instrumentId: 'INST-WM-101',
    serialNumber: 'MT-2024-8849',
    instrumentCategory: 'Electronic Commercial Counter Scale',
    makeModel: 'Mettler Toledo BBA231',
    accuracyClass: 'Class III',
    capacity: '30 kg (Min: 100 g)',
    verificationInterval: 'e = 5 g, d = 1 g',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    premisesLocation: 'Billing Counter #2, Main Grocery Hall',
    verificationOfficer: 'Insp. Vikram Malhotra',
    officerBadge: 'LM-INSP-408',
    division: 'Delhi NCR Standards & Verification Division',
    issueDate: '2026-01-15',
    expiryDate: '2027-01-14',
    status: 'VALID',
    inspectionResult: 'PASSED',
    certificateHash: '', // computed below
    verificationUrl: 'http://localhost:8081/portal/verify-certificate?id=CERT-2026-WM-4910',
    digitalSeal: 'LEGAL-METROLOGY-STAMP-SEAL-OK',
  },
  {
    id: 'CERT-2025-WM-1102',
    applicationId: 'APP-2025-WM-3012',
    instrumentId: 'INST-WM-103',
    serialNumber: 'TK-2022-9011',
    instrumentCategory: 'Dual Nozzle Motor Fuel Dispensing Unit',
    makeModel: 'Tokheim Quantium 510',
    accuracyClass: 'Class II',
    capacity: '50 L/min',
    verificationInterval: 'e = 0.05 L',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    premisesLocation: 'Commercial Fleet Fueling Pump 1',
    verificationOfficer: 'Insp. Vikram Malhotra',
    officerBadge: 'LM-INSP-408',
    division: 'Delhi NCR Standards & Verification Division',
    issueDate: '2025-02-10',
    expiryDate: '2026-02-09',
    status: 'EXPIRED',
    statusReason: 'Annual statutory verification validity lapsed. Re-verification required.',
    inspectionResult: 'PASSED',
    certificateHash: '', // computed below
    verificationUrl: 'http://localhost:8081/portal/verify-certificate?id=CERT-2025-WM-1102',
    digitalSeal: 'LEGAL-METROLOGY-STAMP-SEAL-EXPIRED',
  },
];

// Initialize hash for seed certificates
INITIAL_CERTIFICATES.forEach((c) => {
  c.certificateHash = computeCanonicalCertificateHash(c);
});

const INITIAL_APPLICATIONS: VerificationApplication[] = [
  {
    id: 'APP-2026-WM-7001',
    traderId: 'USR-TRD-101',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    instrumentId: 'INST-WM-101',
    instrumentSnapshot: INITIAL_INSTRUMENTS[0],
    applicationType: 'periodic',
    applicationTypeLabel: 'Periodic Statutory Re-verification',
    preferredDate: '2026-01-14',
    locationType: 'on_site',
    remarks: 'Routine annual re-verification for counter checkout scale.',
    status: 'verified',
    submittedAt: '2026-01-10 10:30',
    reviewedAt: '2026-01-11 14:20',
    assignedOfficerId: 'USR-INS-202',
    assignedOfficerName: 'Insp. Vikram Malhotra',
    assignedOfficerBadge: 'LM-INSP-408',
    scheduledDate: '2026-01-15',
    scheduledTimeSlot: '11:00 AM - 01:00 PM',
    inspectionCompletedAt: '2026-01-15 12:45',
    inspectionOutcome: 'PASSED',
    testReadings: {
      zeroLoadError: '0.0 g',
      halfCapacityError: '+1.0 g (Tolerance: ±5.0 g)',
      maxCapacityError: '+2.0 g (Tolerance: ±7.5 g)',
      mpeLimit: 'Within MPE limits (Schedule IX Class III)',
      sealsIntact: true,
      notes: 'All load points verified with standard M1 20kg test weights.',
    },
    certificateId: 'CERT-2026-WM-4910',
  },
  {
    id: 'APP-2026-WM-7002',
    traderId: 'USR-TRD-101',
    traderName: 'Rajesh Agarwal',
    businessName: 'Apex Supermarket & Retail Mart',
    instrumentId: 'INST-WM-102',
    instrumentSnapshot: INITIAL_INSTRUMENTS[1],
    applicationType: 'initial',
    applicationTypeLabel: 'Initial Verification Before Commercial Use',
    preferredDate: '2026-11-05',
    locationType: 'on_site',
    remarks: 'New platform scale installed in goods bay. Needs initial stamping.',
    status: 'assigned',
    submittedAt: '2026-10-25 09:15',
    reviewedAt: '2026-10-26 11:00',
    assignedOfficerId: 'USR-INS-202',
    assignedOfficerName: 'Insp. Vikram Malhotra',
    assignedOfficerBadge: 'LM-INSP-408',
    scheduledDate: '2026-11-02',
    scheduledTimeSlot: '02:00 PM - 04:00 PM',
  },
];

export const instrumentService = {
  // ── Initialization ───────────────────────────────────────────
  async ensureInitialized(): Promise<void> {
    const isInit = await AsyncStorage.getItem(STORAGE_KEYS.INITIALIZED);
    if (!isInit) {
      await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(DEMO_USERS.trader));
      await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(INITIAL_INSTRUMENTS));
      await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(INITIAL_APPLICATIONS));
      await AsyncStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(INITIAL_CERTIFICATES));
      await AsyncStorage.setItem(STORAGE_KEYS.INITIALIZED, 'true');
    }
  },

  // ── Authentication & User Session ─────────────────────────────
  async getCurrentUser(): Promise<UserProfile> {
    await this.ensureInitialized();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (data) {
      return JSON.parse(data);
    }
    return DEMO_USERS.trader;
  },

  async setCurrentUser(user: UserProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
  },

  async switchRole(role: UserRole): Promise<UserProfile> {
    const user = DEMO_USERS[role];
    await this.setCurrentUser(user);
    return user;
  },

  async login(email: string, role: UserRole): Promise<UserProfile> {
    const existing = DEMO_USERS[role];
    const user: UserProfile = {
      ...existing,
      email: email.trim() || existing.email,
    };
    await this.setCurrentUser(user);
    return user;
  },

  async registerTrader(profile: Partial<UserProfile>): Promise<UserProfile> {
    const newTrader: UserProfile = {
      id: `USR-TRD-${Date.now().toString().slice(-4)}`,
      name: profile.name || 'New Trader',
      email: profile.email || 'trader@example.com',
      role: 'trader',
      businessName: profile.businessName || 'Trading Enterprise',
      tradeLicenseNumber: profile.tradeLicenseNumber || `TL-${Date.now().toString().slice(-6)}`,
      address: profile.address || 'Commercial Market Premises',
      phone: profile.phone || '+91 98000 00000',
    };
    await this.setCurrentUser(newTrader);
    return newTrader;
  },

  // ── Instruments API ───────────────────────────────────────────
  async listInstruments(traderId?: string): Promise<Instrument[]> {
    await this.ensureInitialized();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.INSTRUMENTS);
    const instruments: Instrument[] = data ? JSON.parse(data) : [];
    if (traderId) {
      return instruments.filter((i) => i.traderId === traderId);
    }
    return instruments;
  },

  async getInstrumentById(id: string): Promise<Instrument | null> {
    const list = await this.listInstruments();
    return list.find((i) => i.id === id) || null;
  },

  async registerInstrument(
    instrumentData: Omit<Instrument, 'id' | 'registrationDate' | 'status'>
  ): Promise<Instrument> {
    const list = await this.listInstruments();
    const newInstrument: Instrument = {
      ...instrumentData,
      id: `INST-WM-${Math.floor(100 + Math.random() * 900)}`,
      registrationDate: new Date().toISOString().split('T')[0],
      status: 'pending_verification',
    };
    list.unshift(newInstrument);
    await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(list));
    return newInstrument;
  },

  // ── Applications API ──────────────────────────────────────────
  async listApplications(traderId?: string): Promise<VerificationApplication[]> {
    await this.ensureInitialized();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.APPLICATIONS);
    const apps: VerificationApplication[] = data ? JSON.parse(data) : [];
    if (traderId) {
      return apps.filter((a) => a.traderId === traderId);
    }
    return apps;
  },

  async getApplicationById(id: string): Promise<VerificationApplication | null> {
    const list = await this.listApplications();
    return list.find((a) => a.id === id) || null;
  },

  async submitApplication(params: {
    trader: UserProfile;
    instrument: Instrument;
    applicationType: 'initial' | 'periodic' | 'post_repair';
    preferredDate: string;
    locationType: 'on_site' | 'laboratory';
    remarks?: string;
    documentName?: string;
  }): Promise<VerificationApplication> {
    const apps = await this.listApplications();
    const labels = {
      initial: 'Initial Verification Before Commercial Use',
      periodic: 'Periodic Statutory Re-verification',
      post_repair: 'Verification & Stamping After Repair',
    };

    const newApp: VerificationApplication = {
      id: `APP-2026-WM-${Math.floor(1000 + Math.random() * 9000)}`,
      traderId: params.trader.id,
      traderName: params.trader.name,
      businessName: params.trader.businessName || 'Business Owner',
      instrumentId: params.instrument.id,
      instrumentSnapshot: params.instrument,
      applicationType: params.applicationType,
      applicationTypeLabel: labels[params.applicationType],
      preferredDate: params.preferredDate,
      locationType: params.locationType,
      remarks: params.remarks,
      documentName: params.documentName,
      status: 'submitted',
      submittedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
    };

    apps.unshift(newApp);
    await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return newApp;
  },

  async assignInspector(
    applicationId: string,
    officer: { id: string; name: string; badge: string }
  ): Promise<VerificationApplication> {
    const apps = await this.listApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    app.assignedOfficerId = officer.id;
    app.assignedOfficerName = officer.name;
    app.assignedOfficerBadge = officer.badge;
    app.status = 'assigned';
    app.reviewedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);

    await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return app;
  },

  async scheduleInspection(
    applicationId: string,
    scheduledDate: string,
    timeSlot: string,
    notes?: string
  ): Promise<VerificationApplication> {
    const apps = await this.listApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    app.scheduledDate = scheduledDate;
    app.scheduledTimeSlot = timeSlot;
    app.inspectionNotes = notes;
    app.status = 'inspection_scheduled';

    await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));
    return app;
  },

  /**
   * Records inspection outcome.
   * If PASSED: Issues certificate with SHA-256 hash & QR code.
   * If FAILED: Marks application rejected with defect notice; NO certificate issued.
   */
  async recordInspectionResult(
    applicationId: string,
    outcome: 'PASSED' | 'FAILED',
    testReadings: {
      zeroLoadError?: string;
      halfCapacityError?: string;
      maxCapacityError?: string;
      mpeLimit?: string;
      sealsIntact?: boolean;
      notes?: string;
    }
  ): Promise<{ application: VerificationApplication; certificate?: Certificate }> {
    const apps = await this.listApplications();
    const app = apps.find((a) => a.id === applicationId);
    if (!app) throw new Error('Application not found');

    app.inspectionCompletedAt = new Date().toISOString().replace('T', ' ').slice(0, 16);
    app.inspectionOutcome = outcome;
    app.testReadings = testReadings;

    if (outcome === 'FAILED') {
      app.status = 'rejected';
      await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));

      // Update instrument status to rejected
      const instruments = await this.listInstruments();
      const inst = instruments.find((i) => i.id === app.instrumentId);
      if (inst) {
        inst.status = 'rejected';
        await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(instruments));
      }

      return { application: app };
    }

    // Outcome is PASSED -> Issue Certificate
    app.status = 'verified';

    const certId = `CERT-2026-WM-${Math.floor(1000 + Math.random() * 9000)}`;
    const issueDate = new Date().toISOString().split('T')[0];
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    const expiryDate = expiry.toISOString().split('T')[0];

    const certPayload = {
      id: certId,
      applicationId: app.id,
      instrumentId: app.instrumentId,
      serialNumber: app.instrumentSnapshot.serialNumber,
      makeModel: app.instrumentSnapshot.makeModel,
      accuracyClass: app.instrumentSnapshot.accuracyClass,
      capacity: app.instrumentSnapshot.capacity,
      issueDate,
      expiryDate,
      verificationOfficer: app.assignedOfficerName || 'Insp. Vikram Malhotra',
      officerBadge: app.assignedOfficerBadge || 'LM-INSP-408',
    };

    const certHash = computeCanonicalCertificateHash(certPayload);

    const newCert: Certificate = {
      ...certPayload,
      instrumentCategory: app.instrumentSnapshot.categoryLabel,
      verificationInterval: app.instrumentSnapshot.verificationInterval,
      traderName: app.traderName,
      businessName: app.businessName,
      premisesLocation: app.instrumentSnapshot.premisesLocation,
      division: 'Delhi NCR Standards & Verification Division',
      status: 'VALID',
      inspectionResult: 'PASSED',
      certificateHash: certHash,
      verificationUrl: `http://localhost:8081/portal/verify-certificate?id=${certId}`,
      digitalSeal: 'LEGAL-METROLOGY-STAMP-SEAL-OK',
    };

    app.certificateId = certId;
    await AsyncStorage.setItem(STORAGE_KEYS.APPLICATIONS, JSON.stringify(apps));

    // Save certificate
    const certificates = await this.listCertificates();
    certificates.unshift(newCert);
    await AsyncStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(certificates));

    // Update instrument status
    const instruments = await this.listInstruments();
    const inst = instruments.find((i) => i.id === app.instrumentId);
    if (inst) {
      inst.status = 'active_verified';
      inst.lastVerifiedDate = issueDate;
      inst.currentCertificateId = certId;
      await AsyncStorage.setItem(STORAGE_KEYS.INSTRUMENTS, JSON.stringify(instruments));
    }

    return { application: app, certificate: newCert };
  },

  // ── Certificates API (M3) ────────────────────────────────────
  async listCertificates(): Promise<Certificate[]> {
    await this.ensureInitialized();
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CERTIFICATES);
    return data ? JSON.parse(data) : [];
  },

  async getCertificateById(id: string): Promise<Certificate | null> {
    const list = await this.listCertificates();
    const normalized = id.trim().toUpperCase();
    return list.find((c) => c.id.toUpperCase() === normalized) || null;
  },

  /**
   * Cryptographic verification of certificate authenticity and tamper detection.
   * Checks SHA-256 hash match against certificate fields and validates expiry.
   */
  async verifyCertificateIntegrity(certIdOrHash: string): Promise<VerificationCheckResult> {
    await this.ensureInitialized();
    const list = await this.listCertificates();
    const query = certIdOrHash.trim();

    // Match by ID or exact SHA-256 hash
    const cert = list.find(
      (c) =>
        c.id.toLowerCase() === query.toLowerCase() ||
        c.certificateHash.toLowerCase() === query.toLowerCase()
    );

    if (!cert) {
      return {
        certificate: null,
        isValid: false,
        isTampered: false,
        computedHash: '',
        expectedHash: '',
        statusMessage: 'Certificate not found. The specified ID or Hash is not registered in the Legal Metrology database.',
        status: 'INVALID',
      };
    }

    // Recompute canonical SHA-256 hash
    const computedHash = computeCanonicalCertificateHash(cert);
    const expectedHash = cert.certificateHash;
    const isTampered = computedHash !== expectedHash || cert.tamperAlert === true;

    if (isTampered) {
      return {
        certificate: cert,
        isValid: false,
        isTampered: true,
        computedHash,
        expectedHash,
        statusMessage:
          'TAMPERING DETECTED: The computed cryptographic SHA-256 hash does not match the certificate digital signature. Instrument details or dates have been altered.',
        status: 'INVALID',
      };
    }

    if (cert.status === 'REVOKED') {
      return {
        certificate: cert,
        isValid: false,
        isTampered: false,
        computedHash,
        expectedHash,
        statusMessage: 'Certificate REVOKED by Legal Metrology Department due to reported seal tampering or defect.',
        status: 'REVOKED',
      };
    }

    // Check expiry
    const today = new Date().toISOString().split('T')[0];
    if (today > cert.expiryDate || cert.status === 'EXPIRED') {
      return {
        certificate: cert,
        isValid: false,
        isTampered: false,
        computedHash,
        expectedHash,
        statusMessage: `Certificate EXPIRED on ${cert.expiryDate}. Instrument requires statutory annual re-verification before further commercial use.`,
        status: 'EXPIRED',
      };
    }

    return {
      certificate: cert,
      isValid: true,
      isTampered: false,
      computedHash,
      expectedHash,
      statusMessage: 'Certificate is AUTHENTIC and VALID. Statutory inspection seal is active and compliant with Legal Metrology Act.',
      status: 'VALID',
    };
  },

  /**
   * Simulates tampering on a certificate to demonstrate cryptographic detection.
   * Inverts or modifies the serial number without updating the signature hash.
   */
  async simulateTampering(certId: string, enableTamper: boolean): Promise<Certificate> {
    const list = await this.listCertificates();
    const cert = list.find((c) => c.id === certId);
    if (!cert) throw new Error('Certificate not found');

    if (enableTamper) {
      cert.serialNumber = `${cert.serialNumber}-TAMPERED`;
      cert.tamperAlert = true;
    } else {
      cert.serialNumber = cert.serialNumber.replace('-TAMPERED', '');
      cert.tamperAlert = false;
      cert.certificateHash = computeCanonicalCertificateHash(cert);
    }

    await AsyncStorage.setItem(STORAGE_KEYS.CERTIFICATES, JSON.stringify(list));
    return cert;
  },
};
