import React from 'react';

export default function KnockoutBracket({ knockoutPicks, setKnockoutPicks, teams }) {
  const rounds = [
    { key: 'r32', name: 'Round of 32', slots: 16 },
    { key: 'r16', name: 'Round of 16', slots: 8 },
    { key: 'qf', name: 'Quarter-Finals', slots: 4 },
    { key: 'sf', name: 'Semi-Finals', slots: 2 },
    { key: 'final', name: 'Finals', slots: 1 },
  ];

  const handleSelectWinner = (currentRoundKey, nextRoundKey, teamId, index) => {
    if (!teamId) return;
    
    const nextSlotIndex = Math.floor(index / 2);
    
    setKnockoutPicks(prev => {
      const updatedNextRound = [...(prev[nextRoundKey] || [])];
      updatedNextRound[nextSlotIndex] = teamId;
      
      let updatedChampion = prev.champion;
      if (currentRoundKey === 'final') {
        updatedChampion = teamId;
      }

      return {
        ...prev,
        [nextRoundKey]: updatedNextRound,
        champion: updatedChampion
      };
    });
  };

  return (
    <div className="w-full space-y-8 overflow-y-auto max-h-[80vh] border border-zinc-800 rounded-xl p-4 bg-zinc-950/30">
      <div className="flex flex-col gap-6">
        {rounds.map((round) => (
          <div key={round.key} className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest text-zinc-500 font-bold px-1">{round.name}</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              {Array.from({ length: round.slots }).map((_, idx) => {
                const teamId = knockoutPicks[round.key]?.[idx];
                const team = teams[teamId];
                const nextRound = rounds[rounds.indexOf(rounds.find(r => r.key === round.key)) + 1];

                return (
                  <button
                    key={idx}
                    disabled={!teamId || round.key === 'final'}
                    onClick={() => handleSelectWinner(round.key, nextRound?.key || 'champion', teamId, idx)}
                    className={`p-3 text-left border rounded-lg transition-all flex items-center justify-between text-xs min-h-[44px] ${
                      teamId 
                        ? 'bg-zinc-900 border-amber-500/40 hover:border-amber-400 text-white' 
                        : 'bg-zinc-900/20 border-zinc-800 text-zinc-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="truncate font-semibold">
                      {team ? `${team.flag} ${team.name}` : `Slot ${idx + 1}`}
                    </span>
                    {teamId && round.key !== 'final' && (
                      <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-black">➔</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        <div className="mt-4 border-t border-zinc-800 pt-6 text-center">
          <p className="text-zinc-400 text-xs font-bold tracking-widest uppercase mb-2">Predicted Champion 🏆</p>
          <div className="inline-block px-8 py-4 bg-gradient-to-b from-amber-500/10 to-amber-600/20 border border-amber-500/40 rounded-2xl shadow-xl">
            <span className="text-xl font-black tracking-wide text-amber-300">
              {teams[knockoutPicks.champion]?.flag} {teams[knockoutPicks.champion]?.name || "UNDECIDED"}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
