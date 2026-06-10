import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../services/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export default function Profile() {
  const { user, isFirebaseEnabled } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      loadUserProfile();
    }
  }, [user]);

  const loadUserProfile = async () => {
    if (!isFirebaseEnabled || !user) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);
      if (docSnap.exists()) {
        const userData = docSnap.data();
        setDisplayName(userData.displayName || user.displayName || '');
      } else {
        setDisplayName(user.displayName || '');
      }
    } catch (error) {
      console.error("Error loading user profile:", error);
      setDisplayName(user.displayName || '');
    }
  };

  const handleSave = async () => {
    if (!isFirebaseEnabled) return;

    if (!displayName.trim()) {
      setMessage({ type: 'error', text: 'Display name cannot be empty' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        displayName: displayName.trim(),
        updatedAt: new Date()
      });
      
      setMessage({ type: 'success', text: 'Display name updated successfully!' });
      setIsEditing(false);
      
      // Reload the user profile to reflect changes
      await loadUserProfile();
    } catch (error) {
      console.error("Error updating display name:", error);
      setMessage({ type: 'error', text: 'Failed to update display name. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setDisplayName(user.displayName || '');
    setIsEditing(false);
    setMessage({ type: '', text: '' });
  };

  if (!isFirebaseEnabled) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-50">Profile</h2>
        </div>
        <div className="p-6 text-center text-zinc-500 text-sm">
          Firebase not configured. Profile unavailable in local preview mode.
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-5 border-b border-zinc-800">
          <h2 className="text-lg font-bold text-zinc-50">Profile</h2>
        </div>
        <div className="p-6 text-center text-zinc-500 text-sm">
          Please sign in to view your profile.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-800 p-3 sm:p-5 border-b border-zinc-800">
        <h2 className="text-base sm:text-lg font-bold text-zinc-50">Profile</h2>
        <p className="text-[10px] sm:text-xs text-zinc-400 mt-0.5">Manage your account settings</p>
      </div>

      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mb-6">
          <img
            src={`https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`}
            alt={displayName}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-zinc-800 border-2 border-zinc-700"
          />
          <div className="text-center sm:text-left">
            <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold mb-1">Account</p>
            <p className="text-sm text-zinc-400">{user.email}</p>
          </div>
        </div>

        <div className="bg-zinc-900/50 rounded-xl p-4 sm:p-5">
          <div className="flex items-center justify-between mb-4">
            <label className="text-sm font-semibold text-zinc-200">Display Name</label>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg transition-colors font-medium"
              >
                Edit
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3">
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500 transition-all"
                placeholder="Enter your display name"
                maxLength={50}
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-semibold rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancel}
                  disabled={loading}
                  className="flex-1 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium rounded-lg transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <p className="text-lg font-semibold text-zinc-100">{displayName || 'No display name set'}</p>
          )}

          {message.text && (
            <div className={`mt-3 p-3 rounded-lg text-xs font-medium ${
              message.type === 'success' 
                ? 'bg-emerald-900/30 border border-emerald-500/30 text-emerald-300' 
                : 'bg-red-900/30 border border-red-500/30 text-red-300'
            }`}>
              {message.text}
            </div>
          )}
        </div>

        <div className="mt-4 p-4 bg-zinc-900/30 rounded-lg">
          <p className="text-[10px] sm:text-xs text-zinc-500">
            Your display name is shown on the leaderboard and to other players in the game.
          </p>
        </div>
      </div>
    </div>
  );
}
