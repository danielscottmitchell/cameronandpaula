import Corners, { FloralSprig } from '@/components/Corners';
import Countdown from '@/components/Countdown';
import RsvpFlow from '@/components/RsvpFlow';

export default function Home() {
  return (
    <>
      <Corners />

      <main className="hero">
        <div className="monogram">C&amp;P</div>

        <h1 className="reveal" style={{ animationDelay: '.12s' }}>
          Cameron
          <em>&amp;</em>
          Paula
        </h1>

        <div className="divider reveal" style={{ animationDelay: '.24s' }}>
          <hr />
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 2C12 2 8 6 8 10a4 4 0 008 0C16 6 12 2 12 2z" fill="#c9877a" opacity=".7" />
            <path d="M12 22C12 22 8 18 8 14a4 4 0 008 0C16 18 12 22 12 22z" fill="#8a9e88" opacity=".6" />
          </svg>
          <hr />
        </div>

        <p className="date reveal" style={{ animationDelay: '.34s' }}>
          October 3, 2026
        </p>

        <Countdown />

        <p className="reply-line reveal" style={{ animationDelay: '.56s' }}>
          <a href="#rsvp">Kindly reply by September 1</a>
        </p>

        <div className="floral-wrap reveal" style={{ animationDelay: '.66s' }}>
          <FloralSprig />
        </div>
      </main>

      <section className="rsvp-section" id="rsvp">
        <h2>Kindly Reply</h2>
        <p className="rsvp-sub">
          One reply covers your whole household. You can change it until September 1, 2026.
        </p>
        <RsvpFlow />
      </section>
    </>
  );
}
