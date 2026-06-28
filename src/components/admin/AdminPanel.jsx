import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { allGroupMatchesScored, calculateActualStandings, mapKnockoutTeams, isGroupComplete, advanceKnockoutWinners } from '../../utils/tournamentLogic';

export default function AdminPanel({ schedule, teams }) {
  const [actualResults, setActualResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingKnockout, setUpdatingKnockout] = useState(false);
  const [knockoutTeams, setKnockoutTeams] = useState({});
  const [updatedSchedule, setUpdatedSchedule] = useState(schedule);
  const [penaltyPopupMatch, setPenaltyPopupMatch] = useState(null);

  useEffect(() => {
    loadActualResults();
    loadKnockoutTeams();
  }, []);

  const loadActualResults = async () => {
    try {
      const docRef = doc(db, 'actualResults', 'matchResults');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setActualResults(data.matchPicks || {});
      }
    } catch (error) {
      console.error("Error loading actual results:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadKnockoutTeams = async () => {
    try {
      const docRef = doc(db, 'knockoutTeams', 'teams');
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setKnockoutTeams(data.teams || {});
        
        // Update schedule with knockout teams
        const newSchedule = schedule.map(match => {
          if (data.teams && data.teams[match.id]) {
            return {
              ...match,
              homeTeam: data.teams[match.id].homeTeam,
              awayTeam: data.teams[match.id].awayTeam
            };
          }
          return match;
        });
        setUpdatedSchedule(newSchedule);
      }
    } catch (error) {
      console.error("Error loading knockout teams:", error);
    }
  };

  const handleScoreChange = (matchId, field, value) => {
    setActualResults(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: (field.includes('Penalty') || field === 'penaltyWinner') ? (value === '' ? null : parseInt(value, 10)) : (value === '' ? null : parseInt(value, 10))
      }
    }));
  };

  const saveResults = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'actualResults', 'matchResults');
      await setDoc(docRef, {
        matchPicks: actualResults,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Automatically advance knockout winners
      const advancedTeams = advanceKnockoutWinners(knockoutTeams, actualResults);
      
      // Save updated knockout teams to Firestore
      const knockoutDocRef = doc(db, 'knockoutTeams', 'teams');
      await setDoc(knockoutDocRef, {
        teams: advancedTeams,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update local state
      setKnockoutTeams(advancedTeams);

      alert('Actual results saved successfully! Knockout bracket updated with winners.');
    } catch (error) {
      console.error("Error saving actual results:", error);
      alert('Failed to save results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateKnockoutTeams = async () => {
    // Allow updating knockout teams even if not all group matches are scored
    // This allows partial updates as groups finish

    setUpdatingKnockout(true);
    try {
      const standings = calculateActualStandings(actualResults, schedule, teams);
      const newUpdatedSchedule = mapKnockoutTeams(standings, schedule, actualResults);

      const knockoutTeams = {};
      newUpdatedSchedule.forEach(match => {
        if (match.group && !match.group.match(/^[A-L]$/)) {
          knockoutTeams[match.id] = {
            homeTeam: match.homeTeam,
            awayTeam: match.awayTeam
          };
        }
      });

      const docRef = doc(db, 'knockoutTeams', 'teams');
      await setDoc(docRef, {
        teams: knockoutTeams,
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Update local state
      setKnockoutTeams(knockoutTeams);
      setUpdatedSchedule(newUpdatedSchedule);

      // Count how many teams are determined vs TBD
      const determinedCount = Object.values(knockoutTeams).filter(t => t.homeTeam !== 'TBD' && t.awayTeam !== 'TBD').length;
      const totalMatches = Object.keys(knockoutTeams).length;
      
      // Check which groups are complete
      const groups = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
      const completeGroups = groups.filter(g => isGroupComplete(g, actualResults, schedule));
      
      alert(`Knockout teams updated successfully! ${determinedCount}/${totalMatches} matches have determined teams.\nComplete groups: ${completeGroups.join(', ') || 'None'}`);
    } catch (error) {
      console.error("Error updating knockout teams:", error);
      alert('Failed to update knockout teams. Please try again.');
    } finally {
      setUpdatingKnockout(false);
    }
  };

  const resetKnockoutTeams = async () => {
    if (!confirm('Are you sure you want to reset all knockout teams to TBD? This will clear any previously set knockout teams.')) {
      return;
    }

    setUpdatingKnockout(true);
    try {
      const docRef = doc(db, 'knockoutTeams', 'teams');
      await setDoc(docRef, {
        teams: {},
        updatedAt: serverTimestamp()
      }, { merge: true });

      alert('Knockout teams reset to TBD successfully!');
    } catch (error) {
      console.error("Error resetting knockout teams:", error);
      alert('Failed to reset knockout teams. Please try again.');
    } finally {
      setUpdatingKnockout(false);
    }
  };

  if (loading) {
    return <div className="text-center text-zinc-500 py-6">Loading admin panel...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-amber-400">Admin Panel</h2>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">Enter actual match results for scoring</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={resetKnockoutTeams}
              disabled={updatingKnockout}
              className="px-4 py-2 sm:px-6 sm:py-2 bg-red-500 hover:bg-red-400 text-zinc-950 font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {updatingKnockout ? 'Resetting...' : 'Reset Knockout Teams'}
            </button>
            <button
              onClick={updateKnockoutTeams}
              disabled={updatingKnockout}
              className="px-4 py-2 sm:px-6 sm:py-2 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {updatingKnockout ? 'Updating...' : 'Update Knockout Teams'}
            </button>
            <button
              onClick={saveResults}
              disabled={saving}
              className="px-4 py-2 sm:px-6 sm:py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-lg shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
            >
              {saving ? 'Saving...' : 'Save Results'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {updatedSchedule.map((match) => {
            const home = teams[match.homeTeam];
            const away = teams[match.awayTeam];
            const result = actualResults[match.id] || { homeScore: '', awayScore: '', homePenaltyScore: '', awayPenaltyScore: '' };
            
            // Check if this is a knockout match
            const isKnockoutMatch = match.group && !match.group.match(/^[A-L]$/);
            // Check if scores are equal (potential penalty situation)
            const isDraw = result.homeScore !== '' && result.awayScore !== '' && 
                          parseInt(result.homeScore) === parseInt(result.awayScore);

            return (
              <div key={match.id} className="bg-zinc-800/50 border border-zinc-700 p-3 sm:p-4 rounded-xl">
                <div className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2 flex justify-between">
                  <span>{isKnockoutMatch ? match.group : `Group ${match.group}`}</span>
                  <span className="truncate max-w-[120px] sm:max-w-none">{match.stadium}</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 sm:gap-3 w-5/12">
                    <span className="text-xl sm:text-2xl">{home?.flag}</span>
                    <span className="text-xs sm:text-sm font-medium text-zinc-100 truncate">{home?.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 justify-center w-2/12">
                    <input
                      type="number"
                      min="0"
                      placeholder="-"
                      value={result.homeScore ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'homeScore', e.target.value)}
                      className="w-9 h-9 sm:w-10 sm:h-10 text-center bg-zinc-700 border border-zinc-600 rounded-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    <span className="text-zinc-500 font-bold">:</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="-"
                      value={result.awayScore ?? ''}
                      onChange={(e) => handleScoreChange(match.id, 'awayScore', e.target.value)}
                      className="w-9 h-9 sm:w-10 sm:h-10 text-center bg-zinc-700 border border-zinc-600 rounded-lg text-white font-bold focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 justify-end w-5/12 text-right">
                    <span className="text-xs sm:text-sm font-medium text-zinc-100 truncate">{away?.name}</span>
                    <span className="text-xl sm:text-2xl">{away?.flag}</span>
                  </div>
                </div>

                {isKnockoutMatch && isDraw && (
                  <button
                    onClick={() => setPenaltyPopupMatch(match)}
                    className="mt-4 w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition-all"
                  >
                    {result.homePenaltyScore && result.awayPenaltyScore 
                      ? `Penalties: ${result.homePenaltyScore} - ${result.awayPenaltyScore}` 
                      : 'Enter Penalty Score'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Penalty Popup Modal */}
      {penaltyPopupMatch && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-white mb-4">Enter Penalty Score</h3>
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl mb-2">{teams[penaltyPopupMatch.homeTeam]?.flag}</div>
                <div className="text-sm text-zinc-400 mb-2">{teams[penaltyPopupMatch.homeTeam]?.name}</div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="-"
                  value={actualResults[penaltyPopupMatch.id]?.homePenaltyScore ?? ''}
                  onChange={(e) => handleScoreChange(penaltyPopupMatch.id, 'homePenaltyScore', e.target.value)}
                  className="w-16 h-12 text-center bg-zinc-800 border border-zinc-600 rounded-lg text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="text-2xl font-bold text-zinc-500">:</div>
              <div className="text-center">
                <div className="text-2xl mb-2">{teams[penaltyPopupMatch.awayTeam]?.flag}</div>
                <div className="text-sm text-zinc-400 mb-2">{teams[penaltyPopupMatch.awayTeam]?.name}</div>
                <input
                  type="number"
                  min="0"
                  max="10"
                  placeholder="-"
                  value={actualResults[penaltyPopupMatch.id]?.awayPenaltyScore ?? ''}
                  onChange={(e) => handleScoreChange(penaltyPopupMatch.id, 'awayPenaltyScore', e.target.value)}
                  className="w-16 h-12 text-center bg-zinc-800 border border-zinc-600 rounded-lg text-white font-bold text-xl focus:outline-none focus:ring-2 focus:ring-amber-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setPenaltyPopupMatch(null)}
                className="flex-1 py-2 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-lg transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => setPenaltyPopupMatch(null)}
                className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
