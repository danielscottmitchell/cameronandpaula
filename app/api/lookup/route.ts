import { NextResponse } from 'next/server';
import { searchGuests } from '@/lib/airtable';
import { clientIp, rateLimit } from '@/lib/rateLimit';

/**
 * The one door into the form, so it is also the one place the guest list can
 * leak. Three character minimum, five results, rate limited, and the response
 * carries nothing but a name, a household name and an opaque household id.
 * No phone, no address, no household size, no response status.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get('q') ?? '';

  // Enforced here, not only in the input, so a hand rolled request cannot
  // ask for every name starting with "a".
  if (q.trim().length < 3) return NextResponse.json({ matches: [] });

  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ matches: [], blocked: true }, { status: 429 });
  }

  try {
    const { matches, truncated } = await searchGuests(q, 5);
    return NextResponse.json({ matches, truncated });
  } catch (err) {
    console.error('lookup failed', err);
    // Never explain why a match failed. Same empty shape either way.
    return NextResponse.json({ matches: [] }, { status: 500 });
  }
}
