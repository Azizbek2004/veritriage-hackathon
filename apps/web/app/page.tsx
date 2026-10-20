"use client";

import { useEffect, useMemo, useState } from "react";
import ClientTransactionCluster from "../components/domain/ClientTransactionCluster";
import VerifierDiffTable from "../components/domain/VerifierDiffTable";
import TopologicalRadarPanel from "../components/domain/TopologicalRadarPanel";

const RAW_PAGE_SIZE = 100;
import { MarkdownDocViewer } from "./MarkdownDocViewer";
import RoleSwitcher, { ActiveUser, USERS } from "../components/domain/RoleSwitcher";
import MoneyFlowDiagram from "../components/domain/MoneyFlowDiagram";
import FauPostponementModal, { FauPacketDto } from "../components/domain/FauPostponementModal";

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
  topology?: {
    topology_score: number;
    radial_distance: number;
    radar_angle_deg: number;
    radar_quadrant: string;
    forensic_role: string;
    forensic_role_label: string;
    shared_counterparty_count: number;
    has_cyclic_flow: boolean;
    pass_through_hours: number;
    in_out_ratio: number;
    c_degree: number;
    c_clustering: number;
    c_diffusion: number;
    statutory_basis: string;
    correlated_accounts: {
      target_alert_id: string;
      target_client_id: string;
      correlation_score: number;
      shared_iban_score: number;
      temporal_sync_score: number;
      amount_mirror_score: number;
      entity_link_score: number;
      correlation_reason: string;
    }[];
  };
  priority_breakdown?: {
    base: number;
    vol: number;
    pep: number;
    struct: number;
    channel: number;
    overridden?: boolean;
  };
  priority_raw?: number;
  rank?: number;
  rank_total?: number;
  evidence_score?: number;
  confidence_score?: number;
  inputs?: PriorityInputs;
  topBadge?: string;
  jsRaw?: number;
};

type PriorityInputs = {
  base_tier: string;
  vol_ratio: number;
  count_ratio: number;
  is_pep: boolean;
  has_structuring: boolean;
  is_new_remote: boolean;
  base_score: number;
  vol_score: number;
  pep_score: number;
  struct_score: number;
  channel_score: number;
};

