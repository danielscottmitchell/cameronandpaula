const Botanical = () => (
  <g opacity="0.9">
    <path d="M10 310 Q60 200 130 130" stroke="#8a9e88" strokeWidth="1.2" fill="none" />
    <path d="M10 310 Q80 240 170 80" stroke="#8a9e88" strokeWidth="1" fill="none" />
    <path d="M10 310 Q40 260 90 200" stroke="#c9877a" strokeWidth=".8" fill="none" strokeDasharray="2 4" />
    <ellipse cx="130" cy="130" rx="22" ry="10" fill="#8a9e88" opacity=".55" transform="rotate(-40 130 130)" />
    <ellipse cx="110" cy="155" rx="18" ry="8" fill="#8a9e88" opacity=".4" transform="rotate(-55 110 155)" />
    <ellipse cx="80" cy="180" rx="20" ry="9" fill="#a8c5a0" opacity=".45" transform="rotate(-30 80 180)" />
    <ellipse cx="150" cy="105" rx="16" ry="7" fill="#8a9e88" opacity=".5" transform="rotate(-60 150 105)" />
    <circle cx="130" cy="128" r="14" fill="#c9877a" opacity=".7" />
    <circle cx="130" cy="128" r="9" fill="#e0a898" opacity=".8" />
    <circle cx="130" cy="128" r="5" fill="#f5e6e0" />
    <circle cx="170" cy="78" r="10" fill="#c9877a" opacity=".6" />
    <circle cx="170" cy="78" r="6" fill="#e0a898" opacity=".75" />
    <circle cx="170" cy="78" r="3" fill="#f5e6e0" />
    <ellipse cx="155" cy="108" rx="5" ry="7" fill="#c9877a" opacity=".5" transform="rotate(-20 155 108)" />
    <ellipse cx="100" cy="195" rx="4" ry="6" fill="#e0a898" opacity=".55" transform="rotate(10 100 195)" />
    <ellipse cx="60" cy="240" rx="4" ry="6" fill="#c9877a" opacity=".4" transform="rotate(-10 60 240)" />
    <circle cx="95" cy="172" r="3" fill="#b5796b" opacity=".5" />
    <circle cx="88" cy="178" r="2" fill="#b5796b" opacity=".45" />
    <circle cx="145" cy="118" r="2" fill="#8a9e88" opacity=".6" />
  </g>
);

export default function Corners() {
  return (
    <>
      <svg className="corner corner-tl" viewBox="0 0 320 320" fill="none" aria-hidden="true">
        <Botanical />
      </svg>
      <svg className="corner corner-br" viewBox="0 0 320 320" fill="none" aria-hidden="true">
        <Botanical />
      </svg>
    </>
  );
}

export function FloralSprig() {
  return (
    <svg className="floral-bottom" width="160" height="48" viewBox="0 0 160 48" fill="none" aria-hidden="true">
      <path d="M80 48 Q70 30 50 20" stroke="#8a9e88" strokeWidth="1" fill="none" />
      <path d="M80 48 Q90 30 110 20" stroke="#8a9e88" strokeWidth="1" fill="none" />
      <path d="M80 48 Q75 25 60 10" stroke="#8a9e88" strokeWidth=".8" fill="none" />
      <path d="M80 48 Q85 25 100 10" stroke="#8a9e88" strokeWidth=".8" fill="none" />
      <ellipse cx="50" cy="20" rx="12" ry="6" fill="#8a9e88" opacity=".5" transform="rotate(-30 50 20)" />
      <ellipse cx="110" cy="20" rx="12" ry="6" fill="#8a9e88" opacity=".5" transform="rotate(30 110 20)" />
      <circle cx="60" cy="10" r="7" fill="#c9877a" opacity=".65" />
      <circle cx="60" cy="10" r="4" fill="#e0a898" opacity=".8" />
      <circle cx="60" cy="10" r="2" fill="#fdf8f5" />
      <circle cx="100" cy="10" r="7" fill="#c9877a" opacity=".65" />
      <circle cx="100" cy="10" r="4" fill="#e0a898" opacity=".8" />
      <circle cx="100" cy="10" r="2" fill="#fdf8f5" />
      <circle cx="80" cy="2" r="5" fill="#c9877a" opacity=".55" />
      <circle cx="80" cy="2" r="3" fill="#e0a898" opacity=".7" />
    </svg>
  );
}
