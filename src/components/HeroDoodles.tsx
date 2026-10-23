// איורי קו עדינים של לימודים לרקע של דף הבית (דקורטיבי בלבד)
export function HeroDoodles() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 h-[420px] w-[1200px] max-w-none text-indigo-200 opacity-40 sm:opacity-100"
      viewBox="0 0 1200 420"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* כובע סיום */}
      <g transform="translate(90 300)">
        <path d="M0 14 28 0l28 14-28 14z" />
        <path d="M12 20v16c11 8 21 8 32 0V20" />
        <path d="M56 14v18" />
      </g>
      {/* ספר פתוח */}
      <g transform="translate(250 60)">
        <path d="M30 8C22 2 12 0 0 2v38c12-2 22 0 30 6 8-6 18-8 30-6V2C48 0 38 2 30 8z" />
        <path d="M30 8v38" />
      </g>
      {/* מחברת */}
      <g transform="translate(40 120)">
        <path d="M0 0h34a8 8 0 0 1 8 8v40H8a8 8 0 0 1-8-8z" />
        <path d="M10 14h22M10 24h16" />
      </g>
      {/* מולקולה */}
      <g transform="translate(330 300)">
        <circle cx="0" cy="0" r="6" />
        <circle cx="34" cy="-16" r="6" />
        <circle cx="30" cy="26" r="6" />
        <path d="M6 -3 28 -13M5 4l20 18" />
      </g>
      {/* גל / פונקציה */}
      <path d="M420 120q20-28 40 0t40 0" />
      {/* מחוגה */}
      <g transform="translate(170 190)">
        <circle cx="0" cy="0" r="24" />
        <path d="M-30 0h60M0 -30v60" />
      </g>
      {/* עיפרון */}
      <g transform="translate(470 220) rotate(-35)">
        <path d="M0 0h52l10 8-10 8H0z" />
        <path d="M52 0v16M10 0v16" />
      </g>
      {/* נוסחאות */}
      <g fill="currentColor" stroke="none" fontFamily="Georgia, serif">
        <text x="50" y="255" fontSize="30" fontStyle="italic">x²</text>
        <text x="400" y="380" fontSize="28">π</text>
        <text x="560" y="70" fontSize="24" fontStyle="italic">∑</text>
        <text x="230" y="400" fontSize="22" fontStyle="italic">a+b</text>
        <text x="1130" y="380" fontSize="26">√</text>
      </g>
      {/* כוכבים קטנים */}
      <path d="M560 300l4 10 10 4-10 4-4 10-4-10-10-4 10-4z" />
      <path d="M1150 60l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" />
    </svg>
  )
}
