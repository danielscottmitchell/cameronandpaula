import { normalize } from './normalize';

const API = 'https://api.airtable.com/v0';

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing ${name}`);
  return v;
}

async function airtable(
  baseId: string,
  table: string,
  init: RequestInit & { query?: Record<string, string> } = {},
) {
  const { query, ...rest } = init;
  const url = new URL(`${API}/${baseId}/${encodeURIComponent(table)}`);
  for (const [k, v] of Object.entries(query ?? {})) url.searchParams.set(k, v);

  const res = await fetch(url, {
    ...rest,
    headers: {
      Authorization: `Bearer ${env('AIRTABLE_PAT')}`,
      'Content-Type': 'application/json',
      ...(rest.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Airtable ${table} ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

type Row<T> = { id: string; fields: T };

async function listAll<T>(baseId: string, table: string): Promise<Row<T>[]> {
  const out: Row<T>[] = [];
  let offset: string | undefined;
  do {
    const page = await airtable(baseId, table, {
      query: { pageSize: '100', ...(offset ? { offset } : {}) },
    });
    out.push(...page.records);
    offset = page.offset;
  } while (offset);
  return out;
}

/** Airtable caps writes at 10 records per request. */
async function inChunks<T>(items: T[], size: number, fn: (chunk: T[]) => Promise<unknown>) {
  for (let i = 0; i < items.length; i += size) {
    await fn(items.slice(i, i + size));
  }
}

// ── Types ───────────────────────────────────────────────────────────────────

export type Household = {
  household_id: string;
  display_name: string;
  invited_welcome?: boolean;
  invited_wedding?: boolean;
  invited_breakfast?: boolean;
  notes?: string;
};

export type Guest = {
  guest_id: string;
  household_id: string;
  first_name: string;
  last_name: string;
  aliases?: string;
};

export type Attending = 'yes' | 'no';

export type ResponseRow = {
  guest_id: string;
  household_id: string;
  attending_welcome?: Attending;
  attending_wedding?: Attending;
  attending_breakfast?: Attending;
  updated_at?: string;
};

export type SubmissionRow = {
  household_id: string;
  phone?: string;
  dietary_notes?: string;
  song_request?: string;
  message?: string;
  first_submitted_at?: string;
  updated_at?: string;
  revision?: number;
};

// ── Read path, 60s cache ────────────────────────────────────────────────────
// The guest list is a few hundred rows. Cache it so lookup keystrokes do not
// each cost an Airtable round trip, and so a hand-edit in the base shows up
// on the site within a minute.

const TTL_MS = 60_000;

type Cache = { at: number; households: Household[]; guests: Guest[] } | null;
let cache: Cache = null;
let inflight: Promise<NonNullable<Cache>> | null = null;

async function loadList(): Promise<NonNullable<Cache>> {
  const base = env('AIRTABLE_BASE_ID');
  const [households, guests] = await Promise.all([
    listAll<Household>(base, 'households'),
    listAll<Guest>(base, 'guests'),
  ]);
  return {
    at: Date.now(),
    households: households.map((r) => r.fields).filter((h) => h.household_id),
    guests: guests.map((r) => r.fields).filter((g) => g.guest_id && g.household_id),
  };
}

async function getList(): Promise<NonNullable<Cache>> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  // Collapse concurrent misses into one fetch.
  inflight ??= loadList()
    .then((fresh) => {
      cache = fresh;
      return fresh;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type Match = {
  guest_id: string;
  household_id: string;
  display_name: string;
  household_name: string;
};

/**
 * Substring match over first name, last name, full name and aliases.
 * Caller is responsible for enforcing the 3 character minimum.
 */
export async function searchGuests(
  query: string,
  limit = 5,
): Promise<{ matches: Match[]; truncated: boolean }> {
  const q = normalize(query);
  const { households, guests } = await getList();
  const byId = new Map(households.map((h) => [h.household_id, h]));

  const matches: Match[] = [];
  let truncated = false;

  for (const g of guests) {
    // Plus one rows exist so a household can reply for them. They are not
    // people anyone looks themselves up by.
    if (normalize(g.first_name ?? '') === 'guest') continue;

    const full = `${g.first_name ?? ''} ${g.last_name ?? ''}`;
    const aliases = (g.aliases ?? '').split(',').map((a) => a.trim()).filter(Boolean);
    const haystacks = [g.first_name ?? '', g.last_name ?? '', full, ...aliases];
    if (!haystacks.some((h) => normalize(h).includes(q))) continue;

    const household = byId.get(g.household_id);
    if (!household) continue; // Orphan guest row, do not surface it.

    if (matches.length >= limit) {
      // One match beyond the cap is enough to know there are more.
      truncated = true;
      break;
    }

    matches.push({
      guest_id: g.guest_id,
      household_id: g.household_id,
      display_name: full.trim(),
      household_name: household.display_name,
    });
  }
  return { matches, truncated };
}

export async function getHousehold(householdId: string) {
  const { households, guests } = await getList();
  const household = households.find((h) => h.household_id === householdId);
  if (!household) return null;
  return {
    household,
    // Airtable returns rows in no guaranteed order. Sort by guest_id so a
    // household always reads in the order it was entered, which is the order
    // printed on the invitation.
    guests: guests
      .filter((g) => g.household_id === householdId)
      .sort((a, b) => a.guest_id.localeCompare(b.guest_id)),
  };
}

// ── Write path ──────────────────────────────────────────────────────────────

/** Rows already stored for this household, so the form can prefill. */
export async function getExisting(householdId: string) {
  const base = env('AIRTABLE_BASE_ID');
  const filter = `{household_id}='${householdId.replace(/'/g, "\\'")}'`;
  const [responses, submissions] = await Promise.all([
    airtable(base, 'responses', { query: { filterByFormula: filter, pageSize: '100' } }),
    airtable(base, 'submissions', { query: { filterByFormula: filter, pageSize: '1' } }),
  ]);
  return {
    responses: (responses.records as Row<ResponseRow>[]).map((r) => r.fields),
    submission: (submissions.records as Row<SubmissionRow>[])[0]?.fields ?? null,
  };
}

export async function appendLog(entry: {
  household_id: string;
  timestamp: string;
  payload_json: string;
  ip_hash: string;
  user_agent: string;
}) {
  await airtable(env('AIRTABLE_LOG_BASE_ID'), 'log', {
    method: 'POST',
    body: JSON.stringify({ records: [{ fields: entry }] }),
  });
}

export async function upsertResponses(rows: ResponseRow[]) {
  const base = env('AIRTABLE_BASE_ID');
  await inChunks(rows, 10, (chunk) =>
    airtable(base, 'responses', {
      method: 'PATCH',
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: ['guest_id'] },
        records: chunk.map((fields) => ({ fields })),
      }),
    }),
  );
}

export async function upsertSubmission(row: SubmissionRow) {
  await airtable(env('AIRTABLE_BASE_ID'), 'submissions', {
    method: 'PATCH',
    body: JSON.stringify({
      performUpsert: { fieldsToMergeOn: ['household_id'] },
      records: [{ fields: row }],
    }),
  });
}
