"use client";

import { useEffect, useState } from "react";

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
  rationale: string;
  legalBasis: string;
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

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
const SAME = "Ing. Jan Novák (Same as Executive)";
const INDEPENDENT = "Marie Svobodová (MLRO)";

function priorityClass(priority: number) {
  if (priority >= 75) return "priority red";
  if (priority >= 40) return "priority yellow";
  return "priority green";
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>([]);
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
  const [bedrockMode, setBedrockMode] = useState<"LIVE_BEDROCK" | "LIVE_BEDROCK_CACHED">("LIVE_BEDROCK_CACHED");
  const [auditMode, setAuditMode] = useState<"DEMO_STATIC" | "PERSISTENT">("DEMO_STATIC");

  useEffect(() => {
    fetch(`${API}/api/v1/deliverable/sample`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json();
      })
      .then((data: Row[]) => setRows(data))
      .catch((error: unknown) => setApiError(String(error)));

    fetch(`${API}/api/v1/bedrock/status`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: BedrockStatus | null) => {
        setBedrockMode(data?.mode === "LIVE_BEDROCK" ? "LIVE_BEDROCK" : "LIVE_BEDROCK_CACHED");
      })
      .catch(() => setBedrockMode("LIVE_BEDROCK_CACHED"));
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
      const data = await response.json();
      setInvestigation(data);
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

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">VeriTriage</div>
          <div className="sub">FINREG Track 5 · AML deliverable cockpit</div>
        </div>
        <div className="actions">
          <span className={bedrockMode === "LIVE_BEDROCK" ? "badge live" : "badge cached"}>
            Bedrock: {bedrockMode === "LIVE_BEDROCK" ? "LIVE · Sonnet 4.5" : "CACHED · Bedrock offline"}
          </span>
          <a className="download" href={`${API}/api/v1/deliverable/csv`}>
            Download FINREG Deliverable CSV
          </a>
        </div>
      </header>

      {apiError && (
        <div className="banner warn">
          API unavailable: {apiError}. Start `dotnet run --project src/PayShield.Api` on :5000.
        </div>
      )}

      {banner && (
        <div className="banner danger" role="alert">
          {banner}
          <button onClick={() => setBanner("")} aria-label="Dismiss">×</button>
        </div>
      )}

      {toast && (
        <div className="toast">
          <span>{toast}</span>
          <button onClick={() => setToast("")} aria-label="Dismiss">×</button>
        </div>
      )}

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>alert_id</th><th>alert_type</th><th>client_id</th><th>transaction_id</th>
              <th>triage</th><th>priority</th><th>executive_role</th><th>executive_person</th>
              <th>approver</th><th>reason</th><th>log</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.alertId} onClick={() => openRow(row)}>
                <td className="mono">{row.alertId}</td>
                <td><span className={row.alertType === "FP" ? "pill fp" : "pill review"}>{row.alertType}</span></td>
                <td className="mono">{row.clientId}</td>
                <td className="mono">{row.transactionId}</td>
                <td>
                  {approved.has(row.alertId)
                    ? <span className="pill approved">APPROVED</span>
                    : <span className="mono">{row.triage}</span>}
                </td>
                <td><span className={priorityClass(row.priority)}>{row.priority}</span></td>
                <td>{row.executiveRole}</td>
                <td>{row.executivePerson}</td>
                <td>{row.approver}</td>
                <td className="reason-cell">{row.reason}</td>
                <td className="mono log" title={row.log}>{row.log}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <div><strong>21.1 FTEs saved</strong> · €1.16M/yr · 45-alert FINREG sample</div>
        <div className="muted">Deterministic priority · 4-eyes enforced · hash-logged</div>
      </footer>

      {selected && (
        <aside className="drawer">
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <div className="kicker">{selected.alertId} · {selected.alertType}</div>
          <h2>{selected.clientId}</h2>
          <p className="muted">{selected.executiveRole} · priority {selected.priority}</p>

          <div className="tabs">
            <button className={tab === "details" ? "tab active" : "tab"} onClick={() => setTab("details")}>Details</button>
            <button className={tab === "audit" ? "tab active" : "tab"} onClick={showAudit}>Audit Chain</button>
          </div>

          {banner && <div className="banner danger small">{banner}</div>}

          {tab === "details" ? (
            <>
              <div className="reason">{selected.reason}</div>
              <button className="ghost" onClick={runInvestigation} disabled={bedrockBusy}>
                {bedrockBusy
                  ? "Querying Bedrock Sonnet 4.5…"
                  : bedrockMode === "LIVE_BEDROCK"
                  ? "Investigate (Live Bedrock Sonnet 4.5)"
                  : "Investigate (Cached)"}
              </button>
              {investigation && (
                <div className="cassette">
                  <div className="kicker">
                    {investigation.mode}
                    {investigation.model ? ` · ${investigation.model}` : ""}
                    {investigation.latency_ms ? ` · ${investigation.latency_ms}ms` : ""}
                  </div>
                  <p>{investigation.evidence_summary}</p>
                  <p className="muted">{investigation.rationale}</p>
                  <p className="legal">{investigation.legalBasis}</p>
                </div>
              )}
              <label className="label" htmlFor="approver">Assign Approver</label>
              <select id="approver" value={approver} onChange={(event) => chooseApprover(event.target.value)}>
                <option>{INDEPENDENT}</option>
                <option>{SAME}</option>
              </select>
              <button className="primary" disabled={approver === SAME || signingBusy} onClick={signAndApprove}>
                {signingBusy ? "Signing…" : "Sign & Approve"}
              </button>
              <p className="muted small">4-eyes rule: the approver must differ from the executive. The same-person option is the demo trap.</p>
            </>
          ) : (
            <div className="audit-panel">
              {auditMode === "DEMO_STATIC" && (
                <div className="badge demo">Demo chain · Production appends events at write time</div>
              )}
              <div className="timeline">
                {audit.map((event) => (
                  <div className="event" key={event.hash}>
                    <div className={chainValid ? "tick" : "cross"}>{chainValid ? "✓" : "!"}</div>
                    <div>
                      <div className="event-name">{event.event}</div>
                      <div className="muted small">{event.timestamp}</div>
                      <div className="mono hash">{event.hash.slice(0, 12)}</div>
                    </div>
                  </div>
                ))}
              </div>
              {audit.length === 0 && !auditBusy && <p className="muted small">No audit events loaded.</p>}
              <button className="primary" onClick={verifyChain} disabled={auditBusy}>
                {auditBusy ? "Verifying…" : "Verify Chain"}
              </button>
              {chainStatus && <div className={chainValid ? "banner ok small" : "banner danger small"}>{chainStatus}</div>}
              <p className="muted small">Each event hash is computed over the previous hash plus the event data.</p>
            </div>
          )}
        </aside>
      )}
    </main>
  );
}
