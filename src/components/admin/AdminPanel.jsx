import React, { useState, useEffect } from 'react';
import { db } from '../../services/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { allGroupMatchesScored, calculateActualStandings, mapKnockoutTeams } from '../../utils/tournamentLogic';

export default function AdminPanel({ schedule, teams }) {
  const [actualResults, setActualResults] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingKnockout, setUpdatingKnockout] = useState(false);

  useEffect(() => {
    loadActualResults();
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

  const handleScoreChange = (matchId, field, value) => {
    setActualResults(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [field]: value === '' ? null : parseInt(value, 10)
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
      alert('Actual results saved successfully!');
    } catch (error) {
      console.error("Error saving actual results:", error);
      alert('Failed to save results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const updateKnockoutTeams = async () => {
    if (!allGroupMatchesScored(actualResults, schedule)) {
      alert('All group stage matches must be scored before updating knockout teams.');
      return;
    }

    setUpdatingKnockout(true);
    try {
      const standings = calculateActualStandings(actualResults, schedule, teams);
      const updatedSchedule = mapKnockoutTeams(standings, schedule);

      const knockoutTeams = {};
      updatedSchedule.forEach(match => {
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

      alert('Knockout teams updated successfully!');
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
          {schedule.map((match) => {
            const home = teams[match.homeTeam];
            const away = teams[match.awayTeam];
            const result = actualResults[match.id] || { homeScore: '', awayScore: '' };

            return (
              <div key={match.id} className="bg-zinc-800/50 border border-zinc-700 p-3 sm:p-4 rounded-xl">
                <div className="text-[10px] sm:text-xs text-zinc-400 uppercase tracking-widest font-semibold mb-2 flex justify-between">
                  <span>Group {match.group}</span>
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
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
