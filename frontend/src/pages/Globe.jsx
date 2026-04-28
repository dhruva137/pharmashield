/**
 * Globe.jsx — 3D interactive supply chain globe using CesiumJS from CDN.
 * window.Cesium is loaded via <script> in index.html — no npm import needed.
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { api } from '../api/client';

/* ── Mock telemetry per node (keyed by label prefix) ───────────────────── */
const TELEMETRY = {
  'Chengdu':    { tz: 'Asia/Shanghai',   temp: 28, wind: 12, vis: 8,  weather: 'Hazy', humidity: 72 },
  'Wuhan':      { tz: 'Asia/Shanghai',   temp: 31, wind: 8,  vis: 12, weather: 'Partly Cloudy', humidity: 65 },
  'Guangzhou':  { tz: 'Asia/Shanghai',   temp: 33, wind: 15, vis: 10, weather: 'Thunderstorm', humidity: 88 },
  'Shanghai':   { tz: 'Asia/Shanghai',   temp: 26, wind: 22, vis: 14, weather: 'Clear', humidity: 58 },
  'HORMUZ':     { tz: 'Asia/Dubai',      temp: 42, wind: 35, vis: 6,  weather: 'Dust Storm', humidity: 18 },
  'JNPT':       { tz: 'Asia/Kolkata',    temp: 34, wind: 18, vis: 9,  weather: 'Humid', humidity: 82 },
  'Mundra':     { tz: 'Asia/Kolkata',    temp: 36, wind: 14, vis: 11, weather: 'Clear', humidity: 45 },
  'Bengaluru':  { tz: 'Asia/Kolkata',    temp: 27, wind: 10, vis: 15, weather: 'Overcast', humidity: 70 },
  'Hyderabad':  { tz: 'Asia/Kolkata',    temp: 38, wind: 8,  vis: 13, weather: 'Hot & Dry', humidity: 32 },
};

function getNodeTelemetry(label) {
  for (const [key, data] of Object.entries(TELEMETRY)) {
    if (label.includes(key)) {
      const now = new Date();
      const localTime = now.toLocaleTimeString('en-IN', { timeZone: data.tz, hour: '2-digit', minute: '2-digit', hour12: false });
      const localDate = now.toLocaleDateString('en-IN', { timeZone: data.tz, day: '2-digit', month: 'short' });
      return { ...data, localTime, localDate };
    }
  }
  return null;
}

/* ── Supply chain data ──────────────────────────────────────────────────── */
const CORRIDORS = [
  { from: [104.9, 30.6], to: [72.85, 19.0], label: 'Chengdu → JNPT',     rgb: [255, 130, 50], type: 'pharma',    w: 2.5 },
  { from: [114.3, 30.5], to: [72.85, 19.0], label: 'Wuhan → JNPT',        rgb: [255, 160, 0],  type: 'pharma',    w: 2   },
  { from: [113.3, 23.1], to: [79.8,  11.9], label: 'Guangzhou → Mundra',  rgb: [255, 100, 80], type: 'pharma',    w: 2   },
  { from: [121.4, 31.2], to: [72.85, 19.0], label: 'Shanghai → JNPT',    rgb: [255, 200, 60], type: 'pharma',    w: 2   },
  { from: [104.9, 30.6], to: [56.2,  25.3], label: 'Chengdu → Hormuz',   rgb: [239, 68, 68],  type: 'hormuz',    w: 3.5 },
  { from: [56.2,  25.3], to: [72.85, 19.0], label: 'Hormuz → JNPT',      rgb: [239, 68, 68],  type: 'hormuz',    w: 3.5 },
  { from: [121.4, 31.2], to: [43.1,  11.6], label: 'Shanghai → Red Sea', rgb: [245, 158, 11], type: 'diversion', w: 2   },
  { from: [43.1,  11.6], to: [72.85, 19.0], label: 'Red Sea → JNPT',     rgb: [245, 158, 11], type: 'diversion', w: 2   },
];

