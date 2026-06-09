import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthBanner() {
  const { user, loginWithGoogle, logout, isFirebaseEnabled } = useAuth();

  return (
    <div className={`w-full p-4 mb-6 rounded-xl flex flex-col sm:flex-row justify-between items-center text-sm md:text-base gap-4 transition-all duration-300 ${
      user ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-200' : 'bg-amber-900/40 border border-amber-500/30 text-amber-200'
    }`}>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <img src={user.photoURL} alt={user.displayName} className="w-10 h-10 rounded-full border border-emerald-400" />
            <div>
              <p className="font-semibold">Logged in as {user.displayName}</p>
              <p className="text-xs opacity-75">Your picks are synced globally across all devices.</p>
            </div>
          </>
        ) : (
          <div>
            <p className="font-semibold">⚠️ Playing Guest Mode (Local Device Only)</p>
            <p className="text-xs opacity-75">
              {isFirebaseEnabled 
                ? "Sign in with Google to track live points and join the multiplayer leaderboard!" 
                : "Firebase not configured. Running in local preview mode."}
            </p>
          </div>
        )}
      </div>
      <div>
        {user ? (
          <button onClick={logout} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg shadow transition-colors text-xs uppercase tracking-wider">
            Sign Out
          </button>
        ) : isFirebaseEnabled ? (
          <button onClick={loginWithGoogle} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow-lg transform active:scale-95 transition-all flex items-center gap-2">
            🚀 Sign In with Google
          </button>
        ) : null}
      </div>
    </div>
  );
}
