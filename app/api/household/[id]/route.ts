import { NextResponse } from 'next/server';
import { getExisting, getHousehold } from '@/lib/airtable';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { isPastDeadline } from '@/lib/config';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  try {
    const found = await getHousehold(id);
    if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });

    const existing = await getExisting(id);
    return NextResponse.json({
      household: found.household,
      guests: found.guests,
      responses: existing.responses,
      submission: existing.submission,
      closed: isPastDeadline(),
    });
  } catch (err) {
    console.error('household load failed', err);
    return NextResponse.json({ error: 'unavailable' }, { status: 500 });
  }
}
