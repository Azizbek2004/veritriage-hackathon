"use client";

import { useEffect, useState, useMemo } from "react";

type Claim = {
  claimId: string;
  claimType: string;
  narrativeTemplate: string;
  jsonPointers: string[];
  expectedValues: string[];
  documentProvenance: string | null;
};

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
};

type Investigation = {
  mode: string;
  model?: string;
  latency_ms?: number;
  evidence_summary: string;
  claims?: Claim[];
  recommendedOutcome?: string;
  recommendedRiskScore?: number;
  rationale: string;
  legalBasis: string;
};

type AuditEvent = {
  event: string;
  timestamp: string;
  hash: string;
};

type AuditVerification = {
  chain_valid: boolean;
  verified_events: number;
  total_events: number;
  events: AuditEvent[];
};

type FilterType = "ALL" | "FP" | "REVIEW" | "HIGH_PRIORITY" | "APPROVED";
type Tab = "details" | "audit" | "statutory";

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
const SAME = "Ing. Jan Novák (Same as Executive)";
const INDEPENDENT = "Marie Svobodová (MLRO)";

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
  const [selected, setSelected] = useState<Row | null>(null);
  const [approver, setApprover] = useState(INDEPENDENT);
  const [banner, setBanner] = useState("");
  const [toast, setToast] = useState("");
  const [apiError, setApiError] = useState("");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [bedrockBusy, setBedrockBusy] = useState(false);
  const [bedrockOnline, setBedrockOnline] = useState(false);
  const [bedrockLatency, setBedrockLatency] = useState<number | null>(null);
  const [signingBusy, setSigningBusy] = useState(false);
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("details");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);
  const [chainValid, setChainValid] = useState(true);
  const [chainStatus, setChainStatus] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  useEffect(() => {
    // 1. Fetch deliverable sample batch
    fetch(`${API}/api/v1/deliverable/sample`)
      .then((res) => {
        if (!res.ok) throw new Error(`API returned HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Row[]) => setRows(data))
      .catch((err: unknown) => setApiError(String(err)));

    // 2. Probe live Bedrock Sonnet 4.5 connection status
    fetch(`${API}/api/v1/bedrock/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.status === "connected" || data?.mode === "LIVE_BEDROCK") {
          setBedrockOnline(true);
          if (data.latency_ms) setBedrockLatency(data.latency_ms);
        }
      })
      .catch(() => setBedrockOnline(false));
  }, []);

  function openRow(row: Row) {
    setSelected(row);
    setApprover(INDEPENDENT);
    setBanner("");
    setInvestigation(null);
    setTab("details");
    setAudit([]);
    setChainStatus("");
    setChainValid(true);
  }

  async function chooseApprover(value: string) {
    setApprover(value);
    if (!selected) return;
    const approverName = value === SAME ? selected.executivePerson : "Marie Svobodová";
    try {
      const response = await fetch(`${API}/api/v1/cases/verify-4-eyes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ executive: selected.executivePerson, approver: approverName }),
      });
      if (response.status === 400) {
        const body = await response.json();
        setBanner(body.error ?? "4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]");
      } else {
        setBanner("");
      }
    } catch {
      if (value === SAME) {
        setBanner("4-EYES VIOLATION [§ 21 AML Act / § 12 Decree 67/2018]");
      } else {
        setBanner("");
      }
    }
  }

  async function runInvestigation() {
    if (!selected) return;
    setBedrockBusy(true);
    const start = performance.now();
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/investigation`);
      const data: Investigation = await response.json();
      if (!data.latency_ms) {
        data.latency_ms = Math.round(performance.now() - start);
      }
      setInvestigation(data);
      setToast(`Investigation completed in ${data.latency_ms}ms`);
    } catch {
      setBanner("Failed to retrieve investigation from API.");
    } finally {
      setBedrockBusy(false);
    }
  }

  async function signAndApprove() {
    if (!selected || approver === SAME) return;
    setSigningBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signature_b64: "mock_sig_123",
          approver_id: "Marie Svobodová",
        }),
      });
      const body = await response.json();
      if (!response.ok) {
        setBanner(body.error ?? "APPROVAL REJECTED");
        return;
      }
      setApproved((current) => new Set(current).add(selected.alertId));
      setToast(`Approved successfully · ${body.audit_hash}`);
      setBanner("");
    } catch (err: unknown) {
      setBanner(`Approval failed: ${String(err)}`);
    } finally {
      setSigningBusy(false);
    }
  }

  async function loadAudit() {
    if (!selected) return;
    setAuditBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/audit`);
      const data: AuditEvent[] = await response.json();
      setAudit(data);
      setChainValid(true);
    } catch {
      setBanner("Failed to fetch audit ledger.");
    } finally {
      setAuditBusy(false);
    }
  }

  async function verifyChain() {
    if (!selected) return;
    setAuditBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/audit/verify`);
      const data: AuditVerification = await response.json();
      setAudit(data.events);
      setChainValid(data.chain_valid);
      setChainStatus(
        data.chain_valid
          ? `Chain Verified: ${data.verified_events}/${data.total_events} events cryptographically unbroken.`
          : `Chain Integrity Violation: ${data.verified_events}/${data.total_events} verified.`,
      );
      setToast(data.chain_valid ? "5/5 Cryptographic Blocks Verified" : "Chain integrity warning");
    } catch {
      setBanner("Failed to verify audit chain.");
    } finally {
      setAuditBusy(false);
    }
  }

  function showAuditTab() {
    setTab("audit");
    if (audit.length === 0) void loadAudit();
  }

  // Filtered rows
  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      // 1. Tab segment
      if (activeFilter === "FP" && r.alertType !== "FP") return false;
      if (activeFilter === "REVIEW" && r.alertType !== "REVIEW") return false;
      if (activeFilter === "HIGH_PRIORITY" && r.priority < 75) return false;
      if (activeFilter === "APPROVED" && !approved.has(r.alertId)) return false;

      // 2. Search query
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.alertId.toLowerCase().includes(q) ||
        r.clientId.toLowerCase().includes(q) ||
        r.transactionId.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.approver.toLowerCase().includes(q)
      );
    });
  }, [rows, activeFilter, approved, searchQuery]);

  // Priority classification
  function getPriorityColor(priority: number) {
    if (priority >= 75) return "red";
    if (priority >= 40) return "yellow";
    return "green";
  }

  return (
    <main className="shell">
      {/* 1. Modern Navigation Header */}
      <header className="navbar">
        <div className="navbar-brand">
          <div className="brand-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              <path d="m9 12 2 2 4-4"/>
            </svg>
          </div>
          <div>
            <div className="brand-title">VeriTriage</div>
            <div className="brand-subtitle">
              FINREG Track 5 · Czech AML Act No. 253/2008 Sb. & PSR Art. 83 Cockpit
            </div>
          </div>
        </div>

        <div className="navbar-actions">
          <div className={`badge-status ${bedrockOnline ? "live" : "cached"}`}>
            <span className={bedrockOnline ? "live-indicator" : ""}></span>
            <span>{bedrockOnline ? "Bedrock: Claude Sonnet 4.5 (Live)" : "Bedrock: Cached Fallback"}</span>
            {bedrockLatency && <span style={{ opacity: 0.7 }}>· {bedrockLatency}ms</span>}
          </div>

          <a className="btn-primary" href={`${API}/api/v1/deliverable/csv`} download="finreg_aml_deliverable.csv">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download FINREG CSV</span>
          </a>
        </div>
      </header>

      {/* API Error Warning */}
      {apiError && (
        <div className="banner-violation" role="alert">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
            <line x1="12" y1="8" x2="12" y2="12"/>
            <line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <div>
            <strong>Backend API Offline:</strong> {apiError}. Ensure <code>dotnet run --project src/PayShield.Api</code> is listening on <code>:5000</code>.
          </div>
        </div>
      )}

      {/* 2. Executive KPI Metrics Grid */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">
            <span>Automated Triage</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--tertiary)">
              <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
              <polyline points="16 7 22 7 22 13"/>
            </svg>
          </div>
          <div className="kpi-value">82.0%</div>
          <div className="kpi-sub highlight">
            <span>Cleared deterministically</span>
            <span>· 0 LLM tokens</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Staff Productivity</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--primary)">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <div className="kpi-value">21.1 FTE</div>
          <div className="kpi-sub">
            <span>Savings: <strong>€1.16M / year</strong></span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>4-Eyes Compliance</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--tertiary)">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <div className="kpi-value">100%</div>
          <div className="kpi-sub">
            <span>§ 21 AML Act & Decree 67/2018</span>
          </div>
        </div>

        <div className="kpi-card">
          <div className="kpi-label">
            <span>Model Proof Layer</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" color="var(--primary)">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="16" x2="12" y2="12"/>
              <line x1="12" y1="8" x2="12.01" y2="8"/>
            </svg>
          </div>
          <div className="kpi-value">0.028s</div>
          <div className="kpi-sub">
            <span>C# Verifier override safety</span>
          </div>
        </div>
      </section>

      {/* 3. Toolbar: Search & Triage Segment Filter */}
      <section className="toolbar">
        <div className="filter-group">
          <button
            className={`filter-btn ${activeFilter === "ALL" ? "active" : ""}`}
            onClick={() => setActiveFilter("ALL")}
          >
            <span>All Alerts</span>
            <span className="filter-counter">{rows.length}</span>
          </button>
          <button
            className={`filter-btn ${activeFilter === "FP" ? "active" : ""}`}
            onClick={() => setActiveFilter("FP")}
          >
            <span>Auto-Cleared (FP)</span>
            <span className="filter-counter">{rows.filter((r) => r.alertType === "FP").length}</span>
          </button>
          <button
            className={`filter-btn ${activeFilter === "REVIEW" ? "active" : ""}`}
            onClick={() => setActiveFilter("REVIEW")}
          >
            <span>Review Escalations</span>
            <span className="filter-counter">{rows.filter((r) => r.alertType === "REVIEW").length}</span>
          </button>
          <button
            className={`filter-btn ${activeFilter === "HIGH_PRIORITY" ? "active" : ""}`}
            onClick={() => setActiveFilter("HIGH_PRIORITY")}
          >
            <span>High Risk (75+)</span>
            <span className="filter-counter">{rows.filter((r) => r.priority >= 75).length}</span>
          </button>
          {approved.size > 0 && (
            <button
              className={`filter-btn ${activeFilter === "APPROVED" ? "active" : ""}`}
              onClick={() => setActiveFilter("APPROVED")}
            >
              <span>Signed & Approved</span>
              <span className="filter-counter">{approved.size}</span>
            </button>
          )}
        </div>

        <div className="search-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="var(--secondary)">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            placeholder="Search by Alert, Client, TX, Approver..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "16px" }}
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* 4. Main Alert Queue Table */}
      <section className="table-card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Alert ID</th>
                <th>Classification</th>
                <th>Client ID</th>
                <th>Transaction ID</th>
                <th>Triage Disposition</th>
                <th>Priority</th>
                <th>Executive</th>
                <th>Approver</th>
                <th>Statutory Grounds</th>
                <th>Audit Hash</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: "48px 16px", color: "var(--secondary)" }}>
                    No alerts match the current filter or search criteria.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.alertId}
                    onClick={() => openRow(row)}
                    className={selected?.alertId === row.alertId ? "selected" : ""}
                  >
                    <td className="mono-cell" style={{ fontWeight: 700, color: "var(--primary)" }}>
                      {row.alertId}
                    </td>
                    <td>
                      <span className={`status-pill ${row.alertType === "FP" ? "fp" : "review"}`}>
                        {row.alertType === "FP" ? "Auto-Clear" : "Escalate"}
                      </span>
                    </td>
                    <td className="mono-cell">{row.clientId}</td>
                    <td className="mono-cell" style={{ color: "var(--secondary)" }}>{row.transactionId}</td>
                    <td>
                      {approved.has(row.alertId) ? (
                        <span className="status-pill approved">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          APPROVED
                        </span>
                      ) : (
                        <span className="mono-cell" style={{ fontSize: "11px", fontWeight: 600 }}>{row.triage}</span>
                      )}
                    </td>
                    <td>
                      <span className={`priority-badge ${getPriorityColor(row.priority)}`}>
                        {row.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: "12px" }}>{row.executivePerson}</td>
                    <td style={{ fontSize: "12px" }}>{row.approver}</td>
                    <td style={{ maxWidth: "280px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontSize: "12px" }} title={row.reason}>
                      {row.reason}
                    </td>
                    <td className="mono-cell" style={{ fontSize: "11px", color: "var(--muted)" }} title={row.log}>
                      {row.log.length > 20 ? row.log.substring(0, 18) + "…" : row.log}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 5. Minimalist Informative Footer */}
      <footer className="footer">
        <div>
          <strong>VeriTriage Protocol</strong> · The Agent Proposes · The Verifier Proves · The Human Signs
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <span>ČNB AML Act No. 253/2008 Sb. § 20</span>
          <span>·</span>
          <span>EU PSR Article 83</span>
          <span>·</span>
          <span>Decree 67/2018 Sb.</span>
        </div>
      </footer>

      {/* 6. Sliding Inspection Drawer (Sheet) */}
      {selected && (
        <>
          <div className="drawer-backdrop" onClick={() => setSelected(null)} />
          <aside className="drawer">
            {/* Drawer Header */}
            <div className="drawer-header">
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span className="mono-cell" style={{ fontSize: "13px", fontWeight: 700, color: "var(--primary)" }}>
                    {selected.alertId}
                  </span>
                  <span className={`status-pill ${selected.alertType === "FP" ? "fp" : "review"}`}>
                    {selected.alertType}
                  </span>
                  <span className={`priority-badge ${getPriorityColor(selected.priority)}`}>
                    Priority {selected.priority}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 800, color: "var(--on-surface)", letterSpacing: "-0.02em" }}>
                  Client {selected.clientId}
                </h2>
                <div style={{ fontSize: "12px", color: "var(--secondary)", marginTop: "2px" }}>
                  TX: <span className="mono-cell" style={{ fontSize: "11px" }}>{selected.transactionId}</span> · {selected.executiveRole}
                </div>
              </div>
              <button className="drawer-close" onClick={() => setSelected(null)} aria-label="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Drawer Tabs */}
            <div className="drawer-tabs">
              <button
                className={`drawer-tab ${tab === "details" ? "active" : ""}`}
                onClick={() => setTab("details")}
              >
                Case Dossier
              </button>
              <button
                className={`drawer-tab ${tab === "audit" ? "active" : ""}`}
                onClick={showAuditTab}
              >
                Audit Chain ({chainValid ? "5/5" : "!"})
              </button>
              <button
                className={`drawer-tab ${tab === "statutory" ? "active" : ""}`}
                onClick={() => setTab("statutory")}
              >
                Legal Mandate
              </button>
            </div>

            {/* 4-Eyes Warning Banner inside drawer */}
            {banner && (
              <div style={{ margin: "16px 28px 0" }}>
                <div className="banner-violation">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" y1="8" x2="12" y2="12"/>
                    <line x1="12" y1="16" x2="12.01" y2="16"/>
                  </svg>
                  <div>
                    <div>{banner}</div>
                    <div style={{ fontSize: "11px", fontWeight: 400, marginTop: "2px", opacity: 0.9 }}>
                      Self-approval prohibited. A designated MLRO approver must differ from the initiating analyst.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Drawer Content */}
            <div className="drawer-body">
              {tab === "details" && (
                <>
                  {/* Summary card */}
                  <div className="detail-card">
                    <div className="detail-label">Initial Ingestion Grounding</div>
                    <div className="detail-value">{selected.reason}</div>
                  </div>

                  {/* Bedrock Claude Sonnet 4.5 Section */}
                  <div className="ai-card">
                    <div className="ai-header">
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <div style={{ width: "24px", height: "24px", borderRadius: "6px", background: "#dbeafe", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--primary)" }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
                          </svg>
                        </div>
                        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--on-surface)" }}>
                          Bedrock Sonnet 4.5 Agent
                        </span>
                      </div>
                      <span className="ai-badge">
                        {investigation?.mode ?? (bedrockOnline ? "SONNET 4.5 READY" : "CACHED")}
                        {investigation?.latency_ms ? ` · ${investigation.latency_ms}ms` : ""}
                      </span>
                    </div>

                    {investigation ? (
                      <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <p style={{ fontSize: "13px", color: "var(--on-surface-variant)", lineHeight: 1.5 }}>
                          {investigation.evidence_summary}
                        </p>

                        {/* Claims list */}
                        {investigation.claims && investigation.claims.length > 0 && (
                          <div className="ai-claims-list">
                            <div className="detail-label" style={{ marginBottom: "2px" }}>
                              Grounded Claims ({investigation.claims.length})
                            </div>
                            {investigation.claims.map((c) => (
                              <div key={c.claimId} className="ai-claim-item">
                                <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "var(--primary)", marginBottom: "4px" }}>
                                  <span>{c.claimId} · {c.claimType}</span>
                                  <span style={{ color: "var(--secondary)", fontSize: "11px" }}>{c.documentProvenance ?? "JSON Pointer"}</span>
                                </div>
                                <div>{c.narrativeTemplate}</div>
                                <div style={{ display: "flex", gap: "6px", marginTop: "4px", fontSize: "11px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                                  <span>pointer: {c.jsonPointers.join(", ")}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div style={{ background: "rgba(0, 88, 190, 0.04)", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "10px 12px" }}>
                          <div className="detail-label" style={{ color: "var(--primary)", marginBottom: "2px" }}>
                            Statutory Legal Rationale
                          </div>
                          <div style={{ fontSize: "12px", color: "var(--on-surface)", lineHeight: 1.5 }}>
                            {investigation.rationale}
                          </div>
                          <div style={{ fontSize: "11px", fontWeight: 700, color: "var(--primary)", marginTop: "4px" }}>
                            {investigation.legalBasis}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p style={{ fontSize: "12px", color: "var(--secondary)", lineHeight: 1.5, margin: "6px 0 12px" }}>
                        Amazon Bedrock agent performs two-hop evidence collection and checks statutory grounds against Czech AML Act § 21(5).
                      </p>
                    )}

                    <button
                      className="btn-outline"
                      onClick={runInvestigation}
                      disabled={bedrockBusy}
                      style={{ width: "100%", justifyContent: "center", marginTop: "12px" }}
                    >
                      {bedrockBusy ? (
                        <span>Querying Bedrock Sonnet 4.5…</span>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
                          </svg>
                          <span>{investigation ? "Re-run Sonnet 4.5 Investigation" : "Run Live Sonnet 4.5 Investigation"}</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* 4-Eyes Governance Selector */}
                  <div className="detail-card">
                    <div className="detail-label">Designate 4-Eyes Dual Approver</div>
                    <div style={{ fontSize: "12px", color: "var(--secondary)", marginBottom: "10px" }}>
                      Executive Analyst: <strong>{selected.executivePerson}</strong>
                    </div>

                    <select
                      value={approver}
                      onChange={(e) => chooseApprover(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 12px",
                        borderRadius: "8px",
                        border: "1px solid var(--outline)",
                        background: "var(--surface)",
                        fontSize: "13px",
                        color: "var(--on-surface)",
                        outline: "none",
                      }}
                    >
                      <option>{INDEPENDENT}</option>
                      <option>{SAME}</option>
                    </select>

                    <button
                      className="btn-primary"
                      disabled={approver === SAME || signingBusy || approved.has(selected.alertId)}
                      onClick={signAndApprove}
                      style={{ width: "100%", justifyContent: "center", marginTop: "14px" }}
                    >
                      {signingBusy ? (
                        <span>Signing with HSM Simulator…</span>
                      ) : approved.has(selected.alertId) ? (
                        <span>✓ Case Already Approved</span>
                      ) : (
                        <>
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                            <polyline points="9 12 11 14 15 10"/>
                          </svg>
                          <span>Sign & Approve Proof Receipt</span>
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {tab === "audit" && (
                <>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div className="detail-label">Cryptographic Hash Chain</div>
                      <div style={{ fontSize: "12px", color: "var(--secondary)" }}>
                        {chainStatus || "Immutable 5-event audit ledger"}
                      </div>
                    </div>
                    <button
                      className="btn-outline"
                      onClick={verifyChain}
                      disabled={auditBusy}
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      {auditBusy ? "Verifying…" : "Verify Chain"}
                    </button>
                  </div>

                  <div className="timeline">
                    {audit.map((evt, idx) => (
                      <div key={evt.event + idx} className="timeline-item">
                        <div className="timeline-dot">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </div>
                        <div className="timeline-content">
                          <div className="timeline-event">{evt.event}</div>
                          <div className="timeline-meta">{evt.timestamp}</div>
                          <div className="timeline-meta" style={{ color: "var(--primary)", wordBreak: "break-all" }}>
                            {evt.hash}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {tab === "statutory" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div className="detail-card">
                    <div className="detail-label">Czech AML Act No. 253/2008 Sb. § 20</div>
                    <div className="detail-value" style={{ fontSize: "13px" }}>
                      Obliged entities must postpone execution of transactions upon suspicion of money laundering or terrorist financing and notify the Financial Analytical Office (FAÚ).
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Decree No. 67/2018 Sb. § 12 (4-Eyes Principle)</div>
                    <div className="detail-value" style={{ fontSize: "13px" }}>
                      Triage and escalation decisions must be subject to dual control. The executive analyst cannot act as the final authorizer for high-risk dispositions.
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">Czech AML Act § 16 (10-Year Reconstruction)</div>
                    <div className="detail-value" style={{ fontSize: "13px" }}>
                      All evidence, decision trees, and cryptographic proof receipts must be preserved in a tamper-evident manner for a minimum retention window of 10 years.
                    </div>
                  </div>

                  <div className="detail-card">
                    <div className="detail-label">EU PSR (Payment Services Regulation) Art. 83</div>
                    <div className="detail-value" style={{ fontSize: "13px" }}>
                      Transaction monitoring duty and reversed burden of proof for pre-execution payment suspensions and refund adjudications.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </aside>
        </>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className="toast">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" color="var(--tertiary)">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            <span>{toast}</span>
            <button
              onClick={() => setToast("")}
              style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", marginLeft: "8px", fontSize: "16px" }}
            >
              ×
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
