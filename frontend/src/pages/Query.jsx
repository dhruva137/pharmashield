import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

const EXAMPLE_QUERIES = [
  'Top 5 drugs at risk from Hebei shutdown',
  'India rare earth exposure vs Vietnam',
  'Worst case 30-day scenario for paracetamol',
  'Which EV components are most vulnerable to Jiangsu export freeze?',
  'Buffer stock recommendations for critical APIs',
];

function modeMeta(responseMode, shockFeedMode) {
  if (responseMode === 'hybrid_live') {
    return {
      label: 'Gemini Flash | hybrid context',
      color: 'var(--primary)',
      bg: 'rgba(79,156,249,0.12)',
      border: '1px solid rgba(79,156,249,0.25)',
    };
  }
  if (responseMode === 'fallback') {
    return {
      label: 'Local grounded fallback',
      color: 'var(--amber)',
      bg: 'rgba(245,158,11,0.12)',
      border: '1px solid rgba(245,158,11,0.25)',
    };
  }
  if (responseMode === 'demo' || shockFeedMode === 'demo') {
    return {
      label: 'Curated scenario analyst',
      color: 'var(--primary)',
      bg: 'rgba(79,156,249,0.12)',
      border: '1px solid rgba(79,156,249,0.25)',
    };
  }
  return {
    label: 'Gemini Flash | grounded RAG',
    color: 'var(--green)',
    bg: 'rgba(16,185,129,0.12)',
    border: '1px solid rgba(16,185,129,0.25)',
  };
}

