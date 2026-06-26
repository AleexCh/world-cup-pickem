import React from 'react';
import { isMatchLocked, formatMatchTime, calculateMatchPoints } from '../../utils/scoringEngine';

export default function MatchGrid({ schedule, teams, matchPicks, actualResults, onScoreChange, onConfirmPick, user }) {
  // Disable knockout match editing until one day after last group match (June 28, 2026)
  const knockoutLockDate = new Date('2026-06-28T00:00:00Z');
  const isKnockoutLocked = (match) => {
    if (match.group && !match.group.match(/^[A-L]$/)) {
      return new Date() < knockoutLockDate;
    }
    return false;
  };

  return (
    <div>
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 sm:p-3 mb-4">
        <p className="text-amber-400 text-xs sm:text-sm text-center">
          ⚠️ Matches are locked 1 hour before kickoff. Confirm your predictions before then!
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:gap-4">
      {schedule.map((match) => {
        const home = teams[match.homeTeam];
        const away = teams[match.awayTeam];
        const pick = matchPicks[match.id] || { homeScore: '', awayScore: '', confirmed: false };
        const locked = isMatchLocked(match);
        const knockoutLocked = isKnockoutLocked(match);
        const matchTime = formatMatchTime(match);
        
        // Get actual result if available
        const actualMatch = actualResults?.matchPicks?.[match.id];
        const matchCompleted = actualMatch && actualMatch.homeScore !== null && actualMatch.awayScore !== null;
        const pointsEarned = matchCompleted ? calculateMatchPoints(pick, actualMatch) : 0;

        return (
          <div key={match.id} className={`bg-zinc-900/80 border p-3 sm:p-4 rounded-xl flex flex-col justify-between transition-all ${
            matchCompleted 
              ? (pointsEarned > 0 
                  ? `${user ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.4)]' : 'border-zinc-800'}` 
                  : `${user ? 'border-red-500/50 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'border-zinc-800'}`)
              : (locked || knockoutLocked)
                  ? `${user ? 'border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.2)]' : 'border-zinc-800'} opacity-80`
                  : 'border-zinc-800 hover:border-amber-500/50 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)] hover:-translate-y-0.5 hover:bg-zinc-800/90 cursor-pointer'
          }`}>
            <div className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2 flex justify-between">
              <span>Group {match.group}</span>
              <span className={(locked || knockoutLocked) ? 'text-amber-500' : matchCompleted ? 'text-emerald-400' : ''}>
                {matchCompleted ? 'Final' : locked ? 'Locked' : knockoutLocked ? 'Locked (Group Stage)' : matchTime}
              </span>
            </div>

            <div className="flex items-center justify-between gap-4 sm:gap-4">
              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3 w-[42%]">
                <span className="text-xl sm:text-2xl">{home?.flag}</span>
                <span className="text-xs sm:text-sm font-medium text-zinc-100 text-center sm:text-left">{home?.name}</span>
              </div>

              <div className="flex items-center gap-2 justify-center w-[16%]">
                {matchCompleted && user ? (
                  <div className="flex items-center gap-2">
                    <span className={`w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center border rounded-lg font-bold ${pick.homeScore == actualMatch.homeScore && pick.awayScore == actualMatch.awayScore ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'}`}>
                      {pick.homeScore}
                    </span>
                    <span className="text-zinc-500 font-bold">:</span>
                    <span className={`w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center border rounded-lg font-bold ${pick.homeScore == actualMatch.homeScore && pick.awayScore == actualMatch.awayScore ? 'bg-emerald-600/30 border-emerald-500 text-emerald-300' : 'bg-zinc-800/50 border-zinc-700 text-zinc-400'}`}>
                      {pick.awayScore}
                    </span>
                  </div>
                ) : (
                  <>
                    <input
                      type="number"
                      min="0"
                      placeholder="-"
                      value={pick.homeScore ?? ''}
                      onChange={(e) => onScoreChange(match.id, 'homeScore', e.target.value)}
                      disabled={locked || knockoutLocked || pick.confirmed}
                      className={`w-12 h-12 sm:w-10 sm:h-10 text-center border rounded-lg text-white font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${(locked || knockoutLocked || pick.confirmed) ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-amber-500'}`}
                    />
                    <span className="text-zinc-500 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="-"
                      value={pick.awayScore ?? ''}
                      onChange={(e) => onScoreChange(match.id, 'awayScore', e.target.value)}
                      disabled={locked || knockoutLocked || pick.confirmed}
                      className={`w-12 h-12 sm:w-10 sm:h-10 text-center border rounded-lg text-white font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${(locked || knockoutLocked || pick.confirmed) ? 'bg-zinc-800/50 border-zinc-700 text-zinc-500 cursor-not-allowed' : 'bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-amber-500'}`}
                    />
                  </>
                )}
              </div>

              <div className="flex flex-col items-center gap-1 sm:flex-row sm:gap-3 justify-end w-[42%] text-right">
                <span className="text-xl sm:text-2xl">{away?.flag}</span>
                <span className="text-xs sm:text-sm font-medium text-zinc-100 text-center sm:text-right">{away?.name}</span>
              </div>
            </div>

            {matchCompleted && (
              <div className="mt-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-zinc-500">Actual:</span>
                  <span className="font-bold text-zinc-300">{actualMatch.homeScore} - {actualMatch.awayScore}</span>
                </div>
                {/* Only show points if the user is logged in */}
                  {user && (
                    <div className={`font-bold ${pointsEarned > 0 ? 'text-emerald-400' : 'text-zinc-500'}`}>
                      {pointsEarned > 0 ? `+${pointsEarned} pts` : '0 pts'}
                    </div>
                  )}
              </div>
            )}

            {!locked && !knockoutLocked && !pick.confirmed && pick.homeScore !== '' && pick.awayScore !== '' && (
              <button
                onClick={() => onConfirmPick(match.id)}
                className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition-all"
              >
                Confirm Prediction
              </button>
            )}

            {pick.confirmed && !matchCompleted && (
              <div className="mt-3 text-center text-xs text-emerald-400 font-semibold flex items-center justify-center gap-1">
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Confirmed
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
}
