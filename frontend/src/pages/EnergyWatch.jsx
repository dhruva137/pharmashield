import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const Card = ({ children, style }) => (
  <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:14, ...style }}>{children}</div>
);
const Lbl = ({ children }) => (
  <div style={{ fontSize:'0.6rem', color:'var(--muted)', fontFamily:'var(--mono)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{children}</div>
);
const Big = ({ children, color='var(--text)' }) => (
  <div style={{ fontSize:'1.25rem', fontWeight:800, color, fontFamily:'var(--mono)', lineHeight:1 }}>{children}</div>
);
const Badge = ({ status }) => {
  const c = status==='CRITICAL'?'#ef4444':status==='HIGH'?'#f59e0b':'#3b82f6';
  return <span style={{ fontSize:'0.55rem', fontWeight:800, padding:'2px 6px', borderRadius:4, background:c+'18', color:c, border:`1px solid ${c}40`, fontFamily:'var(--mono)' }}>{status}</span>;
};

export default function EnergyWatch() {
  const [status, setStatus] = useState(null);
  const [crude, setCrude] = useState(null);
  const [fuel, setFuel] = useState(null);
  const [reserves, setReserves] = useState(null);
  const [refineries, setRefineries] = useState([]);
  const [stocks, setStocks] = useState([]);
  const [macro, setMacro] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getEnergyStatus(), api.getCrudePrices(), api.getFuelPricesIndia(),
      api.getStrategicReserves(), api.getRefineries(), api.getEnergyStocks(),
      api.getMacroImpact(), api.getEnergyTimeline(),
    ]).then(([s,c,f,r,ref,st,m,t]) => {
      setStatus(s); setCrude(c); setFuel(f); setReserves(r);
      setRefineries(ref); setStocks(st); setMacro(m); setTimeline(t);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'60vh', flexDirection:'column', gap:14 }}>
      <div style={{ width:36, height:36, border:'2px solid rgba(245,158,11,0.2)', borderTop:'2px solid #f59e0b', borderRadius:'50%', animation:'spin 1s linear infinite' }} />
      <div style={{ fontSize:'0.7rem', color:'var(--muted)', fontFamily:'var(--mono)' }}>LOADING ENERGY INTELLIGENCE...</div>
      <style>{`@keyframes spin { to { transform:rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ padding:24, maxWidth:1400, margin:'0 auto' }}>
      {/* Header */}
      <Card style={{ padding:'22px 28px', marginBottom:20, display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, background:'linear-gradient(135deg,var(--surface),rgba(245,158,11,0.04))', borderColor:'rgba(245,158,11,0.25)' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:8 }}>
            <h1 style={{ fontSize:'1.5rem', fontWeight:800, color:'var(--text)', margin:0 }}>Energy Watch</h1>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'4px 10px', background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.35)', borderRadius:6 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#ef4444', display:'inline-block', boxShadow:'0 0 6px #ef4444', animation:'pulse-dot 2s ease-in-out infinite' }} />
              <span style={{ fontSize:'0.62rem', fontWeight:800, color:'#ef4444', fontFamily:'var(--mono)' }}>HORMUZ CRISIS · DAY {status?.days_active}</span>
            </div>
          </div>
          <p style={{ fontSize:'0.82rem', color:'var(--muted)', maxWidth:520, margin:0 }}>
            Real-time oil, fuel & LNG intelligence. {status?.india_import_pct_via_hormuz}% of India's oil imports transit the Strait of Hormuz.
          </p>
        </div>
        <div style={{ display:'flex', gap:20 }}>
          {[
            { lbl:'Brent Crude', val:`$${status?.brent_crude_usd}`, chg:status?.brent_change_pct, c:'#ef4444' },
            { lbl:'Petrol (IN)', val:`₹${status?.petrol_price_india_litre}`, chg:status?.petrol_change_since_crisis, c:'#f59e0b' },
            { lbl:'LNG', val:`$${status?.lng_price_usd_mmbtu}`, chg:status?.lng_change_pct, c:'#ef4444' },
            { lbl:'Reserve', val:`${status?.strategic_reserve_days}d`, chg:status?.strategic_reserve_status, c:'#f59e0b' },
          ].map((s,i) => (
            <div key={i} style={{ textAlign:'right', borderLeft:i?'1px solid var(--border)':'none', paddingLeft:i?20:0 }}>
              <Lbl>{s.lbl}</Lbl>
              <Big color={s.c}>{s.val}</Big>
              <div style={{ fontSize:'0.58rem', color:s.c, fontFamily:'var(--mono)', marginTop:2 }}>{s.chg}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Charts Row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:18 }}>
        {/* Crude Oil Chart */}
        <Card style={{ padding:20 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Brent Crude · 60D</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={crude?.brent || []}>
              <defs><linearGradient id="gBrent" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="100%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
              <XAxis dataKey="date" tick={{ fontSize:9, fill:'#5a6478' }} tickFormatter={d => d?.slice(5)} interval={9} />
              <YAxis tick={{ fontSize:9, fill:'#5a6478' }} domain={['auto','auto']} />
              <Tooltip contentStyle={{ background:'#0d1117', border:'1px solid #1e2330', borderRadius:8, fontSize:'0.72rem' }} />
              <Area type="monotone" dataKey="value" stroke="#ef4444" fill="url(#gBrent)" strokeWidth={2} dot={false} name="Brent USD" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* India Fuel Chart */}
        <Card style={{ padding:20 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>India Fuel Prices · 60D</div>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={fuel?.petrol_inr_litre || []}>
              <defs>
                <linearGradient id="gPetrol" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3}/><stop offset="100%" stopColor="#f59e0b" stopOpacity={0}/></linearGradient>
              </defs>
              <XAxis dataKey="date" tick={{ fontSize:9, fill:'#5a6478' }} tickFormatter={d => d?.slice(5)} interval={9} />
              <YAxis tick={{ fontSize:9, fill:'#5a6478' }} domain={['auto','auto']} />
              <Tooltip contentStyle={{ background:'#0d1117', border:'1px solid #1e2330', borderRadius:8, fontSize:'0.72rem' }} />
              <Area type="monotone" dataKey="value" stroke="#f59e0b" fill="url(#gPetrol)" strokeWidth={2} dot={false} name="Petrol ₹/L" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Refineries + Macro */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 380px', gap:18, marginBottom:18 }}>
        {/* Refineries Table */}
        <Card style={{ overflow:'hidden' }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em' }}>Refinery Status</span>
            <span style={{ fontSize:'0.6rem', color:'var(--muted)', fontFamily:'var(--mono)' }}>{refineries.length} TRACKED</span>
          </div>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'0.78rem' }}>
            <thead><tr style={{ background:'rgba(255,255,255,0.015)' }}>
              {['Refinery','Capacity','Utilization','Shortfall','Risk'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'0.6rem', fontWeight:800, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'0.08em' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {refineries.map(r => (
                <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ fontWeight:600, color:'var(--text)' }}>{r.name}</div>
                    <div style={{ fontSize:'0.6rem', color:'var(--muted)' }}>{r.company}</div>
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', color:'var(--muted)' }}>{r.capacity_kbd} kbd</td>
                  <td style={{ padding:'10px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                      <div style={{ width:40, height:4, background:'var(--surface3)', borderRadius:4, overflow:'hidden' }}>
                        <div style={{ width:`${r.current_utilization_pct}%`, height:'100%', background:r.current_utilization_pct<65?'#ef4444':'#f59e0b', borderRadius:4 }} />
                      </div>
                      <span style={{ fontFamily:'var(--mono)', color:r.current_utilization_pct<65?'#ef4444':'var(--muted)', fontSize:'0.75rem' }}>{r.current_utilization_pct}%</span>
                    </div>
                  </td>
                  <td style={{ padding:'10px 14px', fontFamily:'var(--mono)', color:'#ef4444', fontWeight:700 }}>-{r.shortfall_kbd} kbd</td>
                  <td style={{ padding:'10px 14px' }}><Badge status={r.risk} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Macro Impact */}
        <Card style={{ padding:22 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16 }}>Macro Impact</div>
          {macro && [
            { lbl:'GDP Impact', val:macro.gdp_impact_pct+'%', c:'#ef4444' },
            { lbl:'Inflation Add', val:'+'+macro.inflation_add_pct+'%', c:'#f59e0b' },
            { lbl:'INR/USD', val:'₹'+macro.rupee_vs_usd, c:'#ef4444' },
            { lbl:'CAD (Ann.)', val:'$'+macro.current_account_deficit_bn_usd_annualised+'B', c:'#f59e0b' },
            { lbl:'Forex Burn', val:'$'+macro.forex_reserve_burn_rate_bn_usd_month+'B/mo', c:'#ef4444' },
            { lbl:'ATF Spike', val:'+'+macro.aviation_turbine_fuel_change_pct+'%', c:'#f59e0b' },
            { lbl:'Freight Cost', val:'+'+macro.freight_cost_increase_pct+'%', c:'#ef4444' },
            { lbl:'Food Inflation', val:'+'+macro.food_inflation_add_pct+'%', c:'#f59e0b' },
          ].map((m,i) => (
            <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid var(--border)' }}>
              <span style={{ fontSize:'0.78rem', color:'var(--muted)' }}>{m.lbl}</span>
              <span style={{ fontSize:'0.82rem', fontWeight:700, color:m.c, fontFamily:'var(--mono)' }}>{m.val}</span>
            </div>
          ))}
        </Card>
      </div>

      {/* Energy Stocks + Timeline */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* Stocks */}
        <Card style={{ padding:22 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:14 }}>Energy Equities</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {stocks.map(s => (
              <div key={s.ticker} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'10px 12px', background:'var(--surface2)', borderRadius:10, border:'1px solid var(--border)' }}>
                <div>
                  <div style={{ fontWeight:700, color:'var(--text)', fontSize:'0.82rem' }}>{s.name}</div>
                  <div style={{ fontSize:'0.6rem', color:'var(--muted)', fontFamily:'var(--mono)' }}>{s.ticker} · {s.sector}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontWeight:800, fontFamily:'var(--mono)', color:'var(--text)', fontSize:'0.9rem' }}>₹{s.price}</div>
                  <div style={{ fontSize:'0.65rem', color:s.change_pct<0?'#ef4444':'#10b981', fontFamily:'var(--mono)', fontWeight:700 }}>{s.change_pct}%</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Timeline */}
        <Card style={{ padding:22 }}>
          <div style={{ fontSize:'0.7rem', fontWeight:800, color:'var(--text-dim)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:16 }}>Energy Crisis Timeline</div>
          <div style={{ position:'relative', paddingLeft:26 }}>
            <div style={{ position:'absolute', left:7, top:8, bottom:8, width:1, background:'var(--border)' }} />
            {timeline.map((item,i) => (
              <div key={i} style={{ position:'relative', marginBottom:i<timeline.length-1?18:0 }}>
                <div style={{ position:'absolute', left:-26+1, top:4, width:13, height:13, borderRadius:'50%', background:'var(--surface)', border:'2px solid #f59e0b', zIndex:2 }} />
                <div style={{ fontSize:'0.6rem', fontFamily:'var(--mono)', color:'#f59e0b', fontWeight:800, marginBottom:2 }}>
                  {item.date} · <span style={{ color:'var(--muted)', fontWeight:400 }}>{item.event}</span>
                </div>
                <p style={{ fontSize:'0.72rem', color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
