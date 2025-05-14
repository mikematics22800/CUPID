
"use client";

import type { SVGProps } from 'react';

export function Logo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 100 100"
      aria-label="Ourglass Logo"
      {...props} // Spread props to allow className, width, height, etc.
    >
      <defs>
        <linearGradient id="glassGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.8 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.7 }} />
        </linearGradient>
        <linearGradient id="sandGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" style={{ stopColor: 'hsl(var(--accent))', stopOpacity: 0.9 }} />
          <stop offset="100%" style={{ stopColor: 'hsl(var(--primary))', stopOpacity: 0.6 }} />
        </linearGradient>
      </defs>
      
      {/* Hourglass Frame */}
      <path 
        d="M25,15 Q20,20 20,25 L20,40 Q20,45 25,50 L45,60 Q50,62.5 55,60 L75,50 Q80,45 80,40 L80,25 Q80,20 75,15 Z" 
        fill="url(#glassGradient)" 
        stroke="hsl(var(--foreground))" 
        strokeWidth="2"
      />
      <path 
        d="M25,85 Q20,80 20,75 L20,60 Q20,55 25,50 L45,40 Q50,37.5 55,40 L75,50 Q80,55 80,60 L80,75 Q80,80 75,85 Z" 
        fill="url(#glassGradient)" 
        stroke="hsl(var(--foreground))" 
        strokeWidth="2"
      />

      {/* Sand - Top (less sand) */}
      <path 
        d="M30,25 L70,25 L50,45 Z" 
        fill="url(#sandGradient)"
      />
      
      {/* Sand - Bottom (more sand) */}
      <path 
        d="M25,75 L75,75 L70,60 Q65,55 50,55 Q35,55 30,60 Z" 
        fill="url(#sandGradient)"
      />

      {/* Optional: Highlight/Shine */}
      <path 
        d="M28,20 Q40,25 50,22 Q60,25 72,20 Q65,30 50,32 Q35,30 28,20"
        fill="white"
        fillOpacity="0.3"
      />
       <path 
        d="M28,80 Q40,75 50,78 Q60,75 72,80 Q65,70 50,68 Q35,70 28,80"
        fill="white"
        fillOpacity="0.2"
      />
      <style jsx>{`
        svg {
          filter: drop-shadow(0px 2px 2px rgba(0,0,0,0.1));
        }
      `}</style>
    </svg>
  );
}
