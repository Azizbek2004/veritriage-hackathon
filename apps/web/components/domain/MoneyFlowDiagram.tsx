"use client";

import React, { useEffect, useState } from "react";

export interface FlowNode {
  id: string;
  label: string;
  type: string;
  total_in_czk: number;
  total_out_czk: number;
  risk_tier: string;
  is_fau_postponed: boolean;
}

export interface FlowEdge {
  source_id: string;
  target_id: string;
  amount_czk: number;
  currency: string;
  timestamp: string;
  transaction_id: string;
  hop_index: number;
  transit_delta_hours: number;
  is_sub_threshold: boolean;
}

export interface FlowPath {
  path_id: string;
  hops: string[];
  total_volume_czk: number;
  duration_hours: number;
  preservation_ratio: number;
  typology: string;
}

export interface MoneyFlowGraph {
  alert_id: string;
  client_id: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  paths: FlowPath[];
  aggregate_outflow_czk: number;
  aggregate_inflow_czk: number;
  flow_conservation_ratio: number;
  structuring_fan_out_degree: number;
  is_layering_detected: boolean;
}

interface Props {
  alertId?: string;
  caseId?: string;
  apiBase?: string;
}

export default function MoneyFlowDiagram({ alertId, caseId, apiBase }: Props) {
  const targetId = alertId ?? caseId ?? "";
  const resolvedBase = apiBase ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";
  const [data, setData] = useState<MoneyFlowGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`${resolvedBase}/api/v1/cases/${targetId}/money-flow`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((graph: MoneyFlowGraph) => {
        if (!cancelled) {
          setData(graph);
          setSelectedNode(graph.nodes.find((n) => n.type === "ORIGIN_CLIENT") ?? graph.nodes[0] ?? null);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [alertId, apiBase]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400 font-mono text-xs">
        <div className="animate-spin inline-block w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full mb-2"></div>
        <div>Reconstructing multi-hop money flow from ČNB transaction index...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-4 bg-rose-950/40 border border-rose-800 rounded text-rose-300 text-xs font-mono">
        Failed to load money flow: {error ?? "No flow data returned"}
      </div>
    );
  }

  // Layout positions: 3 columns (Origin on Left, Mule/Hops in Center, Destination on Right)
  const width = 640;
  const height = 300;

  const originNodes = data.nodes.filter((n) => n.type === "ORIGIN_CLIENT" || n.id.startsWith("INFLOW-"));
  const hopNodes = data.nodes.filter((n) => n.type === "MULE_HOP" || n.type === "COUNTERPARTY_CLUSTER");
  const destNodes = data.nodes.filter((n) => n.type === "DESTINATION_ACCOUNT");

  const posMap = new Map<string, { x: number; y: number }>();

  originNodes.forEach((node, i) => {
    const y = 60 + ((height - 120) / Math.max(1, originNodes.length - 1 || 1)) * i;
    posMap.set(node.id, { x: 70, y: originNodes.length === 1 ? height / 2 : y });
  });

  hopNodes.forEach((node, i) => {
    const y = 45 + ((height - 90) / Math.max(1, hopNodes.length - 1 || 1)) * i;
    posMap.set(node.id, { x: 310, y: hopNodes.length === 1 ? height / 2 : y });
  });

  destNodes.forEach((node, i) => {
    const y = 60 + ((height - 120) / Math.max(1, destNodes.length - 1 || 1)) * i;
    posMap.set(node.id, { x: 550, y: destNodes.length === 1 ? height / 2 : y });
  });

  return (
    <div className="money-flow-panel bg-slate-900 border border-slate-700 rounded-lg p-4 text-xs font-sans">
      {/* Top Flow Metrics Banner */}
      <div className="flow-kpis grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 bg-slate-800/60 p-2.5 rounded border border-slate-700/60 font-mono text-[11px]">
        <div>
          <span className="text-slate-400 block text-[9px] uppercase">Aggregate Outflow</span>
          <span className="text-amber-400 font-semibold">{data.aggregate_outflow_czk.toLocaleString()} CZK</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase">Conservation Ratio</span>
          <span className="text-emerald-400 font-semibold">{(data.flow_conservation_ratio * 100).toFixed(0)}% flow</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase">Structuring Fan-Out</span>
          <span className="text-rose-400 font-semibold">{data.structuring_fan_out_degree} sub-threshold</span>
        </div>
        <div>
          <span className="text-slate-400 block text-[9px] uppercase">Layering Detected</span>
          <span className={data.is_layering_detected ? "text-rose-400 font-bold" : "text-slate-300"}>
            {data.is_layering_detected ? "⚠ § 6(1)(b) ACTIVE" : "No Cycle"}
          </span>
        </div>
      </div>

      {/* Directed Graph SVG */}
      <div className="relative overflow-x-auto bg-slate-950/80 rounded border border-slate-800 p-2">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto min-w-[580px]">
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#94a3b8" />
            </marker>
            <marker id="arrow-sub" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#f43f5e" />
            </marker>
          </defs>

          {/* Column labels */}
          <text x="70" y="20" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">ORIGIN CLIENT</text>
          <text x="310" y="20" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">INTERMEDIARY HOPS (MULES)</text>
          <text x="550" y="20" fill="#64748b" fontSize="10" textAnchor="middle" fontFamily="monospace">DESTINATION / CASHOUT</text>

          {/* Directed Edges */}
          {data.edges.map((edge, idx) => {
            const p1 = posMap.get(edge.source_id);
            const p2 = posMap.get(edge.target_id);
            if (!p1 || !p2) return null;

            const mx = (p1.x + p2.x) / 2;
            const my = (p1.y + p2.y) / 2 - 10;
            const strokeColor = edge.is_sub_threshold ? "#f43f5e" : edge.hop_index === 2 ? "#eab308" : "#38bdf8";

            return (
              <g key={`edge-${idx}`}>
                <path
                  d={`M ${p1.x + 15} ${p1.y} Q ${mx} ${my} ${p2.x - 15} ${p2.y}`}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={edge.is_sub_threshold ? "2" : "1.2"}
                  strokeDasharray={edge.is_sub_threshold ? "4 3" : undefined}
                  markerEnd={edge.is_sub_threshold ? "url(#arrow-sub)" : "url(#arrow)"}
                  opacity="0.85"
                />
                <text
                  x={mx}
                  y={my - 4}
                  fill={strokeColor}
                  fontSize="8.5"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {edge.amount_czk.toLocaleString()} CZK {edge.transit_delta_hours > 0 ? `(Δt ${edge.transit_delta_hours}h)` : ""}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {data.nodes.map((node) => {
            const pos = posMap.get(node.id);
            if (!pos) return null;

            const isSelected = selectedNode?.id === node.id;
            const isOrigin = node.type === "ORIGIN_CLIENT";
            const isMule = node.type === "MULE_HOP";
            const isDest = node.type === "DESTINATION_ACCOUNT";

            const fillBg = isMule ? "#450a0a" : isOrigin ? "#022c22" : isDest ? "#422006" : "#0f172a";
            const strokeColor = isMule ? "#ef4444" : isOrigin ? "#10b981" : isDest ? "#f59e0b" : "#475569";

            return (
              <g
                key={node.id}
                transform={`translate(${pos.x}, ${pos.y})`}
                onClick={() => setSelectedNode(node)}
                className="cursor-pointer transition-transform hover:scale-110"
              >
                <circle
                  r={isSelected ? "18" : "14"}
                  fill={fillBg}
                  stroke={strokeColor}
                  strokeWidth={isSelected ? "3" : "1.8"}
                />
                {isMule && (
                  <circle r="22" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" className="animate-spin" />
                )}
                <text
                  y="4"
                  fill="#f8fafc"
                  fontSize="9"
                  fontFamily="monospace"
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {isOrigin ? "ORG" : isMule ? "MULE" : isDest ? "DEST" : "IN"}
                </text>
                <text
                  y="28"
                  fill="#cbd5e1"
                  fontSize="8"
                  fontFamily="monospace"
                  textAnchor="middle"
                >
                  {node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Selected Node Details */}
      {selectedNode && (
        <div className="mt-3 p-2.5 bg-slate-800/80 border border-slate-700 rounded flex flex-wrap items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-slate-400 mr-2 font-mono text-[10px]">INSPECTED NODE:</span>
            <span className="font-semibold text-slate-100">{selectedNode.label}</span>
            <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-700 text-slate-300">
              {selectedNode.type}
            </span>
          </div>
          <div className="flex items-center gap-4 font-mono text-[11px]">
            <div>
              <span className="text-slate-400">Total In:</span>{" "}
              <span className="text-emerald-400">{selectedNode.total_in_czk.toLocaleString()} CZK</span>
            </div>
            <div>
              <span className="text-slate-400">Total Out:</span>{" "}
              <span className="text-amber-400">{selectedNode.total_out_czk.toLocaleString()} CZK</span>
            </div>
            {selectedNode.is_fau_postponed && (
              <span className="px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700 text-[10px] font-bold">
                FAÚ § 20 TARGET
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