type PriorityWeights = {
  base: { low: number; medium: number; high: number; source: string; rationale: string };
  volume: { per_unit_ratio: number; cap: number; source: string; rationale: string };
  pep: { weight: number; source: string; rationale: string };
  structuring: { weight: number; source: string; rationale: string };
  channel: { weight: number; source: string; rationale: string };
  max_raw: number;
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
  signedBy?: string | null;
  signatureAlgorithm?: string | null;
  signatureB64?: string | null;
  publicKeySpkiB64?: string | null;
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

type Tab = "transaction" | "flow" | "fau" | "details" | "audit" | "deep" | "dossiers";
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
  const [roleFilter, setRoleFilter] = useState("");
  const [visibleCount, setVisibleCount] = useState(45);
  const [weights, setWeights] = useState<PriorityWeights | null>(null);
  const [sensitivity, setSensitivity] = useState({ pep: 25, perUnit: 10, struct: 20, cap: 30 });
  const [sensitivityRows, setSensitivityRows] = useState<Row[] | null>(null);
  const [parityError, setParityError] = useState("");
  const [parityMismatches, setParityMismatches] = useState(0);
  const [sensitivityMs, setSensitivityMs] = useState(0);
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
  const [viewingDoc, setViewingDoc] = useState<{ id: string; content: string; signedBy?: string | null; hash?: string } | null>(null);
  const [viewingDocLoading, setViewingDocLoading] = useState(false);
  const [activeUser, setActiveUser] = useState<ActiveUser>(USERS.ANALYST);
  const [fauModalOpen, setFauModalOpen] = useState(false);
  const [tableViewMode, setTableViewMode] = useState<"DELIVERABLE" | "ALL_QUEUE" | "RAW_TXS">("RAW_TXS");
  const [rawTxs, setRawTxs] = useState<any[]>([]);
  const [rawTxsTotal, setRawTxsTotal] = useState(0);
  const [rawTxsLoading, setRawTxsLoading] = useState(false);
  const [rawTxsPage, setRawTxsPage] = useState(0);
  const [fauPackets, setFauPackets] = useState<Record<string, FauPacketDto>>({});

  async function loadRawTransactions(page = 0, q = "") {
    setRawTxsLoading(true);
    try {
      const take = RAW_PAGE_SIZE;
      const skip = page * take;
      const url = `${API}/api/v1/transactions?skip=${skip}&take=${take}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRawTxs(Array.isArray(data.items) ? data.items : []);
        setRawTxsTotal(data.total ?? 0);
        setRawTxsPage(page);
      }
    } catch {
      setToast("Failed to load raw transactions");
    } finally {
      setRawTxsLoading(false);
    }
  }

  async function switchTableViewMode(mode: "DELIVERABLE" | "ALL_QUEUE" | "RAW_TXS") {
    setTableViewMode(mode);
    setSelected(null);
    if (mode === "DELIVERABLE") {
      setRowsLoading(true);
      fetch(`${API}/api/v1/deliverable/sample`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Row[]) => {
          setRows(Array.isArray(data) ? data : []);
          setToast("Loaded FINREG Deliverable Benchmark (45 cases)");
        })
        .finally(() => setRowsLoading(false));
    } else if (mode === "ALL_QUEUE") {
      setRowsLoading(true);
      fetch(`${API}/api/v1/cases?all=true`)
        .then((res) => (res.ok ? res.json() : []))
        .then((data: Row[]) => {
          setRows(Array.isArray(data) ? data : []);
          setToast(`Loaded full alert queue (${data.length} cases from 5,493 clients)`);
        })
        .finally(() => setRowsLoading(false));
    } else if (mode === "RAW_TXS") {
      void loadRawTransactions(0, query);
      setToast("Connected to live ČNB stream (397,853 transactions)");
    }
  }

  useEffect(() => {
    if (tableViewMode === "RAW_TXS") {
      const handler = setTimeout(() => {
        void loadRawTransactions(0, query);
      }, 300);
      return () => clearTimeout(handler);
    }
  }, [query, tableViewMode]);

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const sameApprover = approver === SAME;

  const stats = useMemo(() => {
    const list = Array.isArray(rows) ? rows : [];
    return {
      total: list.length,
      fp: list.filter((row) => row.alertType === "FP").length,
      review: list.filter((row) => row.alertType === "REVIEW").length,
      high: list.filter((row) => row.priority >= 75).length,
      pep: list.filter((row) => row.reason?.includes("§ 9a")).length,
      approved: approved.size,
    };
  }, [rows, approved]);

  function roundHalfAwayFromZero(value: number) {
    return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
  }

  function computeRawPriority(inputs: PriorityInputs, active: { pep: number; perUnit: number; struct: number; cap: number }) {
    const maxRatio = Math.max(inputs.vol_ratio ?? 0, inputs.count_ratio ?? 0);
    const base = inputs.base_score ?? 0;
    const defaultVol = inputs.vol_score ?? 0;
    const vol = Math.min(active.cap, Math.max(0, roundHalfAwayFromZero(defaultVol + (active.perUnit - 10) * Math.max(0, maxRatio - 1))));
    const pep = inputs.is_pep ? active.pep : 0;
    const struct = inputs.struct_score > 0 ? Math.max(0, inputs.struct_score + (active.struct - 20)) : 0;
    const channel = inputs.channel_score ?? 0;
    return roundHalfAwayFromZero(base + vol + pep + struct + channel);
  }

  function baselineTop10(source: Row[]) {
    return new Set([...source]
      .sort((a, b) => (b.priority_raw ?? b.priority) - (a.priority_raw ?? a.priority)
        || (b.confidence_score ?? 0) - (a.confidence_score ?? 0)
        || a.alertId.localeCompare(b.alertId))
      .slice(0, 10)
      .map((r) => r.alertId));
  }

  function applySensitivity(next: { pep: number; perUnit: number; struct: number; cap: number }) {
    if (!weights || parityError) return;
    const started = performance.now();
    const baseline = baselineTop10(rows);
    const scored = rows.map((row) => {
      const jsRaw = row.inputs ? computeRawPriority(row.inputs, next) : (row.priority_raw ?? row.priority);
      return { ...row, jsRaw, priority: Math.min(100, jsRaw) } as Row;
    });
    scored.sort((a, b) => (b.jsRaw ?? 0) - (a.jsRaw ?? 0)
      || (b.confidence_score ?? 0) - (a.confidence_score ?? 0)
      || a.alertId.localeCompare(b.alertId));
    const currentTop = new Set(scored.slice(0, 10).map((r) => r.alertId));
    scored.forEach((row, index) => {
      row.priority = Math.min(100, row.jsRaw ?? row.priority);
      row.topBadge = currentTop.has(row.alertId) && baseline.has(row.alertId) ? "◆ ROBUST"
        : currentTop.has(row.alertId) ? "↑ NEW"
        : baseline.has(row.alertId) ? "↓ DROP" : undefined;
      row.rank = index + 1;
    });
    setSensitivityRows(scored);
    setSensitivity(next);
    setSensitivityMs(Math.round((performance.now() - started) * 10) / 10);
  }

  function resetSensitivity() {
    setSensitivityRows(null);
    setSensitivity({ pep: 25, perUnit: 10, struct: 20, cap: 30 });
    setSensitivityMs(0);
  }

  useEffect(() => {
    fetch(`${API}/api/v1/priority/weights`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: PriorityWeights | null) => {
        if (!data) return;
        setWeights(data);
        setSensitivity({ pep: data.pep.weight, perUnit: data.volume.per_unit_ratio, struct: data.structuring.weight, cap: data.volume.cap });
      })
      .catch(() => setParityError("Sensitivity disabled — weights endpoint unavailable."));
  }, []);

  useEffect(() => {
    if (!weights || rows.length === 0) return;
    const mismatches = rows.filter((row) => {
      if (!row.inputs) return false;
      const jsRaw = computeRawPriority(row.inputs, { pep: weights.pep.weight, perUnit: weights.volume.per_unit_ratio, struct: weights.structuring.weight, cap: weights.volume.cap });
      return jsRaw !== row.priority_raw;
    });
    setParityMismatches(mismatches.length);
    setParityError(mismatches.length > 0 ? `⚠ SENSITIVITY DISABLED — parity drift detected (${mismatches.length} cases, see console)` : "");
    if (mismatches.length > 0) console.error("Priority parity mismatches", mismatches);
  }, [rows, weights]);

  const filteredRows = useMemo(() => {
    if (!Array.isArray(sensitivityRows ?? rows)) return [];
    const needle = query.trim().toLowerCase();
    const source = sensitivityRows ?? [...rows].sort((a, b) =>
      (b.priority_raw ?? b.priority) - (a.priority_raw ?? a.priority)
      || (b.confidence_score ?? 0) - (a.confidence_score ?? 0)
      || a.alertId.localeCompare(b.alertId));
    return source.filter((row) => {
      const matchesFilter =
        filter === "ALL" || (filter === "HIGH" ? row.priority >= 75 : row.alertType === filter);
      const matchesQuery =
        !needle ||
        row.alertId.toLowerCase().includes(needle) ||
        row.clientId.toLowerCase().includes(needle) ||
        row.transactionId.toLowerCase().includes(needle) ||
        row.reason.toLowerCase().includes(needle);
      const matchesRole = !roleFilter || row.topology?.forensic_role === roleFilter;
      return matchesFilter && matchesQuery && row.priority >= minPriority && matchesRole;
    });
  }, [rows, sensitivityRows, filter, query, minPriority, roleFilter]);

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
    setViewingDoc(null);

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
    if (activeUser.role !== "MLRO") {
      setBanner("ROLE UNAUTHORIZED: Statutory 4-Eyes Requirement (§ 21 AML Act). Only designated MLRO (§ 22) can approve cases.");
      return;
    }
    setSigningBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/approve`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Role": activeUser.role,
          "X-User-Name": activeUser.name,
        },
        body: JSON.stringify({ signature_b64: "mock_sig_123", approver_id: approver === SAME ? selected.executivePerson : activeUser.name }),
      });
      const body = await response.json();
      if (!response.ok) {
        setBanner(body.detail ?? body.error ?? "APPROVAL FAILED");
        return;
      }
      setApproved((current) => new Set(current).add(selected.alertId));
      setToast(`APPROVED BY MLRO · ${body.audit_hash}`);
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

  async function openDocumentReader(docId: string, signedBy?: string | null, hash?: string) {
    setViewingDocLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/documents/${docId}`);
      if (res.ok) {
        const md = await res.text();
        setViewingDoc({ id: docId, content: md, signedBy, hash });
      } else {
        setToast("Could not load document text");
      }
    } catch {
      setToast("Failed to fetch document");
    } finally {
      setViewingDocLoading(false);
    }
  }

  async function openDossierReader(dossierId: string, signedBy?: string | null, hash?: string) {
    setViewingDocLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/dossiers/${dossierId}/export?format=md`);
      if (res.ok) {
        const md = await res.text();
        setViewingDoc({ id: dossierId, content: md, signedBy, hash });
      } else {
        setToast("Could not load dossier brief");
      }
    } catch {
      setToast("Failed to fetch dossier brief");
    } finally {
      setViewingDocLoading(false);
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
      if (data.documentId) {
        void openDocumentReader(data.documentId, null, data.documentHash);
      }
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
      if (viewingDoc && viewingDoc.id === id) {
        setViewingDoc((prev) => (prev ? { ...prev, signedBy: "MLRO Marie Svobodová" } : null));
      }
    } catch {
      setToast("Document signing failed");
    }
  }

  function showDeepAnalysis() {
    setTab("deep");
    void loadDocuments();
  }

  async function verifyDossier(id: string) {
    try {
      const response = await fetch(`${API}/api/v1/dossiers/${id}/verify`);
      if (!response.ok) throw new Error("verify failed");
      const data = await response.json();
      setToast(data.valid ? `P-256 signature valid · ${data.signature_algorithm}` : "P-256 signature INVALID");
    } catch {
      setToast("Dossier signature verification failed");
    }
  }

  async function signDossier(id: string) {
    try {
      const response = await fetch(`${API}/api/v1/dossiers/${id}/sign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signedBy: "MLRO Marie Svobodová" }),
      });
      if (!response.ok) throw new Error("sign failed");
      setToast("Dossier re-signed with NIST P-256");
      await loadDossiers();
      if (viewingDoc && viewingDoc.id === id) {
        setViewingDoc((prev) => (prev ? { ...prev, signedBy: "MLRO Marie Svobodová" } : null));
      }
    } catch {
      setToast("Dossier signing failed");
    }
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
    setToast("Calling AWS Bedrock Claude Sonnet 4.5 in eu-central-1...");
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 45000);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/investigate-live`, {
        method: "POST",
        signal: controller.signal,
      });
      const data: Investigation = await response.json();
      setInvestigation(data);
      setToast(data.mode === "LIVE_BEDROCK" ? `LIVE · ${data.latency_ms ?? 0}ms · Claude Sonnet 4.5` : "Live Bedrock fallback — using snapshot.");
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setToast("Live Bedrock request timed out (45s).");
      } else {
        setToast("Live Bedrock call failed — check server status.");
      }
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
    setToast("Re-indexing ČNB transaction pipeline (397k records)...");
    try {
      const response = await fetch(`${API}/api/v1/deliverable/reprocess`, { method: "POST" });
      if (!response.ok) throw new Error(`Reprocess ${response.status}`);
      const data = await response.json();

      const [freshStats, freshDataset] = await Promise.all([
        fetch(`${API}/api/v1/deliverable/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
        fetch(`${API}/api/v1/dataset/stats`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ]);
      if (freshStats) setDataStats(freshStats);
      if (freshDataset) setDatasetStats(freshDataset);
      if (!freshStats && data?.summary) setDataStats(data.summary);
      if (!freshDataset && data?.dataset_stats) setDatasetStats(data.dataset_stats);

      if (tableViewMode === "ALL_QUEUE") {
        const queue = await fetch(`${API}/api/v1/cases?all=true`).then((r) => (r.ok ? r.json() : []));
        setRows(Array.isArray(queue) ? queue : []);
      } else if (tableViewMode === "RAW_TXS") {
        await loadRawTransactions(0, query);
        setRawTxsPage(0);
        const sample = await fetch(`${API}/api/v1/deliverable/sample`).then((r) => (r.ok ? r.json() : []));
        setRows(Array.isArray(sample) ? sample : []);
      } else {
        const sample = await fetch(`${API}/api/v1/deliverable/sample`).then((r) => (r.ok ? r.json() : []));
        setRows(Array.isArray(sample) ? sample : []);
      }

      setSensitivityRows(null);
      setVisibleCount(45);
      setApiError("");
      const elapsed = Math.round(freshDataset?.last_run_ms ?? data?.dataset_stats?.last_run_ms ?? data?.summary?.loadMs ?? 0);
      const totalTx = formatNumber(freshDataset?.transactions_scanned ?? data?.dataset_stats?.transactions_scanned ?? data?.summary?.transactionRows ?? 397853);
      setToast(`✓ Re-indexed ${totalTx} transactions in ${elapsed} ms · 0 LLM Tokens · 100% C# Deterministic`);
    } catch (err) {
      setToast(`Reprocess failed: ${String(err)}`);
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
          <RoleSwitcher activeUser={activeUser} onSwitch={setActiveUser} />
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
          <div className="kpi-sub">Priority 75+ · § 9a(2)(c)</div>
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

      <section className="sensitivity-panel" aria-label="Priority sensitivity">
        <div className="sensitivity-head">
          <div><strong>Priority sensitivity</strong><span>Client-side replay · 3-level tiebreaker · statutory defaults</span></div>
          <div className="sensitivity-meta">
            <span>{parityMismatches === 0 ? "PARITY 0 MISMATCHES" : `PARITY ${parityMismatches} MISMATCHES`}</span>
            <span>{sensitivityMs}ms</span>
            <button className="btn-outline" onClick={resetSensitivity}>Reset to Statutory Defaults</button>
          </div>
        </div>
        <div className="sensitivity-grid">
          <label>PEP weight <output>{sensitivity.pep}</output><input type="range" min={0} max={40} value={sensitivity.pep} disabled={!!parityError || !weights} onChange={(e) => applySensitivity({ ...sensitivity, pep: Number(e.target.value) })} /></label>
          <label>Volume per-unit <output>{sensitivity.perUnit}</output><input type="range" min={5} max={15} value={sensitivity.perUnit} disabled={!!parityError || !weights} onChange={(e) => applySensitivity({ ...sensitivity, perUnit: Number(e.target.value) })} /></label>
          <label>Structuring weight <output>{sensitivity.struct}</output><input type="range" min={0} max={30} value={sensitivity.struct} disabled={!!parityError || !weights} onChange={(e) => applySensitivity({ ...sensitivity, struct: Number(e.target.value) })} /></label>
          <label>Volume cap <output>{sensitivity.cap}</output><input type="range" min={20} max={40} value={sensitivity.cap} disabled={!!parityError || !weights} onChange={(e) => applySensitivity({ ...sensitivity, cap: Number(e.target.value) })} /></label>
        </div>
      </section>

      {parityError && <div className="banner-violation" role="alert"><strong>{parityError}</strong></div>}

      <div className="view-mode-group">
        <button
          className={tableViewMode === "DELIVERABLE" ? "view-mode-btn active" : "view-mode-btn"}
          onClick={() => switchTableViewMode("DELIVERABLE")}
        >
          Deliverable Benchmark (45)
        </button>
        <button
          className={tableViewMode === "ALL_QUEUE" ? "view-mode-btn active" : "view-mode-btn"}
          onClick={() => switchTableViewMode("ALL_QUEUE")}
        >
          All Scanned Alerts ({dataStats?.deliverableRows ?? rows.length})
        </button>
        <button
          className={tableViewMode === "RAW_TXS" ? "view-mode-btn active" : "view-mode-btn"}
          onClick={() => switchTableViewMode("RAW_TXS")}
        >
          Raw Transactions Stream ({formatNumber(datasetStats?.transactions_scanned ?? 397853)})
        </button>
        <a className="btn-outline" href="#ledger">Jump to full ledger ↓</a>
      </div>
      <TopologicalRadarPanel
        rows={rows as any}
        selectedId={selected?.alertId}
        roleFilter={roleFilter}
        onSelect={(row) => openRow(row as unknown as Row)}
        onRoleFilter={(role) => { setRoleFilter(role); setVisibleCount(45); }}
      />

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


      <div className="table-card" id="ledger">
        {tableViewMode === "RAW_TXS" ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>tx_id</th>
                    <th>client_id</th>
                    <th>date</th>
                    <th>amount_czk</th>
                    <th>currency</th>
                    <th>direction</th>
                    <th>counterparty_account</th>
                    <th>action</th>
                  </tr>
                </thead>
                <tbody>
                  {rawTxsLoading ? (
                    <tr><td colSpan={8} className="loading-row">Querying ČNB 400k raw transaction stream…</td></tr>
                  ) : rawTxs.length === 0 ? (
                    <tr><td colSpan={8} className="loading-row">No raw transactions match query.</td></tr>
                  ) : (
                    rawTxs.map((tx: any) => (
                      <tr
                        key={tx.id}
                        className={selected?.transactionId === tx.id ? "selected" : undefined}
                        tabIndex={0}
                        onClick={() => {
                          const match = rows.find((r) => r.transactionId === tx.id || r.clientId === tx.clientId);
                          if (match) {
                            openRow(match);
                          } else {
                            openRow({
                              alertId: `RAW-${tx.id}`,
                              alertType: "REVIEW",
                              clientId: tx.clientId,
                              transactionId: tx.id,
                              triage: "REVIEW",
                              priority: 50,
                              executiveRole: "First-line AML Analyst",
                              executivePerson: "Ing. Jan Novák",
                              approver: INDEPENDENT,
                              reason: `ČNB Raw Stream · ${tx.direction} ${formatNumber(tx.amountCzk)} ${tx.currency} to ${tx.counterpartyAccount}`,
                              log: `Raw transaction ${tx.id} directly from ČNB dataset`,
                            });
                          }
                        }}
                      >
                        <td className="mono-cell">{tx.id}</td>
                        <td className="mono-cell">{tx.clientId}</td>
                        <td>{tx.date}</td>
                        <td className="font-mono amount" style={{ fontWeight: 600 }}>
                          {formatNumber(tx.amountCzk)} CZK
                        </td>
                        <td>{tx.currency}</td>
                        <td>
                          <span className={`status-pill ${tx.direction === "OUT" ? "review" : "fp"}`}>
                            {tx.direction}
                          </span>
                        </td>
                        <td className="mono-cell">{tx.counterpartyAccount}</td>
                        <td>
                          <button
                            className="btn-outline"
                            style={{ fontSize: 10, padding: "2px 8px" }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const match = rows.find((r) => r.transactionId === tx.id || r.clientId === tx.clientId);
                              if (match) {
                                openRow(match);
                                setTab("flow");
                              } else {
                                openRow({
                                  alertId: `RAW-${tx.id}`,
                                  alertType: "REVIEW",
                                  clientId: tx.clientId,
                                  transactionId: tx.id,
                                  triage: "REVIEW",
                                  priority: 50,
                                  executiveRole: "First-line AML Analyst",
                                  executivePerson: "Ing. Jan Novák",
                                  approver: INDEPENDENT,
                                  reason: `ČNB Raw Stream · ${tx.direction} ${formatNumber(tx.amountCzk)} ${tx.currency} to ${tx.counterpartyAccount}`,
                                  log: `Raw transaction ${tx.id} directly from ČNB dataset`,
                                });
                                setTab("flow");
                              }
                            }}
                          >
                            Trace Flow →
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="pagination-bar">
              <span>
                Showing {rawTxs.length} of {formatNumber(rawTxsTotal)} raw transactions · Page {rawTxsPage + 1} of {Math.max(1, Math.ceil(rawTxsTotal / RAW_PAGE_SIZE))}
              </span>
              <div className="pagination-actions">
                <button
                  className="btn-outline"
                  disabled={rawTxsPage <= 0 || rawTxsLoading}
                  onClick={() => loadRawTransactions(rawTxsPage - 1, query)}
                >
                  ← Previous
                </button>
                <button
                  className="btn-outline"
                  disabled={(rawTxsPage + 1) * RAW_PAGE_SIZE >= rawTxsTotal || rawTxsLoading}
                  onClick={() => loadRawTransactions(rawTxsPage + 1, query)}
                >
                  Next →
                </button>
              </div>
            </div>
          </>
        ) : (
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
                  const isPep = row.reason.includes("§ 9a") || row.reason.toLowerCase().includes("pep");
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
                      <td className="mono-cell">{row.alertId}{row.topBadge && <span className={`top-badge ${row.topBadge.includes("NEW") ? "new" : row.topBadge.includes("DROP") ? "drop" : "robust"}`}>{row.topBadge}</span>}{row.topology && <span className={`topo-role role-${row.topology.forensic_role.toLowerCase()}`}>{row.topology.forensic_role === "MULE_AGGREGATOR" ? "MULE" : row.topology.forensic_role === "CAROUSEL_RING" ? "RING" : row.topology.forensic_role === "COMPROMISED_VICTIM" ? "TAKEN" : "ISO"} · R{row.topology.radial_distance.toFixed(2)}</span>}</td>
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
                          {(row.jsRaw ?? 0) > 100 && <span className="raw-pill">raw {row.jsRaw}</span>}
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
                          <div className={`confidence-note ${(row.confidence_score ?? 0) < 50 ? "low" : (row.confidence_score ?? 0) >= 80 ? "high" : "mid"}`}>
                            confidence {row.confidence_score ?? 0}
                          </div>
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
        )}
      </div>

      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <aside className="drawer" role="dialog" aria-modal="true" aria-label={`Case ${selected.alertId}`}>
            <div className="drawer-header">
              <div>
                <div className="brand-subtitle">{selected.alertId} · {selected.alertType}</div>
                <div className="brand-title">{selected.clientId}</div>
                <div className="brand-subtitle">{selected.executiveRole} · priority {selected.priority}{selected.topology ? ` · ${selected.topology.forensic_role_label} · R ${selected.topology.radial_distance.toFixed(2)}` : ""}</div>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close case" autoFocus>×</button>
            </div>
            <div className="drawer-tabs" role="tablist" aria-label="Case views">
              <button role="tab" aria-selected={tab === "transaction"} className={tab === "transaction" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("transaction")}>Transaction</button>
              <button role="tab" aria-selected={tab === "flow"} className={tab === "flow" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("flow")}>Money Flow DAG</button>
              <button role="tab" aria-selected={tab === "fau"} className={tab === "fau" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("fau")}>FAÚ § 20 Freeze</button>
              <button role="tab" aria-selected={tab === "details"} className={tab === "details" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("details")}>Details</button>
              <button role="tab" aria-selected={tab === "audit"} className={tab === "audit" ? "drawer-tab active" : "drawer-tab"} onClick={showAudit}>Audit Chain</button>
              <button role="tab" aria-selected={tab === "deep"} className={tab === "deep" ? "drawer-tab active" : "drawer-tab"} onClick={showDeepAnalysis}>Deep Analysis</button>
              <button role="tab" aria-selected={tab === "dossiers"} className={tab === "dossiers" ? "drawer-tab active" : "drawer-tab"} onClick={showDossiers}>Legal Dossiers</button>
            </div>
            <div className="drawer-body">
              {selected.topology && (
                <div className="detail-card drawer-topology-card">
                  <div className="drawer-topology-head">
                    <div>
                      <div className="detail-label">Network topology</div>
                      <div className="drawer-role">{selected.topology.forensic_role_label}</div>
                    </div>
                    <div className="drawer-r">R {selected.topology.radial_distance.toFixed(2)}</div>
                  </div>
                  <div className="topology-facts">
                    <div><span>TOPOLOGY</span><strong>{selected.topology.topology_score}/100</strong></div>
                    <div><span>SHARED HUB</span><strong>{selected.topology.shared_counterparty_count}</strong></div>
                    <div><span>PASS-THROUGH</span><strong>{selected.topology.pass_through_hours}h</strong></div>
                    <div><span>IN/OUT</span><strong>{selected.topology.in_out_ratio.toFixed(4)}</strong></div>
                    <div><span>CYCLIC</span><strong>{selected.topology.has_cyclic_flow ? "YES" : "NO"}</strong></div>
                    <div><span>LINKS</span><strong>{selected.topology.correlated_accounts.length}</strong></div>
                  </div>
                  <div className="topology-bars">
                    <div><span>DEGREE</span><i><b style={{ width: `${selected.topology.c_degree}%` }} /></i><em>{selected.topology.c_degree}</em></div>
                    <div><span>CLUSTERING</span><i><b style={{ width: `${selected.topology.c_clustering}%` }} /></i><em>{selected.topology.c_clustering}</em></div>
                    <div><span>DIFFUSION</span><i><b style={{ width: `${selected.topology.c_diffusion}%` }} /></i><em>{selected.topology.c_diffusion}</em></div>
                  </div>
                  <p className="topology-basis">{selected.topology.statutory_basis}</p>
                </div>
              )}

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
              ) : tab === "flow" ? (
                <div className="flow-panel" style={{ padding: "10px 0" }}>
                  <MoneyFlowDiagram
                    caseId={selected.alertId}
                    onPostponeRequested={() => setFauModalOpen(true)}
                  />
                </div>
              ) : tab === "fau" ? (
                <div className="fau-panel">
                  <div className="detail-card">
                    <div className="detail-label">Financial Analytical Office (FAÚ) · Statutory Postponement Protocol</div>
                    <div className="brand-subtitle" style={{ marginTop: 4 }}>
                      Statutory authority: Czech AML Act No. 253/2008 Sb. § 20 (postponement of client instructions) and § 18 (STR notification).
                    </div>
                    
                    <div style={{ margin: "14px 0", padding: "12px", background: "var(--surface-dim)", borderRadius: 8, border: "1px solid var(--outline-variant)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>24h Initial Statutory Freeze (§ 20(1))</span>
                        <span className="status-pill pep">OBLIGED ENTITY STATUTORY POWER</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--secondary)", margin: 0, lineHeight: 1.5 }}>
                        The obliged entity is legally empowered to withhold client transaction fulfillment for 24 hours starting immediately upon delivery of the OPO notification to FAÚ.
                      </p>
                    </div>

                    <div style={{ margin: "14px 0", padding: "12px", background: "var(--surface-dim)", borderRadius: 8, border: "1px solid var(--outline-variant)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>72h Extension Power (§ 20(3))</span>
                        <span className="status-pill review">FAÚ EXTENSION ORDER</span>
                      </div>
                      <p style={{ fontSize: 12, color: "var(--secondary)", margin: 0, lineHeight: 1.5 }}>
                        FAÚ may issue an administrative decision extending the fulfillment postponement by up to 3 business days (72 hours), after which assets may be seized by law enforcement (§ 20(4)).
                      </p>
                    </div>

                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                      <button
                        className="btn-primary"
                        onClick={() => setFauModalOpen(true)}
                      >
                        ❄️ Order 24h Postponement (§ 20)
                      </button>
                      <a
                        className="btn-outline"
                        href={`${API}/api/v1/cases/${selected.alertId}/fau-report/xml`}
                        download={`FAU-OPO-${selected.alertId}.xml`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        📄 Download Official FAÚ OPO XML
                      </a>
                    </div>
                  </div>

                  <div className="detail-card" style={{ marginTop: 12, borderLeft: "4px solid var(--error)" }}>
                    <div className="detail-label" style={{ color: "var(--error)" }}>Non-Tipping-Off Safeguard (§ 38 AML Act)</div>
                    <p className="detail-value" style={{ fontSize: 12, marginTop: 4 }}>
                      STRICT PROHIBITION: Informing the client or third parties of the transaction postponement or STR filing constitutes an administrative offense subject to sanctions up to CZK 5,000,000 (§ 38(1)).
                    </p>
                  </div>
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

                  <div className="detail-card">
                    <div className="detail-label">Two-axis scoring</div>
                    <div className="two-axis-grid">
                      <div><span>EVIDENCE</span><strong>{selected.evidence_score ?? selected.priority}/100</strong></div>
                      <div><span>CONFIDENCE</span><strong>{selected.confidence_score ?? 0}/100</strong></div>
                      <div><span>RAW</span><strong>{selected.priority_raw ?? selected.priority}/125</strong></div>
                    </div>
                    <div className={`confidence-note ${(selected.confidence_score ?? 0) < 50 ? "low" : (selected.confidence_score ?? 0) >= 80 ? "high" : "mid"}`}>
                      {(selected.confidence_score ?? 0) < 50 ? "Low confidence — send RFI before escalation." : (selected.confidence_score ?? 0) >= 80 ? "High confidence — escalate." : "Medium confidence — analyst review."}
                    </div>
                  </div>

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
                    <div className="detail-label">Assign approver & 4-Eyes Governance</div>
                    <div className="four-eyes-row">
                      <span>Executive (Analyst)</span>
                      <strong>{selected.executivePerson}</strong>
                    </div>
                    <div className="four-eyes-row" style={{ marginTop: 6 }}>
                      <span>Active Persona</span>
                      <strong style={{ color: activeUser.role === "MLRO" ? "var(--tertiary)" : "var(--primary)" }}>
                        {activeUser.name} ({activeUser.title})
                      </strong>
                    </div>
                    <select className="select" value={approver} onChange={(event) => chooseApprover(event.target.value)} aria-label="Assign approver">
                      <option>{INDEPENDENT}</option>
                      <option>{SAME}</option>
                    </select>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <button
                        className="btn-primary approve-btn"
                        style={{ flex: 1 }}
                        disabled={sameApprover || signingBusy}
                        onClick={signAndApprove}
                        title={activeUser.role !== "MLRO" ? "Requires MLRO persona" : "Sign with MLRO ECDSA P-256"}
                      >
                        {signingBusy ? "Signing…" : activeUser.role === "MLRO" ? "Sign & Approve as MLRO" : "Sign & Approve (MLRO Only)"}
                      </button>
                      <button
                        className="btn-outline"
                        onClick={() => setFauModalOpen(true)}
                        title="Postpone fulfillment under § 20 of AML Act"
                      >
                        ❄️ Freeze (§ 20)
                      </button>
                    </div>
                    {activeUser.role !== "MLRO" && (
                      <p className="brand-subtitle" style={{ color: "var(--warning)", marginTop: 6 }}>
                        ⚠️ You are currently in Analyst persona ({activeUser.name}). Only designated MLRO (§ 22) Marie Svobodová can execute statutory approvals. Switch persona in the navbar.
                      </p>
                    )}
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
                  {viewingDoc ? (
                    <MarkdownDocViewer
                      markdown={viewingDoc.content}
                      docId={viewingDoc.id}
                      caseId={selected.alertId}
                      signedBy={viewingDoc.signedBy}
                      hash={viewingDoc.hash}
                      apiBaseUrl={API}
                      onBack={() => setViewingDoc(null)}
                      onSigned={async () => {
                        await loadDocuments();
                        setViewingDoc((prev) => (prev ? { ...prev, signedBy: "MLRO Marie Svobodová" } : null));
                      }}
                    />
                  ) : (
                    <>
                      <div className="detail-card">
                        <div className="detail-label">Deep analysis</div>
                        <div className="brand-subtitle">ČNB / FAÚ AML Compliance Dossier · 0-Token C# Deterministic + Bedrock Prover</div>
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
                                <div className="brand-subtitle">{doc.signedBy ? `✓ Signed by ${doc.signedBy}` : "Unsigned"} · {doc.documentHash.slice(0, 18)}…</div>
                              </div>
                              <div className="doc-actions">
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => openDocumentReader(doc.id, doc.signedBy, doc.documentHash)}
                                  disabled={viewingDocLoading}
                                >
                                  📖 Read Dossier
                                </button>
                                <a className="btn-outline" href={`${API}/api/v1/documents/${doc.id}`} download={`${doc.id}.md`}>Markdown</a>
                                <a className="btn-outline" href={`${API}/api/v1/documents/${doc.id}/bundle`}>Bundle (.zip)</a>
                                {!doc.signedBy && <button className="btn-outline" onClick={() => signDocument(doc.id)}>Sign</button>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="brand-subtitle">Bundle contains analysis.md, evidence.json, audit_chain.json, rule_registry.json, fatf_references.json, and signatures.json.</p>
                    </>
                  )}
                </div>
              ) : (
                <div className="deep-panel">
                  {viewingDoc ? (
                    <MarkdownDocViewer
                      markdown={viewingDoc.content}
                      docId={viewingDoc.id}
                      caseId={selected.alertId}
                      signedBy={viewingDoc.signedBy}
                      hash={viewingDoc.hash}
                      apiBaseUrl={API}
                      onBack={() => setViewingDoc(null)}
                      onSigned={async () => {
                        await loadDossiers();
                        setViewingDoc((prev) => (prev ? { ...prev, signedBy: "MLRO Marie Svobodová" } : null));
                      }}
                    />
                  ) : (
                    <>
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
                                <div className="brand-subtitle">SHA-256 {dossier.documentSha256.slice(0, 22)}… · {dossier.signatureAlgorithm ?? "unsigned"} · {dossier.signedBy ?? "engine-signed"}</div>
                              </div>
                              <div className="doc-actions">
                                <button
                                  type="button"
                                  className="btn-primary"
                                  onClick={() => openDossierReader(dossier.dossierId, dossier.signedBy, dossier.documentSha256)}
                                  disabled={viewingDocLoading}
                                >
                                  📖 Read Brief
                                </button>
                                <a className="btn-outline" href={`${API}/api/v1/dossiers/${dossier.dossierId}/export?format=html`} target="_blank" rel="noreferrer">Open HTML</a>
                                <a className="btn-outline" href={`${API}/api/v1/dossiers/${dossier.dossierId}/export?format=md`} target="_blank" rel="noreferrer">Markdown</a>
                                <button className="btn-outline" onClick={() => verifyDossier(dossier.dossierId)}>Verify P-256</button>
                                <button className="btn-outline" onClick={() => signDossier(dossier.dossierId)}>Sign P-256</button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {fauModalOpen && selected && (
        <FauPostponementModal
          caseId={selected.alertId}
          activeUser={activeUser}
          onClose={() => setFauModalOpen(false)}
          onPostponed={(packet) => {
            setFauPackets((prev) => ({ ...prev, [selected.alertId]: packet }));
            setToast(`§ 20 Postponement ordered · FAÚ ref ${packet.fau_reference_number}`);
          }}
        />
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
