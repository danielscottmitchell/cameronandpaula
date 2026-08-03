'use client';

import { useEffect, useRef, useState } from 'react';

const WEDDING = new Date('2026-10-03T17:00:00');
const pad = (n: number) => String(n).padStart(2, '0');

function parts(diff: number) {
  if (diff <= 0) return { days: '00', hours: '00', min: '00', sec: '00' };
  const s = Math.floor(diff / 1000);
  return {
    days: pad(Math.floor(s / 86400)),
    hours: pad(Math.floor((s % 86400) / 3600)),
    min: pad(Math.floor((s % 3600) / 60)),
    sec: pad(s % 60),
  };
}

export default function Countdown() {
  // Render dashes on the server so the markup matches the first client paint.
  const [time, setTime] = useState<ReturnType<typeof parts> | null>(null);
  const refs = {
    days: useRef<HTMLSpanElement>(null),
    hours: useRef<HTMLSpanElement>(null),
    min: useRef<HTMLSpanElement>(null),
    sec: useRef<HTMLSpanElement>(null),
  };
  const previous = useRef<ReturnType<typeof parts> | null>(null);

  useEffect(() => {
    const tick = () => setTime(parts(WEDDING.getTime() - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!time) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion) {
      for (const key of ['days', 'hours', 'min', 'sec'] as const) {
        const el = refs[key].current;
        if (el && previous.current && previous.current[key] !== time[key] && el.animate) {
          el.animate(
            [
              { opacity: 0.25, transform: 'translateY(-5px)' },
              { opacity: 1, transform: 'none' },
            ],
            { duration: 420, easing: 'cubic-bezier(.21,.6,.35,1)' },
          );
        }
      }
    }
    previous.current = time;
  }, [time]); // eslint-disable-line react-hooks/exhaustive-deps

  const units = [
    { key: 'days', label: 'Days' },
    { key: 'hours', label: 'Hours' },
    { key: 'min', label: 'Minutes' },
    { key: 'sec', label: 'Seconds' },
  ] as const;

  return (
    <div className="countdown reveal" style={{ animationDelay: '.44s' }} aria-label="Countdown to the wedding">
      {units.map((u, i) => (
        <div key={u.key} style={{ display: 'contents' }}>
          {i > 0 && (
            <span className="dot" aria-hidden="true">
              ·
            </span>
          )}
          <div className="unit">
            <span className="unit-num" ref={refs[u.key]}>
              {time ? time[u.key] : '--'}
            </span>
            <span className="unit-label">{u.label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
