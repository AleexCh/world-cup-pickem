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

    // Immediately write to Firestore
    try {
      const docRef = doc(db, 'predictions', userId);
      await setDoc(docRef, {
        userId,
        matchPicks: updatedMatchPicks,
        knockoutPicks,
        updatedAt: serverTimestamp()
      }, { merge: true });
      
      console.log("Prediction confirmed and saved to Firestore.");
    } catch (error) {
      console.error("Error saving confirmed prediction to Firestore:", error);
    }
  };

  return { matchPicks, setMatchPicks, knockoutPicks, setKnockoutPicks, loading, confirmPick };
}
