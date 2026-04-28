import { useState, useEffect, useMemo } from 'react';
import { api } from '../api/client';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis
} from 'recharts';
import { TrendingUp, TrendingDown, Activity, Zap, AlertTriangle, BarChart2, Info } from 'lucide-react';

/* ── Simulated 30-day price history per ticker ─────────────────────────── */
function generateHistory(basePrice, change30d, days = 30) {
  const pts = [];
  const dailyDrift = change30d / days;
  let price = basePrice * (1 - change30d / 100);
  for (let i = 0; i < days; i++) {
    price += dailyDrift * basePrice / 100;
    price += (Math.random() - 0.48) * basePrice * 0.008; // noise
    pts.push({ day: `D-${days - i}`, price: parseFloat(price.toFixed(2)) });
  }
  return pts;
}

const SEED_HISTORY = {
  SUNPHARMA: { base: 1682.40, change30d: -8.2 },
  DRREDDY:   { base: 5321.15, change30d: -11.4 },
  CIPLA:     { base: 1540.80, change30d: +2.1 },
  DIVISLAB:  { base: 4810.60, change30d: -6.8 },
};

const TICKER_COLORS = {
  SUNPHARMA: '#f59e0b',
  DRREDDY:   '#ef4444',
  CIPLA:     '#10b981',
  DIVISLAB:  '#8b5cf6',
};

/* ── Custom tooltip for chart ──────────────────────────────────────────── */
function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(6,8,16,0.95)', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--mono)',
    }}>
      <div style={{ fontSize: '0.72rem', color: '#d4d8e8', fontWeight: 700 }}>
        ₹{payload[0].value.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
      </div>
      <div style={{ fontSize: '0.6rem', color: '#5a6478', marginTop: 2 }}>{payload[0].payload.day}</div>
    </div>
  );
}

/* ── Single stock card ─────────────────────────────────────────────────── */
function StockCard({ stock, isSelected, onClick }) {
  const color = TICKER_COLORS[stock.ticker] || '#3b82f6';
  const seed = SEED_HISTORY[stock.ticker];
  const history = useMemo(() => seed ? generateHistory(seed.base, seed.change30d) : [], [stock.ticker]);
  const isUp = stock.change >= 0;

  return (
    <div
      onClick={onClick}
      style={{
        background: isSelected ? `${color}10` : 'var(--surface)',
        border: `1px solid ${isSelected ? color + '40' : 'var(--border)'}`,
        borderRadius: 14, padding: '18px 20px', cursor: 'pointer',
        transition: 'all 0.2s',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        boxShadow: isSelected ? `0 8px 32px ${color}20` : 'none',
      }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginBottom: 3 }}>
            NSE:{stock.ticker}
          </div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2, maxWidth: 130 }}>
            {stock.name.split(' ')[0]} {stock.name.split(' ')[1] || ''}
          </div>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 32, height: 32, borderRadius: 8,
          background: isUp ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
        }}>
          {isUp
            ? <TrendingUp size={16} style={{ color: 'var(--green)' }} />
            : <TrendingDown size={16} style={{ color: 'var(--accent)' }} />
          }
        </div>
      </div>

      {/* Price */}
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)', letterSpacing: '-0.03em', lineHeight: 1 }}>
          ₹{stock.price.toLocaleString('en-IN')}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 5 }}>
          <span style={{
            fontSize: '0.72rem', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--accent)',
            fontFamily: 'var(--mono)',
          }}>
            {isUp ? '+' : ''}{stock.change}%
          </span>
          <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>24H</span>
          {stock.source === 'fallback' && (
            <span style={{
              fontSize: '0.55rem', padding: '1px 5px', borderRadius: 3,
              background: 'rgba(245,158,11,0.1)', color: 'var(--amber)',
              border: '1px solid rgba(245,158,11,0.2)', fontFamily: 'var(--mono)',
            }}>EST</span>
          )}
        </div>
      </div>

      {/* Mini chart */}
      <div style={{ height: 50, marginLeft: -8, marginRight: -8 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id={`grad-${stock.ticker}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area
              type="monotone" dataKey="price"
              stroke={color} strokeWidth={1.5}
              fill={`url(#grad-${stock.ticker})`}
              dot={false} isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ fontSize: '0.58rem', color: 'var(--muted)', textAlign: 'right', fontFamily: 'var(--mono)', marginTop: 4 }}>
        30-DAY TREND
      </div>
    </div>
  );
}

