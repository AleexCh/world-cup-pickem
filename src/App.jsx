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
function MatchesPage({ teams, schedule, standings, matchPicks, setMatchPicks, handleScoreChange, confirmPick, actualResults, user }) {
  return (
    <>
      <MatchGrid
        teams={teams}
        schedule={schedule}
        standings={standings}
        matchPicks={matchPicks}
        setMatchPicks={setMatchPicks}
        onScoreChange={handleScoreChange}
        onConfirmPick={confirmPick}
        actualResults={actualResults}
        user={user}
      />
    </>
  );
}

function StandingsPage({ teams, schedule, standings, groupPoints, actualResults,user }) {
  const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const [showResults, setShowResults] = useState(false);
  
  // Calculate actual standings based on actualResults
  const actualStandings = React.useMemo(() => {
    if (!actualResults || !actualResults.matchPicks) return null;
    const actualMatches = actualResults.matchPicks;
    return calculateStandings(actualMatches, schedule, teams);
  }, [actualResults, schedule, teams]);

  // Determine which standings to show
  const displayStandings = showResults ? actualStandings : standings;
  
  // Only pass groupPoints when showing user picks, not when showing actual results
  const shouldShowGroupPoints = !showResults && user;

  const thirdPlaceTeams = React.useMemo(() => {
  if (!displayStandings) return [];
  
  const thirds = [];
  // Iterate over groups A-L
  ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach(group => {
    const teams = displayStandings[group] || [];
    // The 3rd index (0, 1, 2) is the 3rd place team
    if (teams[2]) {
      thirds.push({ ...teams[2], group });
    }
  });

  // Sort: Points, then Goal Difference, then Goals For
  return thirds.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    return b.goalsFor - a.goalsFor;
  });
}, [displayStandings]);
  
  return (

    
    <>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              className="sr-only peer"
              checked={showResults}
              onChange={(e) => setShowResults(e.target.checked)}
            />
            <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
          </label>
          <span className="text-sm font-medium text-zinc-300">
            {showResults ? 'Showing Official Results' : 'Showing My Picks'}
          </span>
        </div>
        {showResults && !actualResults && (
          <span className="text-xs text-zinc-500">No results available yet</span>
        )}
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {groupLetters.map(letter => (
          <GroupTable
            key={letter}
            groupLetter={letter}
            groupStandings={displayStandings[letter] || []}
            groupPoints={shouldShowGroupPoints ? (groupPoints[letter] || null) : null}
            showActualResults={showResults}
          />
        ))}
      </div>
      <div className="mt-8 bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold text-amber-400 mb-4">
          {showResults ? 'Official Best 3rd Place Teams' : 'My Picks: Best 3rd Place Teams'}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-700">
                <th className="text-left py-2">Rank</th>
                <th className="text-left py-2">Team</th>
                <th className="text-center py-2">Group</th>
                <th className="text-center py-2">Played</th>
                <th className="text-center py-2">Goal Difference</th>
                <th className="text-center py-2">Goals For</th>
                <th className="text-center py-2">Points</th>
                <th className="text-center py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {thirdPlaceTeams.map((team, index) => (
                <tr key={team.teamId} className={`border-b border-zinc-700/50 ${index < 8 ? 'bg-emerald-900/20' : ''}`}>
                  <td className="py-2">{index + 1}</td>
                  <td className="py-2">{team.name}</td>
                  <td className="text-center py-2">{team.teamId}</td>
                  <td className="text-center py-2">{team.played}</td>
                  <td className="text-center py-2">{team.goalDifference}</td>
                  <td className="text-center py-2">{team.goalsFor}</td>
                  <td className="text-center py-2 font-bold">{team.points}</td>
                  <td className="text-center py-2">
                    {index < 8 ? (
                      <span className="text-emerald-400 font-bold">QUALIFIED</span>
                    ) : (
                      <span className="text-zinc-500">ELIMINATED</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );

  
}

function KnockoutMatchesPage({ teams, schedule, matchPicks, setMatchPicks, handleScoreChange, confirmPick, actualResults,user }) {
  return (
    <>
      <KnockoutMatches
        teams={teams}
        schedule={schedule}
        actualResults={actualResults}
        matchPicks={matchPicks}
        setMatchPicks={setMatchPicks}
        onScoreChange={handleScoreChange}
        onConfirmPick={confirmPick}
        user={user}
      />
    </>
  );
}

function KnockoutBracketPage({ knockoutPicks, setKnockoutPicks, teams, onConfirm, schedule, matchPicks, actualResults, isAdmin,knockoutTeams }) {
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
        knockoutTeams={knockoutTeams}
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const scoreUpdateTimeoutRef = useRef(null);
  const previousScoreRef = useRef(null);

  const adminEmail = import.meta.env.VITE_ADMIN_EMAIL;
  const isAdmin = user?.email?.toLowerCase() === adminEmail?.toLowerCase();
  const allGroupMatchesCompleted = actualResults && allGroupMatchesScored(actualResults, schedule);

  // Define navigation items
  const navItems = React.useMemo(() => {
    const items = [
      { to: '/matches', label: 'Group Matches', color: 'amber' },
      { to: '/standings', label: 'Group Standings', color: 'amber' },
      { to: '/knockout-matches', label: 'Knockout Matches', color: 'amber' },
    ];
    
    
    items.push({ to: '/knockout-bracket', label: 'Knockout Bracket', color: 'amber' });
   
    
    items.push({ to: '/leaderboard', label: 'Leaderboard', color: 'amber' });
    
    if (user) {
      items.push({ to: '/profile', label: 'Profile', color: 'emerald' });
    }
    
    if (isAdmin) {
      items.push({ to: '/admin', label: 'Admin Panel', color: 'red' });
    }
    
    return items;
  }, [allGroupMatchesCompleted, isAdmin, user]);

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

  // Refresh data when tab becomes visible
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        try {
          const results = await fetchActualResults();
          setActualResults(results);
          console.log('Data refreshed on tab visibility');
        } catch (error) {
          console.error("Error refreshing data on tab visibility:", error);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
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

        <div className="mb-6 border-b border-zinc-800 pb-4">
          <div className="flex items-center justify-between">
            {/* Hamburger menu button (mobile only) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition-all lg:hidden"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>

            {/* Visible tabs (desktop only) */}
            <div className="hidden lg:flex gap-2 flex-1 overflow-hidden">
              {navItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                    location.pathname === item.to
                      ? `bg-${item.color}-500 text-zinc-950`
                      : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            
            {/* Score Badge on the right - only show when signed in */}
            {user && (
              <div className="ml-4">
                <PlayerScoreBadge totalScore={totalScore} user={user} compact={true} />
              </div>
            )}
          </div>
        </div>

        {/* Side panel backdrop */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* Side panel */}
        {mobileMenuOpen && (
          <div className="fixed inset-y-0 left-0 w-72 bg-zinc-900 border-r border-zinc-800 z-50 lg:hidden transform transition-transform duration-300 ease-in-out">
            <div className="p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-zinc-100">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100 transition-all"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="flex flex-col gap-2">
                {navItems.map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg font-medium text-sm transition-all flex items-center gap-3 ${
                      location.pathname === item.to
                        ? `bg-${item.color}-500 text-zinc-950`
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100'
                    }`}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

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
              actualResults={actualResults}
              user={user}
            />
          } />
          <Route path="/standings" element={
            <StandingsPage
              teams={teams}
              schedule={schedule}
              standings={standings}
              groupPoints={groupPoints}
              actualResults={actualResults}
              user={user}
            />
          } />
          <Route path="/knockout-matches" element={
            <KnockoutMatchesPage
              teams={teams}
              schedule={knockoutSchedule}
              matchPicks={matchPicks}
              setMatchPicks={setMatchPicks}
              handleScoreChange={handleScoreChange}
              actualResults={actualResults}
              user={user}
              confirmPick={confirmPick}
            />
          } />
          <Route path="/knockout-bracket" element={
              <KnockoutBracketPage
                knockoutPicks={knockoutPicks}
                setKnockoutPicks={setKnockoutPicks}
                teams={teams}
                onConfirm={confirmKnockoutPicks}
                schedule={schedule}
                matchPicks={matchPicks}
                actualResults={actualResults}
                isAdmin={isAdmin}
                knockoutTeams={knockoutTeams}
              />
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
