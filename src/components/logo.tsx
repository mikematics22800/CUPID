import type { SVGProps } from 'react';

export function Logo(props: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className="flex items-center" aria-label="Ourglass Logo" {...props}>
      <svg
        width="32"
        height="32"
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="h-8 w-8"
      >
        <circle cx="50" cy="50" r="48" fill="#0000CD" /> {/* MediumBlue */}
        {/* Hourglass Body */}
        <path
          d="M25,20 H75 V30 C75,40 60,45 50,50 C40,55 25,60 25,70 V80 H75 V70 C75,60 60,55 50,50 C40,45 25,40 25,30 V20 Z"
          stroke="black"
          strokeWidth="4"
          fill="#00FFFF" // Cyan
        />
        {/* Top and bottom caps for hourglass */}
        <line x1="23" y1="20" x2="77" y2="20" stroke="black" strokeWidth="6" />
        <line x1="23" y1="80" x2="77" y2="80" stroke="black" strokeWidth="6" />

        {/* Heart in top bulb */}
        <path
          d="M50 32 C42 26 38 31 38 37 C38 44 50 48 50 48 C50 48 62 44 62 37 C62 31 58 26 50 32 Z"
          fill="#FF00FF" // Magenta
        />
        {/* Triangle in bottom bulb */}
        <polygon points="50,73 42,63 58,63" fill="#FF00FF" /> {/* Magenta */}
      </svg>
      <span className="ml-2 text-2xl font-bold text-primary">Ourglass</span>
    </div>
  );
}
