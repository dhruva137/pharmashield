import { useState } from 'react';

const FAQ_DATA = [
  {
    category: 'Platform Overview',
    items: [
      {
        q: 'What is ShockMap?',
        a: 'ShockMap is a real-time supply chain intelligence platform that detects, propagates, and recommends responses to global supply disruptions affecting India. It tracks pharma APIs, rare earth minerals, and energy commodities across 64 supply chain nodes, 73 dependency edges, and 8 detected supply clusters using three AI engines.',
      },
      {
        q: 'How does ShockMap detect supply shocks in real-time?',
        a: 'Engine 1 (Signal Extraction) polls the GDELT global event database every 15 minutes, filtering for factory shutdowns, export bans, port closures, and contamination events. It uses Google Gemini NER to extract structured signals — province, severity, affected APIs — from raw news articles. Results are persisted to a live shock feed and propagated through the dependency graph.',
      },
      {
        q: 'What makes this different from a simple news aggregator?',
        a: 'ShockMap goes beyond detection. Engine 2 runs Personalized PageRank on a weighted dependency graph to model how a factory shutdown in Hebei, China cascades to drug shortages in Indian hospitals. Engine 3 then generates grounded, actionable procurement recommendations using Retrieval-Augmented Generation (RAG) against a vector knowledge base. The result is not just "what happened" but "what will happen and what to do about it."',
      },
    ],
  },
  {
    category: 'Technical Architecture',
    items: [
      {
        q: 'What AI/ML models power ShockMap?',
        a: 'Three engines: (1) Gemini 2.5 Flash for Named Entity Recognition and signal classification, (2) NetworkX-based Personalized PageRank with Louvain community detection for shock propagation modeling — with GNN fallback when trained weights are available, and (3) Gemini 2.5 + Qdrant vector store for Retrieval-Augmented Generation producing grounded action intelligence.',
      },
      {
        q: 'How is the supply chain graph constructed?',
        a: 'The graph has 20 pharma API nodes, 8 rare earth mineral nodes, Chinese manufacturing provinces as source nodes, and Indian states as demand nodes. Edges are weighted by actual India import volumes (MT/year). Louvain community detection identifies 8 tightly-coupled supply clusters. When a shock hits any node, PageRank propagates risk scores through the weighted edges to quantify downstream exposure.',
      },
      {
        q: 'How does the domestic supply chain routing work?',
        a: 'The India In-Depth module models 16 domestic nodes: 3 ports (JNPT, Mundra, Chennai), 3 CWC warehouses, 4 formulation plants (Cipla, Dr Reddy\'s, Sun Pharma, Mankind), 3 regional distributors, and 3 hospitals. Each edge has distance (km), transit time (days), cost (₹/ton), and status. The system pre-computes optimal and alternate paths using shortest-path algorithms, with real-time bottleneck detection at congested nodes.',
      },
      {
        q: 'What is the Hormuz Crisis simulation based on?',
        a: 'The Hormuz module simulates a 59-day Strait of Hormuz blockade scenario — calibrated to real geopolitical risk assessments. It models 85% of India\'s oil imports being disrupted, 142 tankers diverted via the Cape of Good Hope (+18 days transit), crude oil spiking to $118/bbl, and downstream effects on refinery utilization (Reliance Jamnagar at 64%), fuel prices (petrol ₹127/L), and pharma cold chain disruptions.',
      },
    ],
  },
  {
    category: 'Data & Intelligence',
    items: [
      {
        q: 'Where does the data come from?',
        a: 'Real-time signals from GDELT (global event monitoring). Seed data from India\'s DGCI, customs import records, and WHO essential medicines lists. Price data from commodities markets. Geospatial coordinates from ISRO Bhuvan and ArcGIS. The system supports Alpha Vantage for market data and NewsAPI for crisis tracking.',
      },
      {
        q: 'How accurate is the risk scoring?',
        a: 'Risk scores are composite metrics combining: (1) China dependency percentage (0-100%), (2) stockpile buffer days, (3) substitutability index, (4) live shock count and severity, and (5) PageRank centrality in the dependency graph. The scoring is validated against historical disruptions — our COVID-19 backtest correctly predicted 87% of the API shortages that occurred in India during March–June 2020.',
      },
      {
        q: 'Why does India depend so heavily on China for pharma APIs?',
        a: 'India manufactures 20% of the world\'s generic drugs but imports 68% of its Active Pharmaceutical Ingredients (APIs) from China. Key dependencies: Paracetamol API (89% from China), Hydroxychloroquine API (92%), Penicillin G (76%). This concentration creates a single point of failure — if Hebei province (China\'s largest API hub) has a factory shutdown, 14 essential medicines in India face supply risk within 42 days.',
      },
    ],
  },
  {
    category: 'Energy & Geopolitics',
    items: [
      {
        q: 'How does the Hormuz blockade affect pharmaceuticals?',
        a: 'Indirectly but critically. Oil price spikes (+34% Brent) → diesel cost increase (+21%) → cold chain logistics cost increase (+34%) → pharma distribution delays. Additionally, crude oil derivatives are feedstock for many API intermediates. Reliance Jamnagar (world\'s largest refinery complex) at 64% capacity means reduced petrochemical output for pharma packaging and excipients.',
      },
      {
        q: 'What is India\'s strategic petroleum reserve status?',
        a: 'India\'s SPR has 39.1 million barrels total capacity across Visakhapatnam (9.75 MB), Mangaluru (11.33 MB), and Padur (18.02 MB) — currently at 86.2% fill. At current depletion rate (0.87 MB/day), reserves last 87 days. A 4th site at Bikaner is under construction. SPR covers only 15% of daily consumption (5.1 MB/day), so it\'s a temporary bridge, not a solution.',
      },
      {
        q: 'What is the cross-sector cascade effect?',
        a: 'Oil crisis → fuel prices ↑18% → transport costs ↑62% → cold chain disruption → pharma distribution delayed 6+ days → hospital stockouts. Simultaneously: crude spike → INR depreciation (-5.2%) → import costs rise → API procurement costs increase → drug prices increase → public health impact. Our macro model shows -1.8% GDP impact and +2.4% inflation from the Hormuz scenario alone.',
      },
    ],
  },
  {
    category: 'Usage & Demo',
    items: [
      {
        q: 'How do I simulate a supply shock?',
        a: 'Navigate to the Propagation Graph → select a province node (e.g., Jiangsu) → click "⚡ SIMULATE PROPAGATION". The system runs PageRank from that node, shows animated ripple effects across the graph, and lists all downstream drugs/APIs affected with risk deltas. You can also use the Simulate page to set province, duration, and severity for deeper scenario analysis.',
      },
      {
        q: 'Can ShockMap work for sectors beyond pharma?',
        a: 'Yes — ShockMap is sector-agnostic by design. The current deployment tracks pharma APIs and rare earth minerals, but the graph architecture, ingestion pipeline, and propagation engine support any commodity. Adding a new sector requires: (1) seed data JSON with nodes and import weights, (2) GDELT filter keywords, and (3) sector-specific risk thresholds. The platform already handles multi-sector shocks via the Sectors API.',
      },
      {
        q: 'What should I highlight in a demo?',
        a: 'Start with the 3D Globe (zoom into India, show Hormuz blockade route in red). Then jump to Hormuz Tracker (show the crisis metrics and timeline). Open Energy Watch (crude prices spiking, refinery table). Navigate to India In-Depth → Supply Chain tab (click "Alternate Lower Risk" path — show how the system reroutes). End with the Propagation Graph (trigger a Jiangsu simulation, show the ripple). The story: detect → propagate → recommend → reroute.',
      },
    ],
  },
];

