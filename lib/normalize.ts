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

/**
 * Digits with the US country code removed.
 *
 * Guests type "1 703 555 0100" and "+1 (703) 555-0100" as readily as the bare
 * ten digits. Without this the leading 1 occupies a slot, the tenth digit falls
 * off the end, and a plausible but wrong number gets stored. No US area code
 * begins with 1, so stripping it is unambiguous.
 */
export function normalizePhone(s: string): string {
  const d = digitsOnly(s);
  return d.length > 10 && d.startsWith('1') ? d.slice(1) : d;
}

/** (571) 268-3859 from any partial digit string, for display as the guest types. */
export function formatPhone(s: string): string {
  const d = normalizePhone(s).slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}
