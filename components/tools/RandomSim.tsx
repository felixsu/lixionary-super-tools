'use client';

import { useEffect, useRef, useState } from 'react';
import { randomInt } from '@/lib/crypto-utils';
import { usePersistentState } from '@/lib/usePersistentState';

export interface OutcomeStyle {
  color: string; // histogram bar + chip background
  chipText: string;
}

// Persisted flip/roll log is capped at the last 1,000 results; the session
// strip keeps the same cap so a +1,000 run never grows the DOM unbounded.
const HISTORY_LIMIT = 1000;

interface SessionState {
  counts: Record<string, number>;
  total: number;
  last: string | null;
  results: string[];
}

const EMPTY_SESSION: SessionState = { counts: {}, total: 0, last: null, results: [] };

function Histogram({
  title,
  outcomes,
  outcomeStyles,
  counts,
  total,
}: {
  title: string;
  outcomes: string[];
  outcomeStyles: Record<string, OutcomeStyle>;
  counts: Record<string, number>;
  total: number;
}) {
  const maxCount = Math.max(1, ...outcomes.map(o => counts[o] || 0));
  return (
    <div className="card" style={{ flex: 1, minWidth: 260 }}>
      <div className="section-title" style={{ marginBottom: 20 }}>{title}</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 220 }}>
        {outcomes.map(outcome => {
          const count = counts[outcome] || 0;
          const pct = total ? (count / total) * 100 : 0;
          return (
            <div key={outcome} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 8 }}>
              <span className="body-sm" style={{ color: 'var(--color-ink)', fontWeight: 500 }}>{count}</span>
              <div
                style={{
                  width: '100%',
                  maxWidth: 56,
                  height: `${(count / maxCount) * 100}%`,
                  minHeight: 2,
                  background: outcomeStyles[outcome].color,
                  borderRadius: '6px 6px 0 0',
                  transition: 'height 200ms ease-out',
                }}
              />
              <span className="body-sm muted">{outcome}</span>
              <span className="caption muted">{pct.toFixed(1)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Shared coin-toss / dice-roll simulator: roll buttons, last-result card, a
// horizontally scrollable strip of this session's results, and two histograms —
// the current session (in-memory, resets when the tab opens) and the last
// 1,000 results persisted to localStorage under `${storageKey}:history`.
export default function RandomSim({
  storageKey,
  title,
  subtitle,
  outcomes,
  outcomeStyles,
  rollOnceLabel,
}: {
  storageKey: string;
  title: string;
  subtitle: string;
  outcomes: string[];
  outcomeStyles: Record<string, OutcomeStyle>;
  rollOnceLabel: string;
}) {
  // Session state is deliberately not persisted: opening the tab starts fresh.
  const [session, setSession] = useState<SessionState>(EMPTY_SESSION);
  const [history, setHistory] = usePersistentState<string[]>(`${storageKey}:history`, []);
  const stripRef = useRef<HTMLDivElement>(null);

  // Keep the carousel pinned to the newest result.
  useEffect(() => {
    const el = stripRef.current;
    if (el) el.scrollLeft = el.scrollWidth;
  }, [session.results.length]);

  const roll = (n: number) => {
    const results: string[] = [];
    for (let i = 0; i < n; i++) results.push(outcomes[randomInt(outcomes.length)]);

    setSession(prev => {
      const counts = { ...prev.counts };
      for (const outcome of results) counts[outcome] = (counts[outcome] || 0) + 1;
      return {
        counts,
        total: prev.total + n,
        last: results[results.length - 1],
        results: [...prev.results, ...results].slice(-HISTORY_LIMIT),
      };
    });
    setHistory(prev => [...prev, ...results].slice(-HISTORY_LIMIT));
  };

  const historyCounts: Record<string, number> = {};
  for (const outcome of history) historyCounts[outcome] = (historyCounts[outcome] || 0) + 1;

  return (
    <div className="page page--form">
      <h1 className="h1" style={{ marginBottom: 8 }}>{title}</h1>
      <p className="body-md muted" style={{ margin: '0 0 32px' }}>{subtitle}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn btn-primary" onClick={() => roll(1)}>{rollOnceLabel}</button>
          <button className="btn btn-secondary" onClick={() => roll(10)}>+10</button>
          <button className="btn btn-secondary" onClick={() => roll(100)}>+100</button>
          <button className="btn btn-secondary" onClick={() => roll(1000)}>+1,000</button>
          <button className="btn btn-ghost" onClick={() => setSession(EMPTY_SESSION)}>Reset session</button>
          <button className="btn btn-ghost" onClick={() => setHistory([])}>Clear history</button>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="caption-up">Last result</span>
            {session.last !== null ? (
              <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40, color: 'var(--color-ink)' }}>{session.last}</span>
            ) : (
              <span className="body-md muted">&mdash;</span>
            )}
          </div>
          <div style={{ width: 1, alignSelf: 'stretch', background: 'var(--color-hairline)' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="caption-up">Session trials</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: 40, color: 'var(--color-ink)' }}>{session.total}</span>
          </div>
        </div>

        <div className="card">
          <div className="section-title" style={{ marginBottom: 16 }}>Session results</div>
          {session.results.length > 0 ? (
            <div
              ref={stripRef}
              style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, scrollbarWidth: 'thin' }}
            >
              {session.results.map((outcome, i) => (
                <span
                  key={i}
                  title={outcome}
                  style={{
                    flex: '0 0 auto',
                    minWidth: 28,
                    height: 28,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 14,
                    fontSize: 13,
                    fontWeight: 600,
                    background: outcomeStyles[outcome].color,
                    color: outcomeStyles[outcome].chipText,
                  }}
                >
                  {outcome.charAt(0)}
                </span>
              ))}
            </div>
          ) : (
            <span className="body-sm muted">No results yet this session.</span>
          )}
        </div>

        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <Histogram title="Current session" outcomes={outcomes} outcomeStyles={outcomeStyles} counts={session.counts} total={session.total} />
          <Histogram
            title={`Historical (last ${HISTORY_LIMIT.toLocaleString()})`}
            outcomes={outcomes}
            outcomeStyles={outcomeStyles}
            counts={historyCounts}
            total={history.length}
          />
        </div>
      </div>
    </div>
  );
}
