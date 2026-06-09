import { useState, useEffect, useRef } from 'react';
import { db, isFirebaseEnabled } from '../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function useSyncPicks(userId) {
  const [matchPicks, setMatchPicks] = useState({});
  const [knockoutPicks, setKnockoutPicks] = useState({
    r32: [], r16: [], qf: [], sf: [], final: [], champion: ''
  });
  const [loading, setLoading] = useState(true);
  
  const isInitialLoad = useRef(true);

  // Load initial bracket picks from Firestore
  useEffect(() => {
    if (!isFirebaseEnabled || !userId) {
      setLoading(false);
      setTimeout(() => { isInitialLoad.current = false; }, 100);
      return;
    }

    async function loadPicks() {
      try {
        const docRef = doc(db, 'predictions', userId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.matchPicks) setMatchPicks(data.matchPicks);
          if (data.knockoutPicks) setKnockoutPicks(data.knockoutPicks);
        }
      } catch (error) {
        console.error("Error loading user picks:", error);
      } finally {
        setLoading(false);
        setTimeout(() => { isInitialLoad.current = false; }, 100);
      }
    }

    loadPicks();
  }, [userId]);

  // Debounced execution for cloud persistence
  useEffect(() => {
    if (isInitialLoad.current || !isFirebaseEnabled || !userId) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const docRef = doc(db, 'predictions', userId);
        await setDoc(docRef, {
          userId,
          matchPicks,
          knockoutPicks,
          updatedAt: serverTimestamp()
        }, { merge: true });
        console.log("Picks auto-saved to cloud backend.");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [matchPicks, knockoutPicks, userId]);

  const confirmPick = (matchId) => {
    setMatchPicks(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        confirmed: true
      }
    }));
  };

  return { matchPicks, setMatchPicks, knockoutPicks, setKnockoutPicks, loading, confirmPick };
}
