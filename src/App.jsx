import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSyncPicks } from './hooks/useSyncPicks';
import AuthBanner from './components/auth/AuthBanner';
import Profile from './components/auth/Profile';
import MatchGrid from './components/tournament/MatchGrid';
import GroupTable from './components/tournament/GroupTable';
import KnockoutBracket from './components/knockout/KnockoutBracket';
import KnockoutMatches from './components/knockout/KnockoutMatches';
import Leaderboard from './components/dashboard/Leaderboard';
import PlayerScoreBadge from './components/dashboard/PlayerScoreBadge';
import ScrollToTop from './components/common/ScrollToTop';
import AdminPanel from './components/admin/AdminPanel';
import { calculateStandings, determineAdvancingTeams, allGroupMatchesScored } from './utils/tournamentLogic';
import { scoreUserPredictions, fetchActualResults, calculateGroupStandingPoints } from './utils/scoringEngine';
import { db } from './services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

// Page Components
function MatchesPage({ teams, schedule, standings, matchPicks, setMatchPicks, handleScoreChange, confirmPick }) {
  return (
    <>
      <MatchGrid
        teams={teams}
        schedule={schedule}
        standings={standings}
        matchPicks={matchPicks}
        setMatchPicks={setMatchPicks}
        onScoreChange={handleScoreChange}
        onConfirm={confirmPick}
      />
    </>
  );
}

function StandingsPage({ teams, schedule, standings, groupPoints }) {
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groupLetters.map(letter => (
          <GroupTable
            key={letter}
            groupLetter={letter}
            groupStandings={standings[letter] || []}
            groupPoints={groupPoints[letter] || null}
          />
        ))}
      </div>
    </>
  );
}

function KnockoutMatchesPage({ teams, schedule, matchPicks, setMatchPicks, handleScoreChange, confirmPick }) {
  return (
    <>
      <KnockoutMatches
        teams={teams}
        schedule={schedule}
        matchPicks={matchPicks}
        setMatchPicks={setMatchPicks}
        onScoreChange={handleScoreChange}
        onConfirm={confirmPick}
      />
    </>
  );
}

function KnockoutBracketPage({ knockoutPicks, setKnockoutPicks, teams, onConfirm, schedule, matchPicks, actualResults, isAdmin }) {
  return (
    <>
      <KnockoutBracket
        knockoutPicks={knockoutPicks}
        setKnockoutPicks={setKnockoutPicks}
        teams={teams}
        onConfirm={onConfirm}
        schedule={schedule}
        matchPicks={matchPicks}
        actualResults={actualResults}
        isAdmin={isAdmin}
      />
    </>
  );
}

function LeaderboardPage({ user }) {
  return (
    <>
      <Leaderboard />
    </>
  );
}

function ProfilePage({ knockoutPicks, setKnockoutPicks, teams, isFirebaseEnabled, user }) {
  return (
    <>
      <Profile />
    </>
  );
}

function AdminPage({ schedule, teams, standings }) {
  return (
    <>
      <AdminPanel schedule={schedule} teams={teams} standings={standings} />
    </>
  );
}

