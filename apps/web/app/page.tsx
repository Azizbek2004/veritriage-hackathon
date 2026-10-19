"use client";

import { useEffect, useMemo, useState } from "react";

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
  claims?: Claim[];
};

type AuditEvent = {
  event: string;
  timestamp: string;
  hash: string;
};

type AuditResponse = {
  events: AuditEvent[];
  chain_valid: boolean;
  mode: "DEMO_STATIC" | "PERSISTENT";
};

type AuditVerification = AuditResponse & {
  verified_events: number;
  total_events: number;
};

type BedrockStatus = {
  mode: "LIVE_BEDROCK" | "LIVE_BEDROCK_CACHED";
  latency_ms?: number;
  error?: string;
};

type Tab = "details" | "audit";
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
  const [approved, setApproved] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("details");
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [auditBusy, setAuditBusy] = useState(false);
  const [chainValid, setChainValid] = useState(true);
  const [chainStatus, setChainStatus] = useState("");
  const [auditMode, setAuditMode] = useState<"DEMO_STATIC" | "PERSISTENT">("DEMO_STATIC");
  const [bedrockMode, setBedrockMode] = useState<"LIVE_BEDROCK" | "LIVE_BEDROCK_CACHED">("LIVE_BEDROCK_CACHED");
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");

  const sameApprover = approver === SAME;

  const stats = useMemo(() => ({
    total: rows.length,
    fp: rows.filter((row) => row.alertType === "FP").length,
    review: rows.filter((row) => row.alertType === "REVIEW").length,
    high: rows.filter((row) => row.priority >= 75).length,
    pep: rows.filter((row) => row.reason.includes("§ 21(5)")).length,
    approved: approved.size,
  }), [rows, approved]);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesFilter =
        filter === "ALL" || (filter === "HIGH" ? row.priority >= 75 : row.alertType === filter);
      const matchesQuery =
        !needle ||
        row.alertId.toLowerCase().includes(needle) ||
        row.clientId.toLowerCase().includes(needle) ||
        row.transactionId.toLowerCase().includes(needle);
      return matchesFilter && matchesQuery;
    });
  }, [rows, filter, query]);

  useEffect(() => {
    fetch(`${API}/api/v1/deliverable/sample`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json();
      })
      .then((data: Row[]) => setRows(data))
      .catch((error: unknown) => setApiError(String(error)))
      .finally(() => setRowsLoading(false));

    fetch(`${API}/api/v1/bedrock/status`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data: BedrockStatus | null) => {
        setBedrockMode(data?.mode === "LIVE_BEDROCK" ? "LIVE_BEDROCK" : "LIVE_BEDROCK_CACHED");
      })
      .catch(() => setBedrockMode("LIVE_BEDROCK_CACHED"));
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

  function openRow(row: Row) {
    setSelected(row);
    setApprover(INDEPENDENT);
    setBanner("");
    setInvestigation(null);
    setTab("details");
    setAudit([]);
    setChainStatus("");
    setChainValid(true);
    setAuditMode("DEMO_STATIC");
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

  async function loadAudit() {
    if (!selected) return;
    setAuditBusy(true);
    try {
      const response = await fetch(`${API}/api/v1/cases/${selected.alertId}/audit`);
      const data: AuditResponse = await response.json();
      setAudit(data.events);
      setChainValid(data.chain_valid);
      setAuditMode(data.mode);
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
      setAuditMode(data.mode);
      setChainStatus(
        data.chain_valid
          ? `Chain Verified: ${data.verified_events}/${data.total_events} events`
          : `Chain Invalid: ${data.verified_events}/${data.total_events} events`,
      );
    } finally {
      setAuditBusy(false);
    }
  }

  function showAudit() {
    setTab("audit");
    if (audit.length === 0) void loadAudit();
  }

  function downloadAudit() {
    if (!selected) return;
    const payload = { caseId: selected.alertId, mode: auditMode, events: audit };
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
            <div className="schema-line">11-column FINREG schema · DEMO_STATIC audit</div>
          </div>
        </div>
        <div className="navbar-actions">
          <span className={`badge-status ${bedrockMode === "LIVE_BEDROCK" ? "live" : "cached"}`}>
            <span className="live-indicator" />
            Bedrock: {bedrockMode === "LIVE_BEDROCK" ? "LIVE · Sonnet 4.5" : "CACHED · Bedrock offline"}
          </span>
          <a className="btn-primary" href={`${API}/api/v1/deliverable/csv`}>
            Download FINREG Deliverable CSV
          </a>
        </div>
      </header>

      <section className="kpi-grid" aria-label="Deliverable summary">
        <div className="kpi-card">
          <div className="kpi-label">Alerts <span>45</span></div>
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

      <section className="toolbar" aria-label="Filter alerts">
        <div className="filter-group">
          {filters.map((item) => (
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
              placeholder="Search alert, client, transaction"
              aria-label="Search alerts"
            />
          </label>
          <span className="brand-subtitle">{filteredRows.length} shown</span>
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
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>alert_id</th><th>alert_type</th><th>client_id</th><th>transaction_id</th>
                <th>triage</th><th>priority</th><th>executive_role</th><th>executive_person</th>
                <th>approver</th><th>reason</th><th>log</th>
              </tr>
            </thead>
            <tbody>
              {rowsLoading ? (
                <tr><td colSpan={11} className="loading-row">Loading 45 FINREG alerts…</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={11} className="loading-row">No alerts match this filter.</td></tr>
              ) : (
                filteredRows.map((row) => {
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
                      <td><span className={`priority-badge ${priorityTone(row.priority)}`}>{row.priority}</span></td>
                      <td>{row.executiveRole}</td>
                      <td>{row.executivePerson}</td>
                      <td>{row.approver}</td>
                      <td className="reason-cell" title={row.reason}>{row.reason}</td>
                      <td className="mono-cell log-cell" title={row.log}>{row.log}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <footer className="footer">
        <div><strong>21.1 FTEs saved</strong> · €1.16M/yr · 45-alert FINREG sample</div>
        <div>Deterministic priority · 4-eyes enforced · hash-logged</div>
      </footer>

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
              <button role="tab" aria-selected={tab === "details"} className={tab === "details" ? "drawer-tab active" : "drawer-tab"} onClick={() => setTab("details")}>Details</button>
              <button role="tab" aria-selected={tab === "audit"} className={tab === "audit" ? "drawer-tab active" : "drawer-tab"} onClick={showAudit}>Audit Chain</button>
            </div>
            <div className="drawer-body">
              {banner && (
                <div className="banner-violation" role="alert">
                  <strong>{banner}</strong>
                </div>
              )}

              {tab === "details" ? (
                <>
                  <div className="decision-grid">
                    <div className="detail-card">
                      <div className="detail-label">Alert type</div>
                      <div className="detail-value">{selected.alertType}</div>
                    </div>
                    <div className="detail-card">
                      <div className="detail-label">Priority</div>
                      <div className="detail-value"><span className={`priority-badge ${priorityTone(selected.priority)}`}>{selected.priority}</span></div>
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

                  <div className="detail-card legal-card">
                    <div className="detail-label">Statutory basis</div>
                    <div className="legal-citation">{citationOf(selected.reason)}</div>
                    <p className="detail-value">{selected.reason}</p>
                  </div>

                  <div className="ai-card">
                    <div className="ai-header">
                      <div>
                        <div className="ai-badge">{investigation?.mode ?? (bedrockMode === "LIVE_BEDROCK" ? "LIVE_BEDROCK" : "LIVE_BEDROCK_CACHED")}</div>
                        <div className="brand-subtitle">Bedrock investigation</div>
                      </div>
                      <button className="btn-outline" onClick={runInvestigation} disabled={bedrockBusy}>
                        {bedrockBusy ? "Querying…" : "Investigate"}
                      </button>
                    </div>
                    {investigation ? (
                      <>
                        <p className="detail-value">{investigation.evidence_summary}</p>
                        <p className="brand-subtitle">{investigation.rationale}</p>
                        {investigation.claims && investigation.claims.length > 0 && (
                          <div className="ai-claims-list">
                            {investigation.claims.map((claim) => (
                              <div className="ai-claim-item" key={claim.claimId}>
                                <strong>{claim.claimType}</strong> · {claim.narrativeTemplate}
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="legal-citation">{investigation.legalBasis}</div>
                        {investigation.model && (
                          <div className="timeline-meta">
                            {investigation.model}{investigation.latency_ms ? ` · ${investigation.latency_ms}ms` : ""}
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="detail-value">
                        Run the cached or live AML dossier. The result is grounded in the case evidence and legal basis.
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
              ) : (
                <div className="audit-panel">
                  {auditMode === "DEMO_STATIC" && (
                    <div className="badge-status cached">DEMO_STATIC · production appends at write time</div>
                  )}
                  <div className="timeline">
                    {audit.map((event) => (
                      <div className="timeline-item" key={event.hash}>
                        <div className={chainValid ? "timeline-dot" : "timeline-dot invalid"}>{chainValid ? "✓" : "!"}</div>
                        <div className="timeline-content">
                          <div className="timeline-event">{event.event}</div>
                          <div className="timeline-meta">{event.timestamp} · {event.hash.slice(0, 12)}</div>
                          <button className="copy" onClick={() => copyHash(event.hash)}>copy hash</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  {audit.length === 0 && !auditBusy && <p className="brand-subtitle">No audit events loaded.</p>}
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
              )}
            </div>
          </aside>
        </>
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
