import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  appendLog,
  getExisting,
  getHousehold,
  upsertResponses,
  upsertSubmission,
  type ResponseRow,
} from '@/lib/airtable';
import { clientIp, rateLimit } from '@/lib/rateLimit';
import { EVENTS, isInvited, isPastDeadline } from '@/lib/config';
import { digitsOnly } from '@/lib/normalize';

const attending = z.enum(['yes', 'no']);

const Payload = z.object({
  household_id: z.string().min(1),
  guests: z
    .array(
      z.object({
        guest_id: z.string().min(1),
        welcome: attending.optional(),
        wedding: attending.optional(),
        breakfast: attending.optional(),
      }),
    )
    .min(1),
  phone: z.string(),
  dietary_notes: z.string().max(400).optional().default(''),
  song_request: z.string().max(200).optional().default(''),
  message: z.string().max(500).optional().default(''),
});

export async function POST(req: Request) {
  if (!rateLimit(clientIp(req))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  if (isPastDeadline()) {
    return NextResponse.json({ error: 'closed' }, { status: 403 });
  }

  const raw = await req.text();

  let body: z.infer<typeof Payload>;
  try {
    body = Payload.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  const phone = digitsOnly(body.phone);
  if (phone.length !== 10) {
    return NextResponse.json({ error: 'phone', message: 'Enter a 10 digit phone number.' }, { status: 400 });
  }

  const found = await getHousehold(body.household_id);
  if (!found) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // A payload may only answer for guests in its own household, and only for
  // events that household was invited to.
  const known = new Set(found.guests.map((g) => g.guest_id));
  if (!body.guests.every((g) => known.has(g.guest_id))) {
    return NextResponse.json({ error: 'invalid' }, { status: 400 });
  }

  for (const g of body.guests) {
    for (const e of EVENTS) {
      const answered = g[e.key] !== undefined;
      const invited = isInvited(found.household, e.key);
      if (answered && !invited) {
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
      }
      if (!answered && invited) {
        return NextResponse.json({ error: 'incomplete' }, { status: 400 });
      }
    }
  }

  const now = new Date().toISOString();

  // Log first. Upserts overwrite, so if the writes below fail halfway there is
  // still a record of exactly what the guest sent. This is the only failure
  // the guest is told about.
  try {
    await appendLog({
      household_id: body.household_id,
      timestamp: now,
      payload_json: raw.slice(0, 90_000),
      ip_hash: createHash('sha256').update(clientIp(req)).digest('hex').slice(0, 32),
      user_agent: (req.headers.get('user-agent') ?? '').slice(0, 250),
    });
  } catch (err) {
    console.error('log append failed', err);
    return NextResponse.json({ error: 'write_failed' }, { status: 500 });
  }

  try {
    const rows: ResponseRow[] = body.guests.map((g) => ({
      guest_id: g.guest_id,
      household_id: body.household_id,
      attending_welcome: g.welcome,
      attending_wedding: g.wedding,
      attending_breakfast: g.breakfast,
      updated_at: now,
    }));
    await upsertResponses(rows);

    const prior = await getExisting(body.household_id);
    await upsertSubmission({
      household_id: body.household_id,
      phone,
      dietary_notes: body.dietary_notes,
      song_request: body.song_request,
      message: body.message,
      first_submitted_at: prior.submission?.first_submitted_at ?? now,
      updated_at: now,
      revision: (prior.submission?.revision ?? 0) + 1,
    });
  } catch (err) {
    // The log has it. Do not make the guest submit twice.
    console.error('rsvp write failed after log', err);
  }

  return NextResponse.json({ ok: true, submitted_at: now });
}
