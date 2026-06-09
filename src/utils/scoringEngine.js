import { db, isFirebaseEnabled } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { calculateStandings } from './tournamentLogic';

/**
 * Fetches actual match results from Firestore
 * @returns {Object} Actual results document or null if not available
 */
export async function fetchActualResults() {
  if (!isFirebaseEnabled) {
    return null;
  }

  try {
    const docRef = doc(db, 'actualResults', 'matchResults');
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error("Error fetching actual results:", error);
    return null;
  }
}

/**
 * Checks if a match is locked (1 hour before match time)
 * @param {Object} match - Match object with date and time in UTC
 * @returns {boolean} True if match is locked
 */
export function isMatchLocked(match) {
  if (!match.date || !match.time) return false;

  const matchDateTime = new Date(`${match.date}T${match.time}`);
  const lockTime = new Date(matchDateTime.getTime() - 60 * 60 * 1000); // 1 hour before
  const now = new Date();

  return now >= lockTime;
}

/**
 * Formats match time to user's local timezone
 * @param {Object} match - Match object with date and time in UTC
 * @returns {string} Formatted local time string
 */
export function formatMatchTime(match) {
  if (!match.date || !match.time) return '';
  
  const matchDateTime = new Date(`${match.date}T${match.time}`);
  return matchDateTime.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short'
  });
}

/**
 * Calculates points earned for a single match prediction
 * @param {Object} userMatch - User's prediction { homeScore, awayScore }
 * @param {Object} actualMatch - Actual result { homeScore, awayScore }
 * @returns {number} Points earned for this match (0, 10, or 25)
 */
export function calculateMatchPoints(userMatch, actualMatch) {
  if (!userMatch || !actualMatch) return 0;
  if (userMatch.homeScore === null || userMatch.awayScore === null) return 0;
  if (actualMatch.homeScore === null || actualMatch.awayScore === null) return 0;

  const uHome = parseInt(userMatch.homeScore, 10);
  const uAway = parseInt(userMatch.awayScore, 10);
  const aHome = parseInt(actualMatch.homeScore, 10);
  const aAway = parseInt(actualMatch.awayScore, 10);

  const userOutcome = uHome > uAway ? 'H' : uHome < uAway ? 'A' : 'D';
  const actualOutcome = aHome > aAway ? 'H' : aHome < aAway ? 'A' : 'D';

  let points = 0;

  // Outcome Match Check
  if (userOutcome === actualOutcome) {
    points += 10;
    // Exact Score Bonus Check
    if (uHome === aHome && uAway === aAway) {
      points += 15;
    }
  }

  return points;
}

/**
 * Scores user predictions against exact official real-world results.
 * Scoring Matrix:
 * - Correct Outcome (Win/Loss/Draw): 10 pts
 * - Exact Match Score Bonus: +15 pts
 * - Perfect Group Standing Bonus: +30 pts per group
 * - Correct Knockout Team Advanced: 20 pts per round milestone
 * @param {Object} userPicks - User's complete prediction document
 * @param {Object} actualResults - Official scores document formatted identically
 * @param {Array} schedule - Match schedule
 * @param {Object} teams - Teams mapping
 * @returns {number} Calculated overall total points
 */
export function scoreUserPredictions(userPicks, actualResults, schedule, teams) {
  let points = 0;

  if (!userPicks || !actualResults) return points;

  // 1. Group Stage Scoring
  const userMatches = userPicks.matchPicks || {};
  const actualMatches = actualResults.matchPicks || {};

  Object.keys(actualMatches).forEach((matchId) => {
    const userMatch = userMatches[matchId];
    const actualMatch = actualMatches[matchId];

    points += calculateMatchPoints(userMatch, actualMatch);
  });

  // 2. Perfect Group Standing Bonus
  if (schedule && teams) {
    const userStandings = calculateStandings(userMatches, schedule, teams);
    const actualStandings = calculateStandings(actualMatches, schedule, teams);

    Object.keys(userStandings).forEach((group) => {
      const userGroup = userStandings[group];
      const actualGroup = actualStandings[group];

      // Check if all matches in this group have been played
      const groupMatches = schedule.filter(match => match.group === group);
      const groupMatchesPlayed = groupMatches.filter(match =>
        actualMatches[match.id] &&
        actualMatches[match.id].homeScore !== null &&
        actualMatches[match.id].awayScore !== null
      );
      const allGroupMatchesPlayed = groupMatchesPlayed.length === groupMatches.length;

      // Only award perfect group bonus if:
      // 1. Group has at least one match
      // 2. All matches in the group have been played
      // 3. User and actual standings match perfectly
      if (userGroup && actualGroup && userGroup.length === actualGroup.length && allGroupMatchesPlayed && groupMatches.length > 0) {
        let perfectMatch = true;
        for (let i = 0; i < userGroup.length; i++) {
          if (userGroup[i].teamId !== actualGroup[i].teamId) {
            perfectMatch = false;
            break;
          }
        }
        if (perfectMatch) {
          points += 30; // Bonus for perfect group standing prediction
        }
      }
    });
  }

  // 3. Knockout Stage Qualification Scoring
  const userKO = userPicks.knockoutPicks || {};
  const actualKO = actualResults.knockoutPicks || {};

  // Iterate rounds in reverse order (final to r32) to award points for furthest achievement
  const knockoutRounds = ['final', 'sf', 'qf', 'r16', 'r32'];
  const roundWeights = { r32: 10, r16: 20, qf: 30, sf: 45, final: 60 };

  // Track which teams have already been awarded points to avoid duplicate scoring
  const awardedTeams = new Set();

  knockoutRounds.forEach((round) => {
    const userTeams = userKO[round] || [];
    const actualTeams = actualKO[round] || [];

    userTeams.forEach((teamId) => {
      // Only award points if team hasn't been awarded yet
      // and if the team actually advanced to this round
      if (!awardedTeams.has(teamId) && actualTeams.includes(teamId)) {
        points += roundWeights[round];
        awardedTeams.add(teamId);
      }
    });
  });

  // Champion Bonus
  if (userKO.champion && actualKO.champion && userKO.champion === actualKO.champion) {
    points += 100;
  }

  return points;
}
