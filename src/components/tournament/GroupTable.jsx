import React from 'react';


export default function GroupTable({ groupLetter, groupStandings, groupPoints = null, showActualResults = false }) {
  if (!groupStandings) return null;

  return (
    <div className="bg-zinc-950/50 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
      <div className="bg-gradient-to-r from-zinc-900 to-zinc-800 px-3 sm:px-4 py-2 sm:py-2.5 border-b border-zinc-800 flex justify-between items-center">
        <h3 className={`font-bold text-xs sm:text-sm tracking-wider uppercase ${showActualResults ? 'text-blue-400' : 'text-amber-400'}`}>
          Group {groupLetter} {showActualResults ? 'Results' : 'Standings'}
        </h3>
        {showActualResults ? (
          <span className="text-xs font-bold text-blue-400 bg-blue-900/30 px-2 py-1 rounded-lg">
            Live
          </span>
        ) : groupPoints && groupPoints.total > 0 ? (
          <span className="text-xs font-bold text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-lg">
            +{groupPoints.total} points
          </span>
        ) : null}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-[10px] sm:text-xs">
          <thead>
            <tr className="bg-zinc-900/30 text-zinc-400 font-semibold border-b border-zinc-800/60 uppercase">
              <th className="py-1.5 sm:py-2 px-2 sm:px-3 text-center w-8">Pos</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2">Team</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">P</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">W</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">D</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">L</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">GD</th>
              <th className="py-1.5 sm:py-2 px-1 sm:px-2 text-center w-10">Pts</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-900/40 font-medium text-zinc-300">
            {groupStandings.map((row, index) => {
              const rowHighlight = index < 2 ? "bg-emerald-950/20 text-emerald-300 font-semibold" : index === 2 ? "bg-blue-950/10 text-blue-300" : "";
              const positionData = groupPoints?.positions?.[index];
              const isCorrect = positionData?.isCorrect;

              return (
                <tr key={row.teamId} className={`hover:bg-zinc-800/40 transition-colors ${rowHighlight} ${!showActualResults && isCorrect ? 'bg-emerald-900/20' : ''}`}>
                  <td className="py-1.5 sm:py-2 px-2 sm:px-3 text-center text-zinc-400 font-bold">{index + 1}</td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-zinc-100 font-semibold truncate max-w-[100px] sm:max-w-[120px]">
                    {row.name}
                    {!showActualResults && isCorrect && (
                      <span className="text-emerald-400 text-xs ml-1">✓</span>
                    )}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center">{row.played}</td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-emerald-400 font-semibold">{row.won}</td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-zinc-300">{row.drawn}</td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-rose-400 font-semibold">{row.lost}</td>
                  <td className={`py-1.5 sm:py-2 px-1 sm:px-2 text-center font-bold ${row.goalDifference > 0 ? 'text-emerald-400' : row.goalDifference < 0 ? 'text-rose-400' : 'text-zinc-400'}`}>
                    {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                  </td>
                  <td className="py-1.5 sm:py-2 px-1 sm:px-2 text-center text-zinc-50 font-bold">{row.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
