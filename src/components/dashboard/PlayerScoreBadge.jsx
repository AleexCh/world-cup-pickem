import React from 'react';

export default function PlayerScoreBadge({ totalScore, user, compact = false }) {
  const badgeSize = compact ? 'w-10 h-10' : 'w-14 h-14 sm:w-16 sm:h-16';
  const scoreSize = compact ? 'text-lg' : 'text-xl sm:text-2xl';

  return (
    <div className="relative inline-flex items-center gap-2">
      {/* Total points label */}
      <span className="text-xs font-bold text-amber-500 uppercase tracking-wider whitespace-nowrap">
        Total points:
      </span>

      {/* Badge Container */}
      <div className="relative">
        {/* Outer ring with gradient */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full blur-sm opacity-75"></div>
        
        {/* Main badge */}
        <div className={`relative bg-zinc-900 border-2 border-amber-500 rounded-full ${badgeSize} flex flex-col items-center justify-center shadow-lg shadow-amber-500/20`}>
          {/* Score */}
          <div className={`${scoreSize} font-black text-amber-400 leading-none`}>
            {totalScore}
          </div>
        </div>
        
        {/* Animated shine effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
      </div>
    </div>
  );
}