import React from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthBanner() {
  const { user, loginWithGoogle, logout, isFirebaseEnabled, authLoading } = useAuth();

  return (
    <div className={`w-full p-4 mb-6 rounded-xl flex flex-col sm:flex-row justify-between items-center text-sm md:text-base gap-4 transition-all duration-300 ${
      authLoading ? 'animate-pulse' : ''
    } ${
      user ? 'bg-emerald-900/40 border border-emerald-500/30 text-emerald-200' : 'bg-amber-900/40 border border-amber-500/30 text-amber-200'
    }`}>
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <img
              src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
              alt={user.displayName}
              className="w-10 h-10 rounded-full border border-emerald-400"
            />
            <div>
              <p className="font-semibold">Logged in as {user.displayName}</p>
              <p className="text-xs opacity-75">Your picks are synced globally across all devices.</p>
            </div>
          </>
        ) : (
          <div>
            <p className="font-semibold">⚠️ Playing Guest Mode </p>
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
          authLoading ? (
            <button disabled className="px-4 py-2 bg-zinc-800 text-zinc-200 font-medium rounded-lg shadow text-xs uppercase tracking-wider flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-zinc-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing out...
            </button>
          ) : (
            <button onClick={logout} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg shadow transition-colors text-xs uppercase tracking-wider">
              Sign Out
            </button>
          )
        ) : isFirebaseEnabled ? (
          authLoading ? (
            <button disabled className="px-5 py-2.5 bg-amber-500 text-zinc-950 font-bold rounded-lg shadow-lg flex items-center gap-2">
              <svg className="animate-spin h-4 w-4 text-zinc-950" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </button>
          ) : (
            <button onClick={loginWithGoogle} className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow-lg transform active:scale-95 transition-all flex items-center gap-2">
              🚀 Sign In with Google
            </button>
          )
        ) : null}
      </div>
    </div>
  );
}
