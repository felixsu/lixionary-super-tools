'use client';

import RandomSim from './RandomSim';

export default function CoinTossTool() {
  return (
    <RandomSim
      storageKey="tool:coin"
      title="Coin toss"
      subtitle="Uses the browser's cryptographic random source. Flip many trials and watch the histogram flatten out toward 50/50."
      outcomes={['Heads', 'Tails']}
      outcomeStyles={{
        Heads: { color: '#4f46e5', chipText: 'var(--color-on-primary)' },
        Tails: { color: '#d9822b', chipText: 'var(--color-ink)' },
      }}
      rollOnceLabel="Flip once"
    />
  );
}
