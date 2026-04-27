import { useState, useEffect, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { api } from '../api/client';
import MapFilterPanel from '../components/MapFilterPanel';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function MapUpdater({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, zoom, { duration: 1.2 });
  }, [center, zoom, map]);
  return null;
}

const RISK_COLORS = {
  critical: '#f43f5e',
  high: '#f59e0b',
  medium: '#60a5fa',
  low: '#10b981',
};

function getRiskColor(score) {
  if (score >= 80) return RISK_COLORS.critical;
  if (score >= 60) return RISK_COLORS.high;
  if (score >= 40) return RISK_COLORS.medium;
  return RISK_COLORS.low;
}

function getRiskLabel(score) {
  if (score >= 80) return 'CRITICAL';
  if (score >= 60) return 'HIGH';
  if (score >= 40) return 'MEDIUM';
  return 'LOW';
}

const REGION_CENTERS = {
  all: { center: [28, 90], zoom: 4 },
  china: { center: [35.86, 104.2], zoom: 4 },
  india: { center: [22, 78.9], zoom: 5 },
};

// ─── Stat Card ───────────────────────────────────────────────────────────
function StatCard({ icon, value, label, color }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px', borderRadius: 12,
      background: 'rgba(13,17,23,0.8)', backdropFilter: 'blur(12px)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: color || 'var(--text)', lineHeight: 1.1 }}>
          {value}
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

// ─── Province Detail Sidebar ─────────────────────────────────────────────
function ProvinceDetail({ detail, onClose }) {
  if (!detail) return null;
  const color = getRiskColor(detail.risk_score);
  const label = getRiskLabel(detail.risk_score);
  const isIndia = detail.region === 'india';

  return (
    <div style={{
      background: 'rgba(13,17,23,0.92)', backdropFilter: 'blur(24px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16,
      padding: '20px', display: 'flex', flexDirection: 'column', gap: 14,
      animation: 'slide-up 0.3s ease',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: '1rem' }}>{isIndia ? '🇮🇳' : '🇨🇳'}</span>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{detail.name}</h3>
          </div>
          <span style={{
            fontSize: '0.65rem', padding: '2px 8px', borderRadius: 999,
            background: `${color}18`, color, border: `1px solid ${color}40`,
            fontWeight: 700, letterSpacing: '0.05em',
          }}>
            {label} — {detail.risk_score.toFixed(1)}
          </span>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.06)', border: '1px solid var(--border)',
          borderRadius: 8, width: 28, height: 28, cursor: 'pointer',
          color: 'var(--muted)', fontSize: '0.85rem', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>

      {/* Risk Gauge */}
      <div>
        <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3, width: `${detail.risk_score}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            transition: 'width 0.8s ease',
          }} />
        </div>
      </div>

      {detail.description && (
        <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55, margin: 0, opacity: 0.85 }}>
          {detail.description}
        </p>
      )}

      {/* Quick Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {detail.factories?.length > 0 && (
          <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Factories</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text)', marginTop: 2 }}>{detail.factories.length}</div>
          </div>
        )}
        <div style={{ padding: '8px 10px', borderRadius: 10, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Shocks</div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: detail.shocks?.length > 0 ? '#f43f5e' : 'var(--text)', marginTop: 2 }}>
            {detail.shocks?.length || 0}
          </div>
        </div>
      </div>

      {/* Active Shocks */}
      {detail.shocks?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: '#f43f5e', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            ⚠ Active Shocks
          </div>
          {detail.shocks.slice(0, 4).map(s => (
            <div key={s.id} style={{
              fontSize: '0.73rem', padding: '8px 10px', borderRadius: 8,
              marginBottom: 6, borderLeft: '3px solid #f43f5e',
              background: 'rgba(244,63,94,0.06)', lineHeight: 1.4,
            }}>
              <strong style={{ color: 'var(--text)' }}>
                {(s.event_type || 'alert').replace(/_/g, ' ').toUpperCase()}
              </strong>
              <div style={{ color: 'var(--muted)', marginTop: 2 }}>{s.title}</div>
            </div>
          ))}
        </div>
      )}

      {/* Top Entities */}
      {detail.top_entities?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {isIndia ? 'Top Consumed Drugs' : 'Dependent Products'}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {detail.top_entities.map(e => (
              <span key={e.id} style={{
                fontSize: '0.68rem', padding: '3px 9px', borderRadius: 999,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                color: 'var(--text)', fontWeight: 500,
              }}>
                {e.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Factories List */}
      {detail.factories?.length > 0 && (
        <div>
          <div style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Key Facilities
          </div>
          {detail.factories.map((f, i) => (
            <div key={i} style={{
              fontSize: '0.73rem', padding: '6px 10px', borderRadius: 8,
              background: 'var(--surface2)', border: '1px solid var(--border)',
              marginBottom: 4, color: 'var(--text)', display: 'flex',
              alignItems: 'center', gap: 6,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--primary)', flexShrink: 0 }} />
              {f}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Map Legend ───────────────────────────────────────────────────────────
function MapLegend() {
  const items = [
    { color: RISK_COLORS.critical, label: 'Critical (80+)' },
    { color: RISK_COLORS.high, label: 'High (60-79)' },
    { color: RISK_COLORS.medium, label: 'Medium (40-59)' },
    { color: RISK_COLORS.low, label: 'Low (<40)' },
  ];
  return (
    <div style={{
      position: 'absolute', bottom: 24, right: 16, zIndex: 1000,
      background: 'rgba(13,17,23,0.88)', backdropFilter: 'blur(16px)',
      border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12,
      padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
        Risk Level
      </div>
      {items.map(it => (
        <div key={it.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: it.color, boxShadow: `0 0 8px ${it.color}60`, flexShrink: 0 }} />
          <span style={{ fontSize: '0.7rem', color: 'var(--text)' }}>{it.label}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 6, marginTop: 2, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 10, height: 3, borderRadius: 2, background: 'rgba(96,165,250,0.5)', flexShrink: 0 }} />
        <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Supply Corridor</span>
      </div>
    </div>
  );
}

// ─── Main Map Component ──────────────────────────────────────────────────
export default function MapView() {
  const [heatmap, setHeatmap] = useState({ points: [] });
  const [corridors, setCorridors] = useState({ corridors: [] });
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({ sector: 'both', risk_min: 0, shock_type: '', region: 'all' });
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [provinceDetail, setProvinceDetail] = useState(null);
  const [showCorridors, setShowCorridors] = useState(false);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef(null);

  const regionConf = REGION_CENTERS[filters.region] || REGION_CENTERS.all;

  const fetchMapData = useCallback(async (f) => {
    setLoading(true);
    try {
      const [hm, cr, st] = await Promise.all([
        api.getMapHeatmap(f),
        api.getMapCorridors(f.sector),
        api.getMapStats(),
      ]);
      setHeatmap(hm);
      setCorridors(cr);
      setStats(st);
    } catch (err) {
      console.error('Map data fetch failed', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchMapData(filters), 300);
    return () => clearTimeout(debounceRef.current);
  }, [filters, fetchMapData]);

  useEffect(() => {
    if (selectedProvince) {
      api.getMapProvince(selectedProvince, filters.sector)
        .then(setProvinceDetail)
        .catch(console.error);
    } else {
      setProvinceDetail(null);
    }
  }, [selectedProvince, filters.sector]);

  const chinaPoints = (heatmap.points || []).filter(p => p.region === 'china');
  const indiaPoints = (heatmap.points || []).filter(p => p.region === 'india');
  const totalPoints = heatmap.points?.length || 0;

  return (
    <div style={{ display: 'flex', height: '100%', animation: 'fade-in 0.35s ease' }}>
      {/* ── Left Sidebar ────────────────────────────────────────────── */}
      <div style={{
        width: 330, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 16,
        padding: '20px 16px', overflowY: 'auto',
        borderRight: '1px solid var(--border)', background: 'var(--bg)',
      }}>
        {/* Title */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8,
              background: 'linear-gradient(135deg, #4f9cf9, #8b5cf6)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>⊕</div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, letterSpacing: '-0.02em' }}>
              Supply Map
            </h1>
          </div>
          <p style={{ fontSize: '0.73rem', color: 'var(--muted)', margin: 0, lineHeight: 1.5 }}>
            Real-time geospatial intelligence across {totalPoints} monitored nodes.
          </p>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <StatCard icon="⚡" value={stats.active_shocks} label="Active Shocks" color="#f43f5e" />
            <StatCard icon="🔴" value={stats.high_risk_provinces} label="High Risk" color="#f59e0b" />
            <StatCard icon="🏭" value={stats.total_factories} label="Factories" color="var(--primary)" />
            <StatCard icon="⛓" value={stats.supply_corridors} label="Corridors" color="#8b5cf6" />
          </div>
        )}

        {/* Filter Panel */}
        <MapFilterPanel
          onFilterChange={setFilters}
          showCorridors={showCorridors}
          onToggleCorridors={() => setShowCorridors(v => !v)}
        />

        {/* Province Detail */}
        <ProvinceDetail detail={provinceDetail} onClose={() => setSelectedProvince(null)} />
      </div>

      {/* ── Map Container ───────────────────────────────────────────── */}
      <div style={{ flex: 1, position: 'relative' }}>
        {/* Loading Indicator */}
        {loading && (
          <div style={{
            position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)',
            zIndex: 1000, background: 'rgba(13,17,23,0.9)', backdropFilter: 'blur(12px)',
            padding: '6px 18px', borderRadius: 999, fontSize: '0.75rem', fontWeight: 600,
            border: '1px solid rgba(79,156,249,0.2)', color: 'var(--primary)',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span className="live-dot" style={{ width: 6, height: 6 }} />
            Updating map data…
          </div>
        )}

        <MapContainer
          center={regionConf.center}
          zoom={regionConf.zoom}
          style={{ height: '100%', width: '100%', background: '#05070f' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />

          <MapUpdater
            center={selectedProvince && provinceDetail
              ? [provinceDetail.coordinates.lat, provinceDetail.coordinates.lng]
              : regionConf.center}
            zoom={selectedProvince ? 6 : regionConf.zoom}
          />

          {/* Supply Corridors */}
          {showCorridors && corridors.corridors?.map(c => {
            const riskColor = getRiskColor(c.risk_score || 30);
            return (
              <Polyline
                key={c.id}
                positions={[[c.source.lat, c.source.lng], [c.target.lat, c.target.lng]]}
                pathOptions={{
                  color: `${riskColor}80`,
                  weight: Math.max(1.5, Math.min(5, c.weight * 1.5)),
                  dashArray: '6, 10',
                  className: 'animated-polyline',
                }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <strong style={{ fontSize: '0.82rem' }}>
                      🇨🇳 {c.source.name} ➜ 🇮🇳 {c.target.name}
                    </strong>
                    <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 6 }}>
                      {c.weight} dependent product{c.weight > 1 ? 's' : ''} on this route
                    </div>
                    {c.affected_entities?.length > 0 && (
                      <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                        {c.affected_entities.map(e => (
                          <span key={e} style={{
                            fontSize: '0.65rem', padding: '2px 6px', borderRadius: 999,
                            background: '#1e293b', border: '1px solid #334155',
                          }}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </Popup>
              </Polyline>
            );
          })}

          {/* China Province Markers */}
          {chinaPoints.map(p => {
            const color = getRiskColor(p.risk_score);
            const radius = Math.max(8, Math.min(28, p.risk_score / 3.5));
            const isShocked = p.shock_count > 0;
            return (
              <CircleMarker
                key={`cn-${p.id}`}
                center={[p.latitude, p.longitude]}
                radius={radius}
                pathOptions={{
                  color: isShocked ? '#f43f5e' : color,
                  fillColor: color,
                  fillOpacity: isShocked ? 0.7 : 0.35,
                  weight: isShocked ? 2.5 : 1,
                }}
                eventHandlers={{ click: () => setSelectedProvince(p.id) }}
              >
                <Popup>
                  <div style={{ minWidth: 160 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span>🇨🇳</span>
                      <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: '#9ca3af' }}>Risk:</span>
                      <strong style={{ color }}>{p.risk_score.toFixed(1)}</strong>
                    </div>
                    {isShocked && (
                      <div style={{ fontSize: '0.75rem', color: '#f43f5e', fontWeight: 600, marginBottom: 4 }}>
                        ⚠ {p.shock_count} Active Shock{p.shock_count > 1 ? 's' : ''}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedProvince(p.id)}
                      style={{
                        width: '100%', padding: 5, marginTop: 6,
                        background: '#4f9cf9', color: '#fff', border: 'none',
                        borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      }}
                    >View Details</button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}

          {/* India State Markers */}
          {indiaPoints.map(p => {
            const color = getRiskColor(p.risk_score);
            const radius = Math.max(7, Math.min(22, p.risk_score / 4));
            return (
              <CircleMarker
                key={`in-${p.id}`}
                center={[p.latitude, p.longitude]}
                radius={radius}
                pathOptions={{
                  color: `${color}cc`,
                  fillColor: color,
                  fillOpacity: 0.3,
                  weight: 1.5,
                  dashArray: '4, 4',
                }}
                eventHandlers={{ click: () => setSelectedProvince(p.id) }}
              >
                <Popup>
                  <div style={{ minWidth: 150 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <span>🇮🇳</span>
                      <strong style={{ fontSize: '0.9rem' }}>{p.name}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: 4 }}>
                      <span style={{ color: '#9ca3af' }}>Dependency Risk:</span>
                      <strong style={{ color }}>{p.risk_score.toFixed(1)}</strong>
                    </div>
                    {p.shock_count > 0 && (
                      <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 600 }}>
                        📡 {p.shock_count} upstream shock{p.shock_count > 1 ? 's' : ''}
                      </div>
                    )}
                    <button
                      onClick={() => setSelectedProvince(p.id)}
                      style={{
                        width: '100%', padding: 5, marginTop: 6,
                        background: '#8b5cf6', color: '#fff', border: 'none',
                        borderRadius: 6, cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
                      }}
                    >View Details</button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Legend */}
        <MapLegend />

        {/* Map CSS Overrides */}
        <style dangerouslySetInnerHTML={{ __html: `
          .animated-polyline { animation: dash 30s linear infinite; }
          @keyframes dash { to { stroke-dashoffset: -1000; } }
          .leaflet-popup-content-wrapper, .leaflet-popup-tip {
            background: #0d1117 !important; color: #e8eaf0 !important;
            border: 1px solid rgba(255,255,255,0.08); border-radius: 12px !important;
            box-shadow: 0 8px 32px rgba(0,0,0,0.5) !important;
          }
          .leaflet-popup-content { margin: 12px 14px !important; }
          .leaflet-container a.leaflet-popup-close-button { color: #6b7280 !important; }
          .leaflet-control-zoom a {
            background: rgba(13,17,23,0.9) !important; color: #e8eaf0 !important;
            border-color: rgba(255,255,255,0.08) !important;
          }
          .leaflet-control-zoom a:hover { background: rgba(30,36,48,0.95) !important; }
        `}} />
      </div>
    </div>
  );
}
