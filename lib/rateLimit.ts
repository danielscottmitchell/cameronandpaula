/**
 * 20 lookups per IP per minute.
 *
 * This is per serverless instance, not global. A determined scraper that gets
 * spread across instances can exceed 20. It raises the cost of walking the
 * guest list without eliminating it, which is the honest description. Swap in
 * Vercel KV or Upstash if the guest list needs a hard guarantee.
 */
const WINDOW_MS = 60_000;
const MAX = 20;

const hits = new Map<string, number[]>();

export function rateLimit(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);

  // Keep the map from growing without bound on a long lived instance.
  if (hits.size > 5_000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length <= MAX;
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return fwd?.split(',')[0].trim() || 'unknown';
}
