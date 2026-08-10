# cameronandpaula.com reference

Wedding: **October 2–4, 2026**, Heigh Torr Estate, Purcellville VA
RSVP deadline: **September 1, 2026**

**Task status lives in Airtable, not here:** base `appyOfrHKJ7wmerSm`,
"Cameron & Paula Build Plan". This file holds only what belongs next to the
code: where things are, and what has already bitten us.

Two trackers drift. If you find yourself updating a checklist in this file,
it belongs in Airtable instead.

---

## Where things are

| | |
| --- | --- |
| Site | https://cameronandpaula.com |
| Repo | https://github.com/danielscottmitchell/cameronandpaula |
| Plan | Airtable `appyOfrHKJ7wmerSm` |
| RSVP data | Airtable `appWQtDIA6fDlqAqc`, tables: households, guests, responses, submissions |
| RSVP log | Airtable `appAJVfltA4hFum0I`, append only, never edit |
| Env vars | `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `AIRTABLE_LOG_BASE_ID` |

Architecture: the wedding site is hand-written static HTML in `public/`, with
a Next.js rewrite pointing `/` at it. Next owns `/rsvp` and `/api` only.

---

## Things that will bite whoever touches this next

- **Guest ids are positional.** `H-001` is the first block in
  `data/guest-list.txt`. Reordering that file reassigns ids and orphans
  replies. Append new households at the end.

- **`data/guest-list.txt` is gitignored.** It holds home addresses. It lives
  locally and in Airtable, never in git history.

- **Never submit test data against a real household id.** Seed first
  (`npm run seed`), test against `H-T*`, then purge. Overwriting a real reply
  has happened once; the `log` base is what made it recoverable.

- **Airtable has no delete-field endpoint.** Every field added through the API
  is permanent unless removed by hand in the UI.

- **Unchecked Airtable checkboxes are absent, not `false`.** Test `=== true`.
  Reading `!== false` silently inverts the flag, which broke the invited-events
  logic once.

- **`revision` is not a reliable submit count** for `H-001`, `H-003`, `H-004`.
  It was bumped by hand to fire notifications before the automations existed.
  The log base is the honest record.

- **Reply notifications need two Airtable automations.** "When record updated"
  does not fire on record creation, so new replies need their own
  "When record created" trigger. Edits need the updated one.

- **Watch image exports.** The site shipped 12.7 MB of images once: corners at
  2857×4000 rendered at 520px, and a 1.8 MB SVG favicon. Budget is 1.2 MB.

- **Don't run `npm run build` while `next dev` is running.** It overwrites
  `.next` and the dev server starts throwing module-not-found.