const NODES = [
  { lon: 104.9, lat: 30.6, label: 'Chengdu API Hub',   rgb: [255,150,50],  r: 10, far: 7e6 },
  { lon: 114.3, lat: 30.5, label: 'Wuhan Pharma',       rgb: [255,150,50],  r: 8,  far: 5e6 },
  { lon: 113.3, lat: 23.1, label: 'Guangzhou Mfg',     rgb: [255,150,50],  r: 8,  far: 5e6 },
  { lon: 121.4, lat: 31.2, label: 'Shanghai Port',     rgb: [100,180,255], r: 10, far: 7e6 },
  { lon: 56.2,  lat: 25.3, label: '⚠ HORMUZ BLOCKED', rgb: [239,68,68],   r: 15, far: 9e6 },
  { lon: 72.85, lat: 19.0, label: 'JNPT · Mumbai',    rgb: [16,185,129],  r: 12, far: 7e6 },
  { lon: 79.8,  lat: 11.9, label: 'Mundra Port',      rgb: [16,185,129],  r: 8,  far: 5e6 },
  { lon: 77.6,  lat: 12.9, label: 'Bengaluru',        rgb: [59,130,246],  r: 10, far: 6e6 },
  { lon: 78.4,  lat: 17.4, label: 'Hyderabad Pharma', rgb: [59,130,246],  r: 8,  far: 5e6 },
];

const FILTERS = [
  { id: 'all',      label: 'ALL ROUTES',  color: '#d4d8e8' },
  { id: 'pharma',   label: 'PHARMA',      color: '#f59e0b' },
  { id: 'hormuz',   label: 'HORMUZ RISK', color: '#ef4444' },
  { id: 'diversion',label: 'DIVERSIONS',  color: '#f59e0b' },
];

function makeArc(from, to, steps = 80) {
  const C = window.Cesium;
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t  = i / steps;
    const lon = from[0] + (to[0] - from[0]) * t;
    const lat = from[1] + (to[1] - from[1]) * t;
    const h   = Math.sin(Math.PI * t) * 900000;
    pts.push(C.Cartesian3.fromDegrees(lon, lat, h));
  }
  return pts;
}

function drawEntities(viewer, filter) {
  const C = window.Cesium;
  viewer.entities.removeAll();

  const visible = filter === 'all' ? CORRIDORS : CORRIDORS.filter(c => c.type === filter);

  visible.forEach(({ from, to, rgb: [r,g,b], type, w }) => {
    viewer.entities.add({
      polyline: {
        positions: makeArc(from, to),
        width: w,
        material: C.Color.fromBytes(r, g, b, type === 'hormuz' ? 240 : 185),
        clampToGround: false,
        arcType: C.ArcType.NONE,
      },
    });
  });

  NODES.forEach(({ lon, lat, label, rgb: [r,g,b], r: size, far }) => {
    const isCrisis = label.includes('HORMUZ');
    const isPort = label.includes('JNPT') || label.includes('Mundra') || label.includes('Shanghai');

    // Pulsing risk zone for crisis/high-risk nodes
    if (isCrisis || isPort) {
      const zoneColor = isCrisis ? C.Color.fromBytes(239, 68, 68, 30) : C.Color.fromBytes(59, 130, 246, 20);
      const borderColor = isCrisis ? C.Color.fromBytes(239, 68, 68, 120) : C.Color.fromBytes(59, 130, 246, 60);
      const radius = isCrisis ? 280000 : 180000;
      viewer.entities.add({
        position: C.Cartesian3.fromDegrees(lon, lat),
        ellipse: {
          semiMajorAxis: radius,
          semiMinorAxis: radius,
          material: zoneColor,
          outline: true,
          outlineColor: borderColor,
          outlineWidth: 2,
          height: 1000,
        },
      });
    }

    viewer.entities.add({
      position: C.Cartesian3.fromDegrees(lon, lat, 5000),
      point: {
        pixelSize: size,
        color: C.Color.fromBytes(r, g, b, 240),
        outlineColor: isCrisis ? C.Color.fromBytes(239, 68, 68, 90) : C.Color.WHITE.withAlpha(0.2),
        outlineWidth: isCrisis ? 7 : 1.5,
        scaleByDistance: new C.NearFarScalar(1.5e6, 1.2, 8e6, 0.7),
      },
      label: {
        text: label,
        font: '600 11px "JetBrains Mono", monospace',
        fillColor: C.Color.WHITE.withAlpha(0.9),
        outlineColor: C.Color.BLACK,
        outlineWidth: 2,
        style: C.LabelStyle.FILL_AND_OUTLINE,
        pixelOffset: new C.Cartesian2(0, -(size + 10)),
        distanceDisplayCondition: new C.DistanceDisplayCondition(0, far),
        scaleByDistance: new C.NearFarScalar(2e6, 1.0, 6e6, 0.75),
      },
    });
  });
}

