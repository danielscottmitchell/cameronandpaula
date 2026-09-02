import type { Metadata } from 'next';
import RsvpFlow from '@/components/RsvpFlow';

export const metadata: Metadata = {
  title: 'RSVP · Cameron & Paula',
  description: 'Reply for your household by September 1, 2026.',
};

export default function RsvpPage() {
  return (
    <main className="rsvp-section" style={{ paddingTop: 110 }}>
      <h2>Kindly Reply</h2>
      {/* Hardcoded rather than computed from the deadline: it has passed and
          will not un-pass, and making this page dynamic to say so would cost
          the static cache on the page every late guest lands on. */}
      <p className="rsvp-sub">
        Our reply deadline has passed. If we have not heard from you, please reply
        as soon as you can. One reply covers your whole household.
      </p>
      <RsvpFlow />
    </main>
  );
}