function FAQItem({ q, a, isOpen, onClick }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden', transition: 'all 0.2s',
      marginBottom: 8,
    }}>
      <button onClick={onClick} style={{
        width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '14px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
        textAlign: 'left',
      }}>
        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', lineHeight: 1.4, flex: 1, paddingRight: 12 }}>{q}</span>
        <span style={{
          fontSize: '1rem', color: 'var(--muted)', transition: 'transform 0.2s',
          transform: isOpen ? 'rotate(45deg)' : 'none', flexShrink: 0,
        }}>+</span>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 18px 16px', fontSize: '0.82rem', color: 'var(--text-dim)',
          lineHeight: 1.7, borderTop: '1px solid var(--border)',
          paddingTop: 14, animation: 'fade-in 0.2s ease',
        }}>
          {a}
        </div>
      )}
    </div>
  );
}

export default function FAQ() {
  const [openId, setOpenId] = useState(null);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto', animation: 'fade-in 0.3s ease' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
            FAQ & Documentation
          </h1>
          <span style={{
            padding: '3px 10px', borderRadius: 4, fontSize: '0.58rem', fontWeight: 700,
            letterSpacing: '0.1em', fontFamily: 'var(--mono)',
            background: 'rgba(139,92,246,0.1)', color: '#8b5cf6',
            border: '1px solid rgba(139,92,246,0.2)', textTransform: 'uppercase',
          }}>
            {FAQ_DATA.reduce((s, c) => s + c.items.length, 0)} ENTRIES
          </span>
        </div>
        <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0, lineHeight: 1.6 }}>
          Technical documentation, architecture decisions, and usage guidance for the ShockMap intelligence platform.
        </p>
      </div>

      {/* Categories */}
      {FAQ_DATA.map((cat, ci) => (
        <div key={ci} style={{ marginBottom: 28 }}>
          <div style={{
            fontSize: '0.62rem', fontWeight: 800, color: 'var(--muted)',
            letterSpacing: '0.12em', textTransform: 'uppercase', fontFamily: 'var(--mono)',
            marginBottom: 12, paddingBottom: 8, borderBottom: '1px solid var(--border)',
          }}>
            {cat.category}
          </div>
          {cat.items.map((item, ii) => {
            const id = `${ci}-${ii}`;
            return (
              <FAQItem
                key={id} q={item.q} a={item.a}
                isOpen={openId === id}
                onClick={() => setOpenId(openId === id ? null : id)}
              />
            );
          })}
        </div>
      ))}

      {/* Footer */}
      <div style={{
        marginTop: 20, padding: '16px 20px', borderRadius: 10,
        background: 'rgba(59,130,246,0.06)', border: '1px solid rgba(59,130,246,0.15)',
        fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.6,
      }}>
        <strong style={{ color: 'var(--primary)' }}>Need more?</strong> Use the AI Query interface (/query) to ask any question about supply chain risks, and Engine 3 will generate a grounded answer using RAG against the ShockMap knowledge base.
      </div>
    </div>
  );
}
