/**
 * Parses data/guest-list.txt into households and guests, then upserts both into
 * Airtable. Blank lines separate households. Idempotent, so editing the text
 * file and re-running updates in place rather than duplicating.
 *
 *   node --env-file=.env.local scripts/import-guests.mjs --dry
 *   node --env-file=.env.local scripts/import-guests.mjs
 *
 * Ids are assigned by position: the first household is H-001, its first guest
 * G-001. Reordering the text file therefore reassigns ids, which would orphan
 * any replies already collected. Append new households at the end instead.
 */

import { readFileSync } from 'node:fs';

const DRY = process.argv.includes('--dry');
const PAT = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID;
if (!DRY && (!PAT || !BASE)) throw new Error('Set AIRTABLE_PAT and AIRTABLE_BASE_ID');

const SUFFIXES = new Set(['sr', 'jr', 'ii', 'iii', 'iv']);

// Both directions: formal names get their nicknames, and people listed by
// nickname get the formal name, because guests type whichever they are called.
const NICKNAMES = {
  alexandria: ['Alex', 'Allie'], // not Alexa, that is a different guest
  alicia: ['Ali'],
  amy: ['Amelia'],
  anastasiya: ['Ana', 'Anastasia', 'Stacy'],
  benjamin: ['Ben', 'Benji'],
  caitlin: ['Cait', 'Katie'],
  caitlyn: ['Cait', 'Katie'],
  cassandra: ['Cassie', 'Cass'],
  catherine: ['Cathy', 'Kate', 'Katie', 'Cat'],
  cathy: ['Catherine', 'Kathryn'],
  chris: ['Christopher', 'Christian'],
  christopher: ['Chris'],
  christian: ['Chris'],
  colleen: ['Coll'],
  craig: [],
  daniel: ['Dan', 'Danny'],
  daniela: ['Dani'],
  danielle: ['Dani', 'Dany'],
  david: ['Dave', 'Davey'],
  deborah: ['Deb', 'Debbie'],
  derrick: ['Derek', 'Rick'],
  elaine: [],
  elizabeth: ['Liz', 'Beth', 'Lizzy'],
  gabrielle: ['Gabby', 'Gabi', 'Brielle'],
  garrett: ['Gary'],
  georgiy: ['George', 'Georgi'],
  gregory: ['Greg'],
  greg: ['Gregory'],
  jeff: ['Jeffrey', 'Jeffery'],
  jeffrey: ['Jeff'],
  jim: ['James', 'Jimmy'],
  john: ['Johnny', 'Jack'],
  jonathan: ['Jon', 'Johnny'],
  joseph: ['Joe', 'Joey'],
  judy: ['Judith'],
  julie: ['Julia', 'Jules'],
  kathleen: ['Kathy', 'Katie', 'Kate', 'Kat'],
  kathy: ['Kathleen', 'Katherine', 'Kathryn'],
  kimberly: ['Kim', 'Kimmy'],
  kylie: ['Ky'],
  lucas: ['Luke'],
  lukas: ['Luke'],
  matthew: ['Matt', 'Matty'],
  matt: ['Matthew'],
  michael: ['Mike', 'Mikey', 'Mick'],
  michelle: ['Shelly', 'Missy'],
  nicholas: ['Nick', 'Nicky'],
  patrick: ['Pat', 'Paddy'],
  rebecca: ['Becca', 'Becky'],
  robert: ['Bob', 'Bobby', 'Rob', 'Robbie'],
  rolando: ['Rolo', 'Roland'],
  ronald: ['Ron', 'Ronnie'],
  rosemary: ['Rose', 'Rosie'],
  rudy: ['Rudolph', 'Rudolfo'],
  salvatore: ['Sal'],
  sandi: ['Sandra', 'Sandy'],
  sandy: ['Sandra', 'Sandi'],
  sara: ['Sarah'],
  sarah: ['Sara'],
  shaun: ['Sean', 'Shawn'],
  shawn: ['Sean', 'Shaun'],
  sophie: ['Sophia', 'Soph'],
  stefany: ['Stephanie', 'Steph'],
  stephanie: ['Steph', 'Stefany'],
  steve: ['Steven', 'Stephen'],
  steven: ['Steve', 'Stephen'],
  susan: ['Sue', 'Susie', 'Suzy'],
  susana: ['Susan', 'Susie'],
  thomas: ['Tom', 'Tommy'],
  timothy: ['Tim', 'Timmy'],
  tommy: ['Thomas', 'Tom'],
  vincent: ['Vince', 'Vinny', 'Vin'],
  william: ['Will', 'Bill', 'Billy'],
  will: ['William', 'Bill'],
  yolanda: ['Yoli'],
};

function parseLine(line) {
  const note = [];

  // Parentheticals carry status or relationship, never part of the name.
  let text = line.replace(/\(([^)]*)\)/g, (_, inner) => {
    note.push(inner.trim());
    return ' ';
  });

  // "SAME^" means the address above applies to this person too.
  const sameAddress = /same\s*\^/i.test(text);
  text = text.replace(/same\s*\^/gi, ' ');

  // Names contain no digits, so the first digit starts the address.
  let address = '';
  const digit = text.search(/\d/);
  if (digit !== -1) {
    address = text.slice(digit).trim();
    text = text.slice(0, digit);
  }

  text = text
    .replace(/[-–—]{2,}/g, ' ')      // "Kevin Brennan-----"
    .replace(/\s[-–—]+\s?/g, ' ')   // " - " separators, not Crespo-Hassan
    .replace(/[-–—]+\s*$/g, ' ')     // trailing dash
    .replace(/:/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Titles are not names.
  text = text.replace(/^(dr|mr|mrs|ms|miss)\.?\s+/i, (m) => {
    note.push(m.trim());
    return '';
  });

  return { text, address, sameAddress, note };
}

