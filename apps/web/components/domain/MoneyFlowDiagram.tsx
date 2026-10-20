"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import {
  Network,
  ArrowRight,
  ShieldAlert,
  Clock,
  Coins,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Activity,
  Maximize2,
  Minimize2,
  Sparkles,
} from "lucide-react";

export interface FlowNode {
  id: string;
  label: string;
  type: string;
  total_in_czk: number;
  total_out_czk: number;
  risk_tier: string;
  is_fau_postponed: boolean;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
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
  source?: any;
  target?: any;
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
  onPostponeRequested?: (nodeId: string) => void;
}

type LayoutMode = "STAGED_PIPELINE" | "CIRCULAR_LAYERING";

export default function MoneyFlowDiagram({
  alertId,
  caseId,
  apiBase,
  onPostponeRequested,
}: Props) {
  const targetId = alertId ?? caseId ?? "";
  const resolvedBase = apiBase ?? process.env.NEXT_PUBLIC_API_BASE ?? "http://127.0.0.1:5000";

  const [data, setData] = useState<MoneyFlowGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("STAGED_PIPELINE");
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [showParticles, setShowParticles] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  // Load graph data from API
  useEffect(() => {
    if (!targetId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`${resolvedBase}/api/v1/cases/${targetId}/money-flow`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((graph: MoneyFlowGraph) => {
        if (!cancelled) {
          setData(graph);
          const initial = graph.nodes.find((n) => n.type === "ORIGIN_CLIENT") ?? graph.nodes[0] ?? null;
          setSelectedNode(initial);
          setSelectedEdge(null);
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
  }, [targetId, resolvedBase]);

  // Set up D3 Zoom
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3.5])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    zoomBehaviorRef.current = zoom;
    svg.call(zoom);

    // Initial reset
    svg.call(zoom.transform, d3.zoomIdentity);
  }, [layoutMode, data, isExpanded]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 1.25);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(250).call(zoomBehaviorRef.current.scaleBy, 0.8);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(350).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  const handleDownloadSvg = () => {
    if (!svgRef.current) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svgRef.current);
    const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `money-trail-${targetId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Node & Edge positioning
  const width = isExpanded ? 880 : 640;
  const height = isExpanded ? 460 : 320;

  // Compute Layout Positions
  const nodePositions = useMemo(() => {
    const positions = new Map<string, { x: number; y: number }>();
    if (!data) return positions;

    if (layoutMode === "STAGED_PIPELINE") {
      // 3-Stage Sankey Pipeline: Left (Origin) -> Center (Mules/Clusters) -> Right (Destinations)
      const originNodes = data.nodes.filter((n) => n.type === "ORIGIN_CLIENT" || n.id.startsWith("INFLOW-"));
      const hopNodes = data.nodes.filter((n) => n.type === "MULE_HOP" || n.type === "COUNTERPARTY_CLUSTER");
      const destNodes = data.nodes.filter((n) => n.type === "DESTINATION_ACCOUNT" || (!originNodes.includes(n) && !hopNodes.includes(n)));

      const col1X = width * 0.16;
      const col2X = width * 0.5;
      const col3X = width * 0.84;

      originNodes.forEach((node, i) => {
        const y = originNodes.length === 1 ? height / 2 : 75 + ((height - 150) / Math.max(1, originNodes.length - 1)) * i;
        positions.set(node.id, { x: col1X, y });
      });

      hopNodes.forEach((node, i) => {
        const y = hopNodes.length === 1 ? height / 2 : 60 + ((height - 120) / Math.max(1, hopNodes.length - 1)) * i;
        positions.set(node.id, { x: col2X, y });
      });

      destNodes.forEach((node, i) => {
        const y = destNodes.length === 1 ? height / 2 : 75 + ((height - 150) / Math.max(1, destNodes.length - 1)) * i;
        positions.set(node.id, { x: col3X, y });
      });
    } else {
      // Circular Ring Layout for Layering Detection
      const centerX = width / 2;
      const centerY = height / 2;
      const radius = Math.min(width, height) * 0.38;
      const total = data.nodes.length;

      data.nodes.forEach((node, i) => {
        const angle = (i / total) * 2 * Math.PI - Math.PI / 2;
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        positions.set(node.id, { x, y });
      });
    }

    return positions;
  }, [data, layoutMode, width, height]);

  // Active path node filter
  const activeHopsSet = useMemo(() => {
    if (!activePathId || !data) return null;
    const path = data.paths.find((p) => p.path_id === activePathId);
    return path ? new Set(path.hops) : null;
  }, [activePathId, data]);

  if (loading) {
    return (
      <div className="money-flow-panel-v2 loading-box">
        <div className="flow-spinner" />
        <div className="font-mono text-xs text-slate-400 mt-2">
          Reconstructing multi-hop money flow DAG from ČNB transaction index…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="money-flow-panel-v2 error-box">
        <ShieldAlert size={16} className="text-rose-400" />
        <span className="font-mono text-xs text-rose-300">Failed to load money flow: {error ?? "No flow data returned"}</span>
      </div>
    );
  }

  return (
    <div className={`money-flow-panel-v2 ${isExpanded ? "expanded" : ""}`}>
      {/* Top Header & Forensic Telemetry */}
      <div className="flow-header">
        <div className="flow-title-wrap">
          <div className="flow-title">
            <Network size={15} className="text-emerald-400" />
            <strong className="text-white text-xs">Multi-Hop Money Trail &amp; Layering DAG</strong>
            <span className="statute-chip">§ 6(1)(b) AML Act</span>
          </div>
          <div className="flow-subtitle font-mono text-[10px] text-slate-400">
            Reconstructed topology: {data.nodes.length} accounts · {data.edges.length} transfers
          </div>
        </div>

        {/* Toolbar Controls */}
        <div className="flow-toolbar">
          <div className="mode-toggle-group">
            <button
              className={`mode-btn ${layoutMode === "STAGED_PIPELINE" ? "active" : ""}`}
              onClick={() => setLayoutMode("STAGED_PIPELINE")}
              title="3-Stage Pipeline (Origin -> Mules -> Cashout)"
            >
              <Layers size={12} />
              <span>Pipeline</span>
            </button>
            <button
              className={`mode-btn ${layoutMode === "CIRCULAR_LAYERING" ? "active" : ""}`}
              onClick={() => setLayoutMode("CIRCULAR_LAYERING")}
              title="Circular Layering Loops"
            >
              <RotateCcw size={12} />
              <span>Loops</span>
            </button>
          </div>

          <div className="action-button-group">
            <button
              className={`icon-btn ${showParticles ? "active" : ""}`}
              onClick={() => setShowParticles((p) => !p)}
              title={showParticles ? "Disable Flow Particles" : "Enable Flow Particles"}
            >
              <Sparkles size={13} />
            </button>
            <button className="icon-btn" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={13} />
            </button>
            <button className="icon-btn" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={13} />
            </button>
            <button className="icon-btn" onClick={handleResetZoom} title="Reset View">
              <RotateCcw size={13} />
            </button>
            <button className="icon-btn" onClick={handleDownloadSvg} title="Export Graph SVG">
              <Download size={13} />
            </button>
            <button
              className="icon-btn"
              onClick={() => setIsExpanded((e) => !e)}
              title={isExpanded ? "Collapse View" : "Expand Full View"}
            >
              {isExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
          </div>
        </div>
      </div>

      {/* KPI Forensic Metrics Bar */}
      <div className="flow-kpi-bar">
        <div className="kpi-cell">
          <span className="kpi-lbl">
            <Coins size={10} className="mr-1 text-slate-400 inline" />
            Outflow Volume
          </span>
          <strong className="kpi-val text-amber-400 font-mono">
            {new Intl.NumberFormat("cs-CZ").format(data.aggregate_outflow_czk)} CZK
          </strong>
        </div>
        <div className="kpi-cell">
          <span className="kpi-lbl">
            <Activity size={10} className="mr-1 text-slate-400 inline" />
            Conservation
          </span>
          <strong className="kpi-val text-emerald-400 font-mono">
            {(data.flow_conservation_ratio * 100).toFixed(0)}%
          </strong>
        </div>
        <div className="kpi-cell">
          <span className="kpi-lbl">
            <ShieldAlert size={10} className="mr-1 text-slate-400 inline" />
            Structuring Fan-Out
          </span>
          <strong className="kpi-val text-rose-400 font-mono">
            {data.structuring_fan_out_degree} txs
          </strong>
        </div>
        <div className="kpi-cell">
          <span className="kpi-lbl">Layering Topology</span>
          <strong className={`kpi-val font-mono ${data.is_layering_detected ? "text-rose-400 font-bold" : "text-slate-300"}`}>
            {data.is_layering_detected ? "⚠ DETECTED" : "LINEAR"}
          </strong>
        </div>
      </div>

      {/* Path Filter Pills */}
      {data.paths.length > 0 && (
        <div className="path-strip">
          <span className="path-strip-title">FILTER BY TRAIL:</span>
          <button
            className={`path-chip ${activePathId === null ? "active" : ""}`}
            onClick={() => setActivePathId(null)}
          >
            All Trails ({data.paths.length})
          </button>
          {data.paths.map((p) => (
            <button
              key={p.path_id}
              className={`path-chip ${activePathId === p.path_id ? "active" : ""}`}
              onClick={() => setActivePathId(activePathId === p.path_id ? null : p.path_id)}
            >
              <span>{p.path_id}</span>
              <small>({new Intl.NumberFormat("cs-CZ").format(p.total_volume_czk)} CZK)</small>
            </button>
          ))}
        </div>
      )}

      {/* SVG Canvas Area */}
      <div className="flow-canvas-wrap">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="flow-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Linear Gradients for Flow Links */}
            <linearGradient id="flow-grad-standard" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>
            <linearGradient id="flow-grad-structuring" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#fb7185" stopOpacity="0.95" />
            </linearGradient>
            <linearGradient id="flow-grad-hop2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#eab308" stopOpacity="0.85" />
            </linearGradient>

            {/* Arrow Markers */}
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#38bdf8" />
            </marker>
            <marker id="arrow-rose" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#f43f5e" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 1.5 L 10 5 L 0 8.5 z" fill="#eab308" />
            </marker>

            {/* Glowing Drop Shadow Filter */}
            <filter id="node-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#f43f5e" floodOpacity="0.5" />
            </filter>
            <filter id="origin-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Root Pan/Zoom Container */}
          <g ref={gRef}>
            {/* Stage Column Background Guides for Pipeline Mode */}
            {layoutMode === "STAGED_PIPELINE" && (
              <g className="stage-guides">
                <line x1={width * 0.33} y1="28" x2={width * 0.33} y2={height - 15} stroke="#1e293b" strokeDasharray="3 3" />
                <line x1={width * 0.67} y1="28" x2={width * 0.67} y2={height - 15} stroke="#1e293b" strokeDasharray="3 3" />

                <text x={width * 0.16} y="18" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="0.08em">
                  STAGE 1: ORIGIN / INFLOW
                </text>
                <text x={width * 0.5} y="18" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="0.08em">
                  STAGE 2: TRANSIT HOPS &amp; MULES
                </text>
                <text x={width * 0.84} y="18" fill="#64748b" fontSize="8" fontFamily="monospace" textAnchor="middle" letterSpacing="0.08em">
                  STAGE 3: CASHOUT / DESTINATION
                </text>
              </g>
            )}

            {/* Directed Edges */}
            {data.edges.map((edge, idx) => {
              const p1 = nodePositions.get(edge.source_id);
              const p2 = nodePositions.get(edge.target_id);
              if (!p1 || !p2) return null;

              const isEdgeActive = !activeHopsSet || (activeHopsSet.has(edge.source_id) && activeHopsSet.has(edge.target_id));
              const isSelected = selectedEdge === edge;

              // Smooth Cubic Bezier Curves
              const dx = p2.x - p1.x;
              const curveStrength = Math.max(35, Math.abs(dx) * 0.45);
              const c1x = p1.x + (dx >= 0 ? curveStrength : -curveStrength);
              const c1y = p1.y;
              const c2x = p2.x - (dx >= 0 ? curveStrength : -curveStrength);
              const c2y = p2.y;

              const pathString = `M ${p1.x} ${p1.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`;

              const midX = (p1.x + p2.x) / 2;
              const midY = (p1.y + p2.y) / 2 - 8;

              const strokeGrad = edge.is_sub_threshold
                ? "url(#flow-grad-structuring)"
                : edge.hop_index === 2
                ? "url(#flow-grad-hop2)"
                : "url(#flow-grad-standard)";

              const markerId = edge.is_sub_threshold
                ? "url(#arrow-rose)"
                : edge.hop_index === 2
                ? "url(#arrow-amber)"
                : "url(#arrow-cyan)";

              return (
                <g
                  key={`edge-${idx}`}
                  className={`edge-group ${isSelected ? "selected" : ""} ${isEdgeActive ? "" : "dimmed"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEdge(edge);
                  }}
                >
                  {/* Broad hitbox */}
                  <path d={pathString} fill="none" stroke="transparent" strokeWidth="16" className="cursor-pointer" />

                  {/* Visual Edge Path */}
                  <path
                    d={pathString}
                    fill="none"
                    stroke={strokeGrad}
                    strokeWidth={isSelected ? "2.5" : edge.is_sub_threshold ? "2" : "1.4"}
                    strokeDasharray={edge.is_sub_threshold ? "5 3" : undefined}
                    markerEnd={markerId}
                    opacity={isEdgeActive ? 0.9 : 0.25}
                  />

                  {/* Flow Particles */}
                  {showParticles && isEdgeActive && (
                    <circle r={edge.is_sub_threshold ? "2.8" : "2"} fill={edge.is_sub_threshold ? "#f43f5e" : "#38bdf8"}>
                      <animateMotion
                        dur={edge.transit_delta_hours > 0 ? `${Math.max(1.5, Math.min(4, edge.transit_delta_hours))}s` : "2s"}
                        repeatCount="indefinite"
                        path={pathString}
                      />
                    </circle>
                  )}

                  {/* Amount Badge */}
                  <rect
                    x={midX - 38}
                    y={midY - 7}
                    width="76"
                    height="14"
                    rx="3"
                    fill="#080d19"
                    stroke={edge.is_sub_threshold ? "#f43f5e" : "#24324a"}
                    strokeWidth="0.8"
                    opacity={isEdgeActive ? 0.95 : 0.3}
                  />
                  <text
                    x={midX}
                    y={midY + 3}
                    fill={edge.is_sub_threshold ? "#fb7185" : "#cbd5e1"}
                    fontSize="7"
                    fontFamily="monospace"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {new Intl.NumberFormat("cs-CZ").format(edge.amount_czk)} CZK
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {data.nodes.map((node) => {
              const pos = nodePositions.get(node.id);
              if (!pos) return null;

              const isNodeActive = !activeHopsSet || activeHopsSet.has(node.id);
              const isSelected = selectedNode?.id === node.id;
              const isOrigin = node.type === "ORIGIN_CLIENT";
              const isMule = node.type === "MULE_HOP";
              const isDest = node.type === "DESTINATION_ACCOUNT";

              const fillBg = isMule ? "#3b0707" : isOrigin ? "#022c22" : isDest ? "#381a03" : "#0f172a";
              const strokeColor = isMule ? "#ef4444" : isOrigin ? "#10b981" : isDest ? "#f59e0b" : "#475569";
              const nodeRadius = isSelected ? 18 : isOrigin ? 16 : 14;

              return (
                <g
                  key={node.id}
                  transform={`translate(${pos.x}, ${pos.y})`}
                  className={`node-group cursor-pointer ${isSelected ? "selected" : ""} ${isNodeActive ? "" : "dimmed"}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(node);
                    setSelectedEdge(null);
                  }}
                >
                  {/* Selection Ring */}
                  {isSelected && (
                    <circle r={nodeRadius + 5} fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3 3" />
                  )}

                  {/* Mule Danger Ring */}
                  {isMule && (
                    <circle r={nodeRadius + 4} fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2 2" />
                  )}

                  {/* Main Circle */}
                  <circle
                    r={nodeRadius}
                    fill={fillBg}
                    stroke={strokeColor}
                    strokeWidth={isSelected ? "2.5" : "1.8"}
                    filter={isMule ? "url(#node-glow)" : isOrigin ? "url(#origin-glow)" : undefined}
                  />

                  {/* Node Role Code */}
                  <text
                    y="3"
                    fill="#f8fafc"
                    fontSize="8"
                    fontFamily="monospace"
                    fontWeight="bold"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {isOrigin ? "ORG" : isMule ? "MULE" : isDest ? "DEST" : "IN"}
                  </text>

                  {/* Node Label Below */}
                  <text
                    y={nodeRadius + 12}
                    fill={isSelected ? "#38bdf8" : "#94a3b8"}
                    fontSize="7"
                    fontFamily="monospace"
                    fontWeight={isSelected ? "bold" : "normal"}
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {node.label.length > 18 ? node.label.slice(0, 16) + "…" : node.label}
                  </text>

                  {/* Subtitle Amount */}
                  <text
                    y={nodeRadius + 21}
                    fill="#64748b"
                    fontSize="6"
                    fontFamily="monospace"
                    textAnchor="middle"
                    pointerEvents="none"
                  >
                    {new Intl.NumberFormat("cs-CZ").format(Math.max(node.total_in_czk, node.total_out_czk))} CZK
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Selected Element Interactive Inspection Card */}
      {selectedNode && (
        <div className="flow-inspector-card">
          <div className="inspector-head">
            <div className="flex items-center gap-2">
              <span className="inspector-tag">INSPECTED ACCOUNT / ENTITY</span>
              <span className={`role-badge ${selectedNode.type.toLowerCase()}`}>
                {selectedNode.type}
              </span>
              {selectedNode.is_fau_postponed && (
                <span className="freeze-badge">❄️ FAÚ § 20 FROZEN</span>
              )}
            </div>
            <strong className="inspector-title font-mono">{selectedNode.label}</strong>
          </div>

          <div className="inspector-grid">
            <div className="inspector-field">
              <span className="field-lbl">Identifier</span>
              <span className="field-val font-mono">{selectedNode.id}</span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Risk Tier</span>
              <span className="field-val font-mono">{selectedNode.risk_tier}</span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Inflow Volume</span>
              <span className="field-val font-mono text-emerald-400">
                {new Intl.NumberFormat("cs-CZ").format(selectedNode.total_in_czk)} CZK
              </span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Outflow Volume</span>
              <span className="field-val font-mono text-amber-400">
                {new Intl.NumberFormat("cs-CZ").format(selectedNode.total_out_czk)} CZK
              </span>
            </div>
          </div>

          {onPostponeRequested && (
            <div className="mt-2 flex justify-end">
              <button
                className="btn-outline text-[11px] py-1 px-3 border-rose-700 text-rose-300 hover:bg-rose-950/60"
                onClick={() => onPostponeRequested(selectedNode.id)}
              >
                ❄️ Order Statutory Postponement on {selectedNode.id} (§ 20)
              </button>
            </div>
          )}
        </div>
      )}

      {selectedEdge && (
        <div className="flow-inspector-card edge-inspector">
          <div className="inspector-head">
            <div className="flex items-center gap-2">
              <span className="inspector-tag">DIRECTED TRANSFER DETAILS</span>
              <span className="font-mono text-[10px] text-slate-300">
                TX: {selectedEdge.transaction_id}
              </span>
              {selectedEdge.is_sub_threshold && (
                <span className="freeze-badge">⚠ SUB-THRESHOLD SMURFING</span>
              )}
            </div>
            <div className="inspector-title font-mono flex items-center gap-2">
              <span>{selectedEdge.source_id}</span>
              <ArrowRight size={12} className="text-slate-400" />
              <span>{selectedEdge.target_id}</span>
            </div>
          </div>

          <div className="inspector-grid">
            <div className="inspector-field">
              <span className="field-lbl">Transfer Amount</span>
              <span className="field-val font-mono text-amber-400">
                {new Intl.NumberFormat("cs-CZ").format(selectedEdge.amount_czk)} {selectedEdge.currency}
              </span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Transit Duration (Δt)</span>
              <span className="field-val font-mono">
                {selectedEdge.transit_delta_hours > 0 ? `${selectedEdge.transit_delta_hours} hours` : "< 30 mins (Rapid)"}
              </span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Hop Index</span>
              <span className="field-val font-mono">Hop #{selectedEdge.hop_index}</span>
            </div>
            <div className="inspector-field">
              <span className="field-lbl">Timestamp</span>
              <span className="field-val font-mono">{selectedEdge.timestamp.slice(0, 19).replace("T", " ")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
