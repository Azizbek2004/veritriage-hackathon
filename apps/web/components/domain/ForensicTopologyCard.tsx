"use client";

import React from "react";
import {
  Network,
  GitFork,
  Clock,
  ArrowUpDown,
  Repeat,
  Layers,
  Activity,
  Scale,
  ShieldAlert,
  Info,
} from "lucide-react";

export type Correlated = {
  target_alert_id: string;
  target_client_id: string;
  correlation_score: number;
  shared_iban_score: number;
  temporal_sync_score: number;
  amount_mirror_score: number;
  entity_link_score: number;
  correlation_reason: string;
};

export type Topology = {
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

type Props = {
  topology: Topology;
  clientId: string;
  alertId: string;
  onJumpToAlert?: (alertId: string) => void;
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CAROUSEL_RING: {
    bg: "rgba(244, 63, 94, 0.12)",
    text: "#fb7185",
    border: "rgba(244, 63, 94, 0.35)",
    dot: "#f43f5e",
  },
  MULE_AGGREGATOR: {
    bg: "rgba(239, 68, 68, 0.12)",
    text: "#ef4444",
    border: "rgba(239, 68, 68, 0.35)",
    dot: "#dc2626",
  },
  COMPROMISED_VICTIM: {
    bg: "rgba(245, 158, 11, 0.12)",
    text: "#f59e0b",
    border: "rgba(245, 158, 11, 0.35)",
    dot: "#d97706",
  },
  ISOLATED_ANOMALY: {
    bg: "rgba(100, 116, 139, 0.12)",
    text: "#94a3b8",
    border: "rgba(100, 116, 139, 0.35)",
    dot: "#64748b",
  },
};

export default function ForensicTopologyCard({ topology, clientId, alertId, onJumpToAlert }: Props) {
  const roleStyle = ROLE_COLORS[topology.forensic_role] ?? ROLE_COLORS.ISOLATED_ANOMALY;
  const isCoreBullseye = topology.radial_distance <= 0.35;
  const isIntermediate = topology.radial_distance > 0.35 && topology.radial_distance <= 0.70;

  return (
    <div className="forensic-topology-card" aria-label="Network topology intelligence and forensic role decomposition">
      {/* Card Header */}
      <div className="ftc-header">
        <div className="ftc-header-left">
          <div className="ftc-eyebrow">
            <Network size={12} className="inline mr-1 text-primary" />
            <span>NETWORK TOPOLOGY INTELLIGENCE · § 6(1)(g) AML ACT</span>
          </div>
          <div className="ftc-title-row">
            <h3 className="ftc-title">{topology.forensic_role_label}</h3>
            <span
              className="ftc-role-badge"
              style={{
                backgroundColor: roleStyle.bg,
                color: roleStyle.text,
                borderColor: roleStyle.border,
              }}
            >
              <span className="ftc-role-dot" style={{ backgroundColor: roleStyle.dot }} />
              {topology.forensic_role}
            </span>
          </div>
        </div>

        <div className="ftc-header-right">
          <div className="ftc-r-container">
            <span className="ftc-r-label">RADIAL DISTANCE</span>
            <div className="ftc-r-val">R {topology.radial_distance.toFixed(2)}</div>
            <span className={`ftc-ring-tier ${isCoreBullseye ? "bullseye" : isIntermediate ? "mid" : "outer"}`}>
              {isCoreBullseye ? "Core Bullseye · High Contagion" : isIntermediate ? "Intermediate Ring" : "Periphery"}
            </span>
          </div>
        </div>
      </div>

      {/* 6 Key Network Topology Metric Tiles */}
      <div className="ftc-metrics-grid">
        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <Activity size={12} className="text-rose-500" />
            <span>TOPOLOGY SCORE</span>
          </div>
          <div className="ftc-metric-val font-mono">
            {topology.topology_score}
            <small>/100</small>
          </div>
          <span className="ftc-metric-sub">Contagion Index</span>
        </div>

        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <GitFork size={12} className="text-sky-500" />
            <span>SHARED HUBS</span>
          </div>
          <div className="ftc-metric-val font-mono">{topology.shared_counterparty_count}</div>
          <span className="ftc-metric-sub">Mule Counterparties</span>
        </div>

        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <Clock size={12} className="text-amber-500" />
            <span>PASS-THROUGH</span>
          </div>
          <div className="ftc-metric-val font-mono">{topology.pass_through_hours}h</div>
          <span className="ftc-metric-sub">Transit Velocity (Δt)</span>
        </div>

        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <ArrowUpDown size={12} className="text-emerald-500" />
            <span>IN/OUT RATIO</span>
          </div>
          <div className="ftc-metric-val font-mono">{topology.in_out_ratio.toFixed(4)}</div>
          <span className="ftc-metric-sub">Balance Retention</span>
        </div>

        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <Repeat size={12} className={topology.has_cyclic_flow ? "text-rose-500" : "text-slate-400"} />
            <span>CYCLIC FLOW</span>
          </div>
          <div className={`ftc-metric-val font-mono ${topology.has_cyclic_flow ? "text-rose-500 font-bold" : ""}`}>
            {topology.has_cyclic_flow ? "DETECTED" : "NONE"}
          </div>
          <span className="ftc-metric-sub">
            {topology.has_cyclic_flow ? "Layering Carousel Ring" : "Linear Propagation"}
          </span>
        </div>

        <div className="ftc-metric-tile">
          <div className="ftc-metric-head">
            <Layers size={12} className="text-indigo-500" />
            <span>CORRELATED ACCOUNTS</span>
          </div>
          <div className="ftc-metric-val font-mono">
            {topology.correlated_accounts.length}
            <small>links</small>
          </div>
          <span className="ftc-metric-sub">Cluster Entities</span>
        </div>
      </div>

      {/* Graph Centrality Decomposition Progress Bars */}
      <div className="ftc-bars-container">
        <div className="ftc-bars-head">
          <span className="ftc-bars-title">
            GRAPH CENTRALITY DECOMPOSITION
          </span>
          <span className="ftc-formula-pill">
            R = 1.0 − (0.40 C<sub>deg</sub> + 0.35 C<sub>clust</sub> + 0.25 C<sub>diff</sub>)
          </span>
        </div>

        <div className="ftc-bar-row">
          <div className="ftc-bar-info">
            <span className="ftc-bar-name">Degree Centrality (C<sub>degree</sub>)</span>
            <span className="ftc-bar-score font-mono">{topology.c_degree}%</span>
          </div>
          <div className="ftc-bar-track">
            <div
              className="ftc-bar-fill degree"
              style={{ width: `${Math.min(100, Math.max(0, topology.c_degree))}%` }}
            />
          </div>
          <span className="ftc-bar-hint">Measures immediate fan-out connections &amp; smurfing density</span>
        </div>

        <div className="ftc-bar-row">
          <div className="ftc-bar-info">
            <span className="ftc-bar-name">Clustering Coefficient (C<sub>clustering</sub>)</span>
            <span className="ftc-bar-score font-mono">{topology.c_clustering}%</span>
          </div>
          <div className="ftc-bar-track">
            <div
              className="ftc-bar-fill clustering"
              style={{ width: `${Math.min(100, Math.max(0, topology.c_clustering))}%` }}
            />
          </div>
          <span className="ftc-bar-hint">Measures triangle formation, circular loops &amp; layering density</span>
        </div>

        <div className="ftc-bar-row">
          <div className="ftc-bar-info">
            <span className="ftc-bar-name">Diffusion Reach (C<sub>diffusion</sub>)</span>
            <span className="ftc-bar-score font-mono">{topology.c_diffusion}%</span>
          </div>
          <div className="ftc-bar-track">
            <div
              className="ftc-bar-fill diffusion"
              style={{ width: `${Math.min(100, Math.max(0, topology.c_diffusion))}%` }}
            />
          </div>
          <span className="ftc-bar-hint">Measures multi-hop transit contagion reach across the financial network</span>
        </div>
      </div>

      {/* Statutory AML Basis Legal Box */}
      <div className="ftc-legal-box">
        <div className="ftc-legal-head">
          <Scale size={13} className="text-amber-500 flex-shrink-0" />
          <strong>Statutory Compliance &amp; Suspicious Transaction Grounds</strong>
        </div>
        <p className="ftc-legal-text">{topology.statutory_basis}</p>
        <div className="ftc-legal-badges">
          <span className="ftc-statute-tag">Act No. 253/2008 Sb. § 6(1)(g)</span>
          <span className="ftc-statute-tag">ČNB Decree 67/2018 Sb. § 6(1)(b)</span>
          <span className="ftc-statute-tag">FAÚ § 20 Postponement Mandatory</span>
        </div>
      </div>

      {/* Linked Correlated Accounts Carousel Peek */}
      {topology.correlated_accounts.length > 0 && (
        <div className="ftc-correlated-section">
          <div className="ftc-correlated-head">
            <span className="ftc-correlated-title">CORRELATED ACCOUNTS IN LAYERING RING</span>
            <span className="ftc-correlated-count">{topology.correlated_accounts.length} linked accounts</span>
          </div>
          <div className="ftc-correlated-chips">
            {topology.correlated_accounts.map((c) => (
              <div key={c.target_alert_id} className="ftc-correlated-chip">
                <div className="ftc-chip-top">
                  <span className="ftc-chip-id font-mono">{c.target_alert_id}</span>
                  <span className="ftc-chip-score font-mono">{c.correlation_score}% match</span>
                </div>
                <div className="ftc-chip-client font-mono">{c.target_client_id}</div>
                <div className="ftc-chip-reason">{c.correlation_reason}</div>
                {onJumpToAlert && (
                  <button
                    type="button"
                    className="ftc-chip-jump-btn"
                    onClick={() => onJumpToAlert(c.target_alert_id)}
                  >
                    Inspect Case →
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
