import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useSyncPicks } from './hooks/useSyncPicks';
import AuthBanner from './components/auth/AuthBanner';
import MatchGrid from './components/tournament/MatchGrid';
import GroupTable from './components/tournament/GroupTable';
import KnockoutBracket from './components/knockout/KnockoutBracket';
import Leaderboard from './components/dashboard/Leaderboard';
import PlayerScoreBadge from './components/dashboard/PlayerScoreBadge';
import ScrollToTop from './components/common/ScrollToTop';
import AdminPanel from './components/admin/AdminPanel';
import { calculateStandings, determineAdvancingTeams } from './utils/tournamentLogic';
import { scoreUserPredictions, fetchActualResults } from './utils/scoringEngine';
import { db } from './services/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

function AppContent() {
  const { user } = useAuth();
  const userId = user?.uid || null;
  const { matchPicks, setMatchPicks, knockoutPicks, setKnockoutPicks, loading, confirmPick } = useSyncPicks(userId);
  
  const [teams, setTeams] = useState({});
  const [schedule, setSchedule] = useState([]);
  const [knockoutTeams, setKnockoutTeams] = useState({});
  const [standings, setStandings] = useState({});
  const [actualResults, setActualResults] = useState(null);
  const [totalScore, setTotalScore] = useState(0);
  const [activeTab, setActiveTab] = useState('matches');

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

  useEffect(() => {
    if (Object.keys(teams).length > 0 && schedule.length > 0) {
      const calculatedStandings = calculateStandings(matchPicks, schedule, teams);
      setStandings(calculatedStandings);
    }
  }, [matchPicks, teams, schedule]);

  useEffect(() => {
    // Load actual results and calculate score
    const loadActualResults = async () => {
      try {
        const results = await fetchActualResults();
        setActualResults(results);
        
        if (results && Object.keys(matchPicks).length > 0) {
          const userPicks = { matchPicks, knockoutPicks };
          const score = scoreUserPredictions(userPicks, results, schedule, teams);
          setTotalScore(score);
          
          // Save score to Firebase if user is authenticated
          if (userId) {
            try {
              const userDocRef = doc(db, 'users', userId);
              await updateDoc(userDocRef, {
                totalPoints: score,
                scoreUpdatedAt: new Date()
              });
            } catch (error) {
              console.error("Error saving score to Firebase:", error);
            }
          }
        }
      } catch (error) {
        console.error("Error loading actual results:", error);
      }
    };
    loadActualResults();
  }, [matchPicks, knockoutPicks, schedule, teams, userId]);

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

        <div className="mb-6 overflow-x-auto border-b border-zinc-800 pb-4">
          <div className="flex gap-2 min-w-max items-center justify-between">
            <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveTab('matches')}
              className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'matches'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Group Matches
            </button>
            <button
              onClick={() => setActiveTab('standings')}
              className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'standings'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Standings
            </button>
            <button
              onClick={() => setActiveTab('knockout-matches')}
              className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'knockout-matches'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Knockout Matches
            </button>
            <button
              onClick={() => setActiveTab('knockout-bracket')}
              className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'knockout-bracket'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Knockout Bracket
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                activeTab === 'leaderboard'
                  ? 'bg-amber-500 text-zinc-950'
                  : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
              }`}
            >
              Leaderboard
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`px-3 py-2 rounded-lg font-medium text-xs sm:text-sm transition-all whitespace-nowrap ${
                  activeTab === 'admin'
                    ? 'bg-red-500 text-zinc-950'
                    : 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800'
                }`}
              >
                Admin Panel
              </button>
            )}
            </div>
            
            {/* Score Badge on the right */}
            <div className="ml-4">
              <PlayerScoreBadge totalScore={totalScore} user={user} compact={true} />
            </div>
          </div>
        </div>

        {activeTab === 'matches' && (
          <div>
            <MatchGrid
              schedule={groupSchedule}
              teams={teams}
              matchPicks={matchPicks}
              actualResults={actualResults}
              onScoreChange={handleScoreChange}
              onConfirmPick={confirmPick}
            />
          </div>
        )}

        {activeTab === 'standings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupLetters.map(letter => (
              <GroupTable
                key={letter}
                groupLetter={letter}
                groupStandings={standings[letter] || []}
              />
            ))}
          </div>
        )}

        {activeTab === 'knockout-matches' && (
          <div>
            <MatchGrid
              schedule={knockoutSchedule}
              teams={teams}
              matchPicks={matchPicks}
              actualResults={actualResults}
              onScoreChange={handleScoreChange}
              onConfirmPick={confirmPick}
            />
          </div>
        )}

        {activeTab === 'knockout-bracket' && (
          <KnockoutBracket
            knockoutPicks={knockoutPicks}
            setKnockoutPicks={setKnockoutPicks}
            teams={teams}
          />
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard />
        )}

        {activeTab === 'admin' && isAdmin && (
          <AdminPanel schedule={schedule} teams={teams} />
        )}
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
