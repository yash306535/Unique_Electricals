import { Material } from '../types';

// Display label for a material, including its sub-type / variant when present.
// e.g. { name: 'Cable', sub_type: 'HT' } -> "Cable — HT"
export const materialLabel = (m: Pick<Material, 'name' | 'sub_type'> | null | undefined): string => {
  if (!m) return '';
  return m.sub_type && String(m.sub_type).trim()
    ? `${m.name} — ${String(m.sub_type).trim()}`
    : m.name;
};