function splitName(text) {
  const parts = text.split(' ').filter(Boolean);
  if (parts.length === 1) return { first: parts[0], last: '', middles: [] };

  let last = parts[parts.length - 1];
  let rest = parts.slice(0, -1);

  // Keep Sr / Jr / III attached to the surname.
  if (SUFFIXES.has(last.toLowerCase().replace(/\./g, '')) && rest.length > 1) {
    last = `${rest[rest.length - 1]} ${last}`;
    rest = rest.slice(0, -1);
  }

  return { first: rest[0], last, middles: rest.slice(1) };
}

function aliasesFor(first, middles) {
  const set = new Set(NICKNAMES[first.toLowerCase()] ?? []);
  // Middle names are searchable, since some guests go by them.
  for (const m of middles) set.add(m);
  return [...set].join(',');
}

function joinNames(names) {
  if (names.length === 1) return names[0];
  return `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

/**
 * "The Hubbard Household" is ambiguous when three Hubbard households are
 * invited, and the lookup shows this string as the only way to tell rows apart.
 * Name the members instead, which is always unique and reads better anyway.
 */
function displayName(guests) {
  // A plus one is "and Guest" on the invitation, never "Guest Chicas".
  const named = guests.filter((g) => !g.plusOne);
  const plusOnes = guests.length - named.length;
  const tail = Array(plusOnes).fill('Guest');

  const surnames = [...new Set(named.map((g) => g.last).filter(Boolean))];
  const base =
    named.length === 1
      ? [`${named[0].first} ${named[0].last}`.trim()]
      : surnames.length === 1
        ? [`${joinNames(named.map((g) => g.first))} ${surnames[0]}`]
        : named.map((g) => `${g.first} ${g.last}`.trim());

  return joinNames([...base, ...tail]);
}

// ── Parse ───────────────────────────────────────────────────────────────────

const raw = readFileSync(new URL('../data/guest-list.txt', import.meta.url), 'utf8');
const blocks = raw
  .split(/\n\s*\n/)
  .map((b) => b.split('\n').map((l) => l.trim()).filter(Boolean))
  .filter((b) => b.length);

const households = [];
const guests = [];
const warnings = [];

blocks.forEach((lines, hi) => {
  const household_id = `H-${String(hi + 1).padStart(3, '0')}`;
  const notes = [];
  const parsed = [];
  let lastAddress = '';

  for (const line of lines) {
    const { text, address, sameAddress, note } = parseLine(line);

    if (address) lastAddress = address;
    if (address || sameAddress) notes.push(`${text.trim()}: ${address || lastAddress}`);
    for (const n of note) notes.push(`${text.trim()}: ${n}`);

    // "And Guest" is a named plus one on the invitation, so it gets a row and
    // can be replied for. It is not a way to add a person through the form.
    if (/^and guest$/i.test(text.trim())) {
      parsed.push({ first: 'Guest', last: '', plusOne: true });
      continue;
    }

    const { first, last, middles } = splitName(text);
    if (!first) {
      warnings.push(`${household_id}: could not parse "${line}"`);
      continue;
    }
    if (!last) warnings.push(`${household_id}: no surname for "${text}"`);
    parsed.push({ first, last, middles });
  }

  // A plus one takes the host's surname so the invitation reads sensibly.
  const hostLast = parsed.find((p) => p.last)?.last ?? '';
  for (const p of parsed) if (p.plusOne) p.last = hostLast;

  households.push({
    household_id,
    display_name: displayName(parsed),
    invited_welcome: true,
    invited_wedding: true,
    invited_breakfast: true,
    notes: [...new Set(notes)].join(' | '),
  });

  parsed.forEach((p, gi) => {
    guests.push({
      guest_id: `G-${String(guests.length + 1).padStart(3, '0')}`,
      household_id,
      first_name: p.first,
      last_name: p.last,
      aliases: p.plusOne ? '' : aliasesFor(p.first, p.middles ?? []),
    });
    void gi;
  });
});

// ── Report ──────────────────────────────────────────────────────────────────

console.log(`${households.length} households, ${guests.length} guests\n`);
for (const h of households) {
  const members = guests.filter((g) => g.household_id === h.household_id);
  console.log(`${h.household_id}  ${h.display_name}`);
  for (const g of members) {
    console.log(`    ${g.guest_id}  ${g.first_name} ${g.last_name}${g.aliases ? `  [${g.aliases}]` : ''}`);
  }
  if (h.notes) console.log(`    note: ${h.notes}`);
}
if (warnings.length) {
  console.log(`\n${warnings.length} warnings:`);
  for (const w of warnings) console.log(`  ! ${w}`);
}

if (DRY) {
  console.log('\ndry run, nothing written');
  process.exit(0);
}

// ── Write ───────────────────────────────────────────────────────────────────

async function upsert(table, mergeOn, records) {
  for (let i = 0; i < records.length; i += 10) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn: mergeOn },
        records: records.slice(i, i + 10).map((fields) => ({ fields })),
      }),
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
}

await upsert('households', ['household_id'], households);
await upsert('guests', ['guest_id'], guests);
console.log(`\nwrote ${households.length} households and ${guests.length} guests`);