export default function Query() {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState(null);

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
  }, []);

  const responseMode = answer?.response_mode;
  const badge = useMemo(
    () => modeMeta(responseMode, health?.shock_feed_mode),
    [responseMode, health?.shock_feed_mode],
  );

  async function submit(q) {
    const text = (q || question).trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const res = await api.query(text);
      setAnswer(res);
      setHistory((prev) => [{ question: text, answer: res, ts: new Date() }, ...prev.slice(0, 5)]);
    } catch (e) {
      setError(e.message || 'Query failed. Check backend connectivity.');
    } finally {
      setLoading(false);
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  }

  const metrics = [
    { label: 'Feed', value: health?.shock_feed_mode === 'hybrid_demo_live' ? 'Hybrid' : health?.shock_feed_mode || 'Live' },
    { label: 'Live shocks', value: health?.live_shocks ?? '-' },
    { label: 'Scenario bank', value: health?.demo_scenarios ?? '-' },
  ];

  return (
    <div className="query-page" style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.03em' }}>Ask ShockMap</h1>
            <span style={{ fontSize: '0.7rem', color: badge.color, background: badge.bg, border: badge.border, borderRadius: 999, padding: '4px 10px', fontWeight: 600 }}>
              {badge.label}
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', maxWidth: 760, lineHeight: 1.6 }}>
            Ask for exposed inputs, buffer pressure, supplier options, escalation triggers, or scenario comparisons.
            The response path will use live context when it is available and fall back to curated scenario evidence when it is not.
          </p>
        </div>
      </div>

      <div className="query-shell">
        <div className="query-main" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at top right, rgba(79,156,249,0.14), transparent 45%)', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Operational query composer</p>
                  <p style={{ fontSize: '0.74rem', color: 'var(--muted)' }}>Grounded answers with citations, affected inputs, and action framing.</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {metrics.map((item) => (
                    <div key={item.label} style={{ minWidth: 88, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border)', borderRadius: 10 }}>
                      <p style={{ fontSize: '0.66rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{item.label}</p>
                      <p style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text)' }}>{item.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              <textarea
                id="query-input"
                className="input"
                rows={5}
                placeholder='Type your question, e.g. "Which drugs are most exposed to Hebei shutdown?"'
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKey}
                style={{ resize: 'vertical', minHeight: 132, fontFamily: 'inherit', lineHeight: 1.6 }}
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 14, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {EXAMPLE_QUERIES.slice(0, 3).map((q) => (
                    <button
                      key={q}
                      className="query-pill-btn"
                      onClick={() => {
                        setQuestion(q);
                        submit(q);
                      }}
                      style={{
                        fontSize: '0.74rem',
                        padding: '6px 12px',
                        borderRadius: 999,
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        color: 'var(--muted)',
                        cursor: 'pointer',
                      }}
                    >
                      {q}
                    </button>
                  ))}
                </div>
                <button
                  id="query-submit"
                  className="btn btn-primary"
                  onClick={() => submit()}
                  disabled={loading || !question.trim()}
                  style={{ minWidth: 116, justifyContent: 'center', opacity: loading || !question.trim() ? 0.6 : 1 }}
                >
                  {loading ? 'Thinking...' : <>Ask {'->'}</>}
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div
              className="card"
              style={{
                padding: '16px 18px',
                borderColor: 'rgba(244,63,94,0.28)',
                background: 'rgba(244,63,94,0.08)',
              }}
            >
              <p style={{ fontSize: '0.85rem', color: '#f43f5e', marginBottom: 6 }}>{error}</p>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                If Gemini or Qdrant is unavailable, ShockMap falls back to local scenario and seed-document context.
              </p>
            </div>
          )}

          {loading && (
            <div className="card" style={{ padding: '24px 24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
                {[1, 2, 3].map((i) => <div key={i} className="skeleton" style={{ height: 64 }} />)}
              </div>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton" style={{ height: 14, marginBottom: 10, width: i === 4 ? '52%' : '100%' }} />
              ))}
            </div>
          )}

          {answer && (
            <div className="card" style={{ padding: '24px 24px', animation: 'slide-up 0.35s ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 18, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)' }}>Answer</span>
                  <span style={{ fontSize: '0.7rem', color: badge.color, background: badge.bg, border: badge.border, borderRadius: 999, padding: '3px 9px' }}>
                    {answer.response_mode || 'live'}
                  </span>
                  {answer.confidence != null && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--muted)', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 999, padding: '3px 9px' }}>
                      Confidence {Math.round(answer.confidence * 100)}%
                    </span>
                  )}
                </div>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                  {answer.citations?.length || 0} cited sources
                </span>
              </div>

              <div style={{ fontSize: '0.92rem', lineHeight: 1.8, color: 'var(--text)', whiteSpace: 'pre-wrap', marginBottom: 18 }}>
                {answer.answer || answer.text || JSON.stringify(answer)}
              </div>

              {answer.matched_scenarios?.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Scenario matches
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {answer.matched_scenarios.map((item) => (
                      <span
                        key={item}
                        style={{
                          fontSize: '0.72rem',
                          color: 'var(--primary)',
                          background: 'rgba(79,156,249,0.08)',
                          border: '1px solid rgba(79,156,249,0.2)',
                          borderRadius: 999,
                          padding: '4px 10px',
                        }}
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {answer.suggested_drugs_to_inspect?.length > 0 && (
                <div style={{ marginBottom: 18 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
                    Inspect next
                  </p>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {answer.suggested_drugs_to_inspect.map((item) => (
                      <Link
                        key={item}
                        to={`/drugs/${item}`}
                        style={{
                          fontSize: '0.74rem',
                          color: 'var(--text)',
                          textDecoration: 'none',
                          background: 'var(--surface2)',
                          border: '1px solid var(--border)',
                          borderRadius: 999,
                          padding: '5px 10px',
                        }}
                      >
                        {item}
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {answer.citations?.length > 0 && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
                  <p style={{ fontSize: '0.72rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12 }}>
                    Source pack
                  </p>
                  <div className="citation-grid">
                    {answer.citations.map((c, i) => (
                      <div key={`${c.source}-${i}`} className="card card-hover citation-card" style={{ padding: '14px 14px', background: 'var(--surface2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                          <span style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text)' }}>{c.source || c}</span>
                          {c.url ? (
                            <a
                              href={c.url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ fontSize: '0.72rem', color: 'var(--primary)', textDecoration: 'none' }}
                            >
                              Open {'->'}
                            </a>
                          ) : (
                            <span style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>Local context</span>
                          )}
                        </div>
                        <p style={{ fontSize: '0.76rem', color: 'var(--muted)', lineHeight: 1.6 }}>{c.snippet}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="query-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="card" style={{ padding: '20px 20px' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Good questions to ask</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {EXAMPLE_QUERIES.map((q) => (
                <button
                  key={q}
                  className="query-example-button"
                  onClick={() => {
                    setQuestion(q);
                    submit(q);
                  }}
                  style={{
                    textAlign: 'left',
                    background: 'var(--surface2)',
                    border: '1px solid var(--border)',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: 'pointer',
                    color: 'var(--muted)',
                    fontSize: '0.78rem',
                    lineHeight: 1.5,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ padding: '20px 20px' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Operator notes</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Best for</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55 }}>Exposure ranking, stockout pressure, escalation triggers, and next 72-hour actions.</p>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10 }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 4 }}>Current model</p>
                <p style={{ fontSize: '0.78rem', color: 'var(--text)', lineHeight: 1.55 }}>Gemini Flash with local retrieval, plus scenario-backed fallback when live context is thin.</p>
              </div>
            </div>
          </div>

          {history.length > 0 && (
            <div className="card" style={{ padding: '20px 20px' }}>
              <p style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', marginBottom: 12 }}>Recent history</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {history.map((item, i) => (
                  <button
                    key={`${item.question}-${i}`}
                    className="query-history-button"
                    onClick={() => {
                      setQuestion(item.question);
                      setAnswer(item.answer);
                    }}
                    style={{
                      textAlign: 'left',
                      background: i === 0 ? 'rgba(79,156,249,0.08)' : 'var(--surface2)',
                      border: i === 0 ? '1px solid rgba(79,156,249,0.2)' : '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '10px 12px',
                      cursor: 'pointer',
                    }}
                  >
                    <p style={{ fontSize: '0.76rem', color: 'var(--text)', marginBottom: 4 }}>{item.question}</p>
                    <p style={{ fontSize: '0.68rem', color: 'var(--muted)' }}>{item.ts.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
