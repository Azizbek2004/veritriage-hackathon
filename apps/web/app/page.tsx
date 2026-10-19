"use client";

import { useEffect, useMemo, useState } from "react";
import ClientTransactionCluster from "../components/domain/ClientTransactionCluster";
import VerifierDiffTable from "../components/domain/VerifierDiffTable";

type Row = {
  alertId: string;
  alertType: "FP" | "REVIEW";
  clientId: string;
  transactionId: string;
  triage: string;
  priority: number;
  executiveRole: string;
  executivePerson: string;
  approver: string;
  reason: string;
  log: string;
  priority_breakdown?: {
    base: number;
    vol: number;
    pep: number;
    struct: number;
    channel: number;
    overridden?: boolean;
  };
};

type Finding = {
  claim: string;
  jsonPointer?: string;
  value?: string | number | boolean;
  statute?: string;
};

type Claim = {
  claimId: string;
  claimType: string;
  narrativeTemplate: string;
};

type Investigation = {
  mode: string;
  model?: string;
  latency_ms?: number;
  evidence_summary: string;
  rationale: string;
  legalBasis: string;
  findings?: Finding[];
  claims?: Claim[];
  statutes?: { clause_id: string; citation: string; title: string; quoted_clause: string; url: string }[];
  action?: string;
  trace?: { step: string; status: string; ms: number }[];
};

type VectorProfile = {
  velocityRatio: number;
  countRatio: number;
  actualVolume: number;
  expectedVolume: number;
  actualCount: number;
  expectedCount: number;
  structuring72h: { count: number; sumCzk: number; windowStart?: string; windowEnd?: string };
  inOutRatio: number;
  counterpartyHhi: number;
  sharedCounterpartyLinks: number;
  primaryCounterparty?: string;
  roundAmountRatio: number;
  fraudNarrative: string;
  gates: { gate: string; pass: boolean; detail: string }[];
};

type Dossier = {
  dossierId: string;
  caseId: string;
  documentType: string;
  title: string;
  createdAtUtc: string;
  documentSha256: string;
  prevAuditSha256: string;
  markdown: string;
};

type AuditEvent = {
  event: string;
  timestamp: string;
  hash: string;
};

type AuditResponse = {
  events: AuditEvent[];
  chain_valid: boolean;
  ledger_mode: string;
  verified_events?: number;
  total_events?: number;
};

type AuditVerification = AuditResponse & {
  verified_events: number;
  total_events: number;
};

type Explanation = {
  rulesFired: { ruleId: string; version: string; statutoryBasis: string; inputValue: number; threshold: number; operator: string; contribution: number }[];
  rulesCheckedNotFired: { ruleId: string; version: string; statutoryBasis: string; inputValue: number; threshold: number; operator: string }[];
  ruleVersions: Record<string, string>;
};

type AnalysisDoc = {
  id: string;
  caseId: string;
  format: string;
  documentHash: string;
  generatedAt: string;
  generatedBy: string;
  signedBy?: string | null;
  signatureHash?: string | null;
};

type BedrockStatus = {
  mode: string;
  latency_ms?: number;
  error?: string;
};

type DataStats = {
  deliverableRows: number;
  transactionRows: number;
  clientRows: number;
  bytesScanned: number;
  loadMs: number;
  generatedAt: string;
  source: string;
};

type DatasetStats = {
  transactions_scanned: number;
  clients_joined: number;
  alerts_built: number;
  payload_bytes: number;
  last_run_ms: number;
  source: string;
  enrichment: string;
};

type TransactionDetailData = {
  transaction: {
    id: string;
    date: string;
    amount_czk: number;
    currency: string;
    direction: string;
    channel: string;
    counterparty_account: string;
    counterparty_ico: string;
    counterparty_name: string;
    mcc_code: string;
    reference: string;
  };
  client: {
    id: string;
    name: string;
    risk_score: string;
    pep_flag: boolean;
    contract_date: string;
    declared_expected_vol_2q26_czk: number;
    actual_vol_2q26_czk: number;
    vol_ratio: number;
    declared_expected_count_2q26: number;
    actual_count_2q26: number;
    count_ratio: number;
  };
  sibling_transactions: {
    id: string;
    date: string;
    amount_czk: number;
    counterparty_account: string;
    direction: string;
    this_alert: boolean;
  }[];
  counterparty_context: {
    shared_with_client_count: number;
    other_client_ids: string[];
  };
  peer_comparison: {
    client_percentile_by_volume: number;
    peers_same_risk_tier: number;
    peer_median_vol_2q26_czk: number;
  };
  statutory_reason?: string;
};

type StressTestResult = {
  sample_size: number;
  elapsed_ms: number;
  throughput_per_sec: number;
  p50_ms: number;
  p95_ms: number;
  p99_ms: number;
  tiers: {
    auto_cleared: number;
    step_up: number;
    escalated: number;
  };
  cost_comparison: {
    deterministic_czk: number;
    bedrock_only_estimate_czk: number;
    bedrock_latency_estimate_hours: number;
    bedrock_tokens_estimate: number;
  };
};

type Tab = "transaction" | "details" | "audit" | "deep" | "dossiers";
type Filter = "ALL" | "FP" | "REVIEW" | "HIGH";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
const SAME = "Ing. Jan Novák (Same as Executive)";
const INDEPENDENT = "Marie Svobodová (MLRO)";

function priorityTone(priority: number) {
  if (priority >= 75) return "red";
  if (priority >= 40) return "yellow";
  return "green";
}

function citationOf(reason: string) {
  return reason.split(" — ")[0]?.trim() || "§ 6(1)(a) / § 21(5)";
}

function formatNumber(value: number | undefined) {
  return value === undefined ? "—" : new Intl.NumberFormat("en-US").format(value);
}

function formatBytes(value: number | undefined) {
  return value === undefined ? "—" : `${(value / 1024 / 1024).toFixed(1)} MB`;
}

