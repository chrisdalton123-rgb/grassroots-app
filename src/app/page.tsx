'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';

type Player = {
  id: string;
  name: string;
  squad_number: number;
  preferred_position: string;
  seconds_played: number;
  current_position: string;
  isAvailable?: boolean;
  isInjured?: boolean;
  isActive?: boolean;
  total_matches?: number;
  total_seconds_played?: number;
  total_goals?: number;
  total_potm?: number;
};

type TrainingRecord = {
  playerId: string;
  status: 'attended' | 'absent' | 'excused';
  effortRating: number; // 1 to 5
  notes: string;
};

type SubPlanStep = {
  id: string;
  minute: number;
  offPlayerId: string;
  offPlayerName: string;
  onPlayerId: string;
  onPlayerName: string;
  status: 'pending' | 'completed';
};

type MatchGoal = {
  id: string;
  scorerName: string;
  minute: number;
  isOpponent: boolean;
};

type SavedMatch = {
  id: string;
  created_at: string;
  opponent_name: string;
  age_group: string;
  our_score: number;
  opponent_score: number;
  player_of_the_match: string | null;
  match_date: string;
};

const AGE_PRESETS: Record<string, { pitchCount: number; halfMins: number; label: string }> = {
  'U7': { pitchCount: 3, halfMins: 10, label: 'U7 (3v3 Carousel Festival)' },
  'U8-U9': { pitchCount: 5, halfMins: 20, label: 'U8/U9 (5v5 — 20m Halves)' },
  'U10-U11': { pitchCount: 7, halfMins: 25, label: 'U10/U11 (7v7 — 25m Halves)' },
  'U12-U13': { pitchCount: 9, halfMins: 30, label: 'U12/U13 (9v9 — 30m Halves)' },
  'U14-U15': { pitchCount: 11, halfMins: 35, label: 'U14/U15 (11v11 — 35m Halves)' },
  'TOURNAMENT': { pitchCount: 6, halfMins: 10, label: 'Summer 6s (6v6 — 10m Games)' },
};

const FORMATION_OPTIONS: Record<number, { label: string; roles: string[] }[]> = {
  5: [
    { label: '2-1-1 (Solid Base)', roles: ['GK', 'DEF', 'DEF', 'MID', 'STR'] },
    { label: '1-2-1 (Diamond)', roles: ['GK', 'DEF', 'MID', 'MID', 'STR'] },
  ],
  6: [
    { label: '2-2-1 (Balanced 6s)', roles: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'STR'] },
    { label: '1-3-1 (Midfield Overload)', roles: ['GK', 'DEF', 'MID', 'MID', 'MID', 'STR'] },
  ],
  7: [
    { label: '2-3-1 (Standard 7v7)', roles: ['GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'STR'] },
    { label: '3-2-1 (Tree)', roles: ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'STR'] },
  ],
  9: [
    { label: '3-3-2 (Standard 9v9)', roles: ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'STR', 'STR'] },
    { label: '3-4-1 (Midfield Heavy)', roles: ['GK', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'STR'] },
  ],
  11: [
    { label: '4-3-3 (Attacking)', roles: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'STR', 'STR', 'STR'] },
    { label: '4-4-2 (Classic)', roles: ['GK', 'DEF', 'DEF', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'MID', 'STR', 'STR'] },
  ]
};