function AppContent() {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const { matchPicks, setMatchPicks, knockoutPicks, setKnockoutPicks, loading, confirmPick, confirmKnockoutPicks } = useSyncPicks(userId);
  const location = useLocation();
  const navigate = useNavigate();
  
  const [teams, setTeams] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [knockoutTeams, setKnockoutTeams] = useState({});
  const [standings, setStandings] = useState({});
  const [groupPoints, setGroupPoints] = useState({});
  const [actualResults, setActualResults] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  
  const scoreUpdateTimeoutRef = useRef(null);
  const previousScoreRef = useRef(null);

  // Filter schedule into group stage and knockout stage
  const groupSchedule = schedule.filter(match => match.group && match.group.match(/^[A-L]$/));
  const knockoutSchedule = schedule.filter(match => match.group && !match.group.match(/^[A-L]$/)).map(match => {
    // Update knockout teams if available from Firestore and not TBD
    if (knockoutTeams[match.id] && knockoutTeams[match.id].homeTeam !== 'TBD' && knockoutTeams[match.id].awayTeam !== 'TBD') {
      return {
        ...match,
        homeTeam: knockoutTeams[match.id].homeTeam,
        awayTeam: knockoutTeams[match.id].awayTeam
      };
    }
    return match;
  });

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email?.toLowerCase() === adminEmail?.toLowerCase();
  const allGroupMatchesCompleted = actualResults && allGroupMatchesScored(actualResults, schedule);

  useEffect(() => {
    // Load static data
    Promise.all([
      fetch(`${import.meta.env.BASE_URL}data/teams.json`).then(res => res.json()),
      fetch(`${import.meta.env.BASE_URL}data/schedule.json`).then(res => res.json())
    ]).then(([teamsData, scheduleData]) => {
      setTeams(teamsData);
      // Sort matches by date and time
      const sortedSchedule = [...scheduleData].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || '00:00:00Z'}`);
        const dateB = new Date(`${b.date}T${b.time || '00:00:00Z'}`);
        return dateA - dateB;
      });
      setSchedule(sortedSchedule);
    }).catch(error => {
      console.error("Error loading static data:", error);
    });
  }, []);

  useEffect(() => {
    // Load knockout teams from Firestore
    const loadKnockoutTeams = async () => {
      try {
        const docRef = doc(db, 'knockoutTeams', 'teams');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setKnockoutTeams(data.teams || {});
        }
      } catch (error) {
        console.error("Error loading knockout teams:", error);
      }
    };
    loadKnockoutTeams();
  }, []);

  // Load actual results once on mount (to avoid repeated Firestore calls)
  useEffect(() => {
    const loadActualResults = async () => {
      try {
        const results = await fetchActualResults();
        setActualResults(results);
      } catch (error) {
        console.error("Error loading actual results:", error);
      }
    };
    loadActualResults();
  }, []);

  useEffect(() => {
    if (Object.keys(teams).length > 0 && schedule.length > 0) {
      const calculatedStandings = calculateStandings(matchPicks, schedule, teams);
      setStandings(calculatedStandings);
    }
  }, [matchPicks, teams, schedule]);

  useEffect(() => {
    if (Object.keys(standings).length > 0 && schedule.length > 0 && actualResults) {
      // Calculate actual standings for comparison
      const actualMatches = actualResults?.matchPicks || {};
      const actualStandings = calculateStandings(actualMatches, schedule, teams);
      const calculatedGroupPoints = calculateGroupStandingPoints(standings, actualStandings, schedule, actualResults);
      setGroupPoints(calculatedGroupPoints.pointsByGroup);
    }
  }, [standings, actualResults, schedule, teams]);

  useEffect(() => {
    // Clear any pending score update
    if (scoreUpdateTimeoutRef.current) {
      clearTimeout(scoreUpdateTimeoutRef.current);
    }

    // COMPUTED FIELDS APPROACH:
    // 1. Calculate score on-the-fly using client-side logic (real-time display)
    // 2. Cache results to Firestore only for leaderboard sorting efficiency
    // 3. Use debouncing and conditional writes to minimize Firestore operations

    if (actualResults && Object.keys(matchPicks).length > 0) {
      // Computed field: calculate score on-the-fly for immediate display
      const userPicks = { matchPicks, knockoutPicks };
      const score = scoreUserPredictions(userPicks, actualResults, schedule, teams);
      setTotalScore(score);

      // Firestore cache: update only for leaderboard purposes (debounced + conditional)
      if (userId) {
        scoreUpdateTimeoutRef.current = setTimeout(async () => {
          try {
            const userDocRef = doc(db, 'users', userId);
            const docSnap = await getDoc(userDocRef);

            if (docSnap.exists()) {
              const currentScore = docSnap.data()?.totalPoints || 0;
              // Only update cache if score has actually changed
              if (currentScore !== score) {
                await updateDoc(userDocRef, {
                  totalPoints: score,
                  scoreUpdatedAt: new Date()
                });
                console.log(`Score cached for leaderboard: ${currentScore} -> ${score}`);
              } else {
                console.log('Score unchanged, skipping Firestore cache update');
              }
            } else {
              // Document doesn't exist yet, create it
              await setDoc(userDocRef, {
                totalPoints: score,
                scoreUpdatedAt: new Date()
              }, { merge: true });
              console.log('Initial score cached for leaderboard');
            }
          } catch (error) {
            console.error("Error caching score to Firebase:", error);
          }
        }, 5000); // 5 second debounce for cache updates
      }
    }

    // Cleanup function to clear timeout on unmount or dependency change
    return () => {
      if (scoreUpdateTimeoutRef.current) {
        clearTimeout(scoreUpdateTimeoutRef.current);
      }
    };
  }, [matchPicks, knockoutPicks, schedule, teams, userId, actualResults]);

  const handleScoreChange = (matchId, field, value) => {
    setMatchPicks(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value === '' ? null : parseInt(value, 10)
      }
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400 text-lg animate-pulse">Loading...</div>
      </div>
    );
  }

  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 bg-clip-text text-transparent mb-2">
            FIFA World Cup 2026 Pick'em
          </h1>
          <p className="text-zinc-400 text-sm md:text-base">Predict match scores and build your knockout bracket</p>
        </header>

        <AuthBanner />

        <div className="mb-6 overflow-x-auto border-b border-zinc-800 pb-4 scrollbar-hide">
          <div className="flex gap-2 min-w-max items-center justify-between">
            <div className="flex gap-2 min-w-max">
              <Link
                to="/matches"
                className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  location.pathname === '/matches'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Group Matches
              </Link>
              <Link
                to="/standings"
                className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  location.pathname === '/standings'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Standings
              </Link>
              <Link
                to="/knockout-matches"
                className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  location.pathname === '/knockout-matches'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Knockout Matches
              </Link>
              {(allGroupMatchesCompleted || isAdmin) && (
                <Link
                  to="/knockout-bracket"
                  className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                    location.pathname === '/knockout-bracket'
                      ? 'bg-amber-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Knockout Bracket
                </Link>
              )}
              <Link
                to="/leaderboard"
                className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  location.pathname === '/leaderboard'
                    ? 'bg-amber-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Leaderboard
              </Link>
              {user && (
                <Link
                  to="/profile"
                  className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                    location.pathname === '/profile'
                      ? 'bg-emerald-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Profile
                </Link>
              )}
              {isAdmin && (
                <Link
                  to="/admin"
                  className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                    location.pathname === '/admin'
                      ? 'bg-red-500 text-zinc-950'
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  Admin Panel
                </Link>
              )}
            </div>
            
            {/* Score Badge on the right - only show when signed in */}
            {user && (
              <div className="ml-4">
                <PlayerScoreBadge totalScore={totalScore} user={user} compact={true} />
              </div>
            )}
          </div>
        </div>

        <Routes>
          <Route path="/" element={<Navigate to="/matches" replace />} />
          <Route path="/matches" element={
            <MatchesPage
              teams={teams}
              schedule={groupSchedule}
              standings={standings}
              matchPicks={matchPicks}
              setMatchPicks={setMatchPicks}
              handleScoreChange={handleScoreChange}
              confirmPick={confirmPick}
            />
          } />
          <Route path="/standings" element={
            <StandingsPage
              teams={teams}
              schedule={schedule}
              standings={standings}
              groupPoints={groupPoints}
            />
          } />
          <Route path="/knockout-matches" element={
            <KnockoutMatchesPage
              teams={teams}
              schedule={knockoutSchedule}
              matchPicks={matchPicks}
              setMatchPicks={setMatchPicks}
              handleScoreChange={handleScoreChange}
              confirmPick={confirmPick}
            />
          } />
          <Route path="/knockout-bracket" element={
            (allGroupMatchesCompleted || isAdmin) ? (
              <KnockoutBracketPage
                knockoutPicks={knockoutPicks}
                setKnockoutPicks={setKnockoutPicks}
                teams={teams}
                onConfirm={confirmKnockoutPicks}
                schedule={schedule}
                matchPicks={matchPicks}
                actualResults={actualResults}
                isAdmin={isAdmin}
              />
            ) : (
              <Navigate to="/matches" replace />
            )
          } />
          <Route path="/leaderboard" element={<LeaderboardPage user={user} />} />
          <Route path="/profile" element={
            user ? (
              <ProfilePage knockoutPicks={knockoutPicks} setKnockoutPicks={setKnockoutPicks} teams={teams} isFirebaseEnabled user={user} />
            ) : (
              <Navigate to="/matches" replace />
            )
          } />
          <Route path="/admin" element={
            isAdmin ? (
              <AdminPage schedule={schedule} teams={teams} standings={standings} />
            ) : (
              <Navigate to="/matches" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/matches" replace />} />
        </Routes>
      </div>

      <ScrollToTop />
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