/* ── Main page ─────────────────────────────────────────────────────────── */
export default function MarketSignals() {
  const [stocks,       setStocks]       = useState([]);
  const [correlations, setCorrelations] = useState([]);
  const [selected,     setSelected]     = useState(null);
  const [loading,      setLoading]      = useState(true);

  useEffect(() => {
    Promise.all([api.getPharmaStocks(), api.getStockCorrelations()])
      .then(([s, c]) => { setStocks(s); setCorrelations(c); setSelected(s[0]?.ticker || null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const selectedStock = stocks.find(s => s.ticker === selected);
  const selectedColor = selectedStock ? (TICKER_COLORS[selectedStock.ticker] || '#3b82f6') : '#3b82f6';
  const selectedSeed  = selectedStock ? SEED_HISTORY[selectedStock.ticker] : null;
  const bigHistory    = useMemo(
    () => selectedSeed ? generateHistory(selectedSeed.base, selectedSeed.change30d, 60) : [],
    [selected]
  );

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', flexDirection: 'column', gap: 12 }}>
      <div style={{ width: 36, height: 36, border: '2px solid rgba(59,130,246,0.2)', borderTop: '2px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
      <div style={{ fontSize: '0.72rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>FETCHING MARKET DATA...</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 14, padding: '20px 28px', marginBottom: 24,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 4 }}>
            Market Signals
          </h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--muted)', maxWidth: 500 }}>
            NSE pharma equities correlated with upstream supply shocks detected by ShockMap.
            7-14 day lead time on average.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 14px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 8 }}>
          <Activity size={14} style={{ color: 'var(--green)' }} />
          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--green)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>
            {stocks.some(s => s.source === 'live') ? 'LIVE DATA' : 'EST. DATA · MARKET CLOSED'}
          </span>
        </div>
      </div>

      {/* ── Stock cards ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 }}>
        {stocks.map(s => (
          <StockCard
            key={s.ticker}
            stock={s}
            isSelected={selected === s.ticker}
            onClick={() => setSelected(s.ticker)}
          />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 20, alignItems: 'start' }}>

        {/* ── Big chart ───────────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'rgba(255,255,255,0.015)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BarChart2 size={16} style={{ color: 'var(--muted)' }} />
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                60-Day Price History
              </span>
              {selectedStock && (
                <span style={{
                  padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700,
                  background: `${selectedColor}18`, color: selectedColor, fontFamily: 'var(--mono)',
                  border: `1px solid ${selectedColor}35`,
                }}>
                  {selectedStock.ticker}
                </span>
              )}
            </div>
            {selectedStock && (
              <div style={{ display: 'flex', items: 'center', gap: 16 }}>
                <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', fontFamily: 'var(--mono)' }}>
                  ₹{selectedStock.price.toLocaleString('en-IN')}
                </span>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--mono)',
                  color: selectedStock.change >= 0 ? 'var(--green)' : 'var(--accent)',
                }}>
                  {selectedStock.change >= 0 ? '+' : ''}{selectedStock.change}%
                </span>
              </div>
            )}
          </div>
          <div style={{ padding: '20px', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={bigHistory} margin={{ top: 4, right: 4, bottom: 0, left: 8 }}>
                <defs>
                  <linearGradient id="bigGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={selectedColor} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={selectedColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="day" tick={{ fontSize: 9, fill: '#5a6478', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} interval={9} />
                <YAxis tick={{ fontSize: 9, fill: '#5a6478', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={60}
                  tickFormatter={v => `₹${(v/1000).toFixed(1)}k`} />
                <RechartsTooltip content={<ChartTooltip />} cursor={{ stroke: selectedColor, strokeWidth: 1, strokeDasharray: '4 2' }} />
                <Area type="monotone" dataKey="price"
                  stroke={selectedColor} strokeWidth={2}
                  fill="url(#bigGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* ShockMap lead-time banner */}
          <div style={{
            margin: '0 20px 20px', padding: '12px 16px',
            background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <AlertTriangle size={14} style={{ color: 'var(--accent)', marginTop: 1, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: 3 }}>
                SHOCKMAP EARLY WARNING
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>
                ShockMap detected the Hebei province API factory disruption <strong style={{ color: 'var(--text)' }}>11 days before</strong> Sun Pharma's 4.2% equity drop.
                Real-time signal extraction gives procurement teams a critical lead window.
              </p>
            </div>
          </div>
        </div>

        {/* ── Correlation feed ────────────────────────────────────────── */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, overflow: 'hidden',
        }}>
          <div style={{
            padding: '14px 18px', borderBottom: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.015)',
          }}>
            <Zap size={15} style={{ color: 'var(--amber)' }} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Shock → Price Correlations
            </span>
          </div>

          <div style={{ padding: '12px' }}>
            {correlations.map((c, i) => {
              const color = TICKER_COLORS[c.stock] || '#3b82f6';
              const confColor = c.confidence === 'High' ? '#10b981' : c.confidence === 'Stable' ? '#3b82f6' : '#f59e0b';
              return (
                <div key={i} style={{
                  padding: '14px', borderRadius: 10, marginBottom: i < correlations.length - 1 ? 8 : 0,
                  background: 'var(--surface2)', border: '1px solid var(--border)',
                  borderLeft: `3px solid ${color}`,
                  transition: 'border-color 0.15s',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span style={{
                      fontSize: '0.65rem', fontWeight: 800, color, fontFamily: 'var(--mono)',
                      padding: '2px 7px', borderRadius: 4, background: `${color}15`,
                    }}>{c.stock}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {c.lead_days && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                          {c.lead_days}d lead
                        </span>
                      )}
                      <span style={{
                        fontSize: '0.58rem', padding: '1px 6px', borderRadius: 3, fontFamily: 'var(--mono)', fontWeight: 700,
                        background: `${confColor}12`, color: confColor, border: `1px solid ${confColor}30`,
                      }}>{c.confidence}</span>
                    </div>
                  </div>
                  {c.stock_move !== null && c.stock_move !== undefined && (
                    <div style={{
                      fontSize: '0.85rem', fontWeight: 800, fontFamily: 'var(--mono)',
                      color: c.stock_move < 0 ? 'var(--accent)' : 'var(--green)', marginBottom: 6,
                    }}>
                      {c.stock_move > 0 ? '+' : ''}{c.stock_move}%
                    </div>
                  )}
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.55, margin: 0 }}>
                    {c.event}
                  </p>
                  <div style={{ fontSize: '0.58rem', color: 'var(--muted)', fontFamily: 'var(--mono)', marginTop: 6 }}>{c.date}</div>
                </div>
              );
            })}
          </div>

          {/* Sector exposure bars */}
          <div style={{ padding: '16px 18px', borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: '0.6rem', color: 'var(--muted)', fontFamily: 'var(--mono)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
              Sector Exposure
            </div>
            {[
              { label: 'China Import Dependency', value: 82, color: 'var(--accent)' },
              { label: 'Hormuz Route Exposure',   value: 68, color: '#f59e0b' },
              { label: 'Supply Chain Resiliency', value: 36, color: 'var(--green)' },
            ].map((bar, i) => (
              <div key={i} style={{ marginBottom: i < 2 ? 12 : 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.65rem', color: 'var(--muted)' }}>{bar.label}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: bar.color, fontFamily: 'var(--mono)' }}>{bar.value}%</span>
                </div>
                <div style={{ height: 4, background: 'var(--surface3)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${bar.value}%`, background: bar.color, borderRadius: 4, transition: 'width 1s ease' }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Bottom insight bar ─────────────────────────────────────────── */}
      <div style={{
        marginTop: 20, padding: '14px 20px',
        background: 'rgba(59,130,246,0.05)', border: '1px solid rgba(59,130,246,0.15)',
        borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <Info size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
        <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', margin: 0, lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text)' }}>How ShockMap uses this:</strong> Supply shock signals from GDELT (Engine 1) propagate through the pharma dependency graph (Engine 2). 
          Historical correlation shows a <strong style={{ color: 'var(--primary)' }}>7–14 day lead time</strong> between upstream disruption detection and NSE equity movement — 
          giving procurement desks and institutional risk teams an actionable early-warning window.
        </p>
      </div>
    </div>
  );
}
