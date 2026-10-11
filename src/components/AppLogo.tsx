import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-8 h-8', size }) => {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      width={size}
      height={size}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Cadence Music Icon"
    >
      <circle cx="256" cy="256" r="256" fill="#000000" />
      {/* Outer Red Ring */}
      <path
        d="M256 36 C134.5 36 36 134.5 36 256 C36 377.5 134.5 476 256 476 C377.5 476 476 377.5 476 256 C476 134.5 377.5 36 256 36 Z M256 86 C349.9 86 426 162.1 426 256 C426 349.9 349.9 426 256 426 C162.1 426 86 349.9 86 256 C86 162.1 162.1 86 256 86 Z"
        fill="#FF0000"
      />
      {/* Inner Red Disc */}
      <circle cx="256" cy="256" r="130" fill="#FF0000" />
      {/* White Play Triangle */}
      <path
        d="M216 186 C216 180.5 222 177 227 180 L320 250 C324.5 253 324.5 259 320 262 L227 332 C222 335 216 331.5 216 326 Z"
        fill="#FFFFFF"
      />
    </svg>
  );
};
