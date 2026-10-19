import React from 'react';

interface AppLogoProps {
  className?: string;
  size?: number;
}

export const AppLogo: React.FC<AppLogoProps> = ({ className = 'w-10 h-10', size }) => {
  return (
    <div
      className={`rounded-xl bg-gradient-to-br from-[#FF3B30] to-[#FF2D55] shadow-[0_4px_14px_rgba(255,45,85,0.3)] flex items-center justify-center shrink-0 select-none overflow-hidden ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Cadence Music Icon"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-3/5 h-3/5 text-white fill-current"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <path d="M19.5 3.5 9.5 5.8C8.7 6 8 6.7 8 7.6V16.7C7.3 16.3 6.4 16 5.5 16 3.6 16 2 17.3 2 19s1.6 3 3.5 3 3.5-1.3 3.5-3V9.6l10-2.3v7.4c-.7-.4-1.6-.7-2.5-.7-1.9 0-3.5 1.3-3.5 3s1.6 3 3.5 3 3.5-1.3 3.5-3V4.5c0-.6-.5-1.1-1-.9z" />
      </svg>
    </div>
  );
};
