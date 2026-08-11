'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EVENTS, PAULA_PHONE, isInvited, type EventKey } from '@/lib/config';
import { formatPhone, normalizePhone } from '@/lib/normalize';

type Match = { guest_id: string; household_id: string; display_name: string; household_name: string };
type Guest = { guest_id: string; first_name: string; last_name: string };
type Household = {
  household_id: string;
  display_name: string;
  invited_welcome?: boolean;
  invited_wedding?: boolean;
  invited_breakfast?: boolean;
};
type Answers = Record<string, Partial<Record<EventKey, 'yes' | 'no'>>>;

type Loaded = {
  household: Household;
  guests: Guest[];
  answers: Answers;
  phone: string;
  dietary: string;
  song: string;
  message: string;
  firstSubmittedAt: string | null;
  closed: boolean;
  noPhone?: boolean;
};

const NO_MATCH = `We can't find that name. Try your first name on its own, or text Paula at ${PAULA_PHONE}.`;

const draftKey = (id: string) => `cp_rsvp_draft_${id}`;

function monthDay(iso: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? null
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
}

export default function RsvpFlow() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [confirmedAt, setConfirmedAt] = useState<string | null>(null);

  if (confirmedAt && loaded) {
    return (
      <Confirmation
        data={loaded}
        submittedAt={confirmedAt}
        onEdit={() => setConfirmedAt(null)}
      />
    );
  }

  if (loaded) {
    return (
      <Form
        data={loaded}
        onBack={() => setLoaded(null)}
        // The form owns the answers while it is open. Take its final state back
        // so the confirmation shows what was sent, not what was loaded, and so
        // "Change our reply" reopens the form on the submitted answers.
        onSubmitted={(at, submitted) => {
          setLoaded(submitted);
          setConfirmedAt(at);
        }}
      />
    );
  }

  return <Lookup onLoaded={setLoaded} />;
}

// ── Step 1: name lookup ─────────────────────────────────────────────────────

