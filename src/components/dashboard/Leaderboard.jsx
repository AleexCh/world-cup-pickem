import React, { useEffect, useState } from 'react';
import { db, isFirebaseEnabled } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';

export default function Leaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, 'users'), orderBy('totalPoints', 'desc'), limit(50));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const players = [];
      snapshot.forEach((doc) => {
        const userData = { id: doc.id, ...doc.data() };
        
        // Filter out admin users from leaderboard using isAdmin field
        if (userData.isAdmin) {
          return; // Skip admin users
        }
        players.push(userData);
      });
      setLeaderboard(players);
      setLoading(false);
    }, (error) => {
      console.error("Leaderboard Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (!isFirebaseEnabled) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-50">Global Leaderboard</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time scores calculated globally</p>
        </div>
        <div className="p-6 text-center text-zinc-500 text-sm">
          Firebase not configured. Leaderboard unavailable in local preview mode.
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="text-center text-zinc-500 py-6 font-medium text-sm animate-pulse">Gathering live standing data...</div>;
  }

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-3 sm:p-5 border-b border-zinc-800 flex justify-between items-center">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-zinc-50">Global Leaderboard</h2>
          <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">Real-time scores calculated globally</p>
        </div>
        <span className="flex h-2.5 w-2.5 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
        </span>
      </div>

      <div className="divide-y divide-zinc-900/60 max-h-[400px] sm:max-h-[500px] overflow-y-auto">
        {leaderboard.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-zinc-500 text-xs sm:text-sm">No predictions scored yet. Group match outcomes pending!</div>
        ) : (
          leaderboard.map((player, index) => {
            const medalColor = index === 0 ? "text-amber-400 text-sm sm:text-base" : index === 1 ? "text-zinc-300 text-sm sm:text-base" : index === 2 ? "text-amber-700 text-sm sm:text-base" : "text-zinc-500 font-bold";

            return (
              <div key={player.id} className="flex items-center justify-between p-3 sm:p-4 hover:bg-zinc-900/30 transition-colors">
                <div className="flex items-center gap-2 sm:gap-4 w-3/4">
                  <span className={`w-5 sm:w-6 text-center text-[10px] sm:text-xs ${medalColor}`}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </span>
                  <img
                    src={`https://api.dicebear.com/7.x/bottts/svg?seed=${player.uid}`}
                    alt={player.displayName}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-zinc-800 border border-zinc-700/50"
                  />
                  <span className="text-xs sm:text-sm font-semibold text-zinc-200 truncate">{player.displayName || "Anonymous Scout"}</span>
                </div>
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-black text-amber-400">{player.totalPoints || 0}</span>
                  <span className="text-[9px] sm:text-[10px] text-zinc-500 block font-bold uppercase tracking-wider">PTS</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
