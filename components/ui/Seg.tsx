'use client';

export interface SegOption<T extends string> {
  value: T;
  label: string;
}

export default function Seg<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: React.CSSProperties;
}) {
  return (
    <div className="seg" style={style}>
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          className={opt.value === value ? 'active' : ''}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
