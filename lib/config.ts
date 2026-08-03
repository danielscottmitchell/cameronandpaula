/** RSVP closes at the end of September 1, 2026, Eastern. */
export const RSVP_DEADLINE = new Date('2026-09-01T23:59:59-04:00');

export const isPastDeadline = () => Date.now() > RSVP_DEADLINE.getTime();

export const EVENTS = [
  {
    key: 'welcome',
    label: 'Welcome Party',
    day: 'Friday',
    detail: 'Oct 2, 5:00 PM · Heigh Torr Estate · Western attire',
    invitedField: 'invited_welcome',
    respField: 'attending_welcome',
  },
  {
    key: 'wedding',
    label: 'Wedding Day',
    day: 'Saturday',
    detail: 'Oct 3, 4:00 PM · Heigh Torr Estate · Formal attire',
    invitedField: 'invited_wedding',
    respField: 'attending_wedding',
  },
  {
    key: 'breakfast',
    label: 'Farewell Breakfast',
    day: 'Sunday',
    detail: 'Oct 4, 10:00 AM · Brennan House · Comfortable attire',
    invitedField: 'invited_breakfast',
    respField: 'attending_breakfast',
  },
] as const;

export type EventKey = (typeof EVENTS)[number]['key'];

/**
 * A ticked checkbox means invited. Airtable leaves unchecked fields out of the
 * API response entirely, so absent and false are the same thing here and there
 * is no third "unset" state to lean on. Practical consequence: a household row
 * added by hand with no boxes ticked is invited to nothing.
 */
export function isInvited(
  household: Partial<Record<string, unknown>>,
  key: EventKey,
): boolean {
  return household[EVENTS.find((e) => e.key === key)!.invitedField] === true;
}

export const PAULA_PHONE = '(571) 268-3859';
