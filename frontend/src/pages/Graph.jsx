import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { api } from '../api/client';
import { MOCK_GRAPH } from '../lib/mockData';
import Spinner from '../components/ui/Spinner';

const NODE_COLORS = {
  province: '#f59e0b',
  input: '#8b5cf6',
  ksm: '#8b5cf6',
  api: '#10b981',
  drug: '#3b82f6',
};

const TYPE_RADIUS = {
  province: 12,
  input: 9,
  ksm: 8,
  api: 10,
  drug: 9,
};

const TYPE_LABELS = {
  province: 'Province',
  input: 'Input',
  ksm: 'KSM',
  api: 'API',
  drug: 'Drug',
};

const FILTERS = ['all', 'province', 'api', 'drug', 'input'];

function riskColor(risk) {
  const value = Number(risk || 0);
  if (value >= 80) return '#f43f5e';
  if (value >= 60) return '#f59e0b';
  if (value >= 35) return '#4f9cf9';
  return '#10b981';
}

function riskBand(risk) {
  const value = Number(risk || 0);
  if (value >= 80) return 'Critical';
  if (value >= 60) return 'High';
  if (value >= 35) return 'Elevated';
  return 'Contained';
}

function formatCompact(value) {
  const num = Number(value || 0);
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}k`;
  return `${Math.round(num)}`;
}

function useSize(ref) {
  const [size, setSize] = useState({ w: 1040, h: 660 });

  useEffect(() => {
    if (!ref.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      setSize({
        w: Math.max(640, Math.round(entry.contentRect.width)),
        h: Math.max(560, Math.round(entry.contentRect.height)),
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);

  return size;
}

function buildLayout(nodes, width, height) {
  const positions = {};
  const buckets = { 0: [], 1: [], 2: [] };
  const columnForType = { province: 0, input: 0, ksm: 0, api: 1, drug: 2 };
  const sorted = [...nodes].sort((a, b) => {
    const colDiff = (columnForType[a.type] ?? 1) - (columnForType[b.type] ?? 1);
    if (colDiff !== 0) return colDiff;
    return Number(b.attributes?.current_risk || 0) - Number(a.attributes?.current_risk || 0);
  });

  sorted.forEach((node) => {
    const column = columnForType[node.type] ?? 1;
    buckets[column].push(node);
  });

  const paddingX = 84;
  const paddingY = 80;
  const columns = [
    paddingX + (width - paddingX * 2) * 0.12,
    paddingX + (width - paddingX * 2) * 0.48,
    paddingX + (width - paddingX * 2) * 0.84,
  ];

  [0, 1, 2].forEach((column) => {
    const nodesInColumn = buckets[column];
    const count = nodesInColumn.length;
    const step = count > 1 ? (height - paddingY * 2) / (count - 1) : 0;

    nodesInColumn.forEach((node, index) => {
      const baseY = count === 1 ? height / 2 : paddingY + step * index;
      const wave = ((index % 2 === 0 ? 1 : -1) * Math.min(20, Number(node.attributes?.current_risk || 0) / 7));
      positions[node.id] = {
        x: columns[column] + (column === 1 ? wave * 0.18 : 0),
        y: baseY + (column === 0 ? wave : column === 2 ? -wave * 0.35 : wave * 0.12),
      };
    });
  });

  return positions;
}

function buildPath(source, target) {
  const distance = Math.abs(target.x - source.x);
  const curve = Math.max(46, distance * 0.34);
  const midX = (source.x + target.x) / 2;
  return `M ${source.x} ${source.y} C ${midX - curve} ${source.y}, ${midX + curve} ${target.y}, ${target.x} ${target.y}`;
}

function SummaryMetric({ label, value, sub, tone = 'var(--text)' }) {
  return (
    <div className="graph-metric-card">
      <p className="graph-metric-value" style={{ color: tone }}>{value}</p>
      <p className="graph-metric-label">{label}</p>
      <p className="graph-metric-sub">{sub}</p>
    </div>
  );
}

export default function Graph() {
  const [graphData, setGraphData] = useState(null);
  const [engines, setEngines] = useState(null);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [propagation, setPropagation] = useState(null);
  const [propLoading, setPropLoading] = useState(false);

  const stageRef = useRef(null);
  const { w, h } = useSize(stageRef);

  const [rippleNode, setRippleNode] = useState(null);
  const [rippleTime, setRippleTime] = useState(0);
  const animRef = useRef(0);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getGraph().catch(() => MOCK_GRAPH),
      api.getEngineStatus().catch(() => null),
      api.health().catch(() => null),
    ])
      .then(([graph, engineStatus, healthStatus]) => {
        setGraphData(graph);
        setEngines(engineStatus);
        setHealth(healthStatus);
      })
      .catch(() => { setGraphData(MOCK_GRAPH); })
      .finally(() => setLoading(false));
  }, []);

  // Particle animation timer
  useEffect(() => {
    let id;
    const tick = () => { animRef.current = (animRef.current + 0.005) % 1; id = requestAnimationFrame(tick); };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  const triggerRipple = useCallback((nodeId) => {
    setRippleNode(nodeId);
    setRippleTime(Date.now());
    setTimeout(() => setRippleNode(null), 2000);
  }, []);

  const allNodes = useMemo(() => graphData?.nodes || [], [graphData]);
  const allEdges = useMemo(() => graphData?.edges || [], [graphData]);

  const rankedNodes = useMemo(
    () => [...allNodes].sort((a, b) => Number(b.attributes?.current_risk || 0) - Number(a.attributes?.current_risk || 0)),
    [allNodes],
  );

  useEffect(() => {
    if (!selectedId && rankedNodes.length) {
      setSelectedId(rankedNodes[0].id);
    }
  }, [rankedNodes, selectedId]);

  const selectedNode = useMemo(
    () => allNodes.find((node) => node.id === selectedId) || rankedNodes[0] || null,
    [allNodes, rankedNodes, selectedId],
  );

  const neighborMap = useMemo(() => {
    const upstream = [];
    const downstream = [];
    const connectedIds = new Set([selectedNode?.id].filter(Boolean));

    if (!selectedNode) {
      return { upstream, downstream, connectedIds };
    }

    for (const edge of allEdges) {
      if (edge.target === selectedNode.id) {
        const sourceNode = allNodes.find((node) => node.id === edge.source);
        if (sourceNode) upstream.push(sourceNode);
        connectedIds.add(edge.source);
      }
      if (edge.source === selectedNode.id) {
        const targetNode = allNodes.find((node) => node.id === edge.target);
        if (targetNode) downstream.push(targetNode);
        connectedIds.add(edge.target);
      }
    }

    return {
      upstream,
      downstream,
      connectedIds,
    };
  }, [allEdges, allNodes, selectedNode]);

  const visibleNodes = useMemo(() => {
    let nodes = allNodes;
    if (filter !== 'all') {
      nodes = nodes.filter((node) => node.type === filter || neighborMap.connectedIds.has(node.id));
      if (selectedNode && !nodes.find((node) => node.id === selectedNode.id)) {
        nodes = [selectedNode, ...nodes];
      }
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      nodes = nodes.filter(n => (n.name || n.id).toLowerCase().includes(q));
    }
    return nodes;
  }, [allNodes, filter, neighborMap.connectedIds, selectedNode, searchTerm]);

  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);

  const visibleEdges = useMemo(
    () => allEdges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
    [allEdges, visibleIds],
  );

  const positions = useMemo(() => buildLayout(visibleNodes, w, h), [visibleNodes, w, h]);

  const feedLabel = health?.shock_feed_mode === 'hybrid_demo_live'
    ? 'Hybrid feed'
    : health?.shock_feed_mode === 'demo'
      ? 'Curated scenarios'
      : 'Live feed';

  const activeMode = engines?.engine_2?.active_mode || 'pagerank';
  const communitiesDetected = engines?.engine_2?.communities_detected ?? graphData?.state_risk_aggregates?.length ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '28px 32px' }}>
        <div className="card" style={{ padding: '18px 20px', borderColor: 'rgba(244,63,94,0.28)', background: 'rgba(244,63,94,0.08)' }}>
          <p style={{ color: '#f43f5e', fontSize: '0.88rem', marginBottom: 6 }}>Graph view failed to load.</p>
          <p style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!graphData) return null;

  const selectedRisk = Number(selectedNode?.attributes?.current_risk || 0);
  const selectedColor = selectedNode ? riskColor(selectedRisk) : 'var(--primary)';
  const highRiskCount = allNodes.filter((node) => Number(node.attributes?.current_risk || 0) >= 70).length;

  return (
    <div style={{ padding: '24px 32px' }}>
      {/* ── Header ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
            Propagation Graph
          </h1>
          {/* Engine 2 mode */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 4,
            background: 'rgba(59,130,246,0.1)', color: 'var(--primary)',
            border: '1px solid rgba(59,130,246,0.2)',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', fontFamily: 'var(--mono)',
          }}>
            ENGINE-2 · {(activeMode || 'pagerank').toUpperCase()}
          </span>
          {/* Feed status */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 4,
            background: feedLabel === 'Live feed' ? 'rgba(16,185,129,0.1)' : 'rgba(245,158,11,0.1)',
            color: feedLabel === 'Live feed' ? 'var(--green)' : 'var(--amber)',
            border: `1px solid ${feedLabel === 'Live feed' ? 'rgba(16,185,129,0.25)' : 'rgba(245,158,11,0.25)'}`,
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', fontFamily: 'var(--mono)',
          }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: feedLabel === 'Live feed' ? 'var(--green)' : 'var(--amber)', flexShrink: 0 }} />
            {feedLabel.toUpperCase()}
          </span>
          {/* Community method */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '2px 8px', borderRadius: 4,
            background: 'rgba(139,92,246,0.1)', color: 'var(--purple)',
            border: '1px solid rgba(139,92,246,0.2)',
            fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.07em',
            textTransform: 'uppercase', fontFamily: 'var(--mono)',
          }}>
            {(engines?.engine_2?.community_detection_method || 'LOUVAIN').toUpperCase()}
            &nbsp;·&nbsp;{communitiesDetected} CLUSTERS
          </span>
        </div>
        <p style={{ fontSize: '0.78rem', color: 'var(--muted)', maxWidth: 680, lineHeight: 1.65, margin: 0 }}>
          Supply chain dependency network. Click a node to trace its upstream sources and downstream drug exposure across India.
        </p>
      </div>


      <div className="graph-summary-grid">
        <SummaryMetric label="Active nodes" value={allNodes.length} sub={`${visibleNodes.length} in current view`} />
        <SummaryMetric label="Dependency edges" value={allEdges.length} sub="Weighted import relationships" />
        <SummaryMetric label="High-risk entities" value={highRiskCount} sub="Modeled risk >= 70" tone="#f43f5e" />
        <SummaryMetric label="Communities" value={communitiesDetected} sub="Detected supply clusters" tone="var(--primary)" />
      </div>

      <div className="graph-shell">
        <div className="graph-panel">
          <div className="graph-toolbar">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              {FILTERS.map((type) => (
                <button
                  key={type}
                  type="button"
                  className={`graph-chip ${filter === type ? 'is-active' : ''}`}
                  onClick={() => setFilter(type)}
                >
                  {type === 'all' ? 'All nodes' : TYPE_LABELS[type]}
                </button>
              ))}
              {/* Search */}
              <input
                type="text" placeholder="Search node..." value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                style={{
                  marginLeft: 8, padding: '5px 10px', borderRadius: 6,
                  border: '1px solid var(--border2)', background: 'var(--surface2)',
                  color: 'var(--text)', fontSize: '0.72rem', fontFamily: 'var(--mono)',
                  outline: 'none', width: 150,
                }}
              />
              {/* Simulate */}
              {selectedNode && selectedNode.type === 'province' && (
                <button
                  type="button"
                  onClick={() => {
                    triggerRipple(selectedNode.id);
                    setPropLoading(true);
                    api.getPropagation(selectedNode.name || selectedNode.id)
                      .then(setPropagation)
                      .catch(() => setPropagation(null))
                      .finally(() => setPropLoading(false));
                  }}
                  style={{
                    marginLeft: 4, padding: '5px 12px', borderRadius: 6,
                    background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
                    color: '#ef4444', fontSize: '0.65rem', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'var(--mono)', letterSpacing: '0.06em',
                  }}
                >
                  {propLoading ? 'SIMULATING...' : '⚡ SIMULATE PROPAGATION'}
                </button>
              )}
            </div>
            <p className="graph-toolbar-note">
              Animated paths show the currently selected dependency corridor.
            </p>
          </div>

          <div ref={stageRef} className="graph-stage">
            <div className="graph-stage-copy">
              <span>Source provinces and inputs</span>
              <span>APIs and intermediates</span>
              <span>Indian demand pressure</span>
            </div>

            <svg className="graph-canvas" width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label="ShockMap propagation graph">
              {visibleEdges.map((edge) => {
                const source = positions[edge.source];
                const target = positions[edge.target];
                if (!source || !target) return null;
                const selected = selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id);
                const path = buildPath(source, target);
                const weight = Math.max(1, Math.min(3.2, Number(edge.weight || 1)));

                const isRippling = rippleNode && (edge.source === rippleNode || edge.target === rippleNode);
                return (
                  <g key={`${edge.source}-${edge.target}`}>
                    <path
                      d={path}
                      className={`graph-flow-line ${selected ? 'is-active' : ''} ${isRippling ? 'is-active' : ''}`}
                      style={{ strokeWidth: selected ? weight + 1.3 : weight * 0.85 }}
                    />
                    {(selected || isRippling) && (
                      <>
                        <path
                          d={path}
                          className="graph-flow-line graph-flow-trail"
                          style={{ strokeWidth: weight + 0.4 }}
                        />
                        {/* Animated particle dot */}
                        <circle r="3" fill="#4f9cf9" opacity="0.9" style={{ filter: 'drop-shadow(0 0 4px #4f9cf9)' }}>
                          <animateMotion dur={isRippling ? '0.8s' : '2s'} repeatCount="indefinite" path={path} />
                        </circle>
                      </>
                    )}
                  </g>
                );
              })}

              {visibleNodes.map((node) => {
                const position = positions[node.id];
                if (!position) return null;

                const risk = Number(node.attributes?.current_risk || 0);
                const fill = risk > 0 ? riskColor(risk) : NODE_COLORS[node.type] || 'var(--primary)';
                const radius = TYPE_RADIUS[node.type] || 8;
                const selected = selectedNode?.id === node.id;
                const connected = neighborMap.connectedIds.has(node.id);

                return (
                  <g
                    key={node.id}
                    transform={`translate(${position.x},${position.y})`}
                    onClick={() => setSelectedId(node.id)}
                    className="graph-node"
                  >
                    {(selected || risk >= 70 || node.id === rippleNode) && (
                      <>
                        <circle
                          r={selected ? radius + 14 : radius + 10}
                          fill={fill}
                          opacity={selected ? 0.18 : 0.11}
                          className="graph-node-halo"
                        />
                        {node.id === rippleNode && (
                          <>
                            <circle r="8" fill="none" stroke={fill} strokeWidth="2" opacity="0">
                              <animate attributeName="r" from="8" to="40" dur="1.2s" repeatCount="3" />
                              <animate attributeName="opacity" from="0.8" to="0" dur="1.2s" repeatCount="3" />
                            </circle>
                            <circle r="8" fill="none" stroke={fill} strokeWidth="1.5" opacity="0">
                              <animate attributeName="r" from="8" to="40" dur="1.2s" begin="0.3s" repeatCount="3" />
                              <animate attributeName="opacity" from="0.6" to="0" dur="1.2s" begin="0.3s" repeatCount="3" />
                            </circle>
                          </>
                        )}
                      </>
                    )}
                    <circle
                      r={selected ? radius + 3 : radius + 1.5}
                      fill="rgba(5,7,15,0.96)"
                      stroke={selected ? fill : 'rgba(255,255,255,0.12)'}
                      strokeWidth={selected ? 2 : 1}
                    />
                    <circle
                      r={radius}
                      fill={fill}
                      opacity={selected ? 1 : connected ? 0.92 : 0.78}
                      className={risk >= 70 ? 'graph-node-pulse' : undefined}
                    />
                    <text
                      className="graph-node-label"
                      x={node.type === 'province' || node.type === 'input' ? -16 : 16}
                      y={4}
                      textAnchor={node.type === 'province' || node.type === 'input' ? 'end' : 'start'}
                    >
                      {(node.name || node.id).slice(0, 26)}
                    </text>
                    {node.type === 'province' && risk >= 60 && (
                      <text
                        y={radius + 20}
                        textAnchor="middle"
                        fill="var(--c-teal, #00E5A0)"
                        fontSize="8"
                        fontFamily="var(--font-mono, monospace)"
                        style={{ cursor: 'pointer' }}
                        onClick={(e) => { e.stopPropagation(); triggerRipple(node.id); }}
                      >
                        ⚡ TRIGGER
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            <div className="graph-stage-legend">
              <div className="graph-legend-row">
                {Object.entries(TYPE_LABELS).map(([type, label]) => (
                  <span key={type} className="graph-legend-item">
                    <span className="graph-legend-dot" style={{ background: NODE_COLORS[type] }} />
                    {label}
                  </span>
                ))}
              </div>
              <div className="graph-legend-row">
                <span className="graph-legend-note">
                  {health?.live_shocks || 0} live shocks | {health?.demo_scenarios || 0} curated scenarios
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="graph-sidebar">
          <div className="graph-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <p className="graph-sidebar-eyebrow">Selected node</p>
                <h2 style={{ fontSize: '1rem', fontWeight: 700, lineHeight: 1.3 }}>{selectedNode?.name || 'None selected'}</h2>
              </div>
              {selectedNode && (
                <span className="graph-chip" style={{ color: selectedColor, borderColor: `${selectedColor}40`, background: `${selectedColor}14` }}>
                  {TYPE_LABELS[selectedNode.type] || selectedNode.type}
                </span>
              )}
            </div>

            {selectedNode ? (
              <>
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 8 }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--muted)' }}>Current risk</span>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: selectedColor }}>
                      {Math.round(selectedRisk)} / 100
                    </span>
                  </div>
                  <div className="risk-bar-track" style={{ height: 8 }}>
                    <div className="risk-bar-fill" style={{ width: `${Math.min(100, selectedRisk)}%`, background: selectedColor }} />
                  </div>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: 8 }}>
                    {riskBand(selectedRisk)} modeled pressure in the current propagation graph.
                  </p>
                </div>

                <div className="graph-detail-grid">
                  <div className="graph-detail-tile">
                    <p className="graph-detail-label">Buffer</p>
                    <p className="graph-detail-value">{selectedNode.attributes?.buffer_days ?? '-'}d</p>
                  </div>
                  <div className="graph-detail-tile">
                    <p className="graph-detail-label">Substitutability</p>
                    <p className="graph-detail-value">
                      {selectedNode.attributes?.substitutability != null
                        ? `${Math.round(Number(selectedNode.attributes.substitutability) * 100)}%`
                        : '-'}
                    </p>
                  </div>
                  <div className="graph-detail-tile">
                    <p className="graph-detail-label">Population / demand</p>
                    <p className="graph-detail-value">
                      {selectedNode.attributes?.patient_population_estimate != null
                        ? formatCompact(selectedNode.attributes.patient_population_estimate)
                        : selectedNode.attributes?.monthly_import_tonnes != null
                          ? `${selectedNode.attributes.monthly_import_tonnes} t`
                          : '-'}
                    </p>
                  </div>
                  <div className="graph-detail-tile">
                    <p className="graph-detail-label">Priority</p>
                    <p className="graph-detail-value">
                      {selectedNode.attributes?.nlem_tier || selectedNode.attributes?.strategic_priority || '-'}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <p className="graph-sidebar-eyebrow">Upstream dependencies</p>
                    <div className="graph-link-list">
                      {neighborMap.upstream.length > 0 ? neighborMap.upstream.slice(0, 5).map((node) => (
                        <button key={node.id} type="button" className="graph-link-chip" onClick={() => setSelectedId(node.id)}>
                          {node.name}
                        </button>
                      )) : <span className="graph-empty-note">No upstream nodes in current graph.</span>}
                    </div>
                  </div>

                  <div>
                    <p className="graph-sidebar-eyebrow">Downstream impact</p>
                    <div className="graph-link-list">
                      {neighborMap.downstream.length > 0 ? neighborMap.downstream.slice(0, 5).map((node) => (
                        <button key={node.id} type="button" className="graph-link-chip" onClick={() => setSelectedId(node.id)}>
                          {node.name}
                        </button>
                      )) : <span className="graph-empty-note">No downstream nodes in current graph.</span>}
                    </div>
                  </div>
                </div>

                {/* ── Chain Intelligence Panel ────────────────────── */}
                <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface2)', border: '1px solid var(--border2)', borderRadius: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.72rem', fontFamily: 'var(--mono)', letterSpacing: '0.06em', color: 'var(--text)' }}>CHAIN INTELLIGENCE</span>
                    <span style={{ fontSize: '0.58rem', background: 'rgba(139,92,246,0.12)', color: '#8b5cf6', border: '1px solid rgba(139,92,246,0.25)', borderRadius: 999, padding: '1px 6px' }}>
                      Engine 2
                    </span>
                  </div>

                  {/* Vulnerability Index */}
                  {(() => {
                    const buf = Number(selectedNode.attributes?.buffer_days ?? 15);
                    const sub = Number(selectedNode.attributes?.substitutability ?? 0.2);
                    const vuln = Math.min(100, Math.round(selectedRisk * (1 - sub) * Math.exp(-buf / 30) * 1.8));
                    const vulnColor = vuln >= 70 ? '#f43f5e' : vuln >= 40 ? '#f59e0b' : '#10b981';
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Vulnerability Index</span>
                          <span style={{ fontSize: '0.72rem', fontWeight: 700, color: vulnColor, fontFamily: 'var(--mono)' }}>{vuln}/100</span>
                        </div>
                        <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${vuln}%`, background: vulnColor, borderRadius: 3, transition: 'width 0.6s ease' }} />
                        </div>
                        <p style={{ fontSize: '0.6rem', color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--mono)' }}>
                          R = PR({selectedRisk.toFixed(0)}) × (1−S:{(sub*100).toFixed(0)}%) × e^(−B:{buf}d/τ)
                        </p>
                      </div>
                    );
                  })()}

                  {/* Edge Weight Analysis */}
                  {(() => {
                    const connEdges = allEdges.filter(e => e.source === selectedNode?.id || e.target === selectedNode?.id);
                    if (connEdges.length === 0) return null;
                    const totalWeight = connEdges.reduce((s, e) => s + Number(e.weight || 1), 0);
                    const maxEdge = connEdges.reduce((best, e) => Number(e.weight || 0) > Number(best.weight || 0) ? e : best, connEdges[0]);
                    const maxPeer = maxEdge.source === selectedNode?.id ? maxEdge.target : maxEdge.source;
                    const peerNode = allNodes.find(n => n.id === maxPeer);
                    return (
                      <div style={{ marginBottom: 12 }}>
                        <p style={{ fontSize: '0.68rem', color: 'var(--muted)', marginBottom: 6 }}>Connected corridors</p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                          <div style={{ padding: '6px 8px', background: 'rgba(59,130,246,0.06)', borderRadius: 6 }}>
                            <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Total edges</p>
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'var(--mono)' }}>{connEdges.length}</p>
                          </div>
                          <div style={{ padding: '6px 8px', background: 'rgba(245,158,11,0.06)', borderRadius: 6 }}>
                            <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Σ weight</p>
                            <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f59e0b', fontFamily: 'var(--mono)' }}>{totalWeight.toFixed(1)}</p>
                          </div>
                        </div>
                        {peerNode && (
                          <div style={{ marginTop: 6, padding: '5px 8px', background: 'rgba(244,63,94,0.06)', borderRadius: 6, borderLeft: '2px solid #f43f5e' }}>
                            <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Strongest dependency</p>
                            <p style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text)' }}>
                              {peerNode.name || peerNode.id} <span style={{ color: '#f43f5e', fontFamily: 'var(--mono)', fontSize: '0.65rem' }}>w={Number(maxEdge.weight || 0).toFixed(2)}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {/* Import Volume */}
                  {selectedNode.attributes?.monthly_import_tonnes && (
                    <div style={{ marginBottom: 12, display: 'flex', gap: 6 }}>
                      <div style={{ flex: 1, padding: '6px 8px', background: 'rgba(16,185,129,0.06)', borderRadius: 6 }}>
                        <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Monthly import</p>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#10b981', fontFamily: 'var(--mono)' }}>{selectedNode.attributes.monthly_import_tonnes}t</p>
                      </div>
                      <div style={{ flex: 1, padding: '6px 8px', background: 'rgba(139,92,246,0.06)', borderRadius: 6 }}>
                        <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Concentration</p>
                        <p style={{ fontSize: '0.82rem', fontWeight: 700, color: '#8b5cf6', fontFamily: 'var(--mono)' }}>
                          {selectedNode.attributes?.china_dependency ? `${(selectedNode.attributes.china_dependency * 100).toFixed(0)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Market value */}
                  {selectedNode.attributes?.market_value_usd_m && (
                    <div style={{ padding: '6px 8px', background: 'rgba(251,191,36,0.06)', borderRadius: 6, marginBottom: 8 }}>
                      <p style={{ fontSize: '0.6rem', color: 'var(--muted)' }}>Market exposure</p>
                      <p style={{ fontSize: '0.88rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'var(--mono)' }}>
                        ${selectedNode.attributes.market_value_usd_m}M
                      </p>
                    </div>
                  )}
                </div>

                {/* Propagation simulation results */}
                {propagation && (
                  <div style={{ marginTop: 14 }}>
                    <p className="graph-sidebar-eyebrow" style={{ color: '#ef4444' }}>Propagation simulation</p>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: 8 }}>
                      {propagation.affected_count || propagation.affected_drugs?.length || '—'} downstream entities affected
                    </div>
                    {(propagation.affected_drugs || propagation.top_affected || []).slice(0, 5).map((d, i) => (
                      <div key={i} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '6px 8px', borderRadius: 6, marginBottom: 4,
                        background: 'rgba(239,68,68,0.06)', borderLeft: '2px solid #ef4444',
                      }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text)' }}>{d.name || d}</span>
                        {d.risk_delta && <span style={{ fontSize: '0.65rem', color: '#ef4444', fontFamily: 'var(--mono)', fontWeight: 700 }}>+{d.risk_delta}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="graph-empty-note">Select a node to inspect its risk components and links.</p>
            )}
          </div>

          <div className="graph-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>Highest risk nodes</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Top 6</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {rankedNodes.slice(0, 6).map((node) => {
                const risk = Number(node.attributes?.current_risk || 0);
                const active = selectedNode?.id === node.id;
                return (
                  <button
                    key={node.id}
                    type="button"
                    className={`graph-list-row ${active ? 'is-active' : ''}`}
                    onClick={() => setSelectedId(node.id)}
                  >
                    <div>
                      <p style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{node.name}</p>
                      <p style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>
                        {TYPE_LABELS[node.type] || node.type}
                      </p>
                    </div>
                    <span style={{ fontSize: '0.84rem', fontWeight: 700, color: riskColor(risk) }}>
                      {Math.round(risk)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="graph-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontSize: '0.82rem', fontWeight: 600 }}>State exposure</p>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>Demand-weighted</span>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {(graphData.state_risk_aggregates || []).map((state) => (
                <div key={state.state_id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                    <span style={{ fontSize: '0.76rem', color: 'var(--text)' }}>{state.state_name}</span>
                    <span style={{ fontSize: '0.76rem', color: riskColor(state.risk_score), fontWeight: 700 }}>
                      {Math.round(state.risk_score)}
                    </span>
                  </div>
                  <div className="risk-bar-track" style={{ height: 6 }}>
                    <div className="risk-bar-fill" style={{ width: `${Math.min(100, state.risk_score)}%`, background: riskColor(state.risk_score) }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
