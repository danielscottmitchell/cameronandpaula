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
      <p className="rsvp-sub">
        One reply covers your whole household. You can change it until September 1, 2026.
      </p>
      <RsvpFlow />
    </main>
  );
}
