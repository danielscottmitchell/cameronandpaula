/**
 * Seeds 20 test households into the Airtable base.
 * Idempotent: upserts on household_id and guest_id, so running it twice is safe.
 *
 *   npm run seed
 *
 * Test names are deliberately not real guests. Delete these rows before launch
 * with the "test data" view, every household_id here starts with H-T.
 */

const PAT = process.env.AIRTABLE_PAT;
const BASE = process.env.AIRTABLE_BASE_ID;
if (!PAT || !BASE) throw new Error('Set AIRTABLE_PAT and AIRTABLE_BASE_ID in .env.local');

const households = [
  // Ordinary two person household.
  ['H-T01', 'The Carter Household', true, true, true, ''],
  // Single person household. Form drops the name column.
  ['H-T02', 'Nellie Carter', true, true, true, 'single person household'],
  // Household of four.
  ['H-T03', 'The Brennan Household', true, true, true, 'household of four'],
  // Everyone here declines, exercised by hand in the form.
  ['H-T04', 'The Okonkwo Household', true, true, true, 'decline all three'],
  // Resubmission target.
  ['H-T05', 'The Vance Household', true, true, true, 'resubmit twice, check revision'],
  // Two guests sharing a first name, inside one household.
  ['H-T06', 'The Nguyen Household', true, true, true, 'two guests named An'],
  // Accented names.
  ['H-T07', 'The Bláha Household', true, true, true, 'accent insensitive lookup'],
  // Not invited to Friday, so the welcome column must not render.
  ['H-T08', 'The Ferris Household', false, true, true, 'not invited to Friday'],
  // Saturday only.
  ['H-T09', 'The Alvarez Household', false, true, false, 'Saturday only'],
  ['H-T10', 'The Whitaker Household', true, true, true, ''],
  ['H-T11', 'The Osei Household', true, true, true, ''],
  ['H-T12', 'The Lindqvist Household', true, true, true, ''],
  ['H-T13', 'The Marchetti Household', true, true, true, ''],
  ['H-T14', 'The Delacroix Household', true, true, true, ''],
  ['H-T15', 'The Hargrove Household', true, true, true, ''],
  ['H-T16', 'The Sandoval Household', true, true, true, ''],
  ['H-T17', 'The Bergstrom Household', true, true, true, ''],
  ['H-T18', 'The Achterberg Household', true, true, true, 'long display name'],
  ['H-T19', 'The Fitzgerald-Moreau Household', true, true, true, 'hyphenated household'],
  ['H-T20', 'The Yu Household', true, true, true, 'two letter last name'],
];

const guests = [
  ['G-T001', 'H-T01', 'Nellie', 'Carter', 'Nell'],
  ['G-T002', 'H-T01', 'Marcus', 'Carter', 'Marc,Mark'],
  ['G-T003', 'H-T02', 'Rosalind', 'Carter', 'Roz,Rosie'],
  ['G-T004', 'H-T03', 'Robert', 'Brennan', 'Bob,Bobby,Rob'],
  ['G-T005', 'H-T03', 'Diane', 'Brennan', 'Di'],
  ['G-T006', 'H-T03', 'Katherine', 'Brennan', 'Katie,Kate,Kath'],
  ['G-T007', 'H-T03', 'Thomas', 'Brennan', 'Tom,Tommy'],
  ['G-T008', 'H-T04', 'Chidi', 'Okonkwo', ''],
  ['G-T009', 'H-T04', 'Amara', 'Okonkwo', ''],
  ['G-T010', 'H-T05', 'Gregory', 'Vance', 'Greg'],
  ['G-T011', 'H-T05', 'Helen', 'Vance', ''],
  ['G-T012', 'H-T06', 'An', 'Nguyen', ''],
  ['G-T013', 'H-T06', 'An', 'Nguyen-Pham', 'Annie'],
  ['G-T014', 'H-T07', 'Tomáš', 'Bláha', 'Tomas,Tom'],
  ['G-T015', 'H-T07', 'Zoë', 'Bláha', 'Zoe'],
  ['G-T016', 'H-T08', 'Peter', 'Ferris', 'Pete'],
  ['G-T017', 'H-T08', 'Susan', 'Ferris', 'Sue,Suzy'],
  ['G-T018', 'H-T09', 'José', 'Alvarez', 'Jose,Pepe'],
  ['G-T019', 'H-T09', 'Renée', 'Alvarez', 'Renee'],
  ['G-T020', 'H-T10', 'Douglas', 'Whitaker', 'Doug'],
  ['G-T021', 'H-T10', 'Margaret', 'Whitaker', 'Maggie,Meg,Peggy'],
  ['G-T022', 'H-T11', 'Kwame', 'Osei', ''],
  ['G-T023', 'H-T12', 'Annika', 'Lindqvist', ''],
  ['G-T024', 'H-T12', 'Lars', 'Lindqvist', ''],
  ['G-T025', 'H-T13', 'Giulia', 'Marchetti', 'Julia'],
  ['G-T026', 'H-T13', 'Matteo', 'Marchetti', 'Matt'],
  ['G-T027', 'H-T14', 'Céline', 'Delacroix', 'Celine'],
  ['G-T028', 'H-T15', 'Wendell', 'Hargrove', 'Wen'],
  ['G-T029', 'H-T15', 'Bernice', 'Hargrove', 'Bernie'],
  ['G-T030', 'H-T15', 'Clyde', 'Hargrove', ''],
  ['G-T031', 'H-T16', 'Ximena', 'Sandoval', ''],
  ['G-T032', 'H-T16', 'Rafael', 'Sandoval', 'Rafa'],
  ['G-T033', 'H-T17', 'Ingrid', 'Bergstrom', ''],
  ['G-T034', 'H-T17', 'Nils', 'Bergstrom', ''],
  ['G-T035', 'H-T18', 'Constance', 'Achterberg', 'Connie'],
  ['G-T036', 'H-T18', 'Bartholomew', 'Achterberg', 'Bart'],
  ['G-T037', 'H-T19', 'Siobhan', 'Fitzgerald-Moreau', 'Shiv'],
  ['G-T038', 'H-T19', 'Declan', 'Fitzgerald-Moreau', ''],
  ['G-T039', 'H-T20', 'Mei', 'Yu', ''],
  ['G-T040', 'H-T20', 'Jian', 'Yu', ''],
];

async function upsert(table, fieldsToMergeOn, records) {
  for (let i = 0; i < records.length; i += 10) {
    const res = await fetch(`https://api.airtable.com/v0/${BASE}/${table}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        performUpsert: { fieldsToMergeOn },
        records: records.slice(i, i + 10).map((fields) => ({ fields })),
      }),
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
  }
}

await upsert(
  'households',
  ['household_id'],
  households.map(([household_id, display_name, w, we, b, notes]) => ({
    household_id,
    display_name,
    invited_welcome: w,
    invited_wedding: we,
    invited_breakfast: b,
    notes,
  })),
);

await upsert(
  'guests',
  ['guest_id'],
  guests.map(([guest_id, household_id, first_name, last_name, aliases]) => ({
    guest_id,
    household_id,
    first_name,
    last_name,
    aliases,
  })),
);

console.log(`seeded ${households.length} households, ${guests.length} guests`);
