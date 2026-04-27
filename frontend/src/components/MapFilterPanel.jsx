import { useState, useEffect, useCallback } from 'react';
import { api } from '../api/client';

const SECTOR_OPTIONS = [
  { value: 'both', label: 'All Sectors', icon: '◉' },
  { value: 'pharma', label: 'Pharma APIs', icon: '💊' },
  { value: 'rare_earth', label: 'Rare Earths', icon: '⚛' },
];

const REGION_OPTIONS = [
  { value: 'all', label: 'Global', icon: '🌐' },
  { value: 'china', label: 'China', icon: '🇨🇳' },
  { value: 'india', label: 'India', icon: '🇮🇳' },
];

const RISK_PRESETS = [
  { value: 0, label: 'All', color: '#6b7280' },
  { value: 40, label: 'Medium+', color: '#60a5fa' },
  { value: 60, label: 'High+', color: '#f59e0b' },
  { value: 80, label: 'Critical', color: '#f43f5e' },
];

export default function MapFilterPanel({ onFilterChange, showCorridors, onToggleCorridors }) {
  const [facets, setFacets] = useState({
    sectors: [],
    shock_types: [],
    risk_levels: [],
    china_provinces: [],
    india_states: [],
  });

  const [filters, setFilters] = useState({
    sector: 'both',
    risk_min: 0,
    shock_type: '',
    region: 'all',
  });

  useEffect(() => {
    api.getMapFacets().then(setFacets).catch(console.error);
  }, []);

  const handleChange = useCallback((key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  }, [filters, onFilterChange]);

  const panelStyle = {
    background: 'rgba(13, 17, 23, 0.85)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: '20px',
    display: 'flex',
    flexDirection: 'column',
    gap: 18,
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.7rem',
    color: 'var(--muted)',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    marginBottom: 8,
  };

  const chipStyle = (isActive, color = 'var(--primary)') => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 5,
    padding: '6px 12px',
    borderRadius: 999,
    fontSize: '0.75rem',
    fontWeight: 500,
    cursor: 'pointer',
    border: `1px solid ${isActive ? color : 'var(--border)'}`,
    background: isActive ? `${color}15` : 'transparent',
    color: isActive ? color : 'var(--muted)',
    transition: 'all 0.2s ease',
  });

  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
          Filters
        </h3>
        <span style={{
          fontSize: '0.65rem', padding: '3px 8px', borderRadius: 999,
          background: 'rgba(79,156,249,0.12)', color: 'var(--primary)',
          border: '1px solid rgba(79,156,249,0.2)', fontWeight: 600,
        }}>
          LIVE
        </span>
      </div>

      {/* Region Selector */}
      <div>
        <label style={labelStyle}>Region Focus</label>
        <div style={{ display: 'flex', gap: 6 }}>
          {REGION_OPTIONS.map(r => (
            <button
              key={r.value}
              onClick={() => handleChange('region', r.value)}
              style={chipStyle(filters.region === r.value)}
            >
              <span>{r.icon}</span> {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sector Selector */}
      <div>
        <label style={labelStyle}>Sector</label>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SECTOR_OPTIONS.map(s => (
            <button
              key={s.value}
              onClick={() => handleChange('sector', s.value)}
              style={chipStyle(filters.sector === s.value, s.value === 'pharma' ? '#10b981' : s.value === 'rare_earth' ? '#f59e0b' : 'var(--primary)')}
            >
              <span>{s.icon}</span> {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Risk Level */}
      <div>
        <label style={labelStyle}>
          Risk Threshold
          <span style={{
            float: 'right', fontWeight: 700, fontSize: '0.72rem',
            color: filters.risk_min >= 80 ? '#f43f5e' : filters.risk_min >= 60 ? '#f59e0b' : filters.risk_min >= 40 ? '#60a5fa' : 'var(--muted)',
            fontFamily: 'var(--mono)',
          }}>
            {filters.risk_min}+
          </span>
        </label>
        <div style={{ display: 'flex', gap: 6 }}>
          {RISK_PRESETS.map(r => (
            <button
              key={r.value}
              onClick={() => handleChange('risk_min', r.value)}
              style={{
                ...chipStyle(filters.risk_min === r.value, r.color),
                flex: 1, justifyContent: 'center',
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shock Type */}
      <div>
        <label style={labelStyle}>Shock Type</label>
        <select
          value={filters.shock_type}
          onChange={(e) => handleChange('shock_type', e.target.value)}
          style={{
            width: '100%', padding: '8px 12px', borderRadius: 10,
            background: 'var(--surface2)', border: '1px solid var(--border)',
            color: 'var(--text)', fontSize: '0.8rem', fontFamily: 'inherit',
            cursor: 'pointer', transition: 'border-color 0.2s',
          }}
        >
          <option value="">Any Shock Type</option>
          {facets.shock_types && facets.shock_types.map(s => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </option>
          ))}
        </select>
      </div>

      {/* Supply Corridor Toggle */}
      <div>
        <button
          onClick={onToggleCorridors}
          style={{
            width: '100%', padding: '10px 14px', borderRadius: 10,
            background: showCorridors ? 'rgba(79,156,249,0.12)' : 'var(--surface2)',
            border: `1px solid ${showCorridors ? 'rgba(79,156,249,0.3)' : 'var(--border)'}`,
            color: showCorridors ? 'var(--primary)' : 'var(--muted)',
            fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.2s ease',
          }}
        >
          <span style={{ fontSize: '1rem' }}>⛓</span>
          {showCorridors ? 'Hide' : 'Show'} Supply Corridors
        </button>
      </div>

      {/* Reset */}
      <button
        onClick={() => {
          const reset = { sector: 'both', risk_min: 0, shock_type: '', region: 'all' };
          setFilters(reset);
          onFilterChange(reset);
        }}
        style={{
          width: '100%', padding: '8px', borderRadius: 8,
          background: 'transparent', border: '1px solid var(--border)',
          color: 'var(--muted)', fontSize: '0.72rem', fontWeight: 500,
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        Reset All Filters
      </button>
    </div>
  );
}