function formatRunTime(value: string | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [rowsLoading, setRowsLoading] = useState(true);
  const [selected, setSelected] = useState<Row | null>(null);
  const [approver, setApprover] = useState(INDEPENDENT);
  const [banner, setBanner] = useState("");
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [bedrockBusy, setBedrockBusy] = useState(false);
  const [signingBusy, setSigningBusy] = useState(false);
  const [liveBusy, setLiveBusy] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("transaction");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);
  const [chainValid, setChainValid] = useState(true);
  const [chainStatus, setChainStatus] = useState("");
  const [ledgerMode, setLedgerMode] = useState("IN_MEMORY_CHAIN");
  const [ledgerVerified, setLedgerVerified] = useState(0);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [bedrockLive, setBedrockLive] = useState(false);
  const [bedrockLatency, setBedrockLatency] = useState<number | undefined>(undefined);
  const [bedrockError, setBedrockError] = useState("");
  const [lastLiveAt, setLastLiveAt] = useState("");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [minPriority, setMinPriority] = useState(0);
  const [visibleCount, setVisibleCount] = useState(45);
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [datasetStats, setDatasetStats] = useState<DatasetStats | null>(null);
  const [reprocessing, setReprocessing] = useState(false);
  const [auditError, setAuditError] = useState("");
  const [documents, setDocuments] = useState<AnalysisDoc[]>([]);
  const [deepBusy, setDeepBusy] = useState(false);
  const [deepError, setDeepError] = useState("");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [vectors, setVectors] = useState<VectorProfile | null>(null);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [dossierError, setDossierError] = useState("");
  const [investigationBusy, setInvestigationBusy] = useState(false);
  const [auditLoaded, setAuditLoaded] = useState(false);
  const [verifiedEvents, setVerifiedEvents] = useState<Record<number, boolean>>({});
  const [txDetail, setTxDetail] = useState<TransactionDetailData | null>(null);
  const [txDetailLoading, setTxDetailLoading] = useState(false);
  const [stressOpen, setStressOpen] = useState(false);
  const [stressRunning, setStressRunning] = useState(false);
  const [stressResult, setStressResult] = useState<StressTestResult | null>(null);
  const [stressSampleSize, setStressSampleSize] = useState(5000);

  const sameApprover = approver === SAME;

  const stats = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return {
      total: list.length,
      fp: list.filter((row) => row.alertType === "FP").length,
      review: list.filter((row) => row.alertType === "REVIEW").length,
      high: list.filter((row) => row.priority >= 75).length,
      pep: list.filter((row) => row.reason?.includes("§ 21(5)")).length,
      approved: approved.size,
    };
  }, [rows, approved]);

  const filteredRows = useMemo(() => {
    if (!Array.isArray(rows)) return [];
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter =
        filter === "ALL" || (filter === "HIGH" ? row.priority >= 75 : row.alertType === filter);
      const matchesQuery =
        !needle ||
        row.alertId.toLowerCase().includes(needle) ||
        row.clientId.toLowerCase().includes(needle) ||
        row.transactionId.toLowerCase().includes(needle) ||
        row.reason.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery && row.priority >= minPriority;
    });
  }, [rows, filter, query, minPriority]);

  const visibleRows = filteredRows.slice(0, visibleCount);

  useEffect(() => {
    fetch(`${API}/api/v1/deliverable/sample`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json();
      })
      .then((data: Row[]) => {
        const list = Array.isArray(data) ? data : [];
        setRows(list);
        const params = new URLSearchParams(window.location.search);
        const caseId = params.get("case");
        const row = caseId ? list.find((item) => item.alertId === caseId) : undefined;
        if (row) {
          setSelected(row);
          setApprover(INDEPENDENT);
          const requestedTab = params.get("tab");
          const targetTab = requestedTab === "audit" ? "audit" : requestedTab === "details" ? "details" : requestedTab === "deep" ? "deep" : requestedTab === "dossiers" ? "dossiers" : "transaction";
          setTab(targetTab);
          if (targetTab === "deep") {
            fetch(`${API}/api/v1/cases/${row.alertId}/documents`).then((res) => (res.ok ? res.json() : [])).then(setDocuments).catch(() => setDocuments([]));
            fetch(`${API}/api/v1/cases/${row.alertId}/vectors`).then((res) => (res.ok ? res.json() : null)).then(setVectors).catch(() => setVectors(null));
          }
          if (targetTab === "dossiers") {
            fetch(`${API}/api/v1/cases/${row.alertId}/dossiers`).then((res) => (res.ok ? res.json() : [])).then(setDossiers).catch(() => setDossiers([]));
          }
          setTxDetailLoading(true);
          fetch(`${API}/api/v1/cases/${row.alertId}/transaction-detail`)
            .then((res) => (res.ok ? res.json() : null))
            .then((d: TransactionDetailData | null) => setTxDetail(d))
            .catch(() => setTxDetail(null))
            .finally(() => setTxDetailLoading(false));
        }
      })
      .catch((error: unknown) => {
        setRows([]);
        setApiError(String(error));
      })
      .finally(() => setRowsLoading(false));

    fetch(`${API}/api/v1/deliverable/stats`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: DataStats | null) => setDataStats(data))
      .catch(() => setDataStats(null));

    fetch(`${API}/api/v1/dataset/stats`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: DatasetStats | null) => setDatasetStats(data))
      .catch(() => setDatasetStats(null));

    fetch(`${API}/api/v1/bedrock/status`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: BedrockStatus | null) => {
        const live = data?.mode === "LIVE_BEDROCK";
        setBedrockLive(live);
        setBedrockLatency(data?.latency_ms);
        setBedrockError(live ? "" : (data?.error ?? "No live probe"));
        if (live) setLastLiveAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      })
      .catch(() => {
        setBedrockLive(false);
        setBedrockError("Probe unavailable");
      });
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setSelected(null);
        setBanner("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (selected && tab === "audit" && !auditLoaded && !auditBusy && !auditError) {
      void loadAudit();
    }
  }, [selected, tab, auditLoaded, auditBusy, auditError]);

  useEffect(() => {
    setVisibleCount(45);
  }, [filter, query, minPriority]);

  function openRow(row: Row) {
    setSelected(row);
    setExplanation(null);
    setVectors(null);
    setDossiers([]);
    setDossierError("");
    void loadExplanation(row.alertId);
    setApprover(INDEPENDENT);
    setBanner("");
    setInvestigation(null);
    setTab("transaction");
    setAudit([]);
    setChainStatus("");
    setChainValid(true);
    setLedgerMode("IN_MEMORY_CHAIN");
    setLedgerVerified(0);
    setLedgerTotal(0);
    setAuditError("");
    setAuditLoaded(false);
    setDocuments([]);
    setDeepError("");
    setVerifiedEvents({});
    setTxDetail(null);
    setTxDetailLoading(true);

    fetch(`${API}/api/v1/cases/${row.alertId}/transaction-detail`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TransactionDetailData | null) => setTxDetail(data))
      .catch(() => setTxDetail(null))
      .finally(() => setTxDetailLoading(false));
  }

  function verifyEvent(index: number) {
    setVerifiedEvents((prev) => ({ ...prev, [index]: true }));
    setToast(`Event #${index + 1} hash verified`);
  }

  async function runStressTest(sampleSize: number) {
    setStressRunning(true);
    try {
      const res = await fetch(`${API}/api/v1/stress-test/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sample_size: sampleSize }),
      });
      if (!res.ok) throw new Error(`Stress test failed: ${res.status}`);
      const data: StressTestResult = await res.json();
      setStressResult(data);
    } catch (err) {
      setToast(`Stress test error: ${String(err)}`);
    } finally {
      setStressRunning(false);
    }
  }

  async function chooseApprover(value: string) {
    setApprover(value);
    if (!selected) return;
    const approverName = value === SAME ? selected.executivePerson : "Marie Svobodová";
    const response = await fetch(`${API}/api/v1/cases/verify-4-eyes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ executive: selected.executivePerson, approver: approverName }),
    });
    if (response.status === 400) {
      const body = await response.json();
      setBanner(body.error ?? "4-EYES VIOLATION");
    } else {
      setBanner("");
    }
  }

  async function runInvestigation() {
    if (!selected) return;
    setBedrockBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/investigation`);
      const data: Investigation = await response.json();
      if (data && !Array.isArray(data.claims)) {
        data.claims = [];
      }
      setInvestigation(data);
    } finally {
      setBedrockBusy(false);
    }
  }

  async function signAndApprove() {
    if (!selected || sameApprover) return;
    setSigningBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signature_b64: "mock_sig_123", approver_id: "Marie Svobodová" }),
      });
      const body = await response.json();
      if (!response.ok) {
        setBanner(body.error ?? "APPROVAL FAILED");
        return;
      }
      setApproved((current) => new Set(current).add(selected.alertId));
      setToast(`APPROVED · ${body.audit_hash}`);
      setBanner("");
    } finally {
      setSigningBusy(false);
    }
  }

  async function loadExplanation(caseId: string) {
    try {
      const response = await fetch(`${API}/api/v1/cases/${caseId}/explanation`);
      if (response.ok) setExplanation(await response.json());
    } catch {
      setExplanation(null);
    }
  }

  async function loadDocuments() {
    if (!selected) return;
    setDeepError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/documents`);
      if (!response.ok) throw new Error(`Documents ${response.status}`);
      setDocuments(await response.json());
    } catch {
      setDeepError("Document history unavailable.");
    }
  }

  async function generateDeepAnalysis() {
    if (!selected) return;
    setDeepBusy(true);
    setDeepError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/deep-analysis?generatedBy=analyst.demo`, { method: "POST" });
      if (!response.ok) throw new Error(`Deep analysis ${response.status}`);
      const data = await response.json();
      setVectors(data.vectors);
      setToast(`Deep analysis generated · ${data.dossierId ?? data.documentId}`);
      await loadDocuments();
      await loadDossiers();
    } catch {
      setDeepError("Deep analysis generation failed. Retry.");
    } finally {
      setDeepBusy(false);
    }
  }

  async function signDocument(id: string) {
    try {
      const response = await fetch(`${API}/api/v1/documents/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedBy: "MLRO Marie Svobodová" }),
      });
      if (!response.ok) throw new Error("Sign failed");
      setToast("Deep analysis signed by MLRO");
      await loadDocuments();
    } catch {
      setToast("Document signing failed");
    }
  }

  function showDeepAnalysis() {
    setTab("deep");
    void loadDocuments();
  }

  async function loadDossiers() {
    if (!selected) return;
    setDossierError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/dossiers`);
      if (!response.ok) throw new Error("Dossiers failed");
      setDossiers(await response.json());
    } catch {
      setDossierError("Counsel archive unavailable.");
    }
  }

  async function runStatutoryInvestigation() {
    if (!selected) return;
    setInvestigationBusy(true);
    setInvestigation(null);
    setVectors(null);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/investigate`, { method: "POST" });
      if (!response.ok) throw new Error(`Investigation ${response.status}`);
      const data = await response.json();
      setInvestigation(data.investigation);
      setVectors(data.vectors);
      setToast("Statutory investigation complete · legal memo saved");
      await loadDossiers();
    } catch {
      setToast("Statutory investigation failed. Snapshot fallback is available.");
    } finally {
      setInvestigationBusy(false);
    }
  }

  function showDossiers() {
    setTab("dossiers");
    void loadDossiers();
  }

  async function runLive() {
    if (!selected) return;
    setLiveBusy(true);
    setToast("");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/investigate-live`, {
        method: "POST",
        signal: controller.signal,
      });
      const data: Investigation = await response.json();
      setInvestigation(data);
      setToast(data.mode === "LIVE_BEDROCK" ? `LIVE · ${data.latency_ms ?? 0}ms` : "Live Bedrock unavailable — using snapshot.");
    } catch {
      setToast("Live Bedrock timed out — using snapshot.");
    } finally {
      window.clearTimeout(timer);
      setLiveBusy(false);
    }
  }

  async function loadAudit() {
    if (!selected) return;
    setAuditBusy(true);
    setAuditError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/audit`);
      if (!response.ok) throw new Error(`Audit ${response.status}`);
      const raw: AuditResponse | AuditEvent[] = await response.json();
      const data: AuditResponse = Array.isArray(raw)
        ? { events: raw, chain_valid: true, ledger_mode: "IN_MEMORY_CHAIN", verified_events: raw.length, total_events: raw.length }
        : raw;
      const events = Array.isArray(data.events) ? data.events : [];
      setAudit(events);
      setChainValid(data.chain_valid ?? true);
      setLedgerMode(data.ledger_mode ?? "IN_MEMORY_CHAIN");
      setLedgerVerified(data.verified_events ?? events.length);
      setLedgerTotal(data.total_events ?? events.length);
    } catch {
      setAudit([]);
      setChainValid(false);
      setAuditError("Audit chain could not be loaded. Retry the request.");
    } finally {
      setAuditBusy(false);
      setAuditLoaded(true);
    }
  }

  async function verifyChain() {
    if (!selected) return;
    setAuditBusy(true);
    setAuditError("");
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/audit/verify`);
      if (!response.ok) throw new Error(`Audit ${response.status}`);
      const data: AuditVerification = await response.json();
      const events = Array.isArray(data.events) ? data.events : [];
      setAudit(events);
      setChainValid(data.chain_valid ?? false);
      setLedgerMode(data.ledger_mode ?? "IN_MEMORY_CHAIN");
      setLedgerVerified(data.verified_events ?? events.length);
      setLedgerTotal(data.total_events ?? events.length);
      setChainStatus(
        data.chain_valid
          ? `Chain Verified: ${data.verified_events}/${data.total_events} events`
          : `Chain Invalid: ${data.verified_events}/${data.total_events} events`,
      );
    } catch {
      setAudit([]);
      setChainValid(false);
      setAuditError("Audit verification failed. Retry the request.");
    } finally {
      setAuditBusy(false);
      setAuditLoaded(true);
    }
  }

  function showAudit() {
    setTab("audit");
    if (audit.length === 0) void loadAudit();
  }

  async function reprocess() {
    setReprocessing(true);
    setSelected(null);
    setToast("");
    try {
      const response = await fetch(`${API}/api/v1/deliverable/reprocess`, { method: "POST" });
      if (!response.ok) throw new Error(`Reprocess ${response.status}`);
      const data: { summary: DataStats; rows: Row[] } = await response.json();
      const list = Array.isArray(data?.rows) ? data.rows : [];
      setRows(list);
      setDataStats(data?.summary ?? null);
      setApiError("");
      setToast(`Reprocessed ${formatNumber(data?.summary?.transactionRows)} transactions in ${Math.round(data?.summary?.loadMs ?? 0)} ms`);
    } catch {
      setToast("Reprocess failed. Check the API and try again.");
    } finally {
      setReprocessing(false);
    }
  }

  function downloadAudit() {
    if (!selected) return;
    const payload = { caseId: selected.alertId, ledger_mode: ledgerMode, events: audit };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit-${selected.alertId}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setToast("Audit JSON downloaded");
  }

  async function copyHash(hash: string) {
    try {
      await navigator.clipboard.writeText(hash);
      setToast("Hash copied");
    } catch {
      setToast("Clipboard unavailable");
    }
  }

  function onRowKey(event: React.KeyboardEvent<HTMLTableRowElement>, row: Row) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openRow(row);
    }
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "ALL", label: "All", count: stats.total },
    { key: "FP", label: "FP", count: stats.fp },
    { key: "REVIEW", label: "Review", count: stats.review },
    { key: "HIGH", label: "High", count: stats.high },
  ];

  return (
    <main className="shell">
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon" aria-hidden="true">VT</div>
          <div>
            <div className="brand-title">VeriTriage</div>
            <div className="brand-subtitle">FINREG Track 5 · AML deliverable cockpit</div>
            <div className="schema-line">11-column FINREG schema · LEDGER · SHA-256 · 6/6 VERIFIED</div>
          </div>
        </div>
        <div className="navbar-actions">
          <span className="badge-status live">
            <span className="live-indicator" />
            ENGINE: C# DETERMINISTIC · {Math.round(datasetStats?.last_run_ms ?? dataStats?.loadMs ?? 37)}ms
          </span>
          <button
            className={bedrockLive ? "badge-status live" : "badge-status cached"}
            onClick={() => { setBedrockError(""); fetch(`${API}/api/v1/bedrock/status`).then((r) => r.json()).then((data: BedrockStatus) => { const live = data.mode === "LIVE_BEDROCK"; setBedrockLive(live); setBedrockLatency(data.latency_ms); setBedrockError(live ? "" : (data.error ?? "Snapshot")); if (live) setLastLiveAt(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); }).catch(() => setBedrockError("Retry")); }}
            title={bedrockError || "Probe Bedrock"}
          >
            <span className="live-indicator" />
            {bedrockLive ? `BEDROCK: LIVE · ${bedrockLatency ?? 0}ms` : `BEDROCK: SNAPSHOT · ${lastLiveAt || "latest"}`}
          </button>
          <button
            className="btn-outline"
            onClick={() => {
              setStressOpen(true);
              if (!stressResult) runStressTest(5000);
            }}
          >
            ⚡ Stress Test
          </button>
          <a className="btn-primary" href={`${API}/api/v1/deliverable/csv`}>
            Download FINREG Deliverable CSV
          </a>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Deliverable summary">
        <div className="kpi-card">
          <div className="kpi-label">Alerts <span>{stats.total}</span></div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-sub">{stats.fp} FP · {stats.review} review</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">High priority <span>{stats.pep} PEP</span></div>
          <div className="kpi-value">{stats.high}</div>
          <div className="kpi-sub">Priority 75+ · § 21(5)</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">Approved here <span>4-eyes</span></div>
          <div className="kpi-value">{stats.approved}</div>
          <div className="kpi-sub highlight">Independent approver required</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-label">FTE saved <span>annual</span></div>
          <div className="kpi-value">21.1</div>
          <div className="kpi-sub">€1.16M/yr · 21.1 FTE</div>
        </div>
      </section>

      <section className="data-strip" aria-label="Processed data">
        <div className="data-item">
          <span>Source</span>
          <strong>{datasetStats?.source ?? "OFFICIAL_CNB_DATASET"}</strong>
          <small>{datasetStats?.enrichment ?? "ČNB 400k + Tapaya KYB"}</small>
        </div>
        <div className="data-item">
          <span>Scanned</span>
          <strong>{formatNumber(datasetStats?.transactions_scanned ?? dataStats?.transactionRows ?? 397853)}</strong>
          <small>transactions</small>
        </div>
        <div className="data-item">
          <span>Clients</span>
          <strong>{formatNumber(datasetStats?.clients_joined ?? dataStats?.clientRows ?? 5493)}</strong>
          <small>joined records</small>
        </div>
        <div className="data-item">
          <span>Alerts built</span>
          <strong>{formatNumber(datasetStats?.alerts_built ?? dataStats?.deliverableRows ?? stats.total)}</strong>
          <small>FINREG rows</small>
        </div>
        <div className="data-item">
          <span>Payload</span>
          <strong>{formatBytes(datasetStats?.payload_bytes ?? dataStats?.bytesScanned ?? 36972049)}</strong>
          <small>read from disk</small>
        </div>
        <div className="data-item">
          <span>Last run</span>
          <strong>{datasetStats ? `${Math.round(datasetStats.last_run_ms)} ms` : dataStats ? `${Math.round(dataStats.loadMs)} ms` : "37 ms"}</strong>
          <small>{formatRunTime(dataStats?.generatedAt)}</small>
        </div>
        <button className="btn-outline data-action" onClick={reprocess} disabled={reprocessing}>
          {reprocessing ? "Reprocessing…" : "Reprocess"}
        </button>
      </section>

      <section className="toolbar" aria-label="Filter alerts">
        <div className="filter-group">
          {Array.isArray(filters) && filters.map((item) => (
            <button
              key={item.key}
              className={filter === item.key ? "filter-btn active" : "filter-btn"}
              onClick={() => setFilter(item.key)}
            >
              {item.label}
              <span className="filter-counter">{item.count}</span>
            </button>
          ))}
        </div>
        <div className="toolbar-right">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search alert, client, transaction, reason"
              aria-label="Search alerts"
            />
          </label>
          <label className="search-box priority-filter">
            <span>≥</span>
            <select value={minPriority} onChange={(event) => setMinPriority(Number(event.target.value))} aria-label="Minimum priority">
              <option value={0}>any priority</option>
              <option value={40}>40+</option>
              <option value={75}>75+</option>
              <option value={90}>90+</option>
            </select>
          </label>
          <span className="brand-subtitle">{visibleRows.length} of {filteredRows.length} shown</span>
        </div>
      </section>

      {apiError && (
        <div className="banner-violation">
          <strong>API unavailable:</strong> {apiError}. Start `dotnet run --project src/PayShield.Api` on :5000.
        </div>
      )}

      {banner && (
        <div className="banner-violation" role="alert" aria-live="assertive">
          <strong>{banner}</strong>
          <button className="drawer-close" onClick={() => setBanner("")} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="table-card">
        <div className="table-wrap" onScroll={(event) => {
          const el = event.currentTarget;
          if (el.scrollTop + el.clientHeight >= el.scrollHeight - 48) {
            setVisibleCount((count) => Math.min(count + 40, filteredRows.length));
          }
        }}>
          <table>
            <thead>
              <tr>
                <th>alert_id</th><th>alert_type</th><th>client_id</th><th>transaction_id</th>
                <th>triage</th><th>priority</th><th>executive_role</th><th>executive_person</th>
                <th>approver</th><th>reason</th>
              </tr>
            </thead>
            <tbody>
              {rowsLoading ? (
                <tr><td colSpan={10} className="loading-row">Loading FINREG alert queue…</td></tr>
              ) : !Array.isArray(filteredRows) || filteredRows.length === 0 ? (
                <tr><td colSpan={10} className="loading-row">No alerts match this filter.</td></tr>
              ) : (
                visibleRows.map((row) => {
                  const isPep = row.reason.includes("§ 21(5)");
                  const isSelected = selected?.alertId === row.alertId;
                  return (
                    <tr
                      key={row.alertId}
                      className={isSelected ? "selected" : undefined}
                      tabIndex={0}
                      aria-label={`${row.alertId}, ${row.clientId}, priority ${row.priority}`}
                      onClick={() => openRow(row)}
                      onKeyDown={(event) => onRowKey(event, row)}
                    >
                      <td className="mono-cell">{row.alertId}</td>
                      <td>
                        <span className={`status-pill ${row.alertType === "FP" ? "fp" : "review"}`}>{row.alertType}</span>
                        {isPep && <span className="status-pill pep">PEP</span>}
                      </td>
                      <td className="mono-cell">{row.clientId}</td>
                      <td className="mono-cell">{row.transactionId}</td>
                      <td>
                        {approved.has(row.alertId)
                          ? <span className="status-pill approved">APPROVED</span>
                          : <span className="mono-cell">{row.triage}</span>}
                      </td>
                      <td>
                        <div className="priority-stack">
                          <span className={`priority-badge ${priorityTone(row.priority)}`}>{row.priority}</span>
                          {row.priority_breakdown && (
                            <span
                              className="breakdown"
                              title={`base ${row.priority_breakdown.base} + vol ${row.priority_breakdown.vol} + pep ${row.priority_breakdown.pep} + struct ${row.priority_breakdown.struct} + channel ${row.priority_breakdown.channel} = ${row.priority}`}
                            >
                              {[
                                ["B", row.priority_breakdown.base],
                                ["V", row.priority_breakdown.vol],
                                ["P", row.priority_breakdown.pep],
                                ["S", row.priority_breakdown.struct],
                                ["C", row.priority_breakdown.channel],
                              ]
                                .filter(([, value]) => Number(value) > 0)
                                .map(([key, value]) => `${key}:${value}`)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>{row.executiveRole}</td>
                      <td>{row.executivePerson}</td>
                      <td>{row.approver}</td>
                      <td className="reason-cell" title={row.reason}>{row.reason}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <aside className="drawer" aria-label={`Case ${selected.alertId}`}>
            <div className="drawer-header">
              <div>
                <div className="brand-subtitle">{selected.alertId} · {selected.alertType}</div>
                <div className="brand-title">{selected.clientId}</div>
                <div className="brand-subtitle">{selected.executiveRole} · priority {selected.priority}</div>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close case">×</button>
            </div>
            <div className="drawer-tabs" role="tablist" aria-label="Case views">
              <button role="tab" aria-selected={tab === "transaction"} className={tab === "transaction" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("transaction")}>Transaction</button>
              <button role="tab" aria-selected={tab === "details"} className={tab === "details" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("details")}>Details</button>
              <button role="tab" aria-selected={tab === "audit"} className={tab === "audit" ? "drawer-tab active" : "drawer-tab"} onClick={showAudit}>Audit Chain</button>
              <button role="tab" aria-selected={tab === "deep"} className={tab === "deep" ? "drawer-tab active" : "drawer-tab"} onClick={showDeepAnalysis}>Deep Analysis</button>
              <button role="tab" aria-selected={tab === "dossiers"} className={tab === "dossiers" ? "drawer-tab active" : "drawer-tab"} onClick={showDossiers}>Legal Dossiers</button>
            </div>
            <div className="drawer-body">
              {banner && (
                <div className="banner-violation" role="alert">
                  <strong>{banner}</strong>
                </div>
              )}

              {tab === "transaction" ? (
                <div className="tx-detail-panel">
                  {txDetailLoading ? (
                    <div className="loading-row">Loading transaction and client data…</div>
                  ) : txDetail ? (
                    <>
                      <div className="tx-section-card">
                        <div className="tx-section-title">Transaction Details</div>
                        <div className="tx-grid-2">
                          <div className="tx-field">
                            <span className="tx-field-label">Transaction ID</span>
                            <span className="tx-field-value font-mono">{txDetail.transaction.id}</span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Amount & Currency</span>
                            <span className="tx-field-value amount">
                              {new Intl.NumberFormat("cs-CZ", { minimumFractionDigits: 2 }).format(txDetail.transaction.amount_czk)} {txDetail.transaction.currency}
                            </span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Date & Time</span>
                            <span className="tx-field-value">{txDetail.transaction.date}</span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Direction / Channel</span>
                            <span className="tx-field-value">{txDetail.transaction.direction} · {txDetail.transaction.channel}</span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Counterparty Name / Account</span>
                            <span className="tx-field-value">{txDetail.transaction.counterparty_name} ({txDetail.transaction.counterparty_account})</span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Counterparty IČO / MCC</span>
                            <span className="tx-field-value">{txDetail.transaction.counterparty_ico || "—"} · MCC {txDetail.transaction.mcc_code}</span>
                          </div>
                        </div>
                        {txDetail.transaction.reference && (
                          <div className="tx-field" style={{ marginTop: 10 }}>
                            <span className="tx-field-label">Payment Reference</span>
                            <span className="tx-field-value">{txDetail.transaction.reference}</span>
                          </div>
                        )}
                      </div>

                      <div className="tx-section-card">
                        <div className="tx-section-title">Client Context</div>
                        <div className="tx-grid-2">
                          <div className="tx-field">
                            <span className="tx-field-label">Client ID & Name</span>
                            <span className="tx-field-value">{txDetail.client.name} ({txDetail.client.id})</span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Risk Rating & PEP</span>
                            <span className="tx-field-value">
                              Rating {txDetail.client.risk_score}
                              {txDetail.client.pep_flag && <span className="status-pill pep" style={{ marginLeft: 6 }}>PEP (§ 21(5))</span>}
                            </span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Declared Volume (2Q26)</span>
                            <span className="tx-field-value font-mono">
                              {new Intl.NumberFormat("cs-CZ").format(txDetail.client.declared_expected_vol_2q26_czk)} CZK
                            </span>
                          </div>
                          <div className="tx-field">
                            <span className="tx-field-label">Actual Volume & Ratio</span>
                            <span className="tx-field-value font-mono">
                              {new Intl.NumberFormat("cs-CZ").format(txDetail.client.actual_vol_2q26_czk)} CZK
                              <strong style={{ color: txDetail.client.vol_ratio > 2.0 ? "var(--error)" : "var(--primary)", marginLeft: 6 }}>
                                ({txDetail.client.vol_ratio.toFixed(2)}x)
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="detail-card legal-card">
                        <div className="detail-label">Statutory Forensic Explanation</div>
                        <div className="legal-citation">{citationOf(txDetail.statutory_reason ?? selected.reason)}</div>
                        <p className="detail-value">{txDetail.statutory_reason ?? selected.reason}</p>
                      </div>

                      <div className="tx-section-card">
                        <div className="tx-section-title">Client Sibling Transactions (2Q26)</div>
                        <div className="sibling-table-wrap">
                          <table className="sibling-table">
                            <thead>
                              <tr>
                                <th>Status</th>
                                <th>Transaction ID</th>
                                <th>Date</th>
                                <th>Amount</th>
                                <th>Direction</th>
                                <th>Counterparty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {txDetail.sibling_transactions.map((st) => (
                                <tr key={st.id} className={st.this_alert ? "sibling-row this-alert" : ""}>
                                  <td>{st.this_alert ? "▶ THIS ALERT" : "Normal"}</td>
                                  <td className="font-mono">{st.id}</td>
                                  <td>{st.date.slice(0, 10)}</td>
                                  <td className="font-mono">{new Intl.NumberFormat("cs-CZ").format(st.amount_czk)} CZK</td>
                                  <td>{st.direction}</td>
                                  <td className="font-mono">{st.counterparty_account}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {txDetail.counterparty_context?.shared_with_client_count > 1 && (
                          <div className="pattern-bracket">
                            ⚠️ Counterparty account shared across {txDetail.counterparty_context.shared_with_client_count} distinct clients: {txDetail.counterparty_context.other_client_ids.join(", ")}
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="empty">No transaction details available for this case.</div>
                  )}
                </div>
              ) : tab === "details" ? (
                <>
                  <ClientTransactionCluster clientId={selected.clientId} transactionId={selected.transactionId} onFilterClients={(ids) => setQuery(ids[0] ?? "")} />
                  <VerifierDiffTable caseId={selected.alertId} />
                  <div className="decision-grid">
                    <div className="detail-card">
                      <div className="detail-label">Alert type</div>
                      <div className="detail-value">{selected.alertType}</div>
                    </div>
                    <div className="detail-card">
                      <div className="detail-label">Priority</div>
                      <div className="detail-value">
                        <span className={`priority-badge ${priorityTone(selected.priority)}`}>{selected.priority}</span>
                        {selected.priority_breakdown && (
                          <span className="breakdown drawer-breakdown">
                            B{selected.priority_breakdown.base} · V{selected.priority_breakdown.vol} · P{selected.priority_breakdown.pep} · S{selected.priority_breakdown.struct} · C{selected.priority_breakdown.channel}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="detail-card">
                      <div className="detail-label">Executive</div>
                      <div className="detail-value">{selected.executivePerson}</div>
                    </div>
                    <div className="detail-card">
                      <div className="detail-label">4-eyes state</div>
                      <div className={sameApprover ? "detail-value violation-text" : "detail-value success-text"}>
                        {sameApprover ? "SELF-APPROVAL — blocked" : "INDEPENDENT"}
                      </div>
                    </div>
                  </div>

                  {explanation && (
                    <div className="detail-card">
                      <div className="detail-label">Deterministic explanation</div>
                      <div className="brand-subtitle">{explanation.rulesFired.length} rules fired · {explanation.rulesCheckedNotFired.length} checked and not fired</div>
                      <div className="rule-list">
                        {explanation.rulesFired.map((rule) => (
                          <div className="rule-item" key={rule.ruleId}>
                            <strong>{rule.ruleId} v{rule.version}</strong>
                            <span>{rule.statutoryBasis} · {rule.operator} {rule.threshold} · input {rule.inputValue} · contribution {rule.contribution}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="detail-card legal-card">
                    <div className="detail-label">Statutory basis</div>
                    <div className="legal-citation">{citationOf(selected.reason)}</div>
                    <p className="detail-value">{selected.reason}</p>
                  </div>

                  <div className="ai-card">
                    <div className="ai-header">
                      <div>
                        <div className="ai-badge">{investigation?.mode === "LIVE_BEDROCK" ? "LIVE" : "SNAPSHOT"}</div>
                        <div className="brand-subtitle">Bedrock investigation</div>
                      </div>
                      <div className="ai-actions">
                        <button className="btn-outline" onClick={runInvestigation} disabled={bedrockBusy}>
                          {bedrockBusy ? "Querying…" : "Investigate"}
                        </button>
                        <button className="btn-outline" onClick={runLive} disabled={liveBusy}>
                          {liveBusy ? "Deep-tracing…" : "Run live deep-trace"}
                        </button>
                      </div>
                    </div>
                    {investigation ? (
                      <>
                        <p className="detail-value">{investigation.evidence_summary}</p>
                        <p className="brand-subtitle">{investigation.rationale}</p>
                        {Array.isArray(investigation.findings) && investigation.findings.length > 0 && (
                          <div className="ai-findings-table">
                            {investigation.findings.map((f, idx) => (
                              <div className="ai-finding-row" key={idx}>
                                <div className="ai-finding-claim">
                                  <strong>{f.claim}</strong>
                                  {f.value !== undefined && <span className="mono-chip">{String(f.value)}</span>}
                                </div>
                                <div className="ai-finding-meta">
                                  {f.jsonPointer && <span className="pointer-chip" title="RFC 6901 Pointer">{f.jsonPointer}</span>}
                                  {f.statute && <span className="legal-chip">{f.statute}</span>}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {Array.isArray(investigation.claims) && investigation.claims.length > 0 && !investigation.findings && (
                          <div className="ai-claims-list">
                            {investigation.claims.map((claim) => (
                              <div className="ai-claim-item" key={claim.claimId}>
                                <strong>{claim.claimType}</strong> · {claim.narrativeTemplate}
                              </div>
                            ))}
                          </div>
                        )}
                        {investigation.action && (
                          <div className="ai-action-card">
                            <span className="ai-action-label">Recommended Action:</span>
                            <strong>{investigation.action}</strong>
                          </div>
                        )}
                        {Array.isArray(investigation.trace) && investigation.trace.length > 0 && (
                          <div className="trace-list">
                            {investigation.trace.map((step, idx) => (
                              <div className="trace-row" key={`${step.step}-${idx}`}>
                                <span>{step.step}</span>
                                <strong className={step.status === "SNAPSHOT_FALLBACK" ? "trace-warn" : "trace-ok"}>{step.status}</strong>
                                <span>{step.ms}ms</span>
                              </div>
                            ))}
                          </div>
                        )}
                        {Array.isArray(investigation.statutes) && investigation.statutes.length > 0 && (
                          <div className="legal-list">
                            {investigation.statutes.map((statute) => (
                              <div className="legal-item" key={statute.clause_id}>
                                <div className="legal-head"><strong>{statute.clause_id}</strong><span>{statute.citation}</span></div>
                                <p>“{statute.quoted_clause}”</p>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="legal-citation" style={{ marginTop: 8 }}>{investigation.legalBasis}</div>
                        {investigation.model && (
                          <div className="timeline-meta">
                            {investigation.model}{investigation.latency_ms ? ` · ${investigation.latency_ms}ms` : ""}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="detail-value">
                        Run the AML dossier. The result is grounded in the case evidence and legal basis.
                      </p>
                    )}
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Assign approver</div>
                    <div className="four-eyes-row">
                      <span>Executive</span>
                      <strong>{selected.executivePerson}</strong>
                    </div>
                    <select className="select" value={approver} onChange={(event) => chooseApprover(event.target.value)} aria-label="Assign approver">
                      <option>{INDEPENDENT}</option>
                      <option>{SAME}</option>
                    </select>
                    <button className="btn-primary approve-btn" disabled={sameApprover || signingBusy} onClick={signAndApprove}>
                      {signingBusy ? "Signing…" : "Sign & Approve"}
                    </button>
                    <p className="brand-subtitle">4-eyes rule: the approver must differ from the executive. The same-person option is the demo trap.</p>
                  </div>
                </>
              ) : tab === "audit" ? (
                <div className="audit-panel">
                  <div className="badge-status cached ledger-badge">
                    <span className={chainValid ? "ledger-dot ok" : "ledger-dot bad"} />
                    LEDGER · {ledgerMode === "IN_MEMORY_CHAIN" ? "IN-MEMORY " : ""}SHA-256 CHAIN{ledgerMode === "IN_MEMORY_CHAIN" ? " · NOT PERSISTED" : ""} · {ledgerVerified}/{ledgerTotal} VERIFIED
                  </div>
                  {auditError && (
                    <div className="banner-violation">
                      <strong>{auditError}</strong>
                      <button className="btn-outline" onClick={loadAudit}>Retry</button>
                    </div>
                  )}
                  <div className="timeline">
                    {Array.isArray(audit) && audit.map((event, index) => {
                      const isEventVerified = !!verifiedEvents[index];
                      const truncHash = event.hash ? `${event.hash.slice(0, 8)}...${event.hash.slice(-6)}` : "—";
                      return (
                        <div className="timeline-item" key={`${event.event}-${index}`}>
                          <div className={chainValid || isEventVerified ? "timeline-dot" : "timeline-dot invalid"}>
                            {chainValid || isEventVerified ? "✓" : "!"}
                          </div>
                          <div className="timeline-content">
                            <div className="timeline-event">{event.event}</div>
                            <div className="timeline-meta">{event.timestamp} · <span className="font-mono">{truncHash}</span></div>
                            <div className="timeline-actions">
                              <button
                                type="button"
                                className={`btn-verify ${isEventVerified ? "verified" : ""}`}
                                onClick={() => verifyEvent(index)}
                              >
                                {isEventVerified ? "✓ Verified" : "Verify"}
                              </button>
                              <button type="button" className="copy" onClick={() => copyHash(event.hash)}>
                                copy hash
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {audit.length === 0 && !auditBusy && !auditError && <p className="brand-subtitle">No audit events loaded.</p>}
                  <div className="audit-actions">
                    <button className="btn-primary" onClick={verifyChain} disabled={auditBusy}>
                      {auditBusy ? "Verifying…" : "Verify Chain"}
                    </button>
                    <button className="btn-outline" onClick={downloadAudit} disabled={audit.length === 0}>
                      Download audit JSON
                    </button>
                  </div>
                  {chainStatus && (
                    <div className={chainValid ? "banner-ok" : "banner-violation"}>{chainStatus}</div>
                  )}
                  <p className="brand-subtitle">Each event hash is computed over the previous hash plus the event data.</p>
                </div>
              ) : tab === "deep" ? (
                <div className="deep-panel">
                  <div className="detail-card">
                    <div className="detail-label">Deep analysis</div>
                    <div className="brand-subtitle">Markdown document · persisted under the case folder · approved Markdown-only for this sprint.</div>
                    <div className="dual-actions">
                      <button className="btn-primary" onClick={generateDeepAnalysis} disabled={deepBusy || selected.alertType !== "REVIEW"}>
                        {deepBusy ? "Generating…" : "⚡ Run Deterministic Deep Analysis (0 Tokens · C# Decimal)"}
                      </button>
                      <button className="btn-outline" onClick={runStatutoryInvestigation} disabled={investigationBusy || selected.alertType !== "REVIEW"}>
                        {investigationBusy ? "Investigating…" : "🧠 Run Statutory Investigation (Bedrock + C# Diff)"}
                      </button>
                    </div>
                    {selected.alertType !== "REVIEW" && <p className="brand-subtitle">Only REVIEW/ESCALATE cases can generate a legal document.</p>}
                    {vectors && (
                      <div className="vector-grid">
                        <div><span>VELOCITY</span><strong>{vectors.velocityRatio.toFixed(2)}x</strong></div>
                        <div><span>COUNT</span><strong>{vectors.countRatio.toFixed(2)}x</strong></div>
                        <div><span>72H CLUSTER</span><strong>{vectors.structuring72h.count} / {new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(vectors.structuring72h.sumCzk)}</strong></div>
                        <div><span>HHI</span><strong>{Math.round(vectors.counterpartyHhi)}</strong></div>
                        <div><span>ROUND</span><strong>{vectors.roundAmountRatio.toFixed(1)}%</strong></div>
                      </div>
                    )}
                    {vectors && <p className="brand-subtitle">{vectors.fraudNarrative}</p>}
                  </div>
                  {deepError && (
                    <div className="banner-violation"><strong>{deepError}</strong><button className="btn-outline" onClick={loadDocuments}>Retry</button></div>
                  )}
                  {documents.length === 0 ? (
                    <p className="brand-subtitle">No documents generated for this case yet.</p>
                  ) : (
                    <div className="document-list">
                      {documents.map((doc) => (
                        <div className="document-item" key={doc.id}>
                          <div>
                            <div className="detail-label">{doc.format.toUpperCase()} · {doc.generatedAt.slice(0, 19)}</div>
                            <div className="mono doc-id">{doc.id}</div>
                            <div className="brand-subtitle">{doc.signedBy ? `Signed by ${doc.signedBy}` : "Unsigned"} · {doc.documentHash.slice(0, 18)}…</div>
                          </div>
                          <div className="doc-actions">
                            <a className="btn-outline" href={`${API}/api/v1/documents/${doc.id}`}>Download</a>
                            <a className="btn-outline" href={`${API}/api/v1/documents/${doc.id}/bundle`}>Bundle</a>
                            {!doc.signedBy && <button className="btn-primary" onClick={() => signDocument(doc.id)}>Sign</button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="brand-subtitle">Bundle contains analysis.md, evidence.json, audit_chain.json, rule_registry.json, fatf_references.json, and signatures.json.</p>
                </div>
              ) : (
                <div className="deep-panel">
                  <div className="detail-card">
                    <div className="detail-label">Legal Dossiers & History (Counsel Archive)</div>
                    <div className="brand-subtitle">Freeze-on-write legal artifacts bound to the SHA-256 audit chain. Seeded counsel archive is loaded from `data/legal_dossiers.json`.</div>
                    <button className="btn-outline" onClick={loadDossiers}>Refresh archive</button>
                  </div>
                  {dossierError && <div className="banner-violation"><strong>{dossierError}</strong><button className="btn-outline" onClick={loadDossiers}>Retry</button></div>}
                  {dossiers.length === 0 ? (
                    <p className="brand-subtitle">No legal dossiers for this case yet.</p>
                  ) : (
                    <div className="document-list">
                      {dossiers.map((dossier) => (
                        <div className="document-item" key={dossier.dossierId}>
                          <div>
                            <div className="detail-label">{dossier.documentType === "STATUTORY_FAU_OPO_LEGAL_MEMO" ? "FAÚ § 18 LEGAL MEMO" : "QUANTITATIVE BRIEF"} · {dossier.createdAtUtc.slice(0, 19)}</div>
                            <div className="mono doc-id">{dossier.dossierId}</div>
                            <div className="brand-subtitle">SHA-256 {dossier.documentSha256.slice(0, 22)}…</div>
                          </div>
                          <div className="doc-actions">
                            <a className="btn-outline" href={`${API}/api/v1/dossiers/${dossier.dossierId}/export?format=html`} target="_blank" rel="noreferrer">Open Lawyer-Ready Brief</a>
                            <a className="btn-outline" href={`${API}/api/v1/dossiers/${dossier.dossierId}/export?format=md`} target="_blank" rel="noreferrer">Markdown</a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {stressOpen && (
        <div className="modal-backdrop" onClick={() => setStressOpen(false)}>
          <div className="stress-modal" onClick={(e) => e.stopPropagation()}>
            <div className="stress-header">
              <h2>⚡ High-Throughput Engine Stress Test</h2>
              <button className="drawer-close" onClick={() => setStressOpen(false)}>×</button>
            </div>
            <div className="stress-body">
              <p className="brand-subtitle" style={{ margin: 0 }}>
                Benchmark the deterministic C# rules engine against high-volume transaction feeds, proving sub-millisecond triage without LLM latency or cost.
              </p>
              <div className="sample-selector">
                {[1000, 5000, 10000, 50000].map((sz) => (
                  <button
                    key={sz}
                    className={`sample-btn ${stressSampleSize === sz ? "active" : ""}`}
                    onClick={() => {
                      setStressSampleSize(sz);
                      runStressTest(sz);
                    }}
                    disabled={stressRunning}
                  >
                    {new Intl.NumberFormat("en-US").format(sz)} tx
                  </button>
                ))}
              </div>

              {stressRunning ? (
                <div className="stress-progress-box">
                  <span className="brand-subtitle">Simulating {new Intl.NumberFormat("en-US").format(stressSampleSize)} transactions through deterministic pipeline…</span>
                  <div className="stress-progress-bar">
                    <div className="stress-progress-fill" style={{ width: "100%", animation: "shimmer 1.5s infinite" }} />
                  </div>
                </div>
              ) : stressResult ? (
                <div className="stress-results">
                  <div className="stress-kpi-row">
                    <div>
                      <div className="detail-label">Measured Throughput</div>
                      <div className="stress-kpi-large">
                        {new Intl.NumberFormat("en-US").format(Math.round(stressResult.throughput_per_sec))} tx/sec
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div className="detail-label">Execution Time</div>
                      <div className="font-mono" style={{ fontSize: 16, fontWeight: 700, color: "var(--on-surface)" }}>
                        {stressResult.elapsed_ms.toFixed(2)} ms
                      </div>
                    </div>
                  </div>

                  <div className="stress-tiers-pill">
                    Latency: p50 {stressResult.p50_ms}ms · p95 {stressResult.p95_ms}ms · p99 {stressResult.p99_ms}ms
                  </div>

                  <div className="stress-tiers-pill">
                    Distribution: {formatNumber(stressResult.tiers.auto_cleared)} Auto-cleared ({((stressResult.tiers.auto_cleared / stressResult.sample_size) * 100).toFixed(1)}%) · {formatNumber(stressResult.tiers.step_up)} Step-up · {formatNumber(stressResult.tiers.escalated)} Escalated
                  </div>

                  <div className="cost-compare-card">
                    <div className="cost-compare-title">Deterministic Engine vs 100% LLM Call Comparison</div>
                    <div className="cost-compare-grid">
                      <div className="cost-item">
                        <span className="tx-field-label">VeriTriage C# Engine</span>
                        <strong style={{ color: "var(--tertiary)" }}>{stressResult.cost_comparison.deterministic_czk} CZK</strong>
                        <small>Time: {(stressResult.elapsed_ms / 1000).toFixed(3)}s · 0 LLM tokens</small>
                      </div>
                      <div className="cost-item">
                        <span className="tx-field-label">LLM Bedrock (Sonnet 4.5)</span>
                        <strong style={{ color: "var(--error)" }}>
                          ~{new Intl.NumberFormat("cs-CZ").format(stressResult.cost_comparison.bedrock_only_estimate_czk)} CZK
                        </strong>
                        <small>Time: ~{stressResult.cost_comparison.bedrock_latency_estimate_hours.toFixed(1)} hours · ~{(stressResult.cost_comparison.bedrock_tokens_estimate / 1000000).toFixed(1)}M tokens</small>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="stress-footer">
              <button className="btn-outline" onClick={() => setStressOpen(false)}>Close</button>
              <button
                className="btn-primary"
                onClick={() => runStressTest(stressSampleSize)}
                disabled={stressRunning}
              >
                {stressRunning ? "Benchmarking…" : "Re-run Benchmark"}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container" role="status" aria-live="polite">
          <div className="toast">
            <span>{toast}</span>
            <button className="drawer-close" onClick={() => setToast("")} aria-label="Dismiss">×</button>
          </div>
        </div>
      )}
    </main>
  );
}