function Lookup({ onLoaded }: { onLoaded: (l: Loaded) => void }) {
  const [query, setQuery] = useState('');
  const [matches, setMatches] = useState<Match[]>([]);
  const [searched, setSearched] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const [active, setActive] = useState(-1);
  const [busy, setBusy] = useState(false);
  const listId = 'rsvp-suggestions';

  useEffect(() => {
    if (query.trim().length < 3) {
      setMatches([]);
      setSearched(false);
      return;
    }
    // Debounce so typing does not fan out one request per keystroke.
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/lookup?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setMatches(data.matches ?? []);
        setTruncated(!!data.truncated);
      } catch {
        setMatches([]);
        setTruncated(false);
      } finally {
        setSearched(true);
        setActive(-1);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const select = useCallback(
    async (m: Match) => {
      setBusy(true);
      try {
        const res = await fetch(`/api/household/${encodeURIComponent(m.household_id)}`);
        if (!res.ok) throw new Error('load failed');
        const d = await res.json();

        const answers: Answers = {};
        for (const r of d.responses ?? []) {
          answers[r.guest_id] = {
            welcome: r.attending_welcome,
            wedding: r.attending_wedding,
            breakfast: r.attending_breakfast,
          };
        }

        const base: Loaded = {
          household: d.household,
          guests: d.guests,
          answers,
          phone: d.submission?.phone ? formatPhone(d.submission.phone) : '',
          dietary: d.submission?.dietary_notes ?? '',
          song: d.submission?.song_request ?? '',
          message: d.submission?.message ?? '',
          firstSubmittedAt: d.submission?.first_submitted_at ?? null,
          closed: !!d.closed,
        };

        // A draft from an interrupted session wins over what the server has,
        // because it is the more recent intent.
        try {
          const raw = sessionStorage.getItem(draftKey(d.household.household_id));
          if (raw) Object.assign(base, JSON.parse(raw));
        } catch {
          /* sessionStorage unavailable, carry on with server state */
        }

        onLoaded(base);
      } catch {
        setBusy(false);
      }
    },
    [onLoaded],
  );

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!matches.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === 'Enter' && active >= 0) {
      e.preventDefault();
      select(matches[active]);
    } else if (e.key === 'Escape') {
      setMatches([]);
    }
  }

  return (
    <div>
      <div className="field">
        <label htmlFor="rsvp-name">Start typing your name</label>
        <div className="lookup-wrap">
          <input
            id="rsvp-name"
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            role="combobox"
            aria-expanded={matches.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={query}
            disabled={busy}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
          />

          <div aria-live="polite" className="visually-hidden" style={{ position: 'absolute', left: -9999 }}>
            {searched ? `${matches.length} ${matches.length === 1 ? 'result' : 'results'}` : ''}
          </div>

          {matches.length > 0 && (
            <ul className="suggestions" id={listId} role="listbox">
              {matches.map((m, i) => (
                <li key={m.guest_id} role="presentation">
                  <button
                    type="button"
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    data-active={i === active}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => select(m)}
                  >
                    {m.display_name}
                    <span className="household">{m.household_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {truncated && !busy && (
            // Seven Hubbards are invited and only five rows show. Without this
            // the other two see five relatives, not themselves, and no reason
            // to keep typing. No count, because that would leak list size.
            <p className="lookup-empty">
              More names match. Add your first name to narrow it down.
            </p>
          )}

          {searched && matches.length === 0 && !busy && <p className="lookup-empty">{NO_MATCH}</p>}
        </div>
      </div>
    </div>
  );
}

// ── Step 2: the form ────────────────────────────────────────────────────────

function Form({
  data,
  onBack,
  onSubmitted,
}: {
  data: Loaded;
  onBack: () => void;
  onSubmitted: (at: string, submitted: Loaded) => void;
}) {
  const [answers, setAnswers] = useState<Answers>(data.answers);
  const [phone, setPhone] = useState(data.phone);
  const [dietary, setDietary] = useState(data.dietary);
  const [song, setSong] = useState(data.song);
  const [message, setMessage] = useState(data.message);
  const [noPhone, setNoPhone] = useState(data.noPhone ?? false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errorRef = useRef<HTMLDivElement>(null);

  const { household, guests, closed } = data;
  const events = useMemo(() => EVENTS.filter((e) => isInvited(household, e.key)), [household]);
  const single = guests.length === 1;
  const submittedOn = monthDay(data.firstSubmittedAt);

  // Keep a draft so a dropped connection does not cost the guest their answers.
  useEffect(() => {
    if (closed) return;
    try {
      sessionStorage.setItem(
        draftKey(household.household_id),
        JSON.stringify({ answers, phone, dietary, song, message, noPhone }),
      );
    } catch {
      /* private mode, nothing to do */
    }
  }, [answers, phone, dietary, song, message, noPhone, household.household_id, closed]);

  const missing = useMemo(() => {
    for (const g of guests) {
      for (const e of events) {
        if (!answers[g.guest_id]?.[e.key]) {
          return { guest: g, event: e };
        }
      }
    }
    return null;
  }, [answers, guests, events]);

  // A phone number is asked for, but never allowed to be the reason a household
  // cannot reply at all. Guests without one opt out and submit anyway.
  const phoneOk = noPhone || normalizePhone(phone).length === 10;
  const canSubmit = !missing && phoneOk && !sending;

  // Only offer the opt out once the number is the single thing left, so it does
  // not read as "skip this" to everyone else.
  const offerOptOut = !missing && !noPhone && normalizePhone(phone).length !== 10;

  const hint = missing
    ? single
      ? `Answer ${missing.event.day}`
      : `Answer ${missing.event.day} for ${missing.guest.first_name}`
    : !phoneOk
      ? 'Add a phone number'
      : '';

  function setAnswer(guestId: string, key: EventKey, value: 'yes' | 'no') {
    setAnswers((prev) => ({ ...prev, [guestId]: { ...prev[guestId], [key]: value } }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          household_id: household.household_id,
          guests: guests.map((g) => ({ guest_id: g.guest_id, ...answers[g.guest_id] })),
          phone: noPhone ? '' : phone,
          dietary_notes: dietary,
          song_request: song,
          message,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.message ?? 'That didn\u2019t save. Please try again.');

      try {
        sessionStorage.removeItem(draftKey(household.household_id));
      } catch {
        /* nothing to clear */
      }
      onSubmitted(body.submitted_at, {
        ...data,
        answers,
        noPhone,
        phone: noPhone ? '' : phone,
        dietary,
        song,
        message,
        firstSubmittedAt: data.firstSubmittedAt ?? body.submitted_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That didn\u2019t save. Please try again.');
      setSending(false);
      requestAnimationFrame(() => errorRef.current?.focus());
    }
  }

  if (closed) {
    return (
      <ReadOnly
        data={data}
        answers={answers}
        phone={phone}
        dietary={dietary}
        song={song}
        message={message}
        onBack={onBack}
      />
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <div className="household-head">
        <h3 className="guest-name">{household.display_name}</h3>
        <p className="names">
          {guests.map((g) => `${g.first_name} ${g.last_name}`).join(', ')}
          <br />
          <button type="button" className="text-link" onClick={onBack}>
            Not you?
          </button>
        </p>
        {submittedOn && (
          <p className="help" style={{ marginTop: 10 }}>
            Submitted on {submittedOn}. Changes save when you submit again.
          </p>
        )}
      </div>

      {error && (
        <div className="error-summary" ref={errorRef} tabIndex={-1} role="alert">
          {error}
        </div>
      )}

      <div className="field">
        <span className="label">Who is coming</span>
        {guests.map((g) => (
          <div className="guest-block" key={g.guest_id}>
            {!single && (
              <p className="guest-name">
                {g.first_name} {g.last_name}
              </p>
            )}
            {events.map((e) => {
              const current = answers[g.guest_id]?.[e.key];
              const group = `${single ? 'You' : g.first_name}, ${e.label}`;
              return (
                <div className="event-row" key={e.key}>
                  <div className="event-meta">
                    <div className="event-label">
                      {e.day} · {e.label}
                    </div>
                    <div className="event-detail">{e.detail}</div>
                  </div>
                  <div className="segmented" role="group" aria-label={group}>
                    <button
                      type="button"
                      aria-pressed={current === 'yes'}
                      onClick={() => setAnswer(g.guest_id, e.key, 'yes')}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className="no"
                      aria-pressed={current === 'no'}
                      onClick={() => setAnswer(g.guest_id, e.key, 'no')}
                    >
                      No
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div className="field">
        <label htmlFor="rsvp-phone">Phone number</label>
        <p className="help">For weekend updates only.</p>
        <input
          id="rsvp-phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          disabled={noPhone}
          aria-describedby={phone && !phoneOk ? 'phone-error' : undefined}
          onChange={(e) => setPhone(formatPhone(e.target.value))}
        />
        {phone && !noPhone && normalizePhone(phone).length !== 10 && (
          <span className="field-error" id="phone-error">
            That needs to be 10 digits.
          </span>
        )}

        {offerOptOut && (
          <button
            type="button"
            className="text-link"
            style={{ marginTop: 10, fontSize: '.85rem' }}
            onClick={() => {
              setNoPhone(true);
              setPhone('');
            }}
          >
            I&apos;d rather not share a number
          </button>
        )}

        {noPhone && (
          <p className="help" style={{ marginTop: 10 }}>
            No number, that&rsquo;s fine.{' '}
            <button type="button" className="text-link" onClick={() => setNoPhone(false)}>
              Add one after all
            </button>
          </p>
        )}
      </div>

      <div className="field">
        <label htmlFor="rsvp-dietary">Dietary restrictions and allergies</label>
        <p className="help">
          Dinner is a buffet with bread, salad, steak, chicken, pasta, rice, and grilled vegetables.
          Tell us about allergies or restrictions and we&apos;ll make sure there&apos;s something for you.
        </p>
        <textarea
          id="rsvp-dietary"
          rows={3}
          maxLength={400}
          value={dietary}
          onChange={(e) => setDietary(e.target.value)}
        />
        <div className="char-count">{400 - dietary.length} left</div>
      </div>

      <div className="field">
        <label htmlFor="rsvp-song">Song requests</label>
        <p className="help">What will get you on the dance floor?</p>
        <textarea
          id="rsvp-song"
          rows={2}
          maxLength={200}
          value={song}
          onChange={(e) => setSong(e.target.value)}
        />
        <div className="char-count">{200 - song.length} left</div>
      </div>

      <div className="field">
        <label htmlFor="rsvp-message">A note to the couple</label>
        <textarea
          id="rsvp-message"
          rows={3}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="char-count">{500 - message.length} left</div>
      </div>

      <div className="submit-row">
        <button className="submit" type="submit" disabled={!canSubmit}>
          {sending ? 'Sending' : 'Send our reply'}
        </button>
        <p className="submit-hint">{hint}</p>
      </div>
    </form>
  );
}

// ── Step 3: confirmation ────────────────────────────────────────────────────

function summaryLines(guests: Guest[], answers: Answers, household: Household) {
  return guests.map((g) => {
    const yes = EVENTS.filter(
      (e) => isInvited(household, e.key) && answers[g.guest_id]?.[e.key] === 'yes',
    ).map((e) => e.day);
    return {
      name: `${g.first_name} ${g.last_name}`,
      text: yes.length ? yes.join(', ') : 'Not attending',
    };
  });
}

function Confirmation({
  data,
  submittedAt,
  onEdit,
}: {
  data: Loaded;
  submittedAt: string;
  onEdit: () => void;
}) {
  const when = new Date(submittedAt).toLocaleString('en-US', {
    dateStyle: 'long',
    timeStyle: 'short',
  });

  return (
    <div className="confirm-card" role="status">
      {/* Has to work for a household that accepted and one that declined
          everything, so it thanks them for replying rather than for coming. */}
      <h3>Thank you for letting us know.</h3>
      <p className="confirm-line">Your reply was saved on {when}.</p>
      {summaryLines(data.guests, data.answers, data.household).map((l) => (
        <p className="confirm-line" key={l.name}>
          <strong>{l.name}</strong> · {l.text}
        </p>
      ))}
      {data.dietary && <p className="confirm-line">Dietary: {data.dietary}</p>}
      {data.song && <p className="confirm-line">Song: {data.song}</p>}
      <p className="confirm-line" style={{ marginTop: 12 }}>
        You can come back and change this until September 1, 2026.{' '}
        <button type="button" className="text-link" onClick={onEdit}>
          Change our reply
        </button>
      </p>
    </div>
  );
}

// ── After the deadline ──────────────────────────────────────────────────────

function ReadOnly({
  data,
  answers,
  phone,
  dietary,
  song,
  onBack,
}: {
  data: Loaded;
  answers: Answers;
  phone: string;
  dietary: string;
  song: string;
  message: string;
  onBack: () => void;
}) {
  return (
    <div className="confirm-card">
      <h3>{data.household.display_name}</h3>
      <p className="confirm-line">Replies closed on September 1, 2026. Here is what we have.</p>
      {summaryLines(data.guests, answers, data.household).map((l) => (
        <p className="confirm-line" key={l.name}>
          <strong>{l.name}</strong> · {l.text}
        </p>
      ))}
      {phone && <p className="confirm-line">Phone: {phone}</p>}
      {dietary && <p className="confirm-line">Dietary: {dietary}</p>}
      {song && <p className="confirm-line">Song: {song}</p>}
      <p className="confirm-line" style={{ marginTop: 12 }}>
        If anything needs changing, text Paula at {PAULA_PHONE}.{' '}
        <button type="button" className="text-link" onClick={onBack}>
          Look up a different name
        </button>
      </p>
    </div>
  );
}
