"use client";

import { useMemo, useState } from "react";

type Correlated = {
  target_alert_id: string;
  target_client_id: string;
  correlation_score: number;
  shared_iban_score: number;
  temporal_sync_score: number;
  amount_mirror_score: number;
  entity_link_score: number;
  correlation_reason: string;
};

type Topology = {
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
  correlated_accounts: Correlated[];
};

type RadarRow = {
  alertId: string;
  clientId: string;
  priority: number;
  confidence_score?: number;
  topology?: Topology;
};

type Props = {
  rows: RadarRow[];
  selectedId?: string;
  roleFilter: string;
  onSelect: (row: RadarRow) => void;
  onRoleFilter: (role: string) => void;
};

const ROLE_META: Record<string, { label: string; short: string; color: string; ring: string }> = {
  MULE_AGGREGATOR: { label: "Mule Aggregator Hubs", short: "MULE HUB", color: "#ef4444", ring: "#fca5a5" },
  CAROUSEL_RING: { label: "Carousel / Layering Rings", short: "RING", color: "#fb7185", ring: "#fda4af" },
  COMPROMISED_VICTIM: { label: "Compromised / Taken Clients", short: "TAKEN CLIENT", color: "#f59e0b", ring: "#fcd34d" },
  ISOLATED_ANOMALY: { label: "Isolated Periphery", short: "ISOLATED", color: "#64748b", ring: "#94a3b8" },
};

const C = 260;
const MAX_R = 210;

function point(radial: number, angle: number) {
  const r = 24 + radial * (MAX_R - 24);
  const rad = ((angle - 90) * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad), r };
}

