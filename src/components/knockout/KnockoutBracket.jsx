import React, { useState, useMemo } from 'react';
import { SingleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import styled from 'styled-components';
import { mapKnockoutTeams, calculateStandings } from '../../utils/tournamentLogic';

const DarkTheme = createTheme({
  textColor: { main: '#fafafa', highlighted: '#f59e0b', dark: '#a1a1aa' },
  matchBackground: { wonColor: '#f59e0b', lostColor: '#27272a' },
  score: {
    background: { wonColor: '#d97706', lostColor: '#3f3f46' },
    text: { highlightedWonColor: '#fbbf24', highlightedLostColor: '#a1a1aa' },
  },
  border: {
    color: '#3f3f46',
    highlightedColor: '#f59e0b',
  },
  roundHeader: { backgroundColor: '#18181b', fontColor: '#f59e0b' },
  connectorColor: '#3f3f46',
  connectorColorHighlight: '#f59e0b',
  svgBackground: '#09090b',
});

// Styled components defined outside render method
const MatchWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-radius: 6px;
  transition: background-color 0.2s;
  background-color: #18181b;
  border: 1px solid #3f3f46;
`;

const Participant = styled.div`
  padding: 6px 10px;
  background-color: ${props => props.$isWinner ? '#f59e0b' : props.$isEmpty ? '#18181b' : '#27272a'};
  color: ${props => props.$isWinner ? '#fafafa' : props.$isEmpty ? '#52525b' : '#a1a1aa'};
  border-radius: 4px;
  font-size: 11px;
  font-weight: ${props => props.$isWinner ? '600' : '400'};
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  border: 2px solid ${props => props.$isWinner ? '#d97706' : props.$isEmpty ? '#27272a' : '#3f3f46'};
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;

  ${props => props.$isClickable && !props.$isEmpty && `
    &:hover {
      background-color: #3f3f46;
      border-color: #f59e0b;
      transform: scale(1.02);
    }
  `}

  ${props => props.$isClickable && props.$isEmpty && `
    &:hover {
      background-color: #27272a;
      border-color: #ef4444;
    }
  `}

  ${props => props.$isWinner && `
    box-shadow: 0 0 8px rgba(245, 158, 11, 0.3);
  `}
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: #18181b;
  border: 2px solid #3f3f46;
  border-radius: 12px;
  padding: 24px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  width: 90%;
`;

const TeamOption = styled.button`
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background-color: #27272a;
  border: 2px solid #3f3f46;
  border-radius: 8px;
  color: #fafafa;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  gap: 12px;

  &:hover {
    background-color: #3f3f46;
    border-color: #ef4444;
  }
`;

export default function KnockoutBracket({ knockoutPicks, setKnockoutPicks, teams, onConfirm, schedule, matchPicks, actualResults, isAdmin }) {
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [showTeamSelector, setShowTeamSelector] = useState(false);
  const [adminMode, setAdminMode] = useState(false);

  // Calculate knockout teams based on group standings
  const knockoutTeams = useMemo(() => {
    if (!schedule || !matchPicks) return {};

    // Calculate standings from match picks or actual results
    const standings = calculateStandings(actualResults || matchPicks, schedule, teams);

    // Map advancing teams to knockout matches
    const updatedSchedule = mapKnockoutTeams(standings, schedule);

    // Extract knockout match team assignments
    const knockoutSchedule = updatedSchedule.filter(match => match.group && !match.group.match(/^[A-L]$/));
    const teamAssignments = {};

    knockoutSchedule.forEach(match => {
      teamAssignments[match.id] = {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam
      };
    });

    return teamAssignments;
  }, [schedule, matchPicks, actualResults, teams]);

  // Transform data to match the library's expected format
  const bracketData = useMemo(() => {
    // Each round has half as many matches as teams
    const rounds = [
      { key: 'r32', name: 'Round of 32', matches: 16, roundNumber: 1 },
      { key: 'r16', name: 'Round of 16', matches: 8, roundNumber: 2 },
      { key: 'qf', name: 'Quarter-Finals', matches: 4, roundNumber: 3 },
      { key: 'sf', name: 'Semi-Finals', matches: 2, roundNumber: 4 },
      { key: 'final', name: 'Finals', matches: 1, roundNumber: 5 },
    ];

    const matches = [];

    // Build matches for each round with proper linking for tournament structure
    rounds.forEach((round, roundIndex) => {
      const nextRound = rounds[roundIndex + 1];
      const nextRoundKey = nextRound?.key;

      // Create matches in order (this determines left/right positioning)
      for (let i = 0; i < round.matches; i++) {
        // Each match has 2 teams, so team indices are i*2 and i*2+1
        let team1Id = knockoutPicks[round.key]?.[i * 2];
        let team2Id = knockoutPicks[round.key]?.[i * 2 + 1];

        // If no user prediction, use knockout teams from group standings for R32
        if (round.key === 'r32' && (!team1Id || !team2Id) && knockoutTeams[i]) {
          if (!team1Id) team1Id = knockoutTeams[i].homeTeam;
          if (!team2Id) team2Id = knockoutTeams[i].awayTeam;
        }

        const team1 = teams[team1Id];
        const team2 = teams[team2Id];

        const matchId = `${round.key}-${i}`;

        // Calculate next match ID for proper tournament progression
        let nextMatchId = null;
        if (nextRoundKey) {
          // In a tournament bracket, matches 0-7 feed into 0-3, then 0-3 feed into 0-1, etc.
          const nextMatchIndex = Math.floor(i / 2);
          nextMatchId = `${nextRoundKey}-${nextMatchIndex}`;
        }

        // Determine winner for this match
        let winnerId = null;
        if (nextRoundKey) {
          const nextMatchIndex = Math.floor(i / 2);
          winnerId = knockoutPicks[nextRoundKey]?.[nextMatchIndex * 2] || knockoutPicks[nextRoundKey]?.[nextMatchIndex * 2 + 1];
        } else if (round.key === 'final') {
          winnerId = knockoutPicks.champion;
        }

        matches.push({
          id: matchId,
          nextMatchId: nextMatchId,
          tournamentRoundText: round.name,
          roundNumber: round.roundNumber,
          participants: [
            {
              id: team1Id || `${matchId}-team1`,
              resultText: team1 ? `${team1.flag} ${team1.name}` : 'TBD',
              isWinner: team1Id === winnerId,
              status: team1Id ? 'PLAYED' : 'NOT_PLAYED'
            },
            {
              id: team2Id || `${matchId}-team2`,
              resultText: team2 ? `${team2.flag} ${team2.name}` : 'TBD',
              isWinner: team2Id === winnerId,
              status: team2Id ? 'PLAYED' : 'NOT_PLAYED'
            }
          ]
        });
      }
    });

    return {
      matches: matches,
      currentRound: 'Round of 32'
    };
  }, [knockoutPicks, teams, knockoutTeams]);

  const handleMatchClick = (matchId, participantId) => {
    // This function is called when a team is clicked
    // Extract round key and match index from matchId
    const [roundKey, matchIndexStr] = matchId.split('-');
    const matchIndex = parseInt(matchIndexStr);

    // Find which participant was clicked (team1 or team2)
    const participantIndex = participantId.includes('team1') ? 0 : participantId.includes('team2') ? 1 : -1;
    const actualTeamIndex = matchIndex * 2 + participantIndex;

    if (participantIndex === -1) return;

    const teamId = knockoutPicks[roundKey]?.[actualTeamIndex];
    if (!teamId) return;

    // Find next round
    const rounds = [
      { key: 'r32', name: 'Round of 32', matches: 16 },
      { key: 'r16', name: 'Round of 16', matches: 8 },
      { key: 'qf', name: 'Quarter-Finals', matches: 4 },
      { key: 'sf', name: 'Semi-Finals', matches: 2 },
      { key: 'final', name: 'Finals', matches: 1 },
    ];

    const roundIndex = rounds.findIndex(r => r.key === roundKey);
    const nextRound = rounds[roundIndex + 1];

    // If no next round (final match), update champion
    if (!nextRound) {
      setKnockoutPicks(prev => ({
        ...prev,
        champion: teamId
      }));
      setShowConfirmButton(true);
      return;
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextTeamIndex = nextMatchIndex * 2; // Winner goes to first position of next match

    setKnockoutPicks(prev => {
      const updatedNextRound = [...(prev[nextRound.key] || [])];
      updatedNextRound[nextTeamIndex] = teamId;

      return {
        ...prev,
        [nextRound.key]: updatedNextRound
      };
    });

    setShowConfirmButton(true);
  };

  // Custom match component with direct prediction functionality
  const CustomMatch = ({ match, onMatchClick, onPartyClick }) => {
    const topTeam = match.participants[0];
    const bottomTeam = match.participants[1];

    return (
      <MatchWrapper>
        <Participant
          onClick={(e) => {
            e.stopPropagation();
            if (topTeam.status === 'PLAYED') {
              onPartyClick(match, topTeam.id);
            } else if (isAdmin && adminMode) {
              setSelectedMatch({ match, participantId: topTeam.id, participantIndex: 0, roundKey: match.id.split('-')[0], matchIndex: parseInt(match.id.split('-')[1]) });
              setShowTeamSelector(true);
            }
          }}
          $isWinner={topTeam.isWinner}
          $isClickable={topTeam.status === 'PLAYED' || (isAdmin && adminMode)}
          $isEmpty={topTeam.status === 'NOT_PLAYED'}
        >
          <div className="flex items-center justify-between w-full">
            <span>{topTeam.resultText}</span>
            {topTeam.isWinner && <span>✓</span>}
            {(isAdmin && adminMode && topTeam.status === 'NOT_PLAYED') && <span className="text-amber-400">+</span>}
          </div>
        </Participant>
        <Participant
          onClick={(e) => {
            e.stopPropagation();
            if (bottomTeam.status === 'PLAYED') {
              onPartyClick(match, bottomTeam.id);
            } else if (isAdmin && adminMode) {
              setSelectedMatch({ match, participantId: bottomTeam.id, participantIndex: 1, roundKey: match.id.split('-')[0], matchIndex: parseInt(match.id.split('-')[1]) });
              setShowTeamSelector(true);
            }
          }}
          $isWinner={bottomTeam.isWinner}
          $isClickable={bottomTeam.status === 'PLAYED' || (isAdmin && adminMode)}
          $isEmpty={bottomTeam.status === 'NOT_PLAYED'}
        >
          <div className="flex items-center justify-between w-full">
            <span>{bottomTeam.resultText}</span>
            {bottomTeam.isWinner && <span>✓</span>}
            {(isAdmin && adminMode && bottomTeam.status === 'NOT_PLAYED') && <span className="text-amber-400">+</span>}
          </div>
        </Participant>
      </MatchWrapper>
    );
  };

  // Handle admin team selection
  const handleAdminTeamSelection = (teamId) => {
    if (!selectedMatch) return;

    const { roundKey, matchIndex, participantIndex } = selectedMatch;
    const actualTeamIndex = matchIndex * 2 + participantIndex;

    setKnockoutPicks(prev => {
      const updatedRound = [...(prev[roundKey] || [])];
      // Ensure array is large enough
      while (updatedRound.length <= actualTeamIndex) {
        updatedRound.push(null);
      }
      updatedRound[actualTeamIndex] = teamId;

      return {
        ...prev,
        [roundKey]: updatedRound
      };
    });

    setShowTeamSelector(false);
    setSelectedMatch(null);
    setShowConfirmButton(true);
  };

  return (
    <div className="w-full border border-zinc-800 rounded-xl p-4 bg-zinc-950/50">
      {/* Admin mode toggle */}
      {isAdmin && (
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-amber-400">Admin Controls</h3>
          <button
            onClick={() => setAdminMode(!adminMode)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              adminMode
                ? 'bg-red-600 text-white'
                : 'bg-amber-600 text-white'
            }`}
          >
            {adminMode ? 'Exit Admin Mode' : 'Enter Admin Mode'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto">
        <SingleEliminationBracket
          matches={bracketData.matches}
          matchComponent={CustomMatch}
          theme={DarkTheme}
          options={{
            style: {
              roundHeader: {
                backgroundColor: DarkTheme.roundHeader.backgroundColor,
                fontColor: DarkTheme.roundHeader.fontColor,
              },
              connectorColor: DarkTheme.connectorColor,
              connectorColorHighlight: DarkTheme.connectorColorHighlight,
            },
          }}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              background={DarkTheme.svgBackground}
              SVGBackground={DarkTheme.svgBackground}
              width={2000}
              height={1000}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
          onPartyClick={(match, participantId) => handleMatchClick(match.id, participantId)}
        />

        {/* Admin Team Selector Modal */}
        {showTeamSelector && selectedMatch && (
          <Modal onClick={() => setShowTeamSelector(false)}>
            <ModalContent onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-bold text-red-400 mb-4">Admin: Select Team for Slot</h3>
              <p className="text-xs text-zinc-400 mb-4">
                {selectedMatch.roundKey.toUpperCase()} - Match {selectedMatch.matchIndex + 1}
              </p>
              <div className="space-y-2">
                {Object.entries(teams).map(([teamId, team]) => (
                  <TeamOption
                    key={teamId}
                    onClick={() => handleAdminTeamSelection(teamId)}
                  >
                    <span className="text-xl">{team.flag}</span>
                    <span className="font-semibold">{team.name}</span>
                  </TeamOption>
                ))}
              </div>
              <button
                onClick={() => setShowTeamSelector(false)}
                className="mt-4 w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
            </ModalContent>
          </Modal>
        )}
      </div>

      {/* Champion display */}
      <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
        <div className="inline-block">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">🏆 Predicted Champion</p>
          <div className="px-8 py-5 bg-gradient-to-b from-amber-500/15 to-amber-600/25 border-2 border-amber-500/50 rounded-2xl shadow-xl">
            <span className="text-xl font-black tracking-wide text-amber-300">
              {teams[knockoutPicks.champion]?.flag} {teams[knockoutPicks.champion]?.name || "UNDECIDED"}
            </span>
          </div>
        </div>
      </div>

      {showConfirmButton && (
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => {
              onConfirm();
              setShowConfirmButton(false);
            }}
            className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg"
          >
            Confirm Bracket Predictions
          </button>
        </div>
      )}
    </div>
  );
}