export default function MatchdayApp() {
  const [activeTab, setActiveTab] = useState<'matchday' | 'planner' | 'training' | 'squad' | 'stats'>('matchday');
  const [squad, setSquad] = useState<Player[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [injuredPlayers, setInjuredPlayers] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingMatch, setSavingMatch] = useState(false);

  // Training Session States
  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [trainingData, setTrainingData] = useState<Record<string, TrainingRecord>>({});

  // Match & Format Settings
  const [ageGroup, setAgeGroup] = useState<string>('U8-U9');
  const [basePitchCapacity, setBasePitchCapacity] = useState<number>(5);
  const [halfMinutes, setHalfMinutes] = useState<number>(20);
  const [carouselPitches, setCarouselPitches] = useState<number>(2);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Tactical Pitch Board View Options
  const [viewMode, setViewMode] = useState<'pitch' | 'cards'>('pitch');
  const [formationIndex, setFormationIndex] = useState<number>(0);

  // Powerplay & Injury States
  const [isPowerplayActive, setIsPowerplayActive] = useState<boolean>(false);

  // Match Event & Scoreboard Logging
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');

  // Planner States
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [fixedGkId, setFixedGkId] = useState<string | null>(null);
  const [gkMode, setGkMode] = useState<'fixed' | 'split'>('fixed');
  const [half2GkId, setHalf2GkId] = useState<string | null>(null);
  const [maxGkOutfieldMins, setMaxGkOutfieldMins] = useState<number>(10);
  const [rotationIntervalMins, setRotationIntervalMins] = useState<number>(7);
  const [subsPerBatch, setSubsPerBatch] = useState<number>(1);
  const [generatedPlan, setGeneratedPlan] = useState<SubPlanStep[]>([]);

  // Team Roster Editing States
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPosition, setEditPosition] = useState('');

  // Stats & Match History States
  const [matchHistory, setMatchHistory] = useState<SavedMatch[]>([]);

  // Match Clock & Screen Lock States
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20 * 60);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [wakeLock, setWakeLock] = useState<any>(null);

  const currentPitchCapacity = isPowerplayActive ? basePitchCapacity + 1 : basePitchCapacity;

  const triggerHaptic = () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(40);
    }
  };

  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        const lock = await (navigator as any).wakeLock.request('screen');
        setWakeLock(lock);
      }
    } catch (err) {
      console.log('Wake Lock Error:', err);
    }
  };

  const releaseWakeLock = () => {
    if (wakeLock) {
      wakeLock.release();
      setWakeLock(null);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayerMins = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    return `${mins}m`;
  };

  const ourGoalsCount = goals.filter((g) => !g.isOpponent).length;
  const opponentGoalsCount = goals.filter((g) => g.isOpponent).length;
  const goalDifference = opponentGoalsCount - ourGoalsCount;

  const pendingPlanSteps = generatedPlan.filter((step) => step.status === 'pending');

  const allPlayers = [...pitchPlayers, ...subBench];
  const lowestSeconds = allPlayers.length > 0 ? Math.min(...allPlayers.map((p) => p.seconds_played)) : 0;

  const loadSquad = async () => {
    setLoading(true);
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('*')
      .order('squad_number', { ascending: true });

    const { data: statsData } = await supabase
      .from('match_player_stats')
      .select('*');

    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .order('created_at', { ascending: false });

    if (matchesData) {
      setMatchHistory(matchesData);
    }

    if (playersError) {
      console.error('Error fetching team roster:', playersError);
    } else if (playersData) {
      const formatted: Player[] = playersData.map((p) => {
        const playerStats = statsData?.filter((s) => s.player_id === p.id) || [];
        const totalMatches = playerStats.length;
        const totalSecs = playerStats.reduce((acc, curr) => acc + (curr.seconds_played || 0), 0);
        const totalGoals = playerStats.reduce((acc, curr) => acc + (curr.goals_scored || 0), 0);
        const totalPotm = playerStats.filter((s) => s.is_potm).length;

        return {
          id: p.id,
          name: p.name,
          squad_number: p.squad_number,
          preferred_position: p.preferred_position,
          seconds_played: 0,
          current_position: p.preferred_position || 'SUB',
          isInjured: false,
          isActive: true,
          total_matches: totalMatches,
          total_seconds_played: totalSecs,
          total_goals: totalGoals,
          total_potm: totalPotm,
        };
      });

      setSquad(formatted);
      setAvailablePlayerIds(formatted.map((p) => p.id));
      
      const initialTraining: Record<string, TrainingRecord> = {};
      formatted.forEach((p) => {
        initialTraining[p.id] = {
          playerId: p.id,
          status: 'attended',
          effortRating: 5,
          notes: '',
        };
      });
      setTrainingData(initialTraining);

      const defaultGk = formatted.find((p) => p.preferred_position === 'Goalkeeper');
      if (defaultGk) setFixedGkId(defaultGk.id);

      setPitchPlayers(formatted.slice(0, currentPitchCapacity));
      setSubBench(formatted.slice(currentPitchCapacity));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSquad();
  }, []);

  const handleTrainingStatusChange = (playerId: string, status: 'attended' | 'absent' | 'excused') => {
    triggerHaptic();
    setTrainingData((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        status,
      },
    }));
  };

  const handleRatingChange = (playerId: string, effortRating: number) => {
    triggerHaptic();
    setTrainingData((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        effortRating,
      },
    }));
  };

  const handleNotesChange = (playerId: string, notes: string) => {
    setTrainingData((prev) => ({
      ...prev,
      [playerId]: {
        ...prev[playerId],
        notes,
      },
    }));
  };

  const applyTrainingToAvailability = () => {
    triggerHaptic();
    const presentIds = squad
      .filter((p) => trainingData[p.id]?.status === 'attended')
      .map((p) => p.id);

    setAvailablePlayerIds(presentIds);
    alert(`Sync complete! ${presentIds.length} present players selected for upcoming matchday.`);
    setActiveTab('planner');
  };

  const applyAgePreset = (presetKey: string) => {
    setAgeGroup(presetKey);
    setFormationIndex(0);
    const preset = AGE_PRESETS[presetKey];
    if (preset) {
      const capacity = presetKey === 'U7' ? carouselPitches * 3 : preset.pitchCount;
      setBasePitchCapacity(capacity);
      setHalfMinutes(preset.halfMins);
      setSecondsRemaining(preset.halfMins * 60);
      setIsClockRunning(false);

      const activeSquad = squad.filter((p) => availablePlayerIds.includes(p.id) && !p.isInjured);
      setPitchPlayers(activeSquad.slice(0, capacity));
      setSubBench(activeSquad.slice(capacity));
    }
  };

  const getRecommendation = () => {
    const activeCount = availablePlayerIds.length;
    const subsCount = activeCount - currentPitchCapacity;

    if (subsCount <= 0) {
      return { interval: 0, batch: 0, note: 'No subs needed (exact team count).' };
    }
    if (subsCount === 1) {
      return { interval: Math.floor((halfMinutes * 2) / activeCount), batch: 1, note: `Recommend 1 sub every ${Math.floor((halfMinutes * 2) / activeCount)} mins for smooth rotation.` };
    }
    if (subsCount === 2) {
      return { interval: 6, batch: 1, note: 'Recommend 1 sub every 6 mins.' };
    }
    if (subsCount >= 3) {
      return { interval: 7, batch: 2, note: 'Recommend 2 subs every 7 mins to keep tempo high.' };
    }
    return { interval: 7, batch: 1, note: 'Standard rotation preset.' };
  };

  const handleHalfMinutesChange = (newMins: number) => {
    const mins = Math.max(1, newMins);
    setHalfMinutes(mins);
    setSecondsRemaining(mins * 60);
    setIsClockRunning(false);
  };

  const recalculateFutureSubSchedule = (
    currentPitch: Player[],
    currentBench: Player[],
    effectivePitchCap: number
  ) => {
    const currentMin = Math.max(1, Math.ceil((halfMinutes * 60 - secondsRemaining) / 60));
    const totalMatchMins = halfMinutes * 2;

    const completed = generatedPlan.filter((s) => s.status === 'completed');
    const newPendingPlan: SubPlanStep[] = [];

    let tempPitch = [...currentPitch];
    let tempBench = [...currentBench];

    if (fixedGkId) {
      tempPitch = tempPitch.filter((p) => p.id !== fixedGkId);
      tempBench = tempBench.filter((p) => p.id !== fixedGkId);
    }

    let interval = Math.ceil(currentMin / rotationIntervalMins) * rotationIntervalMins;
    if (interval <= currentMin) interval += rotationIntervalMins;

    while (interval < totalMatchMins) {
      for (let i = 0; i < subsPerBatch; i++) {
        if (tempBench.length === 0 || tempPitch.length === 0) break;

        const incoming = tempBench.shift();
        const outgoing = tempPitch.shift();

        if (incoming && outgoing) {
          newPendingPlan.push({
            id: Math.random().toString(),
            minute: interval,
            offPlayerId: outgoing.id,
            offPlayerName: `#${outgoing.squad_number} ${outgoing.name}`,
            onPlayerId: incoming.id,
            onPlayerName: `#${incoming.squad_number} ${incoming.name}`,
            status: 'pending',
          });

          tempPitch.push(incoming);
          tempBench.push(outgoing);
        }
      }
      interval += rotationIntervalMins;
    }

    setGeneratedPlan([...completed, ...newPendingPlan]);
  };

  const togglePowerplay = () => {
    triggerHaptic();
    const newPowerplayState = !isPowerplayActive;
    setIsPowerplayActive(newPowerplayState);

    let updatedPitch = [...pitchPlayers];
    let updatedBench = [...subBench];
    const newCap = newPowerplayState ? basePitchCapacity + 1 : basePitchCapacity;

    if (newPowerplayState && subBench.length > 0) {
      const subToPromote = subBench[0];
      updatedPitch = [...pitchPlayers, { ...subToPromote, current_position: 'POWERPLAY' }];
      updatedBench = subBench.filter((p) => p.id !== subToPromote.id);
      setPitchPlayers(updatedPitch);
      setSubBench(updatedBench);
    } else if (!newPowerplayState && pitchPlayers.length > basePitchCapacity) {
      const playerToBench = pitchPlayers[pitchPlayers.length - 1];
      updatedPitch = pitchPlayers.slice(0, basePitchCapacity);
      updatedBench = [{ ...playerToBench, current_position: 'SUB' }, ...subBench];
      setPitchPlayers(updatedPitch);
      setSubBench(updatedBench);
    }

    if (generatedPlan.length > 0) {
      recalculateFutureSubSchedule(updatedPitch, updatedBench, newCap);
    }
  };

  const handleMarkInjured = (playerId: string) => {
    triggerHaptic();
    const targetPlayer = [...pitchPlayers, ...subBench].find((p) => p.id === playerId);
    if (!targetPlayer) return;

    const isPlayerOnPitch = pitchPlayers.some((p) => p.id === playerId);
    let updatedPitch = [...pitchPlayers];
    let updatedBench = [...subBench];

    if (isPlayerOnPitch && subBench.length > 0) {
      const subIn = subBench.reduce((prev, curr) => (prev.seconds_played < curr.seconds_played ? prev : curr));
      updatedPitch = pitchPlayers.map((p) => (p.id === playerId ? { ...subIn, current_position: p.current_position } : p));
      updatedBench = subBench.filter((p) => p.id !== subIn.id);
    } else if (isPlayerOnPitch) {
      updatedPitch = pitchPlayers.filter((p) => p.id !== playerId);
    } else {
      updatedBench = subBench.filter((p) => p.id !== playerId);
    }

    setPitchPlayers(updatedPitch);
    setSubBench(updatedBench);
    setInjuredPlayers((prev) => [...prev, { ...targetPlayer, isInjured: true }]);
    setAvailablePlayerIds((prev) => prev.filter((id) => id !== playerId));

    recalculateFutureSubSchedule(updatedPitch, updatedBench, currentPitchCapacity);
  };

  const handleRecoverPlayer = (playerId: string) => {
    triggerHaptic();
    const playerToRecover = injuredPlayers.find((p) => p.id === playerId);
    if (!playerToRecover) return;

    setInjuredPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setAvailablePlayerIds((prev) => [...prev, playerId]);

    const updatedBench = [...subBench, { ...playerToRecover, isInjured: false, current_position: 'SUB' }];
    setSubBench(updatedBench);

    recalculateFutureSubSchedule(pitchPlayers, updatedBench, currentPitchCapacity);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isClockRunning && secondsRemaining > 0) {
      requestWakeLock();
      interval = setInterval(() => {
        setSecondsRemaining((prev) => prev - 1);
        setPitchPlayers((prevPitch) =>
          prevPitch.map((player) => ({
            ...player,
            seconds_played: player.seconds_played + 1,
          }))
        );
      }, 1000);
    } else if (secondsRemaining === 0 && isClockRunning) {
      setIsClockRunning(false);
      releaseWakeLock();
      triggerHaptic();
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockRunning, secondsRemaining]);

  const toggleClock = () => {
    triggerHaptic();
    if (!isClockRunning) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    setIsClockRunning(!isClockRunning);
  };

  const handleSubSwap = (benchPlayerId: string) => {
    triggerHaptic();
    if (!selectedOnPitch) return;
    const onPitchIndex = pitchPlayers.findIndex((p) => p.id === selectedOnPitch);
    const benchIndex = subBench.findIndex((p) => p.id === benchPlayerId);
    if (onPitchIndex === -1 || benchIndex === -1) return;

    const newPitch = [...pitchPlayers];
    const newBench = [...subBench];
    const outgoing = newPitch[onPitchIndex];
    const incoming = newBench[benchIndex];

    newPitch[onPitchIndex] = { ...incoming, current_position: outgoing.current_position };
    newBench[benchIndex] = { ...outgoing, current_position: 'SUB' };

    setPitchPlayers(newPitch);
    setSubBench(newBench);
    setSelectedOnPitch(null);
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

      newPitch[onPitchIndex] = { ...incoming, current_position: outgoing.current_position };
      newBench[benchIndex] = { ...outgoing, current_position: 'SUB' };

      setPitchPlayers(newPitch);
      setSubBench(newBench);
    }

    setGeneratedPlan((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status: 'completed' } : s))
    );
  };

  const handleLogGoal = (playerName: string, isOpponent = false) => {
    triggerHaptic();
    const currentMin = Math.max(1, Math.ceil((halfMinutes * 60 - secondsRemaining) / 60));
    setGoals((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        scorerName: playerName,
        minute: currentMin,
        isOpponent,
      },
    ]);
  };

  const togglePlayerAvailability = (id: string) => {
    triggerHaptic();
    setAvailablePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const getProjectedMinutes = () => {
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length === 0) return [];

    const totalMatchMins = halfMinutes * 2;
    const minutesMap: Record<string, number> = {};

    active.forEach((p) => {
      minutesMap[p.id] = 0;
    });

    if (gkMode === 'fixed' && fixedGkId && minutesMap[fixedGkId] !== undefined) {
      minutesMap[fixedGkId] = totalMatchMins;
      const outfield = active.filter((p) => p.id !== fixedGkId);
      const outfieldCapacity = currentPitchCapacity - 1;
      let currentPitch = outfield.slice(0, outfieldCapacity);
      let currentBench = outfield.slice(outfieldCapacity);

      for (let m = 1; m <= totalMatchMins; m++) {
        currentPitch.forEach((p) => (minutesMap[p.id] += 1));
        if (m % rotationIntervalMins === 0 && m < totalMatchMins) {
          for (let i = 0; i < subsPerBatch; i++) {
            if (currentBench.length === 0 || currentPitch.length === 0) break;
            const inc = currentBench.shift();
            const out = currentPitch.shift();
            if (inc && out) {
              currentPitch.push(inc);
              currentBench.push(out);
            }
          }
        }
      }
    } else if (gkMode === 'split' && fixedGkId && half2GkId) {
      minutesMap[fixedGkId] += halfMinutes + Math.min(maxGkOutfieldMins, halfMinutes);
      minutesMap[half2GkId] += halfMinutes + Math.min(maxGkOutfieldMins, halfMinutes);

      const pureOutfield = active.filter((p) => p.id !== fixedGkId && p.id !== half2GkId);
      const remainingPitchSeats = currentPitchCapacity - 1;
      
      if (pureOutfield.length > 0) {
        const totalOutfieldCapacityMins = remainingPitchSeats * totalMatchMins;
        const gkOutfieldConsumed = Math.min(maxGkOutfieldMins, halfMinutes) * 2;
        const netPoolForPureOutfield = totalOutfieldCapacityMins - gkOutfieldConsumed;
        const fairMinsPerPureOutfield = Math.round(netPoolForPureOutfield / pureOutfield.length);

        pureOutfield.forEach((p) => {
          minutesMap[p.id] = fairMinsPerPureOutfield;
        });
      }
    } else {
      let currentPitch = active.slice(0, currentPitchCapacity);
      let currentBench = active.slice(currentPitchCapacity);

      for (let m = 1; m <= totalMatchMins; m++) {
        currentPitch.forEach((p) => (minutesMap[p.id] += 1));
        if (m % rotationIntervalMins === 0 && m < totalMatchMins) {
          for (let i = 0; i < subsPerBatch; i++) {
            if (currentBench.length === 0 || currentPitch.length === 0) break;
            const inc = currentBench.shift();
            const out = currentPitch.shift();
            if (inc && out) {
              currentPitch.push(inc);
              currentBench.push(out);
            }
          }
        }
      }
    }

    return active.map((p) => ({
      ...p,
      projectedMins: minutesMap[p.id] || 0,
    }));
  };

  const handleGenerateMatchPlan = () => {
    triggerHaptic();
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length <= currentPitchCapacity) return;

    let gkPlayer: Player | undefined;
    let outfieldPlayers = [...active];

    if (fixedGkId) {
      gkPlayer = active.find((p) => p.id === fixedGkId);
      if (gkPlayer) outfieldPlayers = active.filter((p) => p.id !== fixedGkId);
    }

    const outfieldCapacity = currentPitchCapacity - 1;
    const startingOutfieldPitch = outfieldPlayers.slice(0, outfieldCapacity);
    const startingBench = outfieldPlayers.slice(outfieldCapacity);

    const fullStartingPitch = gkPlayer
      ? [{ ...gkPlayer, current_position: 'Goalkeeper' }, ...startingOutfieldPitch]
      : startingOutfieldPitch;

    setPitchPlayers(fullStartingPitch);
    setSubBench(startingBench);

    const plan: SubPlanStep[] = [];
    const totalMatchMins = halfMinutes * 2;

    let currentOutfieldPitch = [...startingOutfieldPitch];
    let currentBench = [...startingBench];
    let interval = rotationIntervalMins;

    while (interval < totalMatchMins) {
      if (gkMode === 'split' && interval === halfMinutes && half2GkId) {
        const h2Gk = active.find((p) => p.id === half2GkId);
        const h1Gk = active.find((p) => p.id === fixedGkId);

        if (h2Gk && h1Gk) {
          plan.push({
            id: Math.random().toString(),
            minute: interval,
            offPlayerId: h1Gk.id,
            offPlayerName: `#${h1Gk.squad_number} ${h1Gk.name} (GK)`,
            onPlayerId: h2Gk.id,
            onPlayerName: `#${h2Gk.squad_number} ${h2Gk.name} (GK)`,
            status: 'pending',
          });
        }
      }

      for (let i = 0; i < subsPerBatch; i++) {
        if (currentBench.length === 0 || currentOutfieldPitch.length === 0) break;

        const incoming = currentBench.shift();
        const outgoing = currentOutfieldPitch.shift();

        if (incoming && outgoing) {
          plan.push({
            id: Math.random().toString(),
            minute: interval,
            offPlayerId: outgoing.id,
            offPlayerName: `#${outgoing.squad_number} ${outgoing.name}`,
            onPlayerId: incoming.id,
            onPlayerName: `#${incoming.squad_number} ${incoming.name}`,
            status: 'pending',
          });

          currentOutfieldPitch.push(incoming);
          currentBench.push(outgoing);
        }
      }

      interval += rotationIntervalMins;
    }

    setGeneratedPlan(plan);
    setActiveTab('matchday');
  };

  const handleSaveAndFinishMatch = async () => {
    triggerHaptic();
    setSavingMatch(true);

    try {
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert([
          {
            opponent_name: opponentName,
            age_group: ageGroup,
            our_score: ourGoalsCount,
            opponent_score: opponentGoalsCount,
            player_of_the_match: playerOfTheMatch,
          },
        ])
        .select()
        .single();

      if (matchError || !matchData) {
        alert('Error saving match record.');
        setSavingMatch(false);
        return;
      }

      const allActiveMatchPlayers = [...pitchPlayers, ...subBench, ...injuredPlayers];
      const statsPayload = allActiveMatchPlayers.map((p) => {
        const playerGoalsCount = goals.filter((g) => !g.isOpponent && g.scorerName === p.name).length;
        return {
          match_id: matchData.id,
          player_id: p.id,
          seconds_played: p.seconds_played,
          goals_scored: playerGoalsCount,
          is_potm: playerOfTheMatch === p.name,
        };
      });

      const { error: statsError } = await supabase.from('match_player_stats').insert(statsPayload);

      if (statsError) {
        console.error('Error saving player stats:', statsError);
        alert('Match saved, but player stats failed to update.');
      } else {
        alert('Matchday results & player stats successfully saved to Supabase!');
        loadSquad();
        setActiveTab('stats');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred while saving.');
    } finally {
      setSavingMatch(false);
    }
  };

  const generateWhatsAppSummary = () => {
    let text = `⚽ *MATCHDAY RECAP — CO-GAFFER*\n`;
    text += `Vs. ${opponentName} (${ageGroup})\n`;
    text += `Score: Our Team ${ourGoalsCount} - ${opponentGoalsCount} ${opponentName}\n\n`;
    
    const ourGoals = goals.filter((g) => !g.isOpponent);
    if (ourGoals.length > 0) {
      text += `🎯 *Goals Scored:* ${ourGoals.length}\n`;
      ourGoals.forEach((g) => {
        text += `• ${g.scorerName} (${g.minute}')\n`;
      });
      text += `\n`;
    }

    if (playerOfTheMatch) {
      text += `⭐ *Player of the Match:* ${playerOfTheMatch}\n\n`;
    }

    text += `⏱️ *Playing Time Logged:*\n`;
    const combined = [...pitchPlayers, ...subBench];
    combined.forEach((p) => {
      text += `• #${p.squad_number} ${p.name}: ${Math.floor(p.seconds_played / 60)} mins\n`;
    });

    text += `\nEqual playing time achieved across all players! ⚽👏`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  const handleAddPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newNumber) return;

    const { error } = await supabase.from('players').insert([
      {
        name: newName,
        squad_number: parseInt(newNumber, 10),
        preferred_position: newPosition,
      },
    ]);

    if (!error) {
      setNewName('');
      setNewNumber('');
      loadSquad();
    }
  };

  const startEditPlayer = (player: Player) => {
    setEditingPlayerId(player.id);
    setEditName(player.name);
    setEditNumber(player.squad_number.toString());
    setEditPosition(player.preferred_position);
  };

  const saveEditPlayer = async (id: string) => {
    const { error } = await supabase
      .from('players')
      .update({
        name: editName,
        squad_number: parseInt(editNumber, 10),
        preferred_position: editPosition,
      })
      .eq('id', id);

    if (!error) {
      setEditingPlayerId(null);
      loadSquad();
    }
  };

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) loadSquad();
  };

  if (loading) {
    return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Co-Gaffer Dashboard...</div>;
  }

  const rec = getRecommendation();
  const squadMaxSeconds = Math.max(...squad.map((p) => p.total_seconds_played || 0), 1);

  const activeFormations = FORMATION_OPTIONS[basePitchCapacity] || [
    { label: 'Standard Formation', roles: Array(basePitchCapacity).fill('OUTFIELD') },
  ];
  const currentFormation = activeFormations[formationIndex] || activeFormations[0];

  const strikers = pitchPlayers.filter((_, idx) => currentFormation.roles[idx] === 'STR');
  const midfielders = pitchPlayers.filter((_, idx) => currentFormation.roles[idx] === 'MID');
  const defenders = pitchPlayers.filter((_, idx) => currentFormation.roles[idx] === 'DEF');
  const goalkeepers = pitchPlayers.filter((_, idx) => currentFormation.roles[idx] === 'GK' || idx === 0);

  const attendedCount = squad.filter((p) => trainingData[p.id]?.status === 'attended').length;

  return (
    <div className="bg-black text-white min-h-screen pb-20 p-4 font-sans select-none max-w-md mx-auto">
      {/* BRANDING HEADER */}
      <div className="flex justify-between items-center mb-3 px-1">
        <h1 className="text-xl font-black text-lime-400 tracking-tight flex items-center gap-1.5">
          <span>📋</span> CO-GAFFER
        </h1>
        <div className="flex items-center gap-2">
          {wakeLock && (
            <span className="text-[10px] bg-lime-500/20 text-lime-400 border border-lime-500/40 px-2 py-0.5 rounded font-bold">
              🔒 AWAKE
            </span>
          )}
          <span className="text-[10px] bg-gray-900 border border-gray-800 text-lime-400 font-extrabold px-2 py-0.5 rounded tracking-wider uppercase">
            ASSISTANT COACH
          </span>
        </div>
      </div>

      {/* TAB 1: MATCHDAY TOUCHLINE */}
      {activeTab === 'matchday' && (
        <div>
          <div className="bg-gray-950 p-2.5 rounded-xl mb-3 border border-gray-850 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <select
                value={ageGroup}
                onChange={(e) => applyAgePreset(e.target.value)}
                className="bg-black border border-gray-800 text-lime-400 font-black text-xs rounded p-2 focus:outline-none focus:border-lime-400 flex-1 mr-2"
              >
                {Object.keys(AGE_PRESETS).map((key) => (
                  <option key={key} value={key}>
                    {AGE_PRESETS[key].label}
                  </option>
                ))}
              </select>

              <button
                onClick={() => setViewMode(viewMode === 'pitch' ? 'cards' : 'pitch')}
                className="text-[10px] bg-lime-500 text-black font-extrabold px-2.5 py-2 rounded shadow shrink-0 mr-1.5"
              >
                {viewMode === 'pitch' ? '🎴 CARDS' : '🏟️ BOARD'}
              </button>

              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs bg-gray-900 border border-gray-800 text-gray-300 font-bold px-2 py-2 rounded"
              >
                ⚙️
              </button>
            </div>

            {showSettings && (
              <div className="pt-2 border-t border-gray-850 flex justify-between items-center text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px]">PITCH SEATS:</span>
                  <input
                    type="number"
                    value={basePitchCapacity}
                    onChange={(e) => setBasePitchCapacity(parseInt(e.target.value, 10) || 5)}
                    className="bg-black border border-gray-800 text-lime-400 font-bold p-1 w-12 text-center rounded"
                  />
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px]">HALF MINS:</span>
                  <input
                    type="number"
                    value={halfMinutes}
                    onChange={(e) => handleHalfMinutesChange(parseInt(e.target.value, 10) || 20)}
                    className="bg-black border border-gray-800 text-lime-400 font-bold p-1 w-12 text-center rounded"
                  />
                </div>
              </div>
            )}
          </div>

          {(goalDifference >= 4 || isPowerplayActive) && (
            <div className="bg-purple-950 border border-purple-500/50 p-3 rounded-xl mb-3 flex justify-between items-center">
              <div>
                <span className="text-xs font-extrabold text-purple-300 block">⚡ FA POWERPLAY RULE</span>
                <span className="text-[10px] text-gray-300">
                  {isPowerplayActive ? 'Extra player active (+1 pitch seat)' : '4+ goals behind! Add extra player'}
                </span>
              </div>
              <button
                onClick={togglePowerplay}
                className={`px-3 py-1.5 font-black text-xs rounded-lg transition-all ${
                  isPowerplayActive ? 'bg-purple-400 text-black' : 'bg-purple-600 text-white'
                }`}
              >
                {isPowerplayActive ? 'DISABLE' : 'ENABLE (+1)'}
              </button>
            </div>
          )}

          <div className="bg-gray-900 p-4 rounded-xl mb-4 border border-gray-800">
            <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase">OUR TEAM</span>
                  <span className="text-2xl font-black text-lime-400 font-mono">{ourGoalsCount}</span>
                </div>
                <span className="text-gray-600 font-black text-lg">-</span>
                <div className="text-center">
                  <span className="text-[10px] text-gray-400 font-bold block uppercase truncate max-w-[70px]">{opponentName}</span>
                  <span className="text-2xl font-black text-red-400 font-mono">{opponentGoalsCount}</span>
                </div>
              </div>

              <button
                onClick={() => handleLogGoal(opponentName, true)}
                className="px-2.5 py-1.5 bg-red-500/20 text-red-400 border border-red-500/40 rounded font-black text-[10px] active:scale-95"
              >
                + OPPONENT GOAL
              </button>
            </div>

            <div className="flex justify-between items-center">
              <div>
                <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
                  {ageGroup === 'U7' ? `Mini-Game ${currentPeriod}` : `Half ${currentPeriod}`} — Live
                </span>
                <h1 className="text-2xl font-black text-lime-400 font-mono tracking-tight">
                  {formatTime(secondsRemaining)}
                </h1>
              </div>
              <button
                onClick={toggleClock}
                className={`px-5 py-3 font-black text-sm rounded-lg active:scale-95 transition-all ${
                  isClockRunning ? 'bg-red-500 text-white' : 'bg-lime-500 text-black'
                }`}
              >
                {isClockRunning ? 'PAUSE' : 'START'}
              </button>
            </div>
          </div>

          {pendingPlanSteps.length > 0 && (
            <div className="bg-gray-900 p-3.5 rounded-xl border border-lime-500/40 mb-4">
              <h3 className="text-xs font-black text-lime-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                <span>⏱️ Upcoming Pre-Planned Subs ({pendingPlanSteps.length})</span>
                <span className="text-[10px] text-gray-400 font-normal">Tap to execute</span>
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {pendingPlanSteps.map((step) => (
                  <div key={step.id} className="bg-black border border-lime-500/30 p-2.5 rounded-lg shrink-0 min-w-[140px] flex flex-col justify-between">
                    <div>
                      <span className="text-[10px] font-mono text-lime-400 font-bold block mb-1">MIN {step.minute}'</span>
                      <span className="text-red-400 block font-bold text-[11px]">OFF: {step.offPlayerName}</span>
                      <span className="text-lime-400 block font-bold text-[11px] mb-2">ON: {step.onPlayerName}</span>
                    </div>
                    <button
                      onClick={() => handleApplyScheduledSub(step.id)}
                      className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-1.5 rounded text-[10px] active:scale-95 shadow transition-all"
                    >
                      ⚡ EXECUTE SUB
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'pitch' ? (
            <div className="mb-6 bg-gray-900 p-3.5 rounded-2xl border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase tracking-widest text-lime-400 font-bold">
                  🏟️ Tactical Pitch ({pitchPlayers.length}/{currentPitchCapacity})
                </span>
                {activeFormations.length > 0 && (
                  <select
                    value={formationIndex}
                    onChange={(e) => setFormationIndex(parseInt(e.target.value, 10))}
                    className="bg-black border border-gray-800 text-lime-400 font-bold text-[10px] rounded px-2 py-1"
                  >
                    {activeFormations.map((f, i) => (
                      <option key={i} value={i}>{f.label}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="relative bg-emerald-900 border-2 border-emerald-500/60 rounded-xl p-3 min-h-[380px] flex flex-col justify-between shadow-inner overflow-hidden">
                <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-500/30 -translate-y-1/2" />
                <div className="absolute top-1/2 left-1/2 w-20 h-20 border border-emerald-500/30 rounded-full -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute top-0 left-1/2 w-32 h-10 border-b border-x border-emerald-500/30 rounded-b-lg -translate-x-1/2" />
                <div className="absolute bottom-0 left-1/2 w-32 h-10 border-t border-x border-emerald-500/30 rounded-t-lg -translate-x-1/2" />

                <div className="relative z-10 flex flex-col justify-between h-full min-h-[360px] py-1 gap-2">
                  {strikers.length > 0 && (
                    <div className="flex justify-around items-center">
                      {strikers.map((player) => {
                        const isSelected = selectedOnPitch === player.id;
                        return (
                          <button
                            key={player.id}
                            onClick={() => {
                              triggerHaptic();
                              setSelectedOnPitch(isSelected ? null : player.id);
                            }}
                            className={`p-2 rounded-xl text-center transition-all border ${
                              isSelected ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-xl' : 'bg-black/80 border-lime-400/50 text-white'
                            }`}
                          >
                            <span className="text-[10px] font-black block">#{player.squad_number} {player.name}</span>
                            <span className="text-[9px] font-mono text-lime-300">STR • {formatPlayerMins(player.seconds_played)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {midfielders.length > 0 && (
                    <div className="flex justify-around items-center">
                      {midfielders.map((player) => {
                        const isSelected = selectedOnPitch === player.id;
                        return (
                          <button
                            key={player.id}
                            onClick={() => {
                              triggerHaptic();
                              setSelectedOnPitch(isSelected ? null : player.id);
                            }}
                            className={`p-2 rounded-xl text-center transition-all border ${
                              isSelected ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-xl' : 'bg-black/80 border-lime-400/50 text-white'
                            }`}
                          >
                            <span className="text-[10px] font-black block">#{player.squad_number} {player.name}</span>
                            <span className="text-[9px] font-mono text-lime-300">MID • {formatPlayerMins(player.seconds_played)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {defenders.length > 0 && (
                    <div className="flex justify-around items-center">
                      {defenders.map((player) => {
                        const isSelected = selectedOnPitch === player.id;
                        return (
                          <button
                            key={player.id}
                            onClick={() => {
                              triggerHaptic();
                              setSelectedOnPitch(isSelected ? null : player.id);
                            }}
                            className={`p-2 rounded-xl text-center transition-all border ${
                              isSelected ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-xl' : 'bg-black/80 border-lime-400/50 text-white'
                            }`}
                          >
                            <span className="text-[10px] font-black block">#{player.squad_number} {player.name}</span>
                            <span className="text-[9px] font-mono text-lime-300">DEF • {formatPlayerMins(player.seconds_played)}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-center items-center">
                    {goalkeepers.slice(0, 1).map((player) => {
                      const isSelected = selectedOnPitch === player.id;
                      return (
                        <button
                          key={player.id}
                          onClick={() => {
                            triggerHaptic();
                            setSelectedOnPitch(isSelected ? null : player.id);
                          }}
                          className={`p-2 rounded-xl text-center transition-all border ${
                            isSelected ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-xl' : 'bg-black/90 border-lime-400 text-white'
                          }`}
                        >
                          <span className="text-[10px] font-black block">🧤 #{player.squad_number} {player.name}</span>
                          <span className="text-[9px] font-mono text-lime-300">GK • {formatPlayerMins(player.seconds_played)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold flex justify-between">
                <span>On Pitch ({pitchPlayers.length}/{currentPitchCapacity})</span>
                {isPowerplayActive && <span className="text-purple-400">⚡ POWERPLAY (+1)</span>}
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {pitchPlayers.map((player) => {
                  const isSelected = selectedOnPitch === player.id;
                  const isFixedGk = gkMode === 'fixed' && player.id === fixedGkId;

                  return (
                    <div key={player.id} className="relative">
                      <button
                        onClick={() => {
                          triggerHaptic();
                          setSelectedOnPitch(isSelected ? null : player.id);
                        }}
                        className={`w-full p-3.5 rounded-xl border-2 text-left transition-all relative ${
                          isSelected
                            ? 'bg-yellow-500 border-yellow-300 text-black scale-102 shadow-lg'
                            : isFixedGk
                            ? 'bg-gray-900 border-lime-500 text-white'
                            : 'bg-gray-900 border-gray-800 text-white'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-extrabold text-base">
                            #{player.squad_number} {player.name}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded font-black ${isSelected ? 'bg-black text-yellow-500' : isFixedGk ? 'bg-lime-500 text-black' : 'bg-gray-800 text-lime-400'}`}>
                            {isFixedGk ? 'GK (LOCKED)' : player.current_position}
                          </span>
                        </div>

                        <div className="flex justify-between items-center text-xs font-mono opacity-90 mt-2">
                          <span>{formatPlayerMins(player.seconds_played)} played</span>
                        </div>
                      </button>

                      <div className="flex gap-1 mt-1">
                        <button
                          onClick={() => handleLogGoal(player.name, false)}
                          className="flex-1 bg-gray-950 hover:bg-lime-500 hover:text-black border border-gray-800 text-gray-300 text-[10px] font-bold py-1 rounded transition-all"
                        >
                          ⚽ GOAL
                        </button>
                        <button
                          onClick={() => handleMarkInjured(player.id)}
                          className="bg-red-950 hover:bg-red-600 text-red-300 hover:text-white border border-red-800 text-[10px] font-bold px-2 py-1 rounded transition-all"
                        >
                          🏥 INJURY
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold flex justify-between">
              <span>Substitutes Bench ({subBench.length})</span>
              <span className="text-lime-400">⭐ Priority Sub</span>
            </h2>
            <div className="flex flex-col gap-2">
              {subBench.map((player) => {
                const isLowest = player.seconds_played === lowestSeconds;

                return (
                  <div key={player.id} className="flex gap-2">
                    <button
                      disabled={!selectedOnPitch}
                      onClick={() => handleSubSwap(player.id)}
                      className={`flex-1 p-3.5 rounded-xl flex justify-between items-center text-left border transition-all ${
                        selectedOnPitch
                          ? 'bg-amber-500/10 border-amber-500 text-amber-200 active:bg-amber-500 active:text-black'
                          : isLowest
                          ? 'bg-gray-950 border-lime-500/50 text-gray-300'
                          : 'bg-gray-950 border-gray-800 text-gray-500'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>
                          <span className="font-extrabold text-base">#{player.squad_number} {player.name}</span>
                          <span className="ml-3 text-xs font-mono">{formatPlayerMins(player.seconds_played)}</span>
                        </div>
                      </div>

                      {selectedOnPitch ? (
                        <span className="font-black text-xs">SUB ON →</span>
                      ) : isLowest ? (
                        <span className="bg-lime-500/20 text-lime-400 border border-lime-500/40 text-[10px] px-2 py-0.5 rounded font-bold">
                          LOWEST MINS
                        </span>
                      ) : null}
                    </button>
                    <button
                      onClick={() => handleMarkInjured(player.id)}
                      className="bg-red-950 border border-red-800 text-red-400 font-bold px-2.5 rounded-xl text-xs"
                    >
                      🏥
                    </button>
                  </div>
                );
              })}
            </div>

            {injuredPlayers.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-800">
                <h3 className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider flex justify-between items-center">
                  <span>🏥 Injured / Resting ({injuredPlayers.length})</span>
                  <span className="text-[10px] text-gray-400">Tap to return to play</span>
                </h3>
                <div className="flex flex-col gap-1.5">
                  {injuredPlayers.map((player) => (
                    <div key={player.id} className="p-2.5 bg-black rounded-lg border border-red-900/50 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-gray-300">#{player.squad_number} {player.name}</span>
                        <span className="ml-2 font-mono text-[10px] text-gray-500">{formatPlayerMins(player.seconds_played)}</span>
                      </div>
                      <button
                        onClick={() => handleRecoverPlayer(player.id)}
                        className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black font-extrabold text-[10px] px-2.5 py-1 rounded transition-all"
                      >
                        ✓ RECOVERED / SUB ON
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex flex-col gap-3">
            <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">
              💾 Finish Match & Sync to Supabase
            </h2>
            <input
              type="text"
              placeholder="Opponent Name"
              value={opponentName}
              onChange={(e) => setOpponentName(e.target.value)}
              className="bg-black border border-gray-800 rounded p-2.5 text-xs text-white"
            />
            <select
              value={playerOfTheMatch || ''}
              onChange={(e) => setPlayerOfTheMatch(e.target.value || null)}
              className="bg-black border border-gray-800 rounded p-2.5 text-xs text-white"
            >
              <option value="">Select Star Player of the Match</option>
              {[...pitchPlayers, ...subBench, ...injuredPlayers].map((p) => (
                <option key={p.id} value={p.name}>#{p.squad_number} {p.name}</option>
              ))}
            </select>

            <div className="flex gap-2">
              <button
                onClick={generateWhatsAppSummary}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black p-3 rounded-xl text-xs active:scale-95 transition-all"
              >
                💬 WHATSAPP RECAP
              </button>
              <button
                onClick={handleSaveAndFinishMatch}
                disabled={savingMatch}
                className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-black p-3 rounded-xl text-xs active:scale-95 transition-all disabled:opacity-50"
              >
                {savingMatch ? 'SAVING...' : '💾 SAVE TO DATABASE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: 🏋️ TRAINING ATTENDANCE & EFFORT RATING DRAWER */}
      {activeTab === 'training' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-2">Midweek Training Tracker</h1>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4 flex justify-between items-center">
            <div>
              <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
                Session Date
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-black border border-gray-800 text-lime-400 font-black text-xs rounded p-2 focus:outline-none"
              />
            </div>
            <div className="text-right">
              <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Attendance Rate</span>
              <span className="text-lg font-mono font-black text-lime-400">
                {attendedCount}/{squad.length} ({Math.round((attendedCount / (squad.length || 1)) * 100)}%)
              </span>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between items-center">
              <span>📋 Attendance & Effort Ratings</span>
              <span className="text-[10px] text-gray-400">1-5 Stars Focus/Effort</span>
            </h2>

            <div className="flex flex-col gap-3">
              {squad.map((player) => {
                const rec = trainingData[player.id] || {
                  playerId: player.id,
                  status: 'attended',
                  effortRating: 5,
                  notes: '',
                };

                return (
                  <div key={player.id} className="p-3 bg-black rounded-xl border border-gray-800">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-extrabold text-sm text-white">
                        #{player.squad_number} {player.name}
                      </span>

                      <div className="flex gap-1">
                        <button
                          onClick={() => handleTrainingStatusChange(player.id, 'attended')}
                          className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                            rec.status === 'attended'
                              ? 'bg-emerald-500 text-black'
                              : 'bg-gray-900 text-gray-400 border border-gray-800'
                          }`}
                        >
                          PRESENT
                        </button>
                        <button
                          onClick={() => handleTrainingStatusChange(player.id, 'absent')}
                          className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                            rec.status === 'absent'
                              ? 'bg-red-500 text-white'
                              : 'bg-gray-900 text-gray-400 border border-gray-800'
                          }`}
                        >
                          ABSENT
                        </button>
                        <button
                          onClick={() => handleTrainingStatusChange(player.id, 'excused')}
                          className={`px-2 py-1 rounded text-[10px] font-black transition-all ${
                            rec.status === 'excused'
                              ? 'bg-amber-500 text-black'
                              : 'bg-gray-900 text-gray-400 border border-gray-800'
                          }`}
                        >
                          EXCUSED
                        </button>
                      </div>
                    </div>

                    {rec.status === 'attended' && (
                      <div className="mt-2.5 pt-2.5 border-t border-gray-900 flex flex-col gap-2">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] text-gray-400 font-bold uppercase">Focus / Effort Rating:</span>
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => handleRatingChange(player.id, star)}
                                className={`text-xs ${
                                  star <= rec.effortRating ? 'text-amber-400 scale-110' : 'text-gray-700'
                                }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                        </div>

                        <input
                          type="text"
                          placeholder="Drill notes (e.g. Sharp 1v1s, good positioning)"
                          value={rec.notes}
                          onChange={(e) => handleNotesChange(player.id, e.target.value)}
                          className="w-full bg-gray-950 border border-gray-850 rounded p-2 text-[11px] text-gray-300 focus:outline-none focus:border-lime-400"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <button
            onClick={applyTrainingToAvailability}
            className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black p-4 rounded-xl text-sm active:scale-95 transition-all shadow-lg mb-6"
          >
            ⚡ SYNC ATTENDED PLAYERS TO MATCHDAY PLANNER
          </button>
        </div>
      )}

      {/* TAB 3: PLANNER */}
      {activeTab === 'planner' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-2">Matchday Scheduler</h1>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
              ⏱️ Match Half Duration ({halfMinutes}m per half = {halfMinutes * 2}m total)
            </label>
            <div className="flex gap-2 mb-3">
              {[20, 25, 30, 35].map((mins) => (
                <button
                  key={mins}
                  onClick={() => handleHalfMinutesChange(mins)}
                  className={`flex-1 py-2 rounded text-xs font-bold border transition-all ${
                    halfMinutes === mins
                      ? 'bg-lime-500 text-black border-lime-400'
                      : 'bg-black border-gray-800 text-gray-400 hover:border-gray-700'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 pt-2 border-t border-gray-800">
              <span className="text-xs font-bold text-gray-400">Custom Half Duration:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={halfMinutes}
                  onChange={(e) => handleHalfMinutesChange(parseInt(e.target.value, 10) || 20)}
                  className="bg-black border border-gray-800 rounded p-1.5 w-16 text-center text-xs font-bold text-lime-400 focus:outline-none focus:border-lime-400"
                />
                <span className="text-xs text-gray-400 font-bold">mins</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
              🧤 Goalkeeper Strategy
            </label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setGkMode('fixed')}
                className={`flex-1 py-2 rounded text-xs font-bold border ${
                  gkMode === 'fixed' ? 'bg-lime-500 text-black border-lime-400' : 'bg-black border-gray-800 text-gray-400'
                }`}
              >
                Fixed GK (Full Match)
              </button>
              <button
                onClick={() => setGkMode('split')}
                className={`flex-1 py-2 rounded text-xs font-bold border ${
                  gkMode === 'split' ? 'bg-lime-500 text-black border-lime-400' : 'bg-black border-gray-800 text-gray-400'
                }`}
              >
                Split Halves / Dual GK
              </button>
            </div>

            {gkMode === 'fixed' ? (
              <select
                value={fixedGkId || ''}
                onChange={(e) => setFixedGkId(e.target.value || null)}
                className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-white text-xs font-bold"
              >
                <option value="">No Fixed GK (Rotate everyone)</option>
                {squad
                  .filter((p) => availablePlayerIds.includes(p.id))
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      #{p.squad_number} {p.name} ({p.preferred_position})
                    </option>
                  ))}
              </select>
            ) : (
              <div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Half 1 Goalkeeper</label>
                    <select
                      value={fixedGkId || ''}
                      onChange={(e) => setFixedGkId(e.target.value || null)}
                      className="w-full bg-black border border-gray-800 rounded p-2 text-white text-xs font-bold"
                    >
                      <option value="">Select H1 GK</option>
                      {squad
                        .filter((p) => availablePlayerIds.includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
                        ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-400 mb-1">Half 2 Goalkeeper</label>
                    <select
                      value={half2GkId || ''}
                      onChange={(e) => setHalf2GkId(e.target.value || null)}
                      className="w-full bg-black border border-gray-800 rounded p-2 text-white text-xs font-bold"
                    >
                      <option value="">Select H2 GK</option>
                      {squad
                        .filter((p) => availablePlayerIds.includes(p.id))
                        .map((p) => (
                          <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="p-2.5 bg-black rounded-lg border border-gray-800">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-gray-300">Max Outfield Mins for GKs:</span>
                    <select
                      value={maxGkOutfieldMins}
                      onChange={(e) => setMaxGkOutfieldMins(parseInt(e.target.value, 10))}
                      className="bg-gray-900 border border-gray-700 rounded p-1 text-lime-400 font-bold"
                    >
                      <option value={5}>5 mins max</option>
                      <option value={8}>8 mins max</option>
                      <option value={10}>10 mins max (Recommended)</option>
                      <option value={12}>12 mins max</option>
                      <option value={15}>15 mins max</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-300 font-bold mb-3 flex justify-between">
              <span>Select Available Players ({availablePlayerIds.length}/{squad.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {squad.map((player) => {
                const isChecked = availablePlayerIds.includes(player.id);
                const isGk = player.id === fixedGkId || player.id === half2GkId;

                return (
                  <button
                    key={player.id}
                    onClick={() => togglePlayerAvailability(player.id)}
                    className={`p-2.5 rounded-lg text-left border font-bold text-xs flex justify-between items-center ${
                      isGk
                        ? 'bg-lime-500/20 border-lime-500 text-lime-400'
                        : isChecked
                        ? 'bg-lime-500/10 border-lime-500/50 text-lime-300'
                        : 'bg-black border-gray-800 text-gray-500'
                    }`}
                  >
                    <span>#{player.squad_number} {player.name} {isGk ? '🧤' : ''}</span>
                    <span>{isChecked ? '✓' : '+'}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {availablePlayerIds.length > currentPitchCapacity && (
            <div className="bg-lime-500/10 border border-lime-500/40 p-3 rounded-xl mb-4 text-xs">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-lime-400 font-black">💡 CO-GAFFER RECOMMENDATION</span>
              </div>
              <p className="text-gray-300 text-[11px] font-medium">{rec.note}</p>
              <button
                onClick={() => {
                  setRotationIntervalMins(rec.interval);
                  setSubsPerBatch(rec.batch);
                }}
                className="mt-2 bg-lime-500 text-black font-extrabold px-3 py-1 rounded text-[10px] hover:bg-lime-400"
              >
                APPLY RECOMMENDATION ({rec.interval}m / {rec.batch} subs)
              </button>
            </div>
          )}

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Rotation Frequency
                </label>
                <select
                  value={rotationIntervalMins}
                  onChange={(e) => setRotationIntervalMins(parseInt(e.target.value, 10))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-white text-xs font-bold focus:outline-none focus:border-lime-400"
                >
                  <option value={5}>Every 5 mins</option>
                  <option value={6}>Every 6 mins</option>
                  <option value={7}>Every 7 mins</option>
                  <option value={8}>Every 8 mins</option>
                  <option value={10}>Every 10 mins</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1.5 uppercase tracking-wider">
                  Subs per Batch
                </label>
                <select
                  value={subsPerBatch}
                  onChange={(e) => setSubsPerBatch(parseInt(e.target.value, 10))}
                  className="w-full bg-black border border-gray-800 rounded-lg p-2.5 text-white text-xs font-bold focus:outline-none focus:border-lime-400"
                >
                  <option value={1}>1 Player at a time</option>
                  <option value={2}>2 Players at once</option>
                  <option value={3}>3 Players at once</option>
                </select>
              </div>
            </div>
          </div>

          {availablePlayerIds.length > 0 && (
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
              <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between">
                <span>📊 Projected Playing Time Breakdown</span>
                <span>{halfMinutes * 2}m Total Match</span>
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {getProjectedMinutes().map((player) => (
                  <div
                    key={player.id}
                    className="p-2.5 bg-black rounded-lg border border-gray-800 flex justify-between items-center text-xs"
                  >
                    <span className="font-bold text-gray-300">
                      #{player.squad_number} {player.name}
                      {player.id === fixedGkId || player.id === half2GkId ? ' 🧤' : ''}
                    </span>
                    <span className="font-mono font-extrabold text-lime-400">
                      {player.projectedMins}m
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleGenerateMatchPlan}
            className="w-full bg-lime-500 text-black font-black p-4 rounded-xl text-sm active:scale-95 transition-all shadow-lg"
          >
            ⚡ GENERATE LINEUP & SUB SCHEDULE
          </button>
        </div>
      )}

      {/* TAB 4: TEAM ROSTER MANAGEMENT */}
      {activeTab === 'squad' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-4">Team Roster Manager</h1>

          <form onSubmit={handleAddPlayer} className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">Add New Player</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Player Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-lime-400 text-xs font-bold"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Kit #"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg p-3 text-white w-1/3 focus:outline-none focus:border-lime-400 text-xs font-bold"
                />
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg p-3 text-white w-2/3 focus:outline-none focus:border-lime-400 text-xs font-bold"
                >
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Striker">Striker</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-lime-500 text-black font-black p-3 rounded-lg active:scale-95 transition-all text-xs"
              >
                + ADD TO ROSTER
              </button>
            </div>
          </form>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold flex justify-between">
              <span>Active Roster ({squad.length})</span>
              <span className="text-lime-400">Tap to edit details</span>
            </h2>

            <div className="flex flex-col gap-2.5">
              {squad.map((player) => {
                const isEditing = editingPlayerId === player.id;

                return (
                  <div key={player.id} className="p-3 bg-black rounded-xl border border-gray-800">
                    {isEditing ? (
                      <div className="flex flex-col gap-2">
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="bg-gray-900 border border-gray-700 rounded p-2 text-xs font-bold text-white"
                        />
                        <div className="flex gap-2">
                          <input
                            type="number"
                            value={editNumber}
                            onChange={(e) => setEditNumber(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-xs font-bold text-white w-1/3"
                          />
                          <select
                            value={editPosition}
                            onChange={(e) => setEditPosition(e.target.value)}
                            className="bg-gray-900 border border-gray-700 rounded p-2 text-xs font-bold text-white w-2/3"
                          >
                            <option value="Goalkeeper">Goalkeeper</option>
                            <option value="Defender">Defender</option>
                            <option value="Midfielder">Midfielder</option>
                            <option value="Striker">Striker</option>
                          </select>
                        </div>
                        <div className="flex gap-2 mt-1">
                          <button
                            onClick={() => saveEditPlayer(player.id)}
                            className="flex-1 bg-lime-500 text-black font-extrabold py-1.5 rounded text-xs"
                          >
                            SAVE
                          </button>
                          <button
                            onClick={() => setEditingPlayerId(null)}
                            className="bg-gray-800 text-gray-300 font-bold px-3 py-1.5 rounded text-xs"
                          >
                            CANCEL
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <div>
                            <span className="font-extrabold text-base mr-2">#{player.squad_number} {player.name}</span>
                            <span className="text-[10px] text-lime-400 bg-lime-500/10 border border-lime-500/30 px-2 py-0.5 rounded font-bold">
                              {player.preferred_position}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => startEditPlayer(player)}
                              className="text-gray-400 hover:text-white font-bold text-xs px-2 py-1 bg-gray-900 rounded border border-gray-800"
                            >
                              ✏️ EDIT
                            </button>
                            <button
                              onClick={() => handleDeletePlayer(player.id)}
                              className="text-red-500 hover:text-red-400 font-bold text-xs px-2 py-1 bg-red-950/40 rounded border border-red-900/40"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 text-[10px] bg-gray-950 p-2 rounded-lg text-center font-mono text-gray-400 border border-gray-850">
                          <div>
                            <span className="block text-gray-500 text-[9px]">MATCHES</span>
                            <span className="font-bold text-white">{player.total_matches}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-[9px]">MINS</span>
                            <span className="font-bold text-lime-400">{Math.floor((player.total_seconds_played || 0) / 60)}m</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-[9px]">GOALS</span>
                            <span className="font-bold text-amber-400">{player.total_goals}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500 text-[9px]">POTM</span>
                            <span className="font-bold text-purple-400">{player.total_potm} ⭐</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: AUDIT & MATCH HISTORY */}
      {activeTab === 'stats' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-4">Season Equal-Time Audit</h1>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between items-center">
              <span>⏱️ Team Playing Time Audit</span>
              <span className="text-[10px] text-gray-400">FA 100% Equal Rotation</span>
            </h2>

            <div className="flex flex-col gap-3">
              {squad.map((player) => {
                const mins = Math.floor((player.total_seconds_played || 0) / 60);
                const percentOfMax = Math.round(((player.total_seconds_played || 0) / squadMaxSeconds) * 100);

                return (
                  <div key={player.id} className="bg-black p-3 rounded-lg border border-gray-800">
                    <div className="flex justify-between items-center text-xs mb-1 font-bold">
                      <span className="text-gray-200">#{player.squad_number} {player.name}</span>
                      <span className="font-mono text-lime-400">{mins} mins ({player.total_matches} matches)</span>
                    </div>
                    <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                      <div
                        className={`h-full transition-all ${
                          percentOfMax >= 85 ? 'bg-lime-500' : percentOfMax >= 60 ? 'bg-amber-400' : 'bg-red-500'
                        }`}
                        style={{ width: `${Math.max(percentOfMax, 5)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">
              📜 Saved Match History ({matchHistory.length})
            </h2>
            <div className="flex flex-col gap-2">
              {matchHistory.map((m) => (
                <div key={m.id} className="p-3 bg-black rounded-lg border border-gray-800 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white block">Vs. {m.opponent_name} ({m.age_group})</span>
                    <span className="text-[10px] text-gray-400 font-mono">{m.match_date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-black text-sm text-lime-400 block">
                      {m.our_score} - {m.opponent_score}
                    </span>
                    {m.player_of_the_match && (
                      <span className="text-[10px] text-purple-300 font-bold">⭐ {m.player_of_the_match}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* BOTTOM NAVIGATION BAR */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950 border-t border-gray-800 p-2 flex justify-around max-w-md mx-auto z-50">
        <button
          onClick={() => setActiveTab('matchday')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'matchday' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          ⚽ MATCH
        </button>
        <button
          onClick={() => setActiveTab('training')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'training' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          🏋️ TRAINING
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'planner' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📅 PLANNER
        </button>
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'squad' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📋 TEAM
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'stats' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📊 AUDIT
        </button>
      </div>
    </div>
  );
}