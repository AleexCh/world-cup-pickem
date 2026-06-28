/**
 * Computes group tables (points, goal differential, goals scored) from user predictions.
 * @param {Object} matchPicks - User's match predictions { matchId: { homeScore, awayScore, homePenaltyScore, awayPenaltyScore } }
 * @param {Array} schedule - Static match schedule list
 * @param {Object} teams - Static teams mapping
 * @returns {Object} Group standings dictionary organized by group letter
 */
export function calculateStandings(matchPicks, schedule, teams) {
  const standings = {};

  // Initialize standings for all teams
  Object.values(teams).forEach((team) => {
    if (!standings[team.group]) standings[team.group] = {};
    standings[team.group][team.id] = {
      teamId: team.id,
      name: team.name,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      points: 0,
    };
  });

  // Process completed pick matches (only group stage matches)
  schedule.forEach((match) => {
    // Skip knockout matches - only process group stage (A-L)
    if (!match.group || !match.group.match(/^[A-L]$/)) return;

    const pick = matchPicks[match.id];
    if (!pick || pick.homeScore === null || pick.awayScore === null || pick.homeScore === undefined || pick.awayScore === undefined) return;

    const hScore = parseInt(pick.homeScore, 10);
    const aScore = parseInt(pick.awayScore, 10);
    const home = standings[match.group][match.homeTeam];
    const away = standings[match.group][match.awayTeam];

    if (!home || !away) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += hScore;
    home.goalsAgainst += aScore;
    away.goalsFor += aScore;
    away.goalsAgainst += hScore;

    if (hScore > aScore) {
      home.won += 1;
      home.points += 3;
      away.lost += 1;
    } else if (hScore < aScore) {
      away.won += 1;
      away.points += 3;
      home.lost += 1;
    } else {
      home.drawn += 1;
      away.drawn += 1;
      home.points += 1;
      away.points += 1;
    }

    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;
  });

  // Sort each group table dynamically based on FIFA rules
  Object.keys(standings).forEach((group) => {
    standings[group] = Object.values(standings[group]).sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      return b.goalsFor - a.goalsFor; // Tiebreaker: Goals Scored
    });
  });

  return standings;
}

/**
 * Calculates top 2 teams from each of the 12 groups, plus the 8 best 3rd-place teams.
 * @param {Object} standings - Output from calculateStandings
 * @returns {Array<string>} List of 32 advancing team IDs
 */
export function determineAdvancingTeams(standings) {
  const advancing = [];
  const thirdPlaceTeams = [];

  Object.keys(standings).forEach((group) => {
    const groupTeams = standings[group];

    // Top 2 automatically advance
    if (groupTeams[0] && groupTeams[0].played > 0) advancing.push(groupTeams[0].teamId);
    if (groupTeams[1] && groupTeams[1].played > 0) advancing.push(groupTeams[1].teamId);

    // Collect 3rd place teams for separate evaluation
    if (groupTeams[2]) {
      thirdPlaceTeams.push(groupTeams[2]);
    }
  });

  // Sort 3rd place overall record
  thirdPlaceTeams.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });

  // Take the 8 best 3rd-place finishers
  for (let i = 0; i < Math.min(8, thirdPlaceTeams.length); i++) {
    if (thirdPlaceTeams[i].played > 0) {
      advancing.push(thirdPlaceTeams[i].teamId);
    }
  }

  return advancing;
}

/**
 * Checks if all group stage matches have been scored.
 * @param {Object} actualResults - Actual match results from admin
 * @param {Array} schedule - Match schedule
 * @returns {boolean} True if all group stage matches are scored
 */
