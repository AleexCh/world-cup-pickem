import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, isFirebaseEnabled } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const SESSION_TIMEOUT = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Reset activity timer on user interactions
  const resetActivityTimer = () => {
    setLastActivity(Date.now());
  };

  useEffect(() => {
    if (!isFirebaseEnabled) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Upsert user profile into Firestore with initial score for new users
        try {
          const userRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(userRef);
          
          if (!docSnap.exists()) {
            // New user - initialize with 0 points
            await setDoc(userRef, {
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName,
              totalPoints: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            // Existing user - update updatedAt, preserve displayName if custom
            const existingData = docSnap.data();
            await updateDoc(userRef, {
              displayName: existingData.displayName || firebaseUser.displayName,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Failed to sync user profile to Firestore:", error);
          // Continue with authentication even if Firestore write fails
        }

        setUser(firebaseUser);
        setLastActivity(Date.now());
      } else {
        setUser(null);
      }
      setLoading(false);
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Session timeout check
  useEffect(() => {
    if (!user) return;

    const checkSessionTimeout = () => {
      const now = Date.now();
      if (now - lastActivity > SESSION_TIMEOUT) {
        console.log('Session timed out, signing out...');
        logout();
      }
    };

    const timeoutCheck = setInterval(checkSessionTimeout, 60000); // Check every minute

    // Add event listeners for user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => {
      window.addEventListener(event, resetActivityTimer);
    });

    return () => {
      clearInterval(timeoutCheck);
      events.forEach(event => {
        window.removeEventListener(event, resetActivityTimer);
      });
    };
  }, [user, lastActivity]);

  const loginWithGoogle = async () => {
    if (!isFirebaseEnabled) {
      console.warn("Firebase is not enabled. Cannot sign in.");
      return;
    }
    setAuthLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Authentication Error:", error);
      setAuthLoading(false);
    }
  };

  const logout = async () => {
    if (!isFirebaseEnabled) {
      console.warn("Firebase is not enabled. Cannot sign out.");
      return;
    }
    setAuthLoading(true);
    try {
      // Add a small delay to show the loading animation
      await new Promise(resolve => setTimeout(resolve, 1500));
      await signOut(auth);
      // Refresh the page after signing out
      window.location.reload();
    } catch (error) {
      console.error("Logout Error:", error);
      setAuthLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, authLoading, loginWithGoogle, logout, isFirebaseEnabled }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
