import { useState, useEffect } from 'react';
import { db, isFirebaseEnabled } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useSyncPicks(userId) {
  const [matchPicks, setMatchPicks] = useState({});
  const [knockoutPicks, setKnockoutPicks] = useState({
    r32: [], r16: [], qf: [], sf: [], final: [], champion: ''
  });
  const [loading, setLoading] = useState(true);

  // Load initial bracket picks from Firestore with caching
  useEffect(() => {
    // Reset state when userId changes or becomes null
    setMatchPicks({});
    setKnockoutPicks({
      r32: [], r16: [], qf: [], sf: [], final: [], champion: ''
    });
    setLoading(true);

    if (!isFirebaseEnabled || !userId) {
      setLoading(false);
      return;
    }

    async function loadPicks() {
      const CACHE_KEY = `userPicksCache_${userId}`;
      const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

      // Check localStorage cache first
      try {
        const cachedData = localStorage.getItem(CACHE_KEY);
        if (cachedData) {
          const { data, timestamp } = JSON.parse(cachedData);
          const age = Date.now() - timestamp;
          
          // Return cached data if it's fresh
          if (age < CACHE_DURATION) {
            console.log('Using cached user picks (age:', Math.round(age / 1000), 'seconds)');
            if (data.matchPicks) setMatchPicks(data.matchPicks);
            if (data.knockoutPicks) setKnockoutPicks(data.knockoutPicks);
            setLoading(false);
            return;
          }
        }
      } catch (error) {
        console.error("Error reading from cache:", error);
      }

      // Fetch from Firestore if cache is stale or missing
      try {
        const docRef = doc(db, 'predictions', userId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          // Only load data if it belongs to the current user
          if (data.userId === userId) {
            const picksData = {};
            
            // Handle both nested matchPicks structure and flattened structure (for backward compatibility)
            if (data.matchPicks) {
              picksData.matchPicks = data.matchPicks;
            } else {
              // Handle flattened structure - extract match-like keys
              const flattenedPicks = {};
              Object.keys(data).forEach(key => {
                // Skip non-match keys
                if (key !== 'userId' && key !== 'updatedAt' && key !== 'knockoutPicks' &&
                    typeof data[key] === 'object' && data[key] !== null &&
                    (data[key].homeScore !== undefined || data[key].awayScore !== undefined)) {
                  flattenedPicks[key] = data[key];
                }
              });
              if (Object.keys(flattenedPicks).length > 0) {
                picksData.matchPicks = flattenedPicks;
              }
            }
            if (data.knockoutPicks) picksData.knockoutPicks = data.knockoutPicks;
            
            // Cache the results
            try {
              localStorage.setItem(CACHE_KEY, JSON.stringify({
                data: picksData,
                timestamp: Date.now()
              }));
            } catch (error) {
              console.error("Error writing to cache:", error);
            }
            
            if (picksData.matchPicks) setMatchPicks(picksData.matchPicks);
            if (picksData.knockoutPicks) setKnockoutPicks(picksData.knockoutPicks);
          }
        }
      } catch (error) {
        console.error("Error loading user picks:", error);
      } finally {
        setLoading(false);
      }
    }

    loadPicks();
  }, [userId]);

  const confirmPick = async (matchId) => {
    if (!isFirebaseEnabled || !userId) {
      console.warn("Firebase not enabled or user not authenticated - prediction not saved to cloud");
      setMatchPicks(prev => ({
        ...prev,
        [matchId]: {
          ...prev[matchId],
          confirmed: true
        }
      }));
      return;
    }

    // Create updated state object
    const updatedMatchPicks = {
      ...matchPicks,
      [matchId]: {
        ...matchPicks[matchId],
        confirmed: true
      }
    };
    
    // Update local state immediately
    setMatchPicks(updatedMatchPicks);

    // Invalidate cache since we're making changes
    try {
      localStorage.removeItem(`userPicksCache_${userId}`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }

    // Immediately write to Firestore (only matchPicks, knockoutPicks auto-save separately)
    try {
      const docRef = doc(db, 'predictions', userId);
      await setDoc(docRef, {
        userId,
        matchPicks: updatedMatchPicks,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log("Prediction confirmed and saved to Firestore.");
    } catch (error) {
      console.error("Error saving confirmed prediction to Firestore:", error);
    }
  };

  const confirmKnockoutPicks = async () => {
    if (!isFirebaseEnabled || !userId) {
      console.warn("Firebase not enabled or user not authenticated - knockout picks not saved to cloud");
      return;
    }

    // Invalidate cache since we're making changes
    try {
      localStorage.removeItem(`userPicksCache_${userId}`);
    } catch (error) {
      console.error("Error invalidating cache:", error);
    }

    // Immediately write to Firestore
    try {
      const docRef = doc(db, 'predictions', userId);
      await setDoc(docRef, {
        userId,
        knockoutPicks,
        updatedAt: serverTimestamp()
      }, { merge: true });

      console.log("Knockout picks confirmed and saved to Firestore.");
    } catch (error) {
      console.error("Error saving confirmed knockout picks to Firestore:", error);
    }
  };

  return { matchPicks, setMatchPicks, knockoutPicks, setKnockoutPicks, loading, confirmPick, confirmKnockoutPicks };
}