export function allGroupMatchesScored(actualResults, schedule) {
  const groupSchedule = schedule.filter(match => match.group && match.group.match(/^[A-L]$/));
  
  for (const match of groupSchedule) {
    const result = actualResults[match.id];
    if (!result || result.homeScore === null || result.awayScore === null || 
        result.homeScore === undefined || result.awayScore === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Checks if a specific group has completed all its matches.
 * @param {string} groupLetter - Group letter (A-L)
 * @param {Object} actualResults - Actual match results from admin
 * @param {Array} schedule - Match schedule
 * @returns {boolean} True if all matches in the group are scored
 */
export function isGroupComplete(groupLetter, actualResults, schedule) {
  const groupSchedule = schedule.filter(match => match.group === groupLetter);
  
  for (const match of groupSchedule) {
    const result = actualResults[match.id];
    if (!result || result.homeScore === null || result.awayScore === null || 
        result.homeScore === undefined || result.awayScore === undefined) {
      return false;
    }
  }
  return true;
}

/**
 * Calculates group standings from actual results (not user predictions).
 * @param {Object} actualResults - Actual match results from admin
 * @param {Array} schedule - Match schedule
 * @param {Object} teams - Teams mapping
 * @returns {Object} Group standings dictionary
 */
export function calculateActualStandings(actualResults, schedule, teams) {
  return calculateStandings(actualResults, schedule, teams);
}

/**
 * Maps advancing teams to knockout stage matches.
 * @param {Object} standings - Group standings
 * @param {Array} schedule - Full schedule including knockout
 * @param {Object} actualResults - Actual match results from admin
 * @returns {Object} Updated knockout schedule with team IDs
 */
export function mapKnockoutTeams(standings, schedule, actualResults) {
  const assignedTeams = new Set();
  const knockoutSchedule = schedule.filter(match => match.group && !match.group.match(/^[A-L]$/));
  const advancing = determineAdvancingTeams(standings);
  
  // Map advancing teams to knockout matches based on bracket structure
  // Round of 32: 1A vs 2B, 1C vs 2D, 1E vs 2F, 1G vs 2H, 1B vs 2A, 1D vs 2C, 1F vs 2E, 1H vs 2G
  // 1I vs 2J, 1K vs 2L, 1J vs 2I, 1L vs 2K, 3A vs 3B, 3C vs 3D, 3E vs 3F, 3G vs 3H
  
  const groupStandings = {};
  Object.keys(standings).forEach(group => {
    groupStandings[group] = standings[group];
  });
  
  const teamMap = {};
  
  // Helper to get team by position in group, only if group is complete
  const getTeam = (group, position) => {
    if (!isGroupComplete(group, actualResults, schedule)) {
      return 'TBD';
    }
    const groupTeams = groupStandings[group];
    return groupTeams && groupTeams[position - 1] ? groupTeams[position - 1].teamId : 'TBD';
  };
  
  // Helper to get best 3rd place team from specific group combinations
  const getBest3rdPlace = (groups) => {
    const candidates = groups
      .map(g => standings[g]?.[2])
      .filter(t => t && !assignedTeams.has(t.teamId) && isGroupComplete(t.group, actualResults, schedule));
    
    candidates.sort((a, b) => (b.points - a.points) || (b.goalDifference - a.goalDifference) || (b.goalsFor - a.goalsFor));
    
    if (candidates.length > 0) {
      assignedTeams.add(candidates[0].teamId);
      return candidates[0].teamId;
    }
    return 'TBD';
  };
  
  // Map Round of 32 matches (FIFA WC 2026 official rules)
  // const r32Mapping = {
  //   'k1': { home: () => getTeam('A', 2), away: () => getTeam('B', 2) },
  //   'k2': { home: () => getTeam('E', 1), away: () => getBest3rdPlace(['A', 'B', 'C', 'D', 'F']) },
  //   'k3': { home: () => getTeam('F', 1), away: () => getTeam('C', 2) },
  //   'k4': { home: () => getTeam('C', 1), away: () => getTeam('F', 2) },
  //   'k5': { home: () => getTeam('I', 1), away: () => getBest3rdPlace(['C', 'D', 'F', 'G', 'H']) },
  //   'k6': { home: () => getTeam('E', 2), away: () => getTeam('I', 2) },
  //   'k7': { home: () => getTeam('A', 1), away: () => getBest3rdPlace(['C', 'E', 'F', 'H', 'I']) },
  //   'k8': { home: () => getTeam('L', 1), away: () => getBest3rdPlace(['E', 'H', 'I', 'J', 'K']) },
  //   'k9': { home: () => getTeam('D', 1), away: () => getBest3rdPlace(['B', 'E', 'F', 'I', 'J']) },
  //   'k10': { home: () => getTeam('G', 1), away: () => getBest3rdPlace(['A', 'E', 'H', 'I', 'J']) },
  //   'k11': { home: () => getTeam('K', 2), away: () => getTeam('L', 2) },
  //   'k12': { home: () => getTeam('H', 1), away: () => getTeam('J', 2) },
  //   'k13': { home: () => getTeam('B', 1), away: () => getBest3rdPlace(['E', 'F', 'G', 'I', 'J']) },
  //   'k14': { home: () => getTeam('J', 1), away: () => getTeam('H', 2) },
  //   'k15': { home: () => getTeam('K', 1), away: () => getBest3rdPlace(['D', 'E', 'I', 'J', 'L']) },
  //   'k16': { home: () => getTeam('D', 2), away: () => getTeam('G', 2) },
  // };

  // Hard coding the mapping because we need it so that the bracket SingleEliminationBracket log matches. The mapping now shuffles FIFA requirements into the UI's connected slots
  const r32Mapping = {
  // "official k2 vs k5"
  'k1': { home: () => getTeam('E', 1), away: () => getBest3rdPlace(['A', 'B', 'C', 'D', 'F']) },
  'k2': { home: () => getTeam('I', 1), away: () => getBest3rdPlace(['C', 'D', 'F', 'G', 'H']) },

  // official k1 vs k3
  'k3': { home: () => getTeam('A', 2), away: () => getTeam('B', 2) },
  'k4': { home: () => getTeam('F', 1), away: () => getTeam('C', 2) },
  
  // official k11 vs k12
  'k5': { home: () => getTeam('K', 2), away: () => getTeam('L', 2) },
  'k6': { home: () => getTeam('H', 1), away: () => getTeam('J', 2) },

  // official k9 vs k10
  'k7':  { home: () => getTeam('D', 1), away: () => getBest3rdPlace(['B', 'E', 'F', 'I', 'J']) },
  'k8': { home: () => getTeam('G', 1), away: () => getBest3rdPlace(['A', 'E', 'H', 'I']) },//somehow it should be choosing  Senegal (best 3rd JI but it was getting Algeria (group J), removing group J untill I finx fix

  // official k 4 vs k6
  'k9': { home: () => getTeam('C', 1), away: () => getTeam('F', 2) },
  'k10': { home: () => getTeam('E', 2), away: () => getTeam('I', 2) },

  // official k7 and k8
  'k11': { home: () => getTeam('A', 1), away: () => getBest3rdPlace(['C', 'E', 'F', 'H', 'I']) },
  'k12': { home: () => getTeam('L', 1), away: () => getBest3rdPlace(['E', 'H', 'I', 'J', 'K']) },

  // official k14 and k16
  'k13': { home: () => getTeam('J', 1), away: () => getTeam('H', 2) },
  'k14': { home: () => getTeam('D', 2), away: () => getTeam('G', 2) },

  // official k13 vs k15
  'k15': { home: () => getTeam('B', 1), away: () => getBest3rdPlace(['E', 'F', 'G', 'I', 'J']) },
  'k16': { home: () => getTeam('K', 1), away: () => getBest3rdPlace(['D', 'E', 'J', 'L']) },  //somehow it should be choosing  Algeria (best 3rd J) but it was getting Senegal (group I), removing group I untill I finx fix
};
  
  // Update knockout schedule with actual teams
  const updatedSchedule = schedule.map(match => {
    if (match.group && !match.group.match(/^[A-L]$/) && r32Mapping[match.id]) {
      return {
        ...match,
        homeTeam: r32Mapping[match.id].home(),
        awayTeam: r32Mapping[match.id].away()
      };
    }
    return match;
  });
  
  return updatedSchedule;
}

/**
 * Advances winners through knockout stages based on completed matches.
 * @param {Object} knockoutTeams - Current knockout team assignments { matchId: { homeTeam, awayTeam } }
 * @param {Object} actualResults - Actual match results from admin
 * @returns {Object} Updated knockout teams with winners advanced
 */
export function advanceKnockoutWinners(knockoutTeams, actualResults) {
  const updatedTeams = { ...knockoutTeams };

  // Define bracket structure: which matches feed into which next matches
  const bracketStructure = {
    // Round of 32 → Round of 16
    'k17': { from: ['k1', 'k2'] },
    'k18': { from: ['k3', 'k4'] },
    'k19': { from: ['k5', 'k6'] },
    'k20': { from: ['k7', 'k8'] },
    'k21': { from: ['k9', 'k10'] },
    'k22': { from: ['k11', 'k12'] },
    'k23': { from: ['k13', 'k14'] },
    'k24': { from: ['k15', 'k16'] },
    // Round of 16 → Quarter Finals
    'k25': { from: ['k17', 'k18'] },
    'k26': { from: ['k19', 'k20'] },
    'k27': { from: ['k21', 'k22'] },
    'k28': { from: ['k23', 'k24'] },
    // Quarter Finals → Semi Finals
    'k29': { from: ['k25', 'k26'] },
    'k30': { from: ['k27', 'k28'] },
    // Semi Finals → Final
    'k32': { from: ['k29', 'k30'] },
    // Semi Finals → 3rd Place Match (losers)
    'k31': { from: ['k29', 'k30'], losers: true },
  };

  // Helper to determine winner of a match
  const getMatchWinner = (matchId) => {
    const result = actualResults[matchId];
    if (!result || result.homeScore === null || result.awayScore === null) {
      return null;
    }

    const homeScore = parseInt(result.homeScore);
    const awayScore = parseInt(result.awayScore);

    // Check for penalty shootout
    if (homeScore === awayScore) {
      if (result.homePenaltyScore !== null && result.awayPenaltyScore !== null) {
        const homePen = parseInt(result.homePenaltyScore);
        const awayPen = parseInt(result.awayPenaltyScore);
        if (homePen > awayPen) {
          return updatedTeams[matchId]?.homeTeam;
        } else if (awayPen > homePen) {
          return updatedTeams[matchId]?.awayTeam;
        }
      }
      return null; // Draw without penalties - no winner yet
    }

    if (homeScore > awayScore) {
      return updatedTeams[matchId]?.homeTeam;
    } else {
      return updatedTeams[matchId]?.awayTeam;
    }
  };

  // Helper to determine loser of a match
  const getMatchLoser = (matchId) => {
    const result = actualResults[matchId];
    if (!result || result.homeScore === null || result.awayScore === null) {
      return null;
    }

    const homeScore = parseInt(result.homeScore);
    const awayScore = parseInt(result.awayScore);

    // Check for penalty shootout
    if (homeScore === awayScore) {
      if (result.homePenaltyScore !== null && result.awayPenaltyScore !== null) {
        const homePen = parseInt(result.homePenaltyScore);
        const awayPen = parseInt(result.awayPenaltyScore);
        if (homePen > awayPen) {
          return updatedTeams[matchId]?.awayTeam;
        } else if (awayPen > homePen) {
          return updatedTeams[matchId]?.homeTeam;
        }
      }
      return null; // Draw without penalties - no loser yet
    }

    if (homeScore > awayScore) {
      return updatedTeams[matchId]?.awayTeam;
    } else {
      return updatedTeams[matchId]?.homeTeam;
    }
  };

  // Process each next match in the bracket
  Object.keys(bracketStructure).forEach(nextMatchId => {
    const { from: sourceMatches, losers } = bracketStructure[nextMatchId];

    // Determine which position (home/away) each source match feeds into
    // Even index (0) → home, Odd index (1) → away
    const homeTeam = losers ? getMatchLoser(sourceMatches[0]) : getMatchWinner(sourceMatches[0]);
    const awayTeam = losers ? getMatchLoser(sourceMatches[1]) : getMatchWinner(sourceMatches[1]);

    // Only update if we have teams from both source matches
    // Or if one source match has a teamand the other is TBD
    if (homeTeam || awayTeam) {
      updatedTeams[nextMatchId] = {
        homeTeam: homeTeam || 'TBD',
        awayTeam: awayTeam || 'TBD'
      };
    }
  });

  return updatedTeams;
}
