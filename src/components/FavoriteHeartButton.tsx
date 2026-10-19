import React, { useState, useEffect } from 'react';

export interface FavoriteHeartButtonProps {
  trackId: string | number;
  initialFavorite?: boolean;
  onToggle?: (id: string | number, isFav: boolean) => void;
  className?: string;
  sizeClass?: string;
}

// Subtle, understated, and non-distracting Favorite / Heart Button
export const FavoriteHeartButton: React.FC<FavoriteHeartButtonProps> = ({ 
  trackId, 
  initialFavorite = false, 
  onToggle,
  className = '',
  sizeClass = 'w-4 h-4',
}) => {
  const [optimisticFav, setOptimisticFav] = useState<boolean | null>(null);

  // Sync with initialFavorite prop changes
  useEffect(() => {
    setOptimisticFav(null);
  }, [initialFavorite]);

  const isFav = optimisticFav !== null ? optimisticFav : initialFavorite;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const nextState = !isFav;
    setOptimisticFav(nextState);

    if (onToggle) {
      onToggle(trackId, nextState);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={isFav ? 'Remove from favorites' : 'Add to favorites'}
      className={`p-1.5 rounded-full hover:bg-white/5 active:scale-90 flex items-center justify-center transition-all duration-150 cursor-pointer select-none shrink-0 ${className}`}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        className={`${sizeClass} transition-all duration-150 ${
          isFav
            ? 'fill-rose-500 stroke-rose-500 hover:scale-105 active:scale-90'
            : 'stroke-zinc-500 fill-transparent hover:stroke-zinc-300 hover:scale-105 stroke-[1.75]'
        }`}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
        />
      </svg>
    </button>
  );
};

export default FavoriteHeartButton;