export default function TopologicalRadarPanel({ rows, selectedId, roleFilter, onSelect, onRoleFilter }: Props) {
  const [showAll, setShowAll] = useState(true);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  const nodes = rows.filter((r) => r.topology);
  // Active focused node defaults to focusedId, or selectedId from props, or the first node
  const activeId = focusedId ?? selectedId ?? (nodes[0]?.alertId ?? null);
  const activeNode = rows.find((r) => r.alertId === activeId) ?? nodes[0] ?? null;
  const activeTopology = activeNode?.topology;

  const counts = useMemo(() => {
    const base: Record<string, number> = { MULE_AGGREGATOR: 0, CAROUSEL_RING: 0, COMPROMISED_VICTIM: 0, ISOLATED_ANOMALY: 0 };
    for (const row of nodes) if (row.topology) base[row.topology.forensic_role as keyof typeof base]++;
    return base;
  }, [nodes]);

  const edges = useMemo(() => {
    const list: { from: RadarRow; to: RadarRow; edge: Correlated }[] = [];
    const byId = new Map(rows.map((r) => [r.alertId, r]));
    const sources = showAll ? nodes : activeNode ? [activeNode] : [];
    for (const source of sources) {
      if (!source.topology) continue;
      for (const edge of source.topology.correlated_accounts ?? []) {
        const to = byId.get(edge.target_alert_id);
        if (to?.topology && (!showAll || edge.correlation_score >= 55)) list.push({ from: source, to, edge });
      }
    }
    return list;
  }, [rows, nodes, activeNode, showAll]);

  return (
    <section className="radar-workspace" aria-label="Topological AML radar and account correlation">
      <div className="radar-heading">
        <div><div className="eyebrow">FORENSIC GRAPH / NETWORK CONTAGION</div><h2>Concentric AML Radar &amp; Account Correlation</h2></div>
        <div className="radar-heading-right"><span>R = 1.0 − (0.40 C<sub>degree</sub> + 0.35 C<sub>clustering</sub> + 0.25 C<sub>diffusion</sub>)</span><button className="btn-outline" onClick={() => setShowAll((v) => !v)}>{showAll ? "Show Selected Links" : "Show All Ring Links"}</button></div>
      </div>

      <div className="radar-role-strip">
        {Object.entries(ROLE_META).map(([role, meta]) => (
          <button key={role} className={`radar-role-card ${roleFilter === role ? "active" : ""}`} onClick={() => onRoleFilter(roleFilter === role ? "" : role)}>
            <span className="radar-role-dot" style={{ background: meta.color }} />
            <span><strong>{counts[role]}</strong><small>{meta.label}</small></span>
          </button>
        ))}
      </div>

      <div className="radar-body">
        <div className="radar-canvas-wrap">
          <svg className="radar-svg" viewBox="0 0 520 520" role="img" aria-label="Concentric AML radar with client nodes">
            <defs>
              <radialGradient id="coreGradient"><stop offset="0%" stopColor="#fecaca" stopOpacity="0.85" /><stop offset="100%" stopColor="#f8fafc" stopOpacity="0.15" /></radialGradient>
              <filter id="glow"><feGaussianBlur stdDeviation="2.5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            </defs>
            <rect width="520" height="520" rx="14" fill="#f8fafc" />
            <circle cx={C} cy={C} r={210 * 0.35} fill="url(#coreGradient)" stroke="#dc2626" strokeDasharray="4 5" />
            <circle cx={C} cy={C} r={210 * 0.70} fill="none" stroke="#d97706" strokeOpacity="0.6" strokeDasharray="3 5" />
            <circle cx={C} cy={C} r="210" fill="none" stroke="#94a3b8" strokeOpacity="0.8" />
            <circle cx={C} cy={C} r="14" fill="#ef4444" opacity="0.24" />
            <line x1={C - 230} y1={C} x2={C + 230} y2={C} stroke="#cbd5e1" strokeDasharray="2 6" />
            <line x1={C} y1={C - 230} x2={C} y2={C + 230} stroke="#cbd5e1" strokeDasharray="2 6" />
            <text x={C} y="22" textAnchor="middle" className="radar-axis">STRUCTURING &amp; SMURFING</text>
            <text x="508" y={C + 4} textAnchor="end" className="radar-axis">MULE VELOCITY</text>
            <text x={C} y="510" textAnchor="middle" className="radar-axis">PEP &amp; HIGH-RISK CORRIDORS</text>
            <text x="12" y={C + 4} className="radar-axis">VOLUME &amp; ATO OUTLIERS</text>
            <text x={C + 8} y={C - 210 + 16} className="radar-ring-label">R 1.00</text>
            <text x={C + 8} y={C - 210 * 0.70 + 16} className="radar-ring-label">R 0.70</text>
            <text x={C + 8} y={C - 210 * 0.35 + 16} className="radar-ring-label">R 0.35</text>
            {edges.map(({ from, to, edge }, idx) => {
              if (!from.topology || !to.topology) return null;
              const a = point(from.topology.radial_distance, from.topology.radar_angle_deg);
              const b = point(to.topology.radial_distance, to.topology.radar_angle_deg);
              const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.12;
              const my = (a.y + b.y) / 2 - (b.x - a.x) * 0.12;
              return <path key={`${from.alertId}-${to.alertId}-${idx}`} d={`M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`} fill="none" stroke={edge.correlation_score >= 58 ? "#ef4444" : "#f59e0b"} strokeWidth={edge.correlation_score >= 58 ? 1.8 : 1.1} strokeDasharray={edge.correlation_score >= 58 ? "4 4" : undefined} opacity="0.75" />;
            })}
            {nodes.map((row) => {
              if (!row.topology) return null;
              const p = point(row.topology.radial_distance, row.topology.radar_angle_deg);
              const meta = ROLE_META[row.topology.forensic_role] ?? ROLE_META.ISOLATED_ANOMALY;
              const isFocused = row.alertId === activeId;
              return (
                <g
                  key={row.alertId}
                  className={`radar-node ${isFocused ? "focused" : ""}`}
                  onClick={() => setFocusedId(row.alertId)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { setFocusedId(row.alertId); } }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${row.alertId} ${row.topology.forensic_role}`}
                >
                  <title>{`${row.alertId} · ${row.topology.forensic_role_label} · score ${row.topology.topology_score} · R ${row.topology.radial_distance.toFixed(2)}`}</title>
                  {isFocused && (
                    <>
                      <circle cx={p.x} cy={p.y} r={17} fill="none" stroke={meta.ring} strokeWidth="2.5" strokeDasharray="3 3" opacity="0.95" />
                      <circle cx={p.x} cy={p.y} r={24} fill={meta.color} opacity="0.14" />
                    </>
                  )}
                  {row.topology.forensic_role === "MULE_AGGREGATOR" && <circle cx={p.x} cy={p.y} r={9} fill={meta.color} opacity="0.25" className="radar-pulse" />}
                  {row.topology.forensic_role === "CAROUSEL_RING"
                    ? <rect x={p.x - 5} y={p.y - 5} width="10" height="10" transform={`rotate(45 ${p.x} ${p.y})`} fill={meta.color} stroke={isFocused ? "#38bdf8" : "#1e293b"} strokeWidth={isFocused ? 2 : 0.7} />
                    : <circle cx={p.x} cy={p.y} r={row.topology.forensic_role === "COMPROMISED_VICTIM" ? 6.5 : 5.5} fill={meta.color} stroke={isFocused ? "#38bdf8" : "#0f172a"} strokeWidth={isFocused ? 2.5 : 1} filter="url(#glow)" />}
                  <text x={p.x + 8} y={p.y - 6} className={`radar-node-label ${isFocused ? "focused-label" : ""}`}>{row.alertId.replace("ALERT-", "A")}</text>
                </g>
              );
            })}
            <text x={C} y={C + 34} textAnchor="middle" className="radar-core-label">CORE BULLSEYE · R ≤ 0.35</text>
          </svg>
          <div className="radar-legend"><span><i style={{ background: "#ef4444" }} />Mule hub</span><span><i style={{ background: "#fb7185" }} />Ring</span><span><i style={{ background: "#f59e0b" }} />Taken client</span><span><i style={{ background: "#64748b" }} />Isolated</span></div>
        </div>

        <aside className="radar-inspector">
          <div className="radar-inspector-head">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
              <div>
                <span>ACCOUNT CORRELATION</span>
                <strong>{activeNode ? activeNode.alertId : "Select a node"}</strong>
                {activeNode && (
                  <div style={{ fontSize: "11px", color: "var(--secondary)", marginTop: "2px" }}>
                    Client: <span className="mono">{activeNode.clientId}</span>
                  </div>
                )}
              </div>
              {activeTopology && (
                <span className="role-badge" style={{ color: (ROLE_META[activeTopology.forensic_role] ?? ROLE_META.ISOLATED_ANOMALY).color }}>
                  {(ROLE_META[activeTopology.forensic_role] ?? ROLE_META.ISOLATED_ANOMALY).short} · R {activeTopology.radial_distance.toFixed(2)}
                </span>
              )}
            </div>

            {activeNode && (
              <div style={{ marginTop: "10px" }}>
                <button
                  type="button"
                  className="btn-primary radar-open-card-btn"
                  onClick={() => onSelect(activeNode)}
                  title={`Open full case dossier and transaction stream for ${activeNode.alertId}`}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                    padding: "8px 14px",
                    fontWeight: 700,
                    fontSize: "12px",
                    cursor: "pointer",
                    borderRadius: "6px",
                  }}
                >
                  <span>📂</span>
                  <span>Open Case Card ({activeNode.alertId})</span>
                  <span style={{ opacity: 0.75 }}>→</span>
                </button>
              </div>
            )}
          </div>

          {activeTopology ? (
            <>
              <p className="radar-statutory">{activeTopology.statutory_basis}</p>
              <div className="radar-metrics"><div><span>TOPOLOGY</span><strong>{activeTopology.topology_score}/100</strong></div><div><span>PASS-THROUGH</span><strong>{activeTopology.pass_through_hours}h</strong></div><div><span>IN/OUT</span><strong>{activeTopology.in_out_ratio.toFixed(4)}</strong></div><div><span>SHARED HUB</span><strong>{activeTopology.shared_counterparty_count}</strong></div></div>
              <div className="correlation-title">4-Signal correlation matrix</div>
              {(activeTopology.correlated_accounts ?? []).length === 0 ? <p className="radar-empty">No correlated accounts above 35%.</p> : activeTopology.correlated_accounts.map((c) => (
                <div className="correlation-item" key={c.target_alert_id}>
                  <div className="correlation-item-head"><strong>{c.target_alert_id}</strong><span>{c.target_client_id}</span><b>{c.correlation_score}%</b></div>
                  <div className="correlation-bars">
                    {[["IBAN 35%", c.shared_iban_score], ["TEMPORAL 30%", c.temporal_sync_score], ["AMOUNT 20%", c.amount_mirror_score], ["ENTITY 15%", c.entity_link_score]].map(([label, value]) => (
                      <div key={String(label)}><span>{label}</span><i><b style={{ width: `${value}%` }} /></i><em>{value}%</em></div>
                    ))}
                  </div>
                  <p>{c.correlation_reason}</p>
                  <div style={{ display: "flex", gap: "6px", marginTop: "8px" }}>
                    <button
                      type="button"
                      className="btn-outline"
                      style={{ flex: 1, fontSize: "11px", padding: "5px 8px" }}
                      onClick={() => setFocusedId(c.target_alert_id)}
                      title={`Inspect ${c.target_alert_id} in the radar without opening card`}
                    >
                      🎯 Focus Node ({c.target_alert_id.replace("ALERT-", "A")})
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ fontSize: "11px", padding: "5px 10px" }}
                      onClick={() => {
                        const target = rows.find((r) => r.alertId === c.target_alert_id);
                        if (target) onSelect(target);
                      }}
                      title={`Open case card for ${c.target_alert_id}`}
                    >
                      Open Card →
                    </button>
                  </div>
                </div>
              ))}
            </>
          ) : <p className="radar-empty">Click a node to inspect its correlation proof, role, and radial distance.</p>}
        </aside>
      </div>
    </section>
  );
}
