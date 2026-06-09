import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, googleProvider, isFirebaseEnabled } from '../services/firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc } from 'firebase/firestore';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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
              photoURL: firebaseUser.photoURL,
              totalPoints: 0,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          } else {
            // Existing user - just update profile info, preserve score
            await updateDoc(userRef, {
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              updatedAt: serverTimestamp()
            });
          }
        } catch (error) {
          console.error("Failed to sync user profile to Firestore:", error);
          // Continue with authentication even if Firestore write fails
        }

        setUser(firebaseUser);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    if (!isFirebaseEnabled) {
      console.warn("Firebase is not enabled. Cannot sign in.");
      return;
    }
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Authentication Error:", error);
    }
  };

  const logout = async () => {
    if (!isFirebaseEnabled) {
      console.warn("Firebase is not enabled. Cannot sign out.");
      return;
    }
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout, isFirebaseEnabled }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
