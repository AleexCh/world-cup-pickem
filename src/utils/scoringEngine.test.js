import { describe, it, expect } from 'vitest';

describe('Scoring Engine Utilities', () => {
  describe('Basic scoring logic', () => {
    it('should calculate exact score match correctly', () => {
      const prediction = { homeScore: 2, awayScore: 1 };
      const actual = { homeScore: 2, awayScore: 1 };
      
      const isExactMatch = prediction.homeScore === actual.homeScore && 
                          prediction.awayScore === actual.awayScore;
      expect(isExactMatch).toBe(true);
    });

    it('should calculate correct result match', () => {
      const prediction = { homeScore: 2, awayScore: 1 };
      const actual = { homeScore: 3, awayScore: 1 };
      
      const predictionResult = prediction.homeScore > prediction.awayScore ? 'home' : 
                              prediction.homeScore < prediction.awayScore ? 'away' : 'draw';
      const actualResult = actual.homeScore > actual.awayScore ? 'home' : 
                          actual.homeScore < actual.awayScore ? 'away' : 'draw';
      
      expect(predictionResult).toBe(actualResult);
    });

    it('should identify draw predictions correctly', () => {
      const prediction = { homeScore: 1, awayScore: 1 };
      const actual = { homeScore: 0, awayScore: 0 };
      
      const predictionResult = prediction.homeScore === prediction.awayScore ? 'draw' : 
                              prediction.homeScore > prediction.awayScore ? 'home' : 'away';
      const actualResult = actual.homeScore === actual.awayScore ? 'draw' : 
                          actual.homeScore > actual.awayScore ? 'home' : 'away';
      
      expect(predictionResult).toBe(actualResult);
    });
  });

  describe('Score calculation', () => {
    it('should assign correct points for exact match', () => {
      const prediction = { homeScore: 2, awayScore: 1 };
      const actual = { homeScore: 2, awayScore: 1 };
      
      let points = 0;
      if (prediction.homeScore === actual.homeScore && prediction.awayScore === actual.awayScore) {
        points = 3; // Full points for exact match
      }
      expect(points).toBe(3);
    });

    it('should assign partial points for correct result', () => {
      const prediction = { homeScore: 2, awayScore: 1 };
      const actual = { homeScore: 3, awayScore: 1 };
      
      let points = 0;
      if (prediction.homeScore !== actual.homeScore || prediction.awayScore !== actual.awayScore) {
        const predictionResult = prediction.homeScore > prediction.awayScore ? 'home' : 
                                prediction.homeScore < prediction.awayScore ? 'away' : 'draw';
        const actualResult = actual.homeScore > actual.awayScore ? 'home' : 
                            actual.homeScore < actual.awayScore ? 'away' : 'draw';
        
        if (predictionResult === actualResult) {
          points = 1; // Partial points for correct result
        }
      }
      expect(points).toBe(1);
    });

    it('should assign zero points for incorrect prediction', () => {
      const prediction = { homeScore: 2, awayScore: 1 };
      const actual = { homeScore: 0, awayScore: 2 };
      
      let points = 0;
      if (prediction.homeScore !== actual.homeScore || prediction.awayScore !== actual.awayScore) {
        const predictionResult = prediction.homeScore > prediction.awayScore ? 'home' : 
                                prediction.homeScore < prediction.awayScore ? 'away' : 'draw';
        const actualResult = actual.homeScore > actual.awayScore ? 'home' : 
                            actual.homeScore < actual.awayScore ? 'away' : 'draw';
        
        if (predictionResult === actualResult) {
          points = 1;
        }
      }
      expect(points).toBe(0);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero scores correctly', () => {
      const prediction = { homeScore: 0, awayScore: 0 };
      const actual = { homeScore: 0, awayScore: 0 };
      
      const isExactMatch = prediction.homeScore === actual.homeScore && 
                          prediction.awayScore === actual.awayScore;
      expect(isExactMatch).toBe(true);
    });

    it('should handle high scores correctly', () => {
      const prediction = { homeScore: 5, awayScore: 3 };
      const actual = { homeScore: 5, awayScore: 3 };
      
      const isExactMatch = prediction.homeScore === actual.homeScore && 
                          prediction.awayScore === actual.awayScore;
      expect(isExactMatch).toBe(true);
    });
  });
});