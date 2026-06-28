import React, { useState, useMemo, useRef, useEffect } from 'react';
import { SingleEliminationBracket, Match, SVGViewer, createTheme } from '@g-loot/react-tournament-brackets';
import styled from 'styled-components';
import { mapKnockoutTeams, calculateStandings } from '../../utils/tournamentLogic';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

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

  @media (max-width: 768px) {
    gap: 2px;
    padding: 4px;
  }
`;

const Participant = styled.div`
  padding: 6px 10px;
  background-color: ${props => props.$isWinner ? '#f59e0b' : '#27272a'};
  color: ${props => props.$isWinner ? '#fafafa' : '#a1a1aa'};
  border-radius: 4px;
  font-size: 11px;
  font-weight: ${props => props.$isWinner ? '600' : '400'};
  cursor: ${props => props.$isClickable ? 'pointer' : 'default'};
  border: 2px solid ${props => props.$isWinner ? '#d97706' : '#3f3f46'};
  transition: all 0.2s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  position: relative;

  @media (max-width: 768px) {
    padding: 4px 6px;
    font-size: 9px;
    border-width: 1px;
  }

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

export default function KnockoutBracket({ knockoutPicks, setKnockoutPicks, teams, onConfirm, schedule, matchPicks, actualResults, isAdmin, knockoutTeams }) {
  const [showConfirmButton, setShowConfirmButton] = useState(false);
  const [knockoutMatchScores, setKnockoutMatchScores] = useState({});
  const [adminKnockoutPicks, setAdminKnockoutPicks] = useState({
    r32: [], r16: [], qf: [], sf: [], final: [], champion: ''
  });
  
  // Mobile detection for zoom
  const [isMobile, setIsMobile] = useState(false);
  
  // Drag-to-scroll state
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [scrollPos, setScrollPos] = useState({ x: 0, y: 0 });
  const scrollContainerRef = useRef(null);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Load knockout match scores and picks from Firestore
  useEffect(() => {
    const loadKnockoutData = async () => {
      try {
        const docRef = doc(db, 'actualResults', 'matchResults');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Filter only knockout match scores (k1, k2, etc.)
          const knockoutScores = {};
          if (data.matchPicks) {
            Object.keys(data.matchPicks).forEach(key => {
              if (key.startsWith('k')) {
                knockoutScores[key] = data.matchPicks[key];
              }
            });
          }
          setKnockoutMatchScores(knockoutScores);
          // Load admin knockout picks separately from user predictions
          if (data.knockoutPicks) {
            setAdminKnockoutPicks(data.knockoutPicks);
          }
        }
      } catch (error) {
        console.error("Error loading knockout data:", error);
      }
    };
    
    loadKnockoutData();
  }, []);

  // Transform data to match the library's expected format
  const bracketData = useMemo(() => {
  const matches = [];
  
  // Keep these semantic keys so the library knows how to draw the bracket
  const rounds = [
    { key: 'r32', name: 'of 32', matches: 16, startK: 1 },
    { key: 'r16', name: 'of 16', matches: 8, startK: 17 },
    { key: 'qf', name: 'Quarter-Finals', matches: 4, startK: 25 },
    { key: 'sf', name: 'Semi-Finals', matches: 2, startK: 29 },
    { key: 'final', name: 'Final', matches: 1, startK: 31 },
  ];

  rounds.forEach((round, roundIndex) => {
    const nextRound = rounds[roundIndex + 1];

    for (let i = 0; i < round.matches; i++) {
      // This calculates the exact 'k' ID from your database
      const kIndex = round.startK + i;
      const matchKey = `k${kIndex}`; 
      
      const matchData = knockoutTeams?.[matchKey];

      const team1Id = matchData?.homeTeam || 'TBD';
      const team2Id = matchData?.awayTeam || 'TBD';

      matches.push({
        // Use the 'k' key as the ID so your logic maps perfectly to Firestore
        id: matchKey, 
        // Calculate the next K-index for the connector
        nextMatchId: nextRound ? `k${nextRound.startK + Math.floor(i / 2)}` : null,
        tournamentRoundText: round.name,
        roundNumber: roundIndex + 1,
        participants: [
          {
            id: team1Id,
            resultText: teams[team1Id] ? `${teams[team1Id].flag} ${teams[team1Id].name}` : team1Id,
            status: team1Id !== 'TBD' ? 'PLAYED' : 'NOT_PLAYED'
          },
          {
            id: team2Id,
            resultText: teams[team2Id] ? `${teams[team2Id].flag} ${teams[team2Id].name}` : team2Id,
            status: team2Id !== 'TBD' ? 'PLAYED' : 'NOT_PLAYED'
          }
        ]
      });
    }
  });

  return { matches };
}, [knockoutTeams, teams]);// Only re-run if these change


  // Drag-to-scroll handlers
  const handleMouseDown = (e) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (scrollContainerRef.current) {
        setScrollPos({ 
          x: scrollContainerRef.current.scrollLeft, 
          y: scrollContainerRef.current.scrollTop 
        });
      }
      e.preventDefault();
    } else if (e.button === 1) { // Middle mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX, y: e.clientY });
      if (scrollContainerRef.current) {
        setScrollPos({ 
          x: scrollContainerRef.current.scrollLeft, 
          y: scrollContainerRef.current.scrollTop 
        });
      }
      e.preventDefault();
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging && scrollContainerRef.current) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      scrollContainerRef.current.scrollLeft = scrollPos.x - dx;
      scrollContainerRef.current.scrollTop = scrollPos.y - dy;
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  // Touch handlers for mobile
  const handleTouchStart = (e) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      if (scrollContainerRef.current) {
        setScrollPos({ 
          x: scrollContainerRef.current.scrollLeft, 
          y: scrollContainerRef.current.scrollTop 
        });
      }
    }
  };

  const handleTouchMove = (e) => {
    if (isDragging && e.touches.length === 1 && scrollContainerRef.current) {
      const dx = e.touches[0].clientX - dragStart.x;
      const dy = e.touches[0].clientY - dragStart.y;
      scrollContainerRef.current.scrollLeft = scrollPos.x - dx;
      scrollContainerRef.current.scrollTop = scrollPos.y - dy;
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };


  const handleMatchClick = (matchId, participantId) => {
    // This function is called when a team is clicked
    // Extract round key and match index from matchId
    const [roundKey, matchIndexStr] = matchId.split('-');
    const matchIndex = parseInt(matchIndexStr);

    // Find which participant was clicked (team1 or team2)
    const participantIndex = participantId.includes('team1') ? 0 : participantId.includes('team2') ? 1 : -1;
    const actualTeamIndex = matchIndex * 2 + participantIndex;

    if (participantIndex === -1) return;

    // Use adminKnockoutPicks when in admin mode
    const currentPicks = (isAdmin && adminMode) ? adminKnockoutPicks : knockoutPicks;
    const setPicks = (isAdmin && adminMode) ? setAdminKnockoutPicks : setKnockoutPicks;

    const teamId = currentPicks[roundKey]?.[actualTeamIndex];
    if (!teamId) return;

    // Define the rounds and where they start in your Firestore 'k' sequence
  const rounds = [
    { key: 'r32', name: 'Round of 32', matches: 16, startK: 1 },
    { key: 'r16', name: 'Round of 16', matches: 8, startK: 17 },
    { key: 'qf', name: 'Quarter-Finals', matches: 4, startK: 25 },
    { key: 'sf', name: 'Semi-Finals', matches: 2, startK: 29 },
    { key: 'final', name: 'Final', matches: 1, startK: 31 },
  ];

    const roundIndex = rounds.findIndex(r => r.key === roundKey);
    const nextRound = rounds[roundIndex + 1];

    // If no next round (final match), update champion
    if (!nextRound) {
      setPicks(prev => ({
        ...prev,
        champion: teamId
      }));
      setShowConfirmButton(true);
      return;
    }

    const nextMatchIndex = Math.floor(matchIndex / 2);
    const nextTeamIndex = nextMatchIndex * 2; // Winner goes to first position of next match

    setPicks(prev => {
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
    // Use knockout match scores from admin panel
    const matchScores = knockoutMatchScores[match.id] || { homeScore: null, awayScore: null };
    
    // Determine winner based on scores
    const homeScore = matchScores.homeScore !== null && matchScores.homeScore !== '' ? parseInt(matchScores.homeScore) : null;
    const awayScore = matchScores.awayScore !== null && matchScores.awayScore !== '' ? parseInt(matchScores.awayScore) : null;
    const topTeamWins = homeScore > awayScore;
    const bottomTeamWins = awayScore > homeScore;

    return (
      <MatchWrapper>
        <Participant
          onClick={(e) => {
            e.stopPropagation();
            if (topTeam.status === 'PLAYED') {
              onPartyClick(match, topTeam.id);
            }
          }}
          $isWinner={topTeamWins}
          $isClickable={topTeam.status === 'PLAYED'}
          $isEmpty={topTeam.status === 'NOT_PLAYED'}
        >
          <div className="flex items-center justify-between w-full">
            <span className="flex-1">{topTeam.resultText}</span>
            <span className="w-6 h-5 text-center text-zinc-500 text-xs font-bold ml-2">{matchScores.homeScore !== null && matchScores.homeScore !== '' ? matchScores.homeScore : '-'}</span>
          </div>
        </Participant>
        <Participant
          onClick={(e) => {
            e.stopPropagation();
            if (bottomTeam.status === 'PLAYED') {
              onPartyClick(match, bottomTeam.id);
            }
          }}
          $isWinner={bottomTeamWins}
          $isClickable={bottomTeam.status === 'PLAYED'}
          $isEmpty={bottomTeam.status === 'NOT_PLAYED'}
        >
          <div className="flex items-center justify-between w-full">
            <span className="flex-1">{bottomTeam.resultText}</span>
            <span className="w-6 h-5 text-center text-zinc-500 text-xs font-bold ml-2">{matchScores.awayScore !== null && matchScores.awayScore !== '' ? matchScores.awayScore : '-'}</span>
          </div>
        </Participant>
      </MatchWrapper>
    );
  };

  return (
    <div className="w-full border border-zinc-800 rounded-xl p-4 bg-zinc-950/50">
      {/* Admin mode toggle */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <h3 className="text-sm font-semibold text-amber-400">
          Bracket Controls
        </h3>
      </div>

      <div 
        ref={scrollContainerRef}
        className="overflow-auto cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ height: '70vh', touchAction: 'none', userSelect: 'none' }}
      >
        <div 
          style={{
            transformOrigin: 'top left',
            overflow: 'visible', 
            display: 'inline-block',
            transition: isDragging ? 'none' : 'transform 0.3s ease-out',
            pointerEvents: 'none'
          }}
        >
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
            disableAutoScroll: true,
            scrollOnScroll: false,
          }}
          svgWrapper={({ children, ...props }) => (
            <SVGViewer
              background={DarkTheme.svgBackground}
              SVGBackground={DarkTheme.svgBackground}
              width={isMobile ? 2500 : 2500} 
              height={isMobile ? 4000 : 4000} // 4000 * 0.6 = 2400
              viewBox={`0 0 ${isMobile ? 1500 : 2500} ${isMobile ? 2400 : 4000}`}
              {...props}
            >
              {children}
            </SVGViewer>
          )}
          onPartyClick={(match, participantId) => handleMatchClick(match.id, participantId)}
        />
        </div>
      </div>

      {/* Champion display */}
      <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
        <div className="inline-block">
          <p className="text-amber-400 text-xs font-bold tracking-widest uppercase mb-3">
            🏆 Predicted Champion
          </p>
          <div className="px-8 py-5 bg-gradient-to-b from-amber-500/15 to-amber-600/25 border-2 border-amber-500/50 rounded-2xl shadow-xl">
            <span className="text-xl font-black tracking-wide text-amber-300">
              {teams[actualResults?.knockoutResults?.champion]?.flag} 
              {teams[actualResults?.knockoutResults?.champion]?.name || "UNDECIDED"}
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
