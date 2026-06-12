/**
 * PURE SCORING LOGIC - No Database or Browser dependencies
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

  if (userOutcome === actualOutcome) {
    points += 10;
    if (uHome === aHome && uAway === aAway) {
      points += 15;
    }
  }
  return points;
}

export function calculateGroupStandingPoints(userStandings, actualStandings, schedule, actualResults) {
  const pointsByGroup = {};
  let totalPoints = 0;
  const positionPoints = { 1: 10, 2: 8, 3: 6, 4: 4 };

  Object.keys(userStandings).forEach((group) => {
    const userGroup = userStandings[group];
    const actualGroup = actualStandings[group];
    const groupPoints = { total: 0 };

    const groupMatches = schedule.filter(match => match.group === group);
    const actualMatches = actualResults?.matchPicks || {};
    const groupMatchesPlayed = groupMatches.filter(match =>
      actualMatches[match.id] &&
      actualMatches[match.id].homeScore !== null &&
      actualMatches[match.id].awayScore !== null
    );
    const allGroupMatchesPlayed = groupMatchesPlayed.length === groupMatches.length;

    if (userGroup && actualGroup && allGroupMatchesPlayed && groupMatches.length > 0) {
      userGroup.forEach((userTeam, position) => {
        const actualTeam = actualGroup[position];
        if (actualTeam && userTeam.teamId === actualTeam.teamId) {
          groupPoints.total += (positionPoints[position + 1] || 0);
        }
      });
      totalPoints += groupPoints.total;
    }
  });

  return { totalPoints };
}

export function scoreUserPredictions(userPicks, actualResults, schedule, teams, calculateStandings) {
  let points = 0;
  if (!userPicks || !actualResults) return points;

  // 1. Match Scoring
  const userMatches = userPicks.matchPicks || {};
  const actualMatches = actualResults.matchPicks || {};
  Object.keys(actualMatches).forEach((matchId) => {
    points += calculateMatchPoints(userMatches[matchId], actualMatches[matchId]);
  });

  // 2. Group Standing Points
  if (schedule && teams) {
    const userStandings = calculateStandings(userMatches, schedule, teams);
    const actualStandings = calculateStandings(actualMatches, schedule, teams);
    const gsPoints = calculateGroupStandingPoints(userStandings, actualStandings, schedule, actualResults);
    points += gsPoints.totalPoints;
  }

  // 3. Knockout Stage
  const userKO = userPicks.knockoutPicks || {};
  const actualKO = actualResults.knockoutPicks || {};
  const knockoutRounds = ['final', 'sf', 'qf', 'r16', 'r32'];
  const roundWeights = { r32: 10, r16: 20, qf: 30, sf: 45, final: 60 };
  const awardedTeams = new Set();

  knockoutRounds.forEach((round) => {
    (userKO[round] || []).forEach((teamId) => {
      if (!awardedTeams.has(teamId) && (actualKO[round] || []).includes(teamId)) {
        points += roundWeights[round];
        awardedTeams.add(teamId);
      }
    });
  });

  if (userKO.champion && actualKO.champion && userKO.champion === actualKO.champion) {
    points += 100;
  }

  return points;
}