// Offline fuzzy search over the tool registry — no dependencies.
// Scores a query against a candidate string with a subsequence matcher that
// rewards word-start hits and consecutive runs, so "b64" finds "Base64" and
// "jwt dec" finds "JWT decode & generate".

import type { ToolDef } from './tools';

/** Returns a match score (higher = better) or -1 when query isn't a subsequence. */
export function fuzzyScore(query: string, candidate: string): number {
  const q = query.toLowerCase();
  const c = candidate.toLowerCase();
  if (!q) return 0;

  // Exact substring beats any scattered subsequence.
  const sub = c.indexOf(q);
  if (sub !== -1) {
    let score = 100 + q.length * 4;
    if (sub === 0) score += 40;
    else if (!/[a-z0-9]/.test(c[sub - 1])) score += 20; // word boundary
    return score;
  }

  let score = 0;
  let ci = 0;
  let prevHit = -2;
  for (let qi = 0; qi < q.length; qi++) {
    const ch = q[qi];
    if (ch === ' ') { prevHit = -2; continue; }
    let found = -1;
    while (ci < c.length) {
      if (c[ci] === ch) { found = ci; ci++; break; }
      ci++;
    }
    if (found === -1) return -1;
    score += 2;
    if (found === prevHit + 1) score += 5; // consecutive run
    if (found === 0 || !/[a-z0-9]/.test(c[found - 1])) score += 8; // word start
    prevHit = found;
  }
  // Penalize very scattered matches on long candidates.
  return score - Math.floor(c.length / 20);
}

export function searchTools(query: string, tools: ToolDef[]): ToolDef[] {
  const q = query.trim();
  if (!q) return tools;
  const scored = tools
    .map(tool => {
      const fields = [tool.name, tool.category, tool.description, ...tool.keywords];
      const best = Math.max(...fields.map((f, i) => {
        const s = fuzzyScore(q, f);
        // Name matches outrank keyword/description matches of equal quality.
        return s < 0 ? s : s + (i === 0 ? 30 : i === 1 ? 10 : 0);
      }));
      return { tool, score: best };
    })
    .filter(r => r.score >= 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(r => r.tool);
}
