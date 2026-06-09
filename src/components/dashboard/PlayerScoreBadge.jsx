import React from 'react';

export default function PlayerScoreBadge({ totalScore, user, compact = false }) {
  const badgeSize = compact ? 'w-12 h-12' : 'w-20 h-20 sm:w-24 sm:h-24';
  const iconSize = compact ? 'text-sm' : 'text-lg sm:text-xl';
  const scoreSize = compact ? 'text-lg' : 'text-2xl sm:text-3xl';
  const labelSize = compact ? 'text-[6px]' : 'text-[8px] sm:text-[9px]';
  const showLabel = !compact;

  return (
    <div className="relative inline-flex flex-col items-center">
      {/* Badge Container */}
      <div className="relative">
        {/* Outer ring with gradient */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 rounded-full blur-sm opacity-75"></div>
        
        {/* Main badge */}
        <div className={`relative bg-zinc-900 border-2 border-amber-500 rounded-full ${badgeSize} flex flex-col items-center justify-center shadow-lg shadow-amber-500/20`}>
          {/* Trophy icon */}
          <div className={`text-amber-400 ${iconSize} mb-0.5`}>
            🏆
          </div>
          
          {/* Score */}
          <div className={`${scoreSize} font-black text-amber-400 leading-none`}>
            {totalScore}
          </div>
          
          {/* PTS label */}
          {showLabel && (
            <div className={`${labelSize} font-bold text-amber-500/80 uppercase tracking-wider mt-0.5`}>
              PTS
            </div>
          )}
        </div>
        
        {/* Animated shine effect */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full rounded-full bg-gradient-to-b from-white/10 to-transparent pointer-events-none"></div>
      </div>
      
      {/* User name label */}
      {user && !compact && (
        <div className="mt-2 text-center">
          <span className="text-xs font-medium text-zinc-400">
            {user.displayName || 'Your Score'}
          </span>
        </div>
      )}
    </div>
  );
}