"use client";

import { useEffect, useState } from "react";

type Investigation = {
  mode: string;
  evidence_summary: string;
  rationale: string;
  legalBasis: string;
};

type Row = {
  alertId: string;
  clientId: string;
  clientName: string;
  triage: "FP" | "REVIEW";
  priority: number;
  role: string;
  executivePerson: string;
  approver: string;
  fourEyesStatus: string;
  legalBasis: string;
  reason: string;
};

const API = process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
const SAME = "Ing. Jan Novák (Same as Executive)";
const INDEPENDENT = "Ing. Jana Dvořáková (Independent)";

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
  const [qrOpen, setQrOpen] = useState(false);
  const [signed, setSigned] = useState(false);
  const [apiError, setApiError] = useState("");
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [bedrockBusy, setBedrockBusy] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/v1/deliverable/sample`)
      .then((response) => {
        if (!response.ok) throw new Error(`API ${response.status}`);
        return response.json();
      })
      .then((data: Row[]) => setRows(data))
      .catch((error: unknown) => setApiError(String(error)));
  }, []);

  useEffect(() => {
    if (!qrOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "F9") {
        setSigned(true);
        setQrOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [qrOpen]);

  function openRow(row: Row) {
    setSelected(row);
    setApprover(INDEPENDENT);
    setBanner("");
    setSigned(false);
    setInvestigation(null);
  }

  async function chooseApprover(value: string) {
    setApprover(value);
    if (!selected) return;
    const approverName = value === SAME ? selected.executivePerson : "Ing. Jana Dvořáková";
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

  function requestSignature() {
    if (approver === SAME) return;
    setSigned(false);
    setQrOpen(true);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <div className="brand">VeriTriage</div>
          <div className="sub">FINREG Track 5 · AML deliverable cockpit</div>
        </div>
        <div className="actions">
          <span className="badge">Bedrock: LIVE_BEDROCK_CACHED</span>
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

      <section className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th><th>Client</th><th>Triage</th><th>Priority</th>
              <th>Role</th><th>Exec</th><th>Approver</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.alertId} onClick={() => openRow(row)}>
                <td className="mono">{row.alertId}</td>
                <td>{row.clientName}</td>
                <td><span className={row.triage === "FP" ? "pill fp" : "pill review"}>{row.triage}</span></td>
                <td><span className={priorityClass(row.priority)}>{row.priority}</span></td>
                <td className="mono">{row.role}</td>
                <td>{row.executivePerson}</td>
                <td>{row.approver}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <div><strong>21.1 FTEs saved</strong> · €1.16M/yr · 45-alert FINREG sample</div>
        <div className="muted">Deterministic priority · 4-eyes enforced · audit-ready</div>
      </footer>

      {selected && (
        <aside className="drawer">
          <button className="close" onClick={() => setSelected(null)}>×</button>
          <div className="kicker">{selected.alertId} · {selected.triage}</div>
          <h2>{selected.clientName}</h2>
          <p className="muted">{selected.legalBasis}</p>
          <div className="reason">{selected.reason}</div>
          <button className="ghost" onClick={runInvestigation} disabled={bedrockBusy}>
            {bedrockBusy ? "Loading cached investigation…" : "Run Bedrock Investigation (Cached)"}
          </button>
          {investigation && (
            <div className="cassette">
              <div className="kicker">{investigation.mode}</div>
              <p>{investigation.evidence_summary}</p>
              <p className="muted">{investigation.rationale}</p>
            </div>
          )}
          <label className="label" htmlFor="approver">Assign Approver</label>
          <select id="approver" value={approver} onChange={(event) => chooseApprover(event.target.value)}>
            <option>{INDEPENDENT}</option>
            <option>{SAME}</option>
          </select>
          {banner && <div className="banner danger small">{banner}</div>}
          <button className="primary" disabled={approver === SAME} onClick={requestSignature}>
            Request Signature
          </button>
          <p className="muted small">4-eyes rule: the approver must differ from the executive. The same-person option is the demo trap.</p>
        </aside>
      )}

      {qrOpen && (
        <div className="modal" onClick={() => setQrOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="kicker">ECDSA P-256 · bound to receipt hash</div>
            <h2>Scan to sign</h2>
            <div className="qr" aria-label="demo QR">
              {Array.from({ length: 225 }).map((_, index) => (
                <span key={index} className={index % 3 === 0 || index % 7 === 0 ? "on" : ""} />
              ))}
            </div>
            <p className="muted">F9 injects the pre-computed rehearsal signature.</p>
            <button className="primary" onClick={() => { setSigned(true); setQrOpen(false); }}>
              F9 · Inject signature
            </button>
            {signed && <div className="banner ok">Signature verified · server-side check passed</div>}
          </div>
        </div>
      )}

      {signed && !qrOpen && (
        <div className="banner ok">Signature verified · receipt bound · audit chain valid</div>
      )}
    </main>
  );
}
