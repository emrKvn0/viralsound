import React from "react";

export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.02 1.62 4.2 1.22 1.34 2.92 2.16 4.74 2.37v3.9c-1.74-.01-3.44-.45-4.94-1.32-.23-.13-.45-.28-.66-.44v6.86c.01 2.3-.9 4.54-2.54 6.16-1.64 1.63-3.9 2.53-6.22 2.53-2.31 0-4.56-.89-6.2-2.52-1.65-1.63-2.57-3.87-2.57-6.19 0-2.31.91-4.55 2.55-6.18 1.63-1.63 3.88-2.54 6.19-2.54 1.11-.01 2.21.2 3.23.62.01 1.48.01 2.96.01 4.44-.73-.42-1.57-.65-2.43-.65-1.22 0-2.38.48-3.24 1.34-.87.87-1.35 2.03-1.35 3.25 0 1.23.48 2.39 1.35 3.26.86.86 2.02 1.35 3.25 1.35 1.22 0 2.38-.48 3.25-1.35.87-.87 1.35-2.03 1.35-3.26V.02z"/>
  </svg>
);

export const InstagramIcon = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 24 24" 
    className={className} 
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
  </svg>
);
