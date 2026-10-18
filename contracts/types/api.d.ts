// FROZEN — changes require PROPOSAL.md and a human DECISION.md.

export type DecisionOutcome = "AUTO_CLEAR" | "ESCALATE" | "BLOCK";

export type CaseStatus =
  | "NEW"
  | "EVIDENCE_GATHERED"
  | "VERIFIED"
  | "ESCALATED"
  | "APPROVED"
  | "REJECTED"
  | "CLOSED";

export type AlertType = "VOP_NO_MATCH" | "VELOCITY" | "BEHAVIOURAL";

export type RegulatoryClock =
  | "PRE_EXECUTION_FREEZE"
  | "UNAUTHORIZED_REFUND"
  | "IMPERSONATION_DISPUTE";

export interface EvidenceEnvelope {
  caseId: string;
  root: unknown;
  gatheredAt: string;
}

export interface BoundingBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface TextractProvenance {
  documentId: string;
  pageNumber: number;
  ocrConfidence: number;
  box: BoundingBox;
  rawExtractedText: string;
}

export interface ClaimAssertion {
  claimId: string;
  claimType: string;
  narrativeTemplate: string;
  jsonPointers: string[];
  expectedValues: string[];
  documentProvenance?: TextractProvenance | null;
}

export interface ProofStep {
  claim?: string | null;
  computed?: number | null;
  baseline?: number | null;
  ratio?: number | null;
  constraint?: string | null;
  condition?: string | null;
  satisfied?: boolean | null;
  valid: boolean;
  legalRef?: string | null;
}

export interface VerificationResult {
  valid: boolean;
  engines: Record<string, number>;
  proofSteps: ProofStep[];
  receiptHash: string;
  failureReason?: string | null;
}

export interface AlertQueueRow {
  caseId: string;
  supplier: string;
  amount: number;
  currency: string;
  tier: number;
  riskScore: number;
  llmTokens: number;
}

export interface BatchTriageSummary {
  totalProcessed: number;
  tier1AutoCleared: number;
  tier2StepUpHold: number;
  tier3Escalated: number;
  elapsedMilliseconds: number;
  llmTokensConsumedByTier1And2: number;
  showcaseRows: AlertQueueRow[];
}

export interface ServerAttestation {
  algorithm: string;
  publicKeyThumbprint: string;
  keyCustodyMode: string;
  signatureBase64: string;
}

export interface AlertDto {
  type: string;
  amount: number;
  currency: string;
  transactionId: string;
}

export interface SupplierDto {
  name: string;
  ico: string;
  dic: string;
  country: string;
  ageDays: number;
  unreliablePayer: boolean;
  publishedAccounts: string[];
}

export interface RuleHitDto {
  ruleId: string;
  severity: number;
  legalRef: string;
  title: string;
  detail: string;
}

export interface DecisionDto {
  outcome: DecisionOutcome;
  riskScore: number;
  rulesVersion: string;
  agentRecommendation: string;
  overriddenByVerifier: boolean;
  reasons: RuleHitDto[];
}

export interface ApprovalDto {
  required: boolean;
  signatureVerified: boolean;
  signatureB64?: string | null;
  payloadHash?: string | null;
}

export interface CaseDetail {
  id: string;
  status: CaseStatus;
  alert: AlertDto;
  supplier: SupplierDto;
  evidence: Record<string, unknown>;
  verification: VerificationResult;
  decision: DecisionDto;
  approval: ApprovalDto;
  regulatory_clock?: RegulatoryClock | null;
}

export interface PaymentSlip {
  beneficiary: string;
  account: string;
  amount: string;
  vs?: string | null;
  ss?: string | null;
  ks?: string | null;
  message?: string | null;
  legalRef: string;
}

export interface ProofReceipt {
  receiptId: string;
  caseId: string;
  decision: DecisionOutcome;
  riskScore: number;
  rulesVersion: string;
  verification: VerificationResult;
  agentRecommendation: string;
  overriddenByVerifier: boolean;
  receiptHash: string;
  prevHash: string;
  serverAttestation: ServerAttestation;
  createdAt: string;
}

export interface AuditEvent {
  seq: number;
  caseId: string;
  eventType: string;
  payload: Record<string, unknown>;
  prevHash?: string | null;
  hash: string;
  createdAt: string;
}

export interface AuditChain {
  events: AuditEvent[];
  valid: boolean;
}

export interface Exposure {
  totalAmount: number;
  currency: string;
  verifiedCount: number;
  pendingCount: number;
}

export interface HealthResponse {
  status: string;
  mode: string;
  deps: Record<string, string>;
}

export interface ApprovalSubmission {
  canonical: string;
  signatureB64: string;
  publicKeyB64: string;
  deviceId: string;
}

export interface RejectRequest {
  reason: string;
}

export interface DeviceRegistration {
  publicKeyB64: string;
  deviceId: string;
}

export interface RecheckRequest {
  ocrConfidence: number;
}

export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
}

export interface ApprovalRequest {
  caseId: string;
  amount: number;
  currency: string;
  decision: DecisionOutcome;
  receiptHash: string;
  nonce: string;
  expiresAt: string;
}

export interface InvoiceUpdate {
  caseId: string;
  documentId: string;
  ocrConfidence: number;
}

export interface PipelineProgress {
  caseId: string;
  stage: string;
  percent: number;
}
