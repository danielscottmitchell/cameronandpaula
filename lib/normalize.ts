/** Lowercase and strip accents so "jose" matches "José" and "renee" matches "Renée". */
export function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Digits only, for storing and comparing phone numbers. */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, '');
}

/** (571) 268-3859 from any partial digit string, for display as the guest types. */
export function formatPhone(s: string): string {
  const d = digitsOnly(s).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
