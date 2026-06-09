import { describe, it, expect, beforeEach } from 'vitest';
import { auth, db, googleProvider, isFirebaseEnabled } from './firebase.js';

// Helper function to check if we're using mock/test values
const isMockConfig = () => {
  return import.meta.env.VITE_FIREBASE_API_KEY === 'test-api-key' ||
         import.meta.env.VITE_FIREBASE_PROJECT_ID === 'test-project';
};

describe('Firebase Configuration', () => {
  describe('Environment Variables', () => {
    it('should have all required Firebase environment variables', () => {
      const requiredVars = [
        'VITE_FIREBASE_API_KEY',
        'VITE_FIREBASE_AUTH_DOMAIN',
        'VITE_FIREBASE_PROJECT_ID',
        'VITE_FIREBASE_STORAGE_BUCKET',
        'VITE_FIREBASE_MESSAGING_SENDER_ID',
        'VITE_FIREBASE_APP_ID'
      ];

      requiredVars.forEach(varName => {
        expect(import.meta.env[varName]).toBeDefined();
        expect(import.meta.env[varName]).not.toBe('');
      });
    });

    it('should have valid Firebase API key format', () => {
      const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
      if (!isMockConfig()) {
        expect(apiKey).toMatch(/^AIza[A-Za-z0-9_-]{35,39}$/);
      } else {
        expect(apiKey).toBeTruthy();
      }
    });

    it('should have valid Firebase auth domain format', () => {
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      if (!isMockConfig()) {
        expect(authDomain).toMatch(/^[a-z0-9-]+\.firebaseapp\.com$/);
      } else {
        expect(authDomain).toBeTruthy();
      }
    });

    it('should have valid Firebase project ID format', () => {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      expect(projectId).toMatch(/^[a-z0-9-]+$/);
      expect(projectId.length).toBeGreaterThan(0);
    });

    it('should have valid Firebase app ID format', () => {
      const appId = import.meta.env.VITE_FIREBASE_APP_ID;
      if (!isMockConfig()) {
        expect(appId).toMatch(/^\d+:\d+:[a-z0-9:]+$/);
      } else {
        expect(appId).toBeTruthy();
      }
    });
  });

  describe('Firebase Initialization', () => {
    it('should have Firebase enabled when API key is present', () => {
      if (import.meta.env.VITE_FIREBASE_API_KEY) {
        expect(isFirebaseEnabled).toBe(true);
      }
    });

    it('should initialize auth service when Firebase is enabled', () => {
      if (isFirebaseEnabled) {
        expect(auth).toBeDefined();
        expect(auth).toHaveProperty('app');
        expect(auth).toHaveProperty('currentUser');
      }
    });

    it('should initialize Firestore database when Firebase is enabled', () => {
      if (isFirebaseEnabled) {
        expect(db).toBeDefined();
        expect(db).toHaveProperty('type');
        expect(db).toHaveProperty('_app');
      }
    });

    it('should initialize Google provider when Firebase is enabled', () => {
      if (isFirebaseEnabled) {
        expect(googleProvider).toBeDefined();
        expect(googleProvider).toHaveProperty('providerId');
        expect(googleProvider.providerId).toBe('google.com');
      }
    });
  });

  describe('Firebase Configuration Structure', () => {
    it('should have consistent project ID across all services', () => {
      const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
      const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
      
      if (isFirebaseEnabled && projectId && authDomain) {
        // Auth domain should contain the project ID
        expect(authDomain).toContain(projectId);
      }
    });

    it('should have valid messaging sender ID', () => {
      const senderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
      expect(senderId).toMatch(/^\d+$/);
      expect(parseInt(senderId)).toBeGreaterThan(0);
    });
  });

  describe('Firebase Services Integration', () => {
    it('should have auth and db initialized from the same app', () => {
      if (isFirebaseEnabled && auth && db) {
        expect(auth.app.name).toBe(db._app.name);
      }
    });

    it('should have Google provider configured correctly', () => {
      if (isFirebaseEnabled && googleProvider) {
        expect(googleProvider.customParameters).toBeDefined();
        expect(googleProvider.scopes).toBeDefined();
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle missing Firebase configuration gracefully', () => {
      // This test verifies that the code doesn't crash when config is missing
      // The isFirebaseEnabled flag should be false if API key is missing
      if (!import.meta.env.VITE_FIREBASE_API_KEY) {
        expect(isFirebaseEnabled).toBe(false);
      }
    });
  });
});