export default function GlobeView() {
  const mountRef  = useRef(null);
  const viewerRef = useRef(null);
  const [ready,  setReady]  = useState(false);
  const [mode,   setMode]   = useState('3D');
  const [filter, setFilter] = useState('all');
  const [status, setStatus] = useState(null);
  const [cesiumAvailable, setCesiumAvailable] = useState(!!window.Cesium);
  const [activeNode, setActiveNode] = useState(NODES[5]); // default JNPT
  const [clockTick, setClockTick] = useState(0);

  // Tick clock every 30s for live time updates
  useEffect(() => {
    const id = setInterval(() => setClockTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  const telemetry = useMemo(() => {
    if (!activeNode) return null;
    return getNodeTelemetry(activeNode.label);
  }, [activeNode, clockTick]);

  useEffect(() => {
    api.getHormuzStatus().then(setStatus).catch(() => {});
  }, []);

  /* ── Wait for window.Cesium to be available ─────────────────────────── */
  useEffect(() => {
    if (window.Cesium) { setCesiumAvailable(true); return; }
    const id = setInterval(() => {
      if (window.Cesium) { setCesiumAvailable(true); clearInterval(id); }
    }, 200);
    return () => clearInterval(id);
  }, []);

  /* ── Init Cesium Viewer once Cesium is available ────────────────────── */
  useEffect(() => {
    if (!cesiumAvailable || viewerRef.current || !mountRef.current) return;

    const C = window.Cesium;

    // Use Cesium Ion token if user has set one, else try anonymous
    const ionToken = import.meta.env.VITE_CESIUM_ION_TOKEN;
    C.Ion.defaultAccessToken = (ionToken && !ionToken.startsWith('YOUR_'))
      ? ionToken
      : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiJlYWE1OWUxNy1mMWZiLTQzYjYtYTQ0OS1kMWFjYmFkNjc5YzciLCJpZCI6NTc3MzMsImlhdCI6MTYyMjgyMDc5Mn0.XcKpgANiY19MC4bdFUXMVEBToBmqS8kuYpUlxJHYZxk'; // Cesium public demo token

    const viewer = new C.Viewer(mountRef.current, {
      // ArcGIS satellite base
      imageryProvider: new C.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri World Imagery',
        maximumLevel: 19,
      }),
      terrainProvider: new C.EllipsoidTerrainProvider(),
      baseLayerPicker:        false,
      geocoder:               false,
      homeButton:             false,
      sceneModePicker:        false,
      navigationHelpButton:   false,
      animation:              false,
      timeline:               false,
      fullscreenButton:       false,
      infoBox:                false,
      selectionIndicator:     false,
      shadows:                false,
      creditContainer:        (() => { const d = document.createElement('div'); d.style.display = 'none'; return d; })(),
    });

    viewer.scene.skyAtmosphere.show             = true;
    viewer.scene.skyAtmosphere.hueShift         = 0.0;
    viewer.scene.skyAtmosphere.saturationShift  = -0.1;
    viewer.scene.skyAtmosphere.brightnessShift  = -0.1;
    viewer.scene.skyBox.show                    = true;
    viewer.scene.globe.enableLighting           = true;
    viewer.scene.globe.showGroundAtmosphere     = true;
    viewer.scene.backgroundColor                = C.Color.fromCssColorString('#010205');
    viewer.scene.globe.baseColor                = C.Color.fromCssColorString('#010a1a');
    viewer.scene.fog.enabled                    = false;
    viewer.scene.globe.depthTestAgainstTerrain  = false;

    // Border overlays
    viewer.imageryLayers.addImageryProvider(
      new C.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Reference_Overlay/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri',
        minimumLevel: 0,
        maximumLevel: 13,
      })
    );
    viewer.imageryLayers.addImageryProvider(
      new C.UrlTemplateImageryProvider({
        url: 'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
        credit: 'Esri',
        minimumLevel: 0,
        maximumLevel: 13,
      })
    );

    viewer.camera.flyTo({
      destination: C.Cartesian3.fromDegrees(83.0, 20.0, 9000000),
      duration: 2.5,
    });

    viewerRef.current = viewer;
    drawEntities(viewer, 'all');
    setReady(true);

    return () => {
      if (viewerRef.current && !viewerRef.current.isDestroyed()) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [cesiumAvailable]);

  /* ── Redraw on filter change ─────────────────────────────────────────── */
  useEffect(() => {
    if (!ready || !viewerRef.current) return;
    drawEntities(viewerRef.current, filter);
  }, [filter, ready]);

  /* ── 3D / 2D toggle ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!ready || !viewerRef.current) return;
    if (mode === '2D') viewerRef.current.scene.morphTo2D(1.0);
    else               viewerRef.current.scene.morphTo3D(1.0);
  }, [mode, ready]);

  const btnBase = {
    border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
    fontWeight: 700, letterSpacing: '0.05em', transition: 'all 0.15s',
    backdropFilter: 'blur(10px)',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100vh', background: '#020408', overflow: 'hidden' }}>

      {/* ── Cesium mount ─────────────────────────────────────────────── */}
      <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

      {/* ── Loading overlay ──────────────────────────────────────────── */}
      {!ready && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 30,
          background: '#020408', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 18,
        }}>
          <div style={{
            width: 52, height: 52,
            border: '3px solid rgba(59,130,246,0.15)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
          <div style={{ fontSize: '0.7rem', color: '#5a6478', fontFamily: 'var(--mono)', letterSpacing: '0.12em' }}>
            INITIALISING 3D GLOBE...
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* ── Top HUD ─────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
        background: 'linear-gradient(180deg, rgba(2,4,8,0.97) 0%, rgba(2,4,8,0.5) 70%, transparent 100%)',
        padding: '14px 22px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        pointerEvents: 'none',
      }}>
        {/* Title + live badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div>
            <div style={{ fontSize: '0.58rem', color: '#5a6478', fontFamily: 'var(--mono)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
              ShockMap · Supply Chain Intelligence
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#d4d8e8', letterSpacing: '-0.03em' }}>
              3D Global Supply Globe
            </div>
          </div>
          {status && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)',
              borderRadius: 6, padding: '5px 12px',
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: '50%', background: '#ef4444',
                display: 'inline-block',
                boxShadow: '0 0 6px #ef4444',
                animation: 'pulse-dot 2s ease-in-out infinite',
              }} />
              <span style={{ fontSize: '0.62rem', color: '#ef4444', fontFamily: 'var(--mono)', fontWeight: 700, letterSpacing: '0.07em' }}>
                HORMUZ {status.status} · DAY {status.days_since_closure}
              </span>
            </div>
          )}
        </div>

        {/* Controls — re-enable pointer events */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', pointerEvents: 'all' }}>
          {/* 3D / 2D */}
          <div style={{
            display: 'flex', overflow: 'hidden', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(2,4,8,0.6)',
          }}>
            {['3D', '2D'].map(m => (
              <button key={m} onClick={() => setMode(m)} style={{
                ...btnBase, padding: '7px 16px', fontSize: '0.7rem',
                background: mode === m ? 'rgba(59,130,246,0.28)' : 'transparent',
                color: mode === m ? '#3b82f6' : '#5a6478',
              }}>{m}</button>
            ))}
          </div>

          {/* Route filters */}
          {FILTERS.map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              ...btnBase, padding: '7px 14px', borderRadius: 8, fontSize: '0.63rem',
              border: `1px solid ${filter === f.id ? f.color + '55' : 'rgba(255,255,255,0.1)'}`,
              background: filter === f.id ? f.color + '1a' : 'rgba(2,4,8,0.6)',
              color: filter === f.id ? f.color : '#5a6478',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* ── Legend ──────────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 26, left: 22, zIndex: 10,
        background: 'rgba(2,4,8,0.88)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '16px 20px', backdropFilter: 'blur(16px)',
      }}>
        <div style={{ fontSize: '0.58rem', color: '#5a6478', fontFamily: 'var(--mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 12 }}>Legend</div>
        {[
          { color: '#ff8232', label: 'Pharma API corridor' },
          { color: '#ef4444', label: 'Hormuz disrupted route' },
          { color: '#f59e0b', label: 'Diversion (Cape route)' },
          { color: '#10b981', label: 'Indian destination port' },
          { color: '#ffaa44', label: 'Chinese API hub (source)' },
        ].map((l, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: i < 4 ? 8 : 0 }}>
            <div style={{ width: 26, height: 2.5, background: l.color, borderRadius: 2, flexShrink: 0 }} />
            <span style={{ fontSize: '0.65rem', color: '#8892a4', fontFamily: 'var(--mono)' }}>{l.label}</span>
          </div>
        ))}
      </div>

      {/* ── Live Telemetry Panel ──────────────────────────────────────── */}
      {telemetry && (
        <div style={{
          position: 'absolute', top: 80, right: 22, zIndex: 10,
          background: 'rgba(2,4,8,0.92)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 12, padding: '16px 20px', backdropFilter: 'blur(16px)',
          minWidth: 220,
        }}>
          <div style={{ fontSize: '0.58rem', color: '#5a6478', fontFamily: 'var(--mono)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>LIVE TELEMETRY</div>
          {/* Node selector */}
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 12 }}>
            {NODES.map((n, i) => (
              <button key={i} onClick={() => setActiveNode(n)} style={{
                border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
                fontSize: '0.55rem', fontWeight: 600, padding: '3px 7px', borderRadius: 4,
                background: activeNode?.label === n.label ? `rgba(${n.rgb.join(',')},0.25)` : 'rgba(255,255,255,0.04)',
                color: activeNode?.label === n.label ? `rgb(${n.rgb.join(',')})` : '#5a6478',
                transition: 'all 0.15s',
              }}>{n.label.split(' ')[0]}</button>
            ))}
          </div>
          {/* Active node name */}
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#d4d8e8', marginBottom: 10 }}>
            {activeNode.label}
          </div>
          {/* Telemetry grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Local Time</div>
              <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#3b82f6', fontFamily: 'var(--mono)' }}>{telemetry.localTime}</div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478' }}>{telemetry.localDate}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Weather</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: telemetry.temp >= 38 ? '#f59e0b' : '#10b981', fontFamily: 'var(--mono)' }}>{telemetry.temp}°C</div>
              <div style={{ fontSize: '0.55rem', color: '#8892a4' }}>{telemetry.weather}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Wind</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: telemetry.wind >= 25 ? '#ef4444' : '#d4d8e8', fontFamily: 'var(--mono)' }}>{telemetry.wind} km/h</div>
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Visibility</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: telemetry.vis <= 8 ? '#f59e0b' : '#d4d8e8', fontFamily: 'var(--mono)' }}>{telemetry.vis} km</div>
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Humidity</div>
              <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#8b5cf6', fontFamily: 'var(--mono)' }}>{telemetry.humidity}%</div>
            </div>
            <div>
              <div style={{ fontSize: '0.55rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Coords</div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: '#5a6478', fontFamily: 'var(--mono)' }}>{activeNode.lat.toFixed(1)}°N {activeNode.lon.toFixed(1)}°E</div>
            </div>
          </div>
        </div>
      )}

      {/* ── Stats panel ─────────────────────────────────────────────── */}
      <div style={{
        position: 'absolute', bottom: 26, right: 22, zIndex: 10,
        background: 'rgba(2,4,8,0.88)', border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 12, padding: '16px 20px', backdropFilter: 'blur(16px)',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px 28px', minWidth: 250,
      }}>
        {[
          { val: '8',    lbl: 'Corridors mapped',  color: '#3b82f6' },
          { val: status ? `${status.days_since_closure}d` : '—', lbl: 'Hormuz closure', color: '#ef4444' },
          { val: '84%',  lbl: 'India at risk',     color: '#f59e0b' },
          { val: '10',   lbl: 'Critical APIs',     color: '#ef4444' },
          { val: '142',  lbl: 'Vessels diverted',  color: '#8b5cf6' },
          { val: '+350%',lbl: 'Air cargo spike',   color: '#f59e0b' },
        ].map((s, i) => (
          <div key={i}>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: s.color, fontFamily: 'var(--mono)', lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontSize: '0.58rem', color: '#5a6478', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 3 }}>{s.lbl}</div>
          </div>
        ))}
      </div>

      {/* ── Drag hint ───────────────────────────────────────────────── */}
      {ready && (
        <div style={{
          position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)',
          zIndex: 10, pointerEvents: 'none',
          background: 'rgba(2,4,8,0.75)', border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 20, padding: '7px 18px', backdropFilter: 'blur(8px)',
          fontSize: '0.62rem', color: '#5a6478', fontFamily: 'var(--mono)',
          animation: 'fadeOut 1s 6s ease forwards',
        }}>
          DRAG TO ROTATE · SCROLL TO ZOOM · RIGHT-DRAG TO TILT
        </div>
      )}
    </div>
  );
}
