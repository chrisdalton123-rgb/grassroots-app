'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Player, TrainingRecord, SubPlanStep, MatchGoal, SavedMatch } from '@/types/matchday';
import MatchdayTab from '@/components/MatchdayTab';
import PlannerTab from '@/components/PlannerTab';
import TrainingTab from '@/components/TrainingTab';
import SquadTab from '@/components/SquadTab';
import AuditTab from '@/components/AuditTab';

const AGE_PRESETS = {
  'U7': { pitchCount: 3, halfMins: 10, label: 'U7 (3v3 Carousel Festival)' },
  'U8-U9': { pitchCount: 5, halfMins: 20, label: 'U8/U9 (5v5 — 20m Halves)' },
  'U10-U11': { pitchCount: 7, halfMins: 25, label: 'U10/U11 (7v7 — 25m Halves)' },
  'U12-U13': { pitchCount: 9, halfMins: 30, label: 'U12/U13 (9v9 — 30m Halves)' },
  'U14-U15': { pitchCount: 11, halfMins: 35, label: 'U14/U15 (11v11 — 35m Halves)' },
  'TOURNAMENT': { pitchCount: 6, halfMins: 10, label: 'Summer 6s (6v6 — 10m Games)' },
};

const POSITION_SLOTS = ['GK', 'L-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'C-MID', 'R-MID', 'L-STR', 'C-STR', 'R-STR'];

export default function MatchdayApp() {
  const [activeTab, setActiveTab] = useState<'matchday' | 'planner' | 'training' | 'squad' | 'stats'>('matchday');
  const [squad, setSquad] = useState<Player[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [injuredPlayers, setInjuredPlayers] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMatch, setSavingMatch] = useState(false);

  // Training & Match States
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [trainingData, setTrainingData] = useState<Record<string, TrainingRecord>>({});
  const [ageGroup, setAgeGroup] = useState('U8-U9');
  const [basePitchCapacity, setBasePitchCapacity] = useState(5);
  const [halfMinutes, setHalfMinutes] = useState(20);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'pitch' | 'cards'>('pitch');
  const [editingPositionPlayerId, setEditingPositionPlayerId] = useState<string | null>(null);
  const [targetSubPosition, setTargetSubPosition] = useState<string | null>(null);
  const [isPowerplayActive, setIsPowerplayActive] = useState(false);

  // Planner States
  const [planOffPlayerId, setPlanOffPlayerId] = useState('');
  const [planOnPlayerId, setPlanOnPlayerId] = useState('');
  const [planMinute, setPlanMinute] = useState(7);
  const [planTargetPos, setPlanTargetPos] = useState('C-MID');
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [startingPlayerIds, setStartingPlayerIds] = useState<string[]>([]);
  const [generatedPlan, setGeneratedPlan] = useState<SubPlanStep[]>([]);

  // Scoreboard & Timer
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState('Opponent');
  const [secondsRemaining, setSecondsRemaining] = useState(20 * 60);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [matchHistory, setMatchHistory] = useState<SavedMatch[]>([]);

  // Squad Editor
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const currentPitchCapacity = isPowerplayActive ? basePitchCapacity + 1 : basePitchCapacity;

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(40);
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayerMins = (totalSeconds: number) => `${Math.floor(totalSeconds / 60)}m`;

  const ourGoalsCount = goals.filter((g) => !g.isOpponent).length;
  const opponentGoalsCount = goals.filter((g) => g.isOpponent).length;
  const goalDifference = opponentGoalsCount - ourGoalsCount;
  const pendingPlanSteps = generatedPlan.filter((s) => s.status === 'pending');
  const squadMaxSeconds = Math.max(...squad.map((p) => p.total_seconds_played || 0), 1);
  const lowestSeconds = pitchPlayers.length + subBench.length > 0 ? Math.min(...[...pitchPlayers, ...subBench].map((p) => p.seconds_played)) : 0;
  const attendedCount = squad.filter((p) => trainingData[p.id]?.status === 'attended').length;

  const loadSquad = async () => {
    setLoading(true);
    const { data: playersData } = await supabase.from('players').select('*').order('squad_number', { ascending: true });
    const { data: statsData } = await supabase.from('match_player_stats').select('*');
    const { data: matchesData } = await supabase.from('matches').select('*').order('created_at', { ascending: false });

    if (matchesData) setMatchHistory(matchesData);

    if (playersData) {
      const formatted: Player[] = playersData.map((p) => {
        const pStats = statsData?.filter((s) => s.player_id === p.id) || [];
        return {
          id: p.id,
          name: p.name,
          squad_number: p.squad_number,
          preferred_position: p.preferred_position,
          seconds_played: 0,
          current_position: p.preferred_position === 'Goalkeeper' ? 'GK' : 'C-MID',
          total_matches: pStats.length,
          total_seconds_played: pStats.reduce((acc, curr) => acc + (curr.seconds_played || 0), 0),
          total_goals: pStats.reduce((acc, curr) => acc + (curr.goals_scored || 0), 0),
          total_potm: pStats.filter((s) => s.is_potm).length,
        };
      });

      setSquad(formatted);
      setAvailablePlayerIds(formatted.map((p) => p.id));
      setPitchPlayers(formatted.slice(0, 5));
      setSubBench(formatted.slice(5));

      const initialTrain: Record<string, TrainingRecord> = {};
      formatted.forEach((p) => {
        initialTrain[p.id] = { playerId: p.id, status: 'attended', effortRating: 5, notes: '' };
      });
      setTrainingData(initialTrain);
    }
    setLoading(false);
  };

  useEffect(() => { loadSquad(); }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isClockRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
        setPitchPlayers((prev) => prev.map((p) => ({ ...p, seconds_played: p.seconds_played + 1 })));
      }, 1000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [isClockRunning, secondsRemaining]);

  const handleChangeOnPitchPosition = (playerId: string, newRole: string) => {
    triggerHaptic();
    setPitchPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, current_position: newRole } : p)));
    setEditingPositionPlayerId(null);
  };

  const handleApplyScheduledSub = (stepId: string) => {
    triggerHaptic();
    const step = generatedPlan.find((s) => s.id === stepId);
    if (!step) return;

    const onPitchIndex = pitchPlayers.findIndex((p) => p.id === step.offPlayerId);
    const benchIndex = subBench.findIndex((p) => p.id === step.onPlayerId);

    if (onPitchIndex !== -1 && benchIndex !== -1) {
      const newPitch = [...pitchPlayers];
      const newBench = [...subBench];
      const outgoing = newPitch[onPitchIndex];
      const incoming = newBench[benchIndex];

      newPitch[onPitchIndex] = { ...incoming, current_position: step.assignedPosition };
      newBench[benchIndex] = { ...outgoing, current_position: 'SUB' };

      setPitchPlayers(newPitch);
      setSubBench(newBench);
    }

    setGeneratedPlan((prev) => prev.map((s) => (s.id === stepId ? { ...s, status: 'completed' } : s)));
  };

  const handleAddCustomSubStep = () => {
    if (!planOffPlayerId || !planOnPlayerId) return;
    const offP = squad.find((p) => p.id === planOffPlayerId);
    const onP = squad.find((p) => p.id === planOnPlayerId);
    if (!offP || !onP) return;

    triggerHaptic();
    setGeneratedPlan((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        minute: planMinute,
        offPlayerId: offP.id,
        offPlayerName: `#${offP.squad_number} ${offP.name}`,
        onPlayerId: onP.id,
        onPlayerName: `#${onP.squad_number} ${onP.name}`,
        assignedPosition: planTargetPos,
        status: 'pending' as const,
      },
    ].sort((a, b) => a.minute - b.minute));
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newNumber) return;
    const { error } = await supabase.from('players').insert([{ name: newName, squad_number: parseInt(newNumber, 10), preferred_position: newPosition }]);
    if (!error) { setNewName(''); setNewNumber(''); loadSquad(); }
  };

  const saveEditPlayer = async (id: string) => {
    const { error } = await supabase.from('players').update({ name: editName, squad_number: parseInt(editNumber, 10), preferred_position: editPosition }).eq('id', id);
    if (!error) { setEditingPlayerId(null); loadSquad(); }
  };

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) loadSquad();
  };

  if (loading) return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Co-Gaffer...</div>;

  return (
    <div className="bg-black text-white min-h-screen pb-24 p-4 font-sans max-w-md mx-auto">
      <div className="flex justify-between items-center mb-4 px-1">
        <h1 className="text-2xl font-black text-lime-400 flex items-center gap-2"><span>📋</span> CO-GAFFER</h1>
        <span className="text-[10px] bg-gray-900 border border-gray-800 text-lime-400 font-extrabold px-2.5 py-1 rounded-md">
          MODULAR ARCHITECTURE
        </span>
      </div>

      {activeTab === 'matchday' && (
        <MatchdayTab
          ageGroup={ageGroup}
          setAgeGroup={setAgeGroup}
          agePresets={AGE_PRESETS}
          viewMode={viewMode}
          setViewMode={setViewMode}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          basePitchCapacity={basePitchCapacity}
          setBasePitchCapacity={setBasePitchCapacity}
          halfMinutes={halfMinutes}
          handleHalfMinutesChange={setHalfMinutes}
          isPowerplayActive={isPowerplayActive}
          togglePowerplay={() => setIsPowerplayActive(!isPowerplayActive)}
          goalDifference={goalDifference}
          ourGoalsCount={ourGoalsCount}
          opponentGoalsCount={opponentGoalsCount}
          opponentName={opponentName}
          setOpponentName={setOpponentName}
          secondsRemaining={secondsRemaining}
          isClockRunning={isClockRunning}
          toggleClock={() => setIsClockRunning(!isClockRunning)}
          currentPeriod={1}
          pendingPlanSteps={pendingPlanSteps}
          handleApplyScheduledSub={handleApplyScheduledSub}
          pitchPlayers={pitchPlayers}
          subBench={subBench}
          injuredPlayers={injuredPlayers}
          currentPitchCapacity={currentPitchCapacity}
          handleLogGoal={(name, isOpp) => setGoals((prev) => [...prev, { id: Math.random().toString(), scorerName: name, minute: 10, isOpponent: !!isOpp }])}
          handleMarkInjured={() => {}}
          handleRecoverPlayer={() => {}}
          selectedOnPitch={selectedOnPitch}
          setSelectedOnPitch={setSelectedOnPitch}
          targetSubPosition={targetSubPosition}
          setTargetSubPosition={setTargetSubPosition}
          handleSubSwap={() => {}}
          handleChangeOnPitchPosition={handleChangeOnPitchPosition}
          editingPositionPlayerId={editingPositionPlayerId}
          setEditingPositionPlayerId={setEditingPositionPlayerId}
          positionSlots={POSITION_SLOTS}
          lowestSeconds={lowestSeconds}
          playerOfTheMatch={playerOfTheMatch}
          setPlayerOfTheMatch={setPlayerOfTheMatch}
          generateWhatsAppSummary={() => {}}
          handleSaveAndFinishMatch={() => {}}
          savingMatch={savingMatch}
          formatTime={formatTime}
          formatPlayerMins={formatPlayerMins}
          triggerHaptic={triggerHaptic}
        />
      )}

      {activeTab === 'planner' && (
        <PlannerTab
          halfMinutes={halfMinutes}
          handleHalfMinutesChange={setHalfMinutes}
          squad={squad}
          planOffPlayerId={planOffPlayerId}
          setPlanOffPlayerId={setPlanOffPlayerId}
          planOnPlayerId={planOnPlayerId}
          setPlanOnPlayerId={setPlanOnPlayerId}
          planMinute={planMinute}
          setPlanMinute={setPlanMinute}
          planTargetPos={planTargetPos}
          setPlanTargetPos={setPlanTargetPos}
          positionSlots={POSITION_SLOTS}
          handleAddCustomSubStep={handleAddCustomSubStep}
          generatedPlan={generatedPlan}
          handleRemoveSubStep={(id) => setGeneratedPlan((prev) => prev.filter((s) => s.id !== id))}
          availablePlayerIds={availablePlayerIds}
          getProjectedMinutes={() => squad.map((p) => ({ ...p, projectedMins: 20 }))}
          handleGenerateMatchPlan={() => setActiveTab('matchday')}
        />
      )}

      {activeTab === 'training' && (
        <TrainingTab
          sessionDate={sessionDate}
          setSessionDate={setSessionDate}
          attendedCount={attendedCount}
          squad={squad}
          trainingData={trainingData}
          handleTrainingStatusChange={(id, status) => setTrainingData((prev) => ({ ...prev, [id]: { ...prev[id], status } }))}
          handleRatingChange={(id, rating) => setTrainingData((prev) => ({ ...prev, [id]: { ...prev[id], effortRating: rating } }))}
          handleNotesChange={(id, notes) => setTrainingData((prev) => ({ ...prev, [id]: { ...prev[id], notes } }))}
          applyTrainingToAvailability={() => setActiveTab('planner')}
        />
      )}

      {activeTab === 'squad' && (
        <SquadTab
          squad={squad}
          newName={newName}
          setNewName={setNewName}
          newNumber={newNumber}
          setNewNumber={setNewNumber}
          newPosition={newPosition}
          setNewPosition={setNewPosition}
          handleAddPlayer={handleAddPlayer}
          editingPlayerId={editingPlayerId}
          setEditingPlayerId={setEditingPlayerId}
          editName={editName}
          setEditName={setEditName}
          editNumber={editNumber}
          setEditNumber={setEditNumber}
          editPosition={editPosition}
          setEditPosition={setEditPosition}
          startEditPlayer={(p) => { setEditingPlayerId(p.id); setEditName(p.name); setEditNumber(p.squad_number.toString()); setEditPosition(p.preferred_position); }}
          saveEditPlayer={saveEditPlayer}
          handleDeletePlayer={handleDeletePlayer}
        />
      )}

      {activeTab === 'stats' && (
        <AuditTab
          squad={squad}
          squadMaxSeconds={squadMaxSeconds}
          matchHistory={matchHistory}
        />
      )}

      {/* BOTTOM NAV */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 p-2 flex justify-around max-w-md mx-auto z-50">
        <button onClick={() => setActiveTab('matchday')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'matchday' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>⚽ MATCH</button>
        <button onClick={() => setActiveTab('training')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'training' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>🏋️ DRILLS</button>
        <button onClick={() => setActiveTab('planner')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'planner' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📅 PLANNER</button>
        <button onClick={() => setActiveTab('squad')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'squad' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📋 TEAM</button>
        <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'stats' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📊 AUDIT</button>
      </div>
    </div>
  );
}