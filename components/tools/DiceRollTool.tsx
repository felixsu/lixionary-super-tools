'use client';

import RandomSim from './RandomSim';

// Face colors are a CVD-validated categorical set (worst adjacent ΔE 20.7 on
// the card surface); the slot order is the safety mechanism — don't reshuffle.
export default function DiceRollTool() {
  return (
    <RandomSim
      storageKey="tool:dice"
      title="Dice roll"
      subtitle="Uses the browser's cryptographic random source. Roll many trials and watch the histogram flatten out toward an even distribution."
      outcomes={['1', '2', '3', '4', '5', '6']}
      outcomeStyles={{
        '1': { color: '#7a9c3f', chipText: 'var(--color-ink)' },
        '2': { color: '#b0578d', chipText: 'var(--color-on-primary)' },
        '3': { color: '#d9822b', chipText: 'var(--color-ink)' },
        '4': { color: '#4f46e5', chipText: 'var(--color-on-primary)' },
        '5': { color: '#b3563a', chipText: 'var(--color-on-primary)' },
        '6': { color: '#1ba07a', chipText: 'var(--color-ink)' },
      }}
      rollOnceLabel="Roll once"
    />
  );
}
