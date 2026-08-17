import {
  Binary,
  Link,
  KeyRound,
  ShieldCheck,
  Key,
  CircleDollarSign,
  Dices,
  Lock,
  FileText,
  FileDown,
  Split,
  Hash,
  Wrench,
  type LucideProps,
} from 'lucide-react';

// Maps the registry's lucide icon names (as used in the design file) to components.
const ICONS: Record<string, React.ComponentType<LucideProps>> = {
  binary: Binary,
  link: Link,
  'key-round': KeyRound,
  'shield-check': ShieldCheck,
  key: Key,
  'circle-dollar-sign': CircleDollarSign,
  dices: Dices,
  lock: Lock,
  'file-text': FileText,
  'file-down': FileDown,
  split: Split,
  hash: Hash,
};

export default function ToolIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = ICONS[name] ?? Wrench;
  return <Icon {...props} />;
}
