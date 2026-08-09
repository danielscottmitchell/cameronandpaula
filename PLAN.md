# cameronandpaula.com — plan and progress

Wedding: **October 2–4, 2026**, Heigh Torr Estate, Purcellville VA
RSVP deadline: **September 1, 2026**

Live counts are not repeated here on purpose; they go stale in hours.
The Airtable base is the source of truth for who has replied.

Update this file in the same commit as the work it describes. If that feels
like a chore, the entry probably was not worth tracking.

---

## Status

| | |
| --- | --- |
| RSVP | **live**, guests replying |
| Site | **live**, all sections complete, no placeholders |
| Redesign (the desk) | **not started**, decision pending |

---

## Done

- [x] RSVP: name lookup, household form, confirmation, edit-until-Sept-1
- [x] Airtable backend: two bases, linked records, lookups, per-guest and
      per-household `Status`
- [x] Guest list imported (80 households, 151 guests) from `data/guest-list.txt`
- [x] Site: Brennan House address and times, Honeymoon Fund + registries,
      Our Story, hotel links, RSVP banner
- [x] Copy pass for AI writing tells
- [x] Phone country codes, and an opt-out for guests without a number
- [x] Page weight 12.7 MB → 716 KB
- [x] Email alerts on new replies (Airtable automation, record-created)
- [x] Chase list view, alias sweep

---

## Now — until September 1

Nothing is blocking guests. The only job in this window is that **151 guests
reply**, so avoid anything that risks the reply path.

- [ ] Watch for zero-result lookups; add aliases as they appear
- [ ] Chase non-responders from the Airtable view, late August
- [ ] **Do not cut over to a redesign in this window**

### Content still missing

- [ ] Gallery photos
- [ ] Wedding party photos
- [ ] Polaroid photo selection — only if the desk happens

---

## Next — the desk redesign

Full spec lives in the PRD, Part Two. Blocked on artwork, not code.

**Decision not yet made.** Three paths:

| Path | Artwork needed | Notes |
| --- | --- | --- |
| **Full desk** | 7 designs, all layered | The PRD's Part Two. Biggest build; the 11-object deal is its hardest part |
| **Light** | envelope + seal only | Envelope opens on first visit, then today's scrolling site. Most of the feeling, a fraction of the work |
| **Nothing** | none | Site is complete and fast as it stands |

Recommended sequencing regardless of path: build behind a preview URL, cut
over **after September 1**, keep the current build one Vercel rollback away.

### Blocked on: Canva artwork

Rules: no text baked into art, envelope in separate layers, 0.375 in safe
area, lowercase-hyphen filenames, SVG preferred else PNG at 3x transparent.
**Check export sizes** — the site just shed 12 MB of oversized art.

- [ ] Envelope — A7 — `flap-closed`, `flap-open`, `body`, `liner`, `seal`
- [ ] Invitation — 5x7 — `paper`, `border`, `ornament`
- [ ] Details card — 5x7 — `paper`, `border`, `ornament`
- [ ] Travel card — 5x7 — `front`, `back`
- [ ] RSVP card — A2 — `paper`, `border`, `ornament`, `back`
- [ ] Note card — 3.5x5 — `paper`, `border`
- [ ] Polaroid frame — 3.5x4.2 — `frame` + photo mask
- [ ] Desk surface — dark walnut, overhead, grain horizontal, tileable
- [ ] Design tokens — paper, ink, accent red, shadow colour
- [ ] Typefaces — names, weights, web licences

---

## Reference

| | |
| --- | --- |
| Site | https://cameronandpaula.com |
| Repo | https://github.com/danielscottmitchell/cameronandpaula |
| Airtable, main | `appWQtDIA6fDlqAqc` — households, guests, responses, submissions |
| Airtable, log | `appAJVfltA4hFum0I` — append only, never edit |
| Env vars | `AIRTABLE_PAT`, `AIRTABLE_BASE_ID`, `AIRTABLE_LOG_BASE_ID` |

### Things that will bite whoever touches this next

- **Guest ids are positional.** `H-001` is the first block in
  `data/guest-list.txt`. Reordering that file reassigns ids and orphans
  replies. Append new households at the end.
- **`data/guest-list.txt` is gitignored.** It holds home addresses. It lives
  locally and in Airtable, not in git history.
- **Never submit test data against a real household id.** Seed first
  (`npm run seed`), test against `H-T*`, then purge. Overwriting a real reply
  has happened once; the `log` base is what made it recoverable.
- **Airtable has no delete-field endpoint.** Every field added through the API
  is permanent unless removed by hand in the UI.
- **`revision` is not a reliable submit count** for `H-001`, `H-003`, `H-004`.
  It was bumped manually to fire notifications. The log is the honest record.
- **Unchecked Airtable checkboxes are absent, not false.** Test `=== true`.
