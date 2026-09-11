'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Player, TrainingRecord, SubPlanStep, MatchGoal, SavedMatch } from '@/types/matchday';
import MatchdayTab from '@/components/MatchdayTab';
import PlannerTab from '@/components/PlannerTab';
import TrainingTab from '@/components/TrainingTab';
import SquadTab from '@/components/SquadTab';
import AuditTab from '@/components/AuditTab';

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
    { label: '2-1-1 (Solid Base)', roles: ['GK', 'L-DEF', 'R-DEF', 'C-MID', 'C-STR'] },
    { label: '1-2-1 (Diamond)', roles: ['GK', 'C-DEF', 'L-MID', 'R-MID', 'C-STR'] },
  ],
  6: [
    { label: '2-2-1 (Balanced 6s)', roles: ['GK', 'L-DEF', 'R-DEF', 'L-MID', 'R-MID', 'C-STR'] },
    { label: '1-3-1 (Midfield Overload)', roles: ['GK', 'C-DEF', 'L-MID', 'C-MID', 'R-MID', 'C-STR'] },
  ],
  7: [
    { label: '2-3-1 (Standard 7v7)', roles: ['GK', 'L-DEF', 'R-DEF', 'L-MID', 'C-MID', 'R-MID', 'C-STR'] },
    { label: '3-2-1 (Tree)', roles: ['GK', 'L-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'R-MID', 'C-STR'] },
  ],
  9: [
    { label: '3-3-2 (Standard 9v9)', roles: ['GK', 'L-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'C-MID', 'R-MID', 'L-STR', 'R-STR'] },
    { label: '3-4-1 (Midfield Heavy)', roles: ['GK', 'L-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'C-MID', 'C-MID', 'R-MID', 'C-STR'] },
  ],
  11: [
    { label: '4-3-3 (Attacking)', roles: ['GK', 'L-DEF', 'C-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'C-MID', 'R-MID', 'L-STR', 'C-STR', 'R-STR'] },
    { label: '4-4-2 (Classic)', roles: ['GK', 'L-DEF', 'C-DEF', 'C-DEF', 'R-DEF', 'L-MID', 'C-MID', 'C-MID', 'R-MID', 'L-STR', 'R-STR'] },
  ]
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

  const [sessionDate, setSessionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [trainingData, setTrainingData] = useState<Record<string, TrainingRecord>>({});
  const [ageGroup, setAgeGroup] = useState<string>('U8-U9');
  const [basePitchCapacity, setBasePitchCapacity] = useState<number>(5);
  const [halfMinutes, setHalfMinutes] = useState<number>(25);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'pitch' | 'cards'>('pitch');
  const [formationIndex, setFormationIndex] = useState<number>(0);
  const [editingPositionPlayerId, setEditingPositionPlayerId] = useState<string | null>(null);
  const [targetSubPosition, setTargetSubPosition] = useState<string | null>(null);
  const [isPowerplayActive, setIsPowerplayActive] = useState<boolean>(false);

  const [planOffPlayerId, setPlanOffPlayerId] = useState<string>('');
  const [planOnPlayerId, setPlanOnPlayerId] = useState<string>('');
  const [planMinute, setPlanMinute] = useState<number>(7);
  const [planTargetPos, setPlanTargetPos] = useState<string>('C-MID');
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [starterMap, setStarterMap] = useState<Record<string, string>>({});
  const [gkStrategy, setGkStrategy] = useState<'full' | 'half' | 'rotate'>('half');
  const [halfTwoGkId, setHalfTwoGkId] = useState<string>('');
  const [rotationIntervalMins, setRotationIntervalMins] = useState<number>(5);
  const [subsPerBatch, setSubsPerBatch] = useState<number | 'dynamic'>('dynamic');
  const [generatedPlan, setGeneratedPlan] = useState<SubPlanStep[]>([]);

  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [secondsRemaining, setSecondsRemaining] = useState<number>(25 * 60);
  const [isClockRunning, setIsClockRunning] = useState<boolean>(false);
  const [matchHistory, setMatchHistory] = useState<SavedMatch[]>([]);

  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNumber, setEditNumber] = useState('');
  const [editPosition, setEditPosition] = useState('');

  const currentPitchCapacity = isPowerplayActive ? basePitchCapacity + 1 : basePitchCapacity;
  const activeFormations = FORMATION_OPTIONS[basePitchCapacity] || [{ label: 'Standard Formation', roles: Array(basePitchCapacity).fill('C-MID') }];

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
      const activeRoles = FORMATION_OPTIONS[basePitchCapacity]?.[0]?.roles || ['GK', 'L-DEF', 'R-DEF', 'C-MID', 'C-STR'];

      const formatted: Player[] = playersData.map((p) => {
        const pStats = statsData?.filter((s) => s.player_id === p.id) || [];
        return {
          id: p.id,
          name: p.name,
          squad_number: p.squad_number,
          preferred_position: p.preferred_position,
          seconds_played: 0,
          current_position: 'C-MID',
          isInjured: false,
          isActive: true,
          isStarter: false,
          total_matches: pStats.length,
          total_seconds_played: pStats.reduce((acc, curr) => acc + (curr.seconds_played || 0), 0),
          total_goals: pStats.reduce((acc, curr) => acc + (curr.goals_scored || 0), 0),
          total_potm: pStats.filter((s) => s.is_potm).length,
        };
      });

      setSquad(formatted);
      setAvailablePlayerIds(formatted.map((p) => p.id));

      const initialMap: Record<string, string> = {};
      const gkPlayer = formatted.find((p) => p.preferred_position === 'Goalkeeper') || formatted[0];
      if (gkPlayer) initialMap['GK'] = gkPlayer.id;

      const outfield = formatted.filter((p) => p.id !== gkPlayer?.id);
      activeRoles.forEach((role) => {
        if (role !== 'GK' && outfield.length > 0) {
          const nextP = outfield.shift();
          if (nextP) initialMap[role] = nextP.id;
        }
      });

      setStarterMap(initialMap);

      if (outfield.length > 0) {
        setHalfTwoGkId(outfield[0].id);
      }

      const starters: Player[] = [];
      Object.entries(initialMap).forEach(([slot, pId]) => {
        const found = formatted.find((p) => p.id === pId);
        if (found) starters.push({ ...found, current_position: slot, isStarter: true });
      });

      setPitchPlayers(starters);
      setSubBench(formatted.filter((p) => !starters.some((s) => s.id === p.id)).map((p) => ({ ...p, isStarter: false, current_position: 'SUB' })));

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

  const togglePlayerAvailability = (id: string) => {
    triggerHaptic();
    setAvailablePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  const assignStarterToSlot = (slot: string, playerId: string) => {
    triggerHaptic();
    setStarterMap((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key] === playerId) delete next[key];
      });
      if (playerId) next[slot] = playerId;
      return next;
    });
  };

  const autoFillStarters = () => {
    triggerHaptic();
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    const activeRoles = activeFormations[formationIndex]?.roles || ['GK', 'L-DEF', 'R-DEF', 'C-MID', 'C-STR'];
    const nextMap: Record<string, string> = {};

    const gk = active.find((p) => p.preferred_position === 'Goalkeeper') || active[0];
    if (gk && activeRoles.includes('GK')) nextMap['GK'] = gk.id;

    const remaining = active.filter((p) => p.id !== gk?.id);
    let rIdx = 0;
    activeRoles.forEach((role) => {
      if (role !== 'GK' && remaining[rIdx]) {
        nextMap[role] = remaining[rIdx].id;
        rIdx++;
      }
    });

    setStarterMap(nextMap);
  };

  // TRUE ADAPTIVE MATHEMATICAL DYNAMIC ROTATION ENGINE
  const handleGenerateMatchPlan = () => {
    triggerHaptic();
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length === 0) return;

    const existingManuals = generatedPlan.filter((s) => s.isManual);
    const totalMatchMins = halfMinutes * 2;
    const autoPlan: SubPlanStep[] = [];

    let starterIds = Object.values(starterMap);
    let currentPitch = active.filter((p) => starterIds.includes(p.id));
    let currentBench = active.filter((p) => !starterIds.includes(p.id));

    const outfieldSlots = gkStrategy === 'full' ? Math.max(1, currentPitchCapacity - 1) : currentPitchCapacity;
    const minsLogged: Record<string, number> = {};
    const outfieldMinsLogged: Record<string, number> = {};
    const continuousBenchMins: Record<string, number> = {};

    active.forEach((p) => { 
      minsLogged[p.id] = 0; 
      outfieldMinsLogged[p.id] = 0;
      continuousBenchMins[p.id] = starterIds.includes(p.id) ? 0 : 1;
    });

    let halfOneGk = starterMap['GK'] || active[0]?.id;
    let halfTwoGk = gkStrategy === 'half' && halfTwoGkId ? halfTwoGkId : halfOneGk;

    for (let m = 1; m <= totalMatchMins; m++) {
      if (m === halfMinutes + 1 && gkStrategy === 'half' && halfTwoGk && halfOneGk !== halfTwoGk) {
        autoPlan.push({
          id: Math.random().toString(),
          minute: halfMinutes,
          offPlayerId: halfOneGk,
          offPlayerName: `#${squad.find((p) => p.id === halfOneGk)?.squad_number} ${squad.find((p) => p.id === halfOneGk)?.name}`,
          onPlayerId: halfTwoGk,
          onPlayerName: `#${squad.find((p) => p.id === halfTwoGk)?.squad_number} ${squad.find((p) => p.id === halfTwoGk)?.name}`,
          assignedPosition: 'GK',
          status: 'pending',
          isManual: false,
        });

        currentPitch = currentPitch.map((p) => (p.id === halfOneGk ? active.find((a) => a.id === halfTwoGk)! : p));
        currentBench = currentBench.map((p) => (p.id === halfTwoGk ? active.find((a) => a.id === halfOneGk)! : p));
      }

      currentPitch.forEach((p) => { 
        minsLogged[p.id] += 1;
        continuousBenchMins[p.id] = 0;
        const currentGk = m <= halfMinutes ? halfOneGk : halfTwoGk;
        if (p.id !== currentGk) outfieldMinsLogged[p.id] += 1;
      });

      currentBench.forEach((p) => {
        continuousBenchMins[p.id] += 1;
      });

      if (m % rotationIntervalMins === 0 && m < totalMatchMins) {
        const activeGkId = m <= halfMinutes ? halfOneGk : halfTwoGk;

        let eligibleOff = currentPitch.filter((p) => (gkStrategy === 'full' ? p.id !== halfOneGk : p.id !== activeGkId));
        let eligibleOn = currentBench.filter((p) => (gkStrategy === 'full' ? p.id !== halfOneGk : p.id !== activeGkId));

        if (eligibleOff.length > 0 && eligibleOn.length > 0) {
          eligibleOn.sort((a, b) => {
            const aIsOffDutyGk = (a.id === halfOneGk || a.id === halfTwoGk) && outfieldMinsLogged[a.id] < 10;
            const bIsOffDutyGk = (b.id === halfOneGk || b.id === halfTwoGk) && outfieldMinsLogged[b.id] < 10;
            if (aIsOffDutyGk && !bIsOffDutyGk) return -1;
            if (!aIsOffDutyGk && bIsOffDutyGk) return 1;

            if (minsLogged[a.id] !== minsLogged[b.id]) {
              return minsLogged[a.id] - minsLogged[b.id];
            }
            return continuousBenchMins[b.id] - continuousBenchMins[a.id];
          });

          eligibleOff.sort((a, b) => minsLogged[b.id] - minsLogged[a.id]);

          const remainingWindows = Math.ceil((totalMatchMins - m) / rotationIntervalMins);
          let calculatedBatch = Math.ceil(eligibleOn.length / Math.max(1, remainingWindows));
          
          if (subsPerBatch === 'dynamic') {
            calculatedBatch = Math.max(1, Math.min(calculatedBatch, outfieldSlots, eligibleOn.length));
          } else {
            calculatedBatch = subsPerBatch;
          }

          const swapsToMake = Math.min(calculatedBatch, eligibleOff.length, eligibleOn.length);

          for (let b = 0; b < swapsToMake; b++) {
            const outgoing = eligibleOff[b];
            const incoming = eligibleOn[b];

            if (outgoing && incoming) {
              autoPlan.push({
                id: Math.random().toString(),
                minute: m,
                offPlayerId: outgoing.id,
                offPlayerName: `#${outgoing.squad_number} ${outgoing.name}`,
                onPlayerId: incoming.id,
                onPlayerName: `#${incoming.squad_number} ${incoming.name}`,
                assignedPosition: starterMap['C-MID'] ? 'C-MID' : 'L-DEF',
                status: 'pending',
                isManual: false,
              });

              currentPitch = currentPitch.map((p) => (p.id === outgoing.id ? incoming : p));
              currentBench = currentBench.map((p) => (p.id === incoming.id ? outgoing : p));
            }
          }
        }
      }
    }

    autoPlan.sort((a, b) => a.minute - b.minute);
    setGeneratedPlan([...autoPlan, ...existingManuals]);
  };

  const handleAddCustomSubStep = () => {
    if (!planOffPlayerId || !planOnPlayerId) return;
    const offP = squad.find((p) => p.id === planOffPlayerId);
    const onP = squad.find((p) => p.id === planOnPlayerId);
    if (!offP || !onP) return;

    triggerHaptic();

    const newStep: SubPlanStep = {
      id: Math.random().toString(),
      minute: planMinute,
      offPlayerId: offP.id,
      offPlayerName: `#${offP.squad_number} ${offP.name}`,
      onPlayerId: onP.id,
      onPlayerName: `#${onP.squad_number} ${onP.name}`,
      assignedPosition: planTargetPos,
      status: 'pending',
      isManual: true,
    };

    setGeneratedPlan((prev) => [...prev, newStep]);
    setPlanOffPlayerId('');
    setPlanOnPlayerId('');
  };

  const handleMoveSubStep = (index: number, direction: 'up' | 'down') => {
    triggerHaptic();
    setGeneratedPlan((prev) => {
      const next = [...prev];
      const targetIdx = direction === 'up' ? index - 1 : index + 1;
      if (targetIdx < 0 || targetIdx >= next.length) return prev;

      const temp = next[index];
      next[index] = next[targetIdx];
      next[targetIdx] = temp;
      return next;
    });
  };

  const handleCommitPlanToMatchday = () => {
    triggerHaptic();
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));

    const starterList: Player[] = [];
    Object.entries(starterMap).forEach(([slot, pId]) => {
      const player = active.find((p) => p.id === pId);
      if (player) starterList.push({ ...player, current_position: slot, isStarter: true });
    });

    const benchList = active
      .filter((p) => !starterList.some((s) => s.id === p.id))
      .map((p) => ({ ...p, isStarter: false, current_position: 'SUB' }));

    setPitchPlayers(starterList);
    setSubBench(benchList);
    setActiveTab('matchday');
  };

  const handleUpdateSubStepPosition = (stepId: string, newPosition: string) => {
    triggerHaptic();
    setGeneratedPlan((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, assignedPosition: newPosition } : step))
    );
  };

  const getProjectedMinutes = () => {
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length === 0) return [];

    const totalMatchMins = halfMinutes * 2;
    const outfieldSlots = gkStrategy === 'full' ? Math.max(1, currentPitchCapacity - 1) : currentPitchCapacity;
    const minsMap: Record<string, number> = {};
    const outfieldMinsMap: Record<string, number> = {};
    const benchMinsMap: Record<string, number> = {};

    let starterIds = Object.values(starterMap);
    let currentPitch = active.filter((p) => starterIds.includes(p.id));
    let currentBench = active.filter((p) => !starterIds.includes(p.id));

    active.forEach((p) => { 
      minsMap[p.id] = 0; 
      outfieldMinsMap[p.id] = 0;
      benchMinsMap[p.id] = starterIds.includes(p.id) ? 0 : 1;
    });

    let halfOneGk = starterMap['GK'] || active[0]?.id;
    let halfTwoGk = gkStrategy === 'half' && halfTwoGkId ? halfTwoGkId : halfOneGk;

    for (let m = 1; m <= totalMatchMins; m++) {
      if (m === halfMinutes + 1 && gkStrategy === 'half' && halfTwoGk && halfOneGk !== halfTwoGk) {
        currentPitch = currentPitch.map((p) => (p.id === halfOneGk ? active.find((a) => a.id === halfTwoGk)! : p));
        currentBench = currentBench.map((p) => (p.id === halfTwoGk ? active.find((a) => a.id === halfOneGk)! : p));
      }

      currentPitch.forEach((p) => { 
        minsMap[p.id] += 1; 
        benchMinsMap[p.id] = 0;
        const currentGk = m <= halfMinutes ? halfOneGk : halfTwoGk;
        if (p.id !== currentGk) outfieldMinsMap[p.id] += 1;
      });

      currentBench.forEach((p) => {
        benchMinsMap[p.id] += 1;
      });

      if (m % rotationIntervalMins === 0 && m < totalMatchMins) {
        const activeGkId = m <= halfMinutes ? halfOneGk : halfTwoGk;

        let eligibleOff = currentPitch.filter((p) => (gkStrategy === 'full' ? p.id !== halfOneGk : p.id !== activeGkId));
        let eligibleOn = currentBench.filter((p) => (gkStrategy === 'full' ? p.id !== halfOneGk : p.id !== activeGkId));

        if (eligibleOff.length > 0 && eligibleOn.length > 0) {
          eligibleOn.sort((a, b) => {
            const aIsOffDutyGk = (a.id === halfOneGk || a.id === halfTwoGk) && outfieldMinsMap[a.id] < 10;
            const bIsOffDutyGk = (b.id === halfOneGk || b.id === halfTwoGk) && outfieldMinsMap[b.id] < 10;
            if (aIsOffDutyGk && !bIsOffDutyGk) return -1;
            if (!aIsOffDutyGk && bIsOffDutyGk) return 1;

            if (minsMap[a.id] !== minsMap[b.id]) {
              return minsMap[a.id] - minsMap[b.id];
            }
            return benchMinsMap[b.id] - benchMinsMap[a.id];
          });

          eligibleOff.sort((a, b) => minsMap[b.id] - minsMap[a.id]);

          const remainingWindows = Math.ceil((totalMatchMins - m) / rotationIntervalMins);
          let calculatedBatch = Math.ceil(eligibleOn.length / Math.max(1, remainingWindows));
          
          if (subsPerBatch === 'dynamic') {
            calculatedBatch = Math.max(1, Math.min(calculatedBatch, outfieldSlots, eligibleOn.length));
          } else {
            calculatedBatch = subsPerBatch;
          }

          const swapsToMake = Math.min(calculatedBatch, eligibleOff.length, eligibleOn.length);

          for (let b = 0; b < swapsToMake; b++) {
            const outP = eligibleOff[b];
            const inP = eligibleOn[b];

            if (outP && inP) {
              currentPitch = currentPitch.map((p) => (p.id === outP.id ? inP : p));
              currentBench = currentBench.map((p) => (p.id === inP.id ? outP : p));
            }
          }
        }
      }
    }

    return active.map((p) => ({
      ...p,
      projectedMins: minsMap[p.id] || 0,
    }));
  };

  const handleChangeOnPitchPosition = (playerId: string, newRole: string) => {
    triggerHaptic();
    setPitchPlayers((prev) => prev.map((p) => (p.id === playerId ? { ...p, current_position: newRole } : p)));
    setEditingPositionPlayerId(null);
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

    const assignedRole = targetSubPosition || outgoing.current_position;

    newPitch[onPitchIndex] = { ...incoming, current_position: assignedRole };
    newBench[benchIndex] = { ...outgoing, current_position: 'SUB' };

    setPitchPlayers(newPitch);
    setSubBench(newBench);
    setSelectedOnPitch(null);
    setTargetSubPosition(null);
  };

  const handleLogGoal = (playerName: string, isOpponent = false) => {
    triggerHaptic();
    const currentMin = Math.max(1, Math.ceil((halfMinutes * 60 - secondsRemaining) / 60));
    setGoals((prev) => [...prev, { id: Math.random().toString(), scorerName: playerName, minute: currentMin, isOpponent }]);
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
  };

  const handleRecoverPlayer = (playerId: string) => {
    triggerHaptic();
    const playerToRecover = injuredPlayers.find((p) => p.id === playerId);
    if (!playerToRecover) return;

    setInjuredPlayers((prev) => prev.filter((p) => p.id !== playerId));
    setSubBench((prev) => [...prev, { ...playerToRecover, isInjured: false, current_position: 'SUB' }]);
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

  const handleSaveAndFinishMatch = async () => {
    triggerHaptic();
    setSavingMatch(true);

    try {
      const startingLineupNames = [...pitchPlayers, ...subBench, ...injuredPlayers]
        .filter((p) => p.isStarter)
        .map((p) => `#${p.squad_number} ${p.name}`);

      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .insert([
          {
            opponent_name: opponentName,
            age_group: ageGroup,
            our_score: ourGoalsCount,
            opponent_score: opponentGoalsCount,
            player_of_the_match: playerOfTheMatch,
            starting_lineup: startingLineupNames,
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

      await supabase.from('match_player_stats').insert(statsPayload);
      alert('Matchday results & player stats successfully saved!');
      loadSquad();
      setActiveTab('stats');
    } catch (err) {
      console.error(err);
      alert('An error occurred while saving.');
    } finally {
      setSavingMatch(false);
    }
  };

  const generateWhatsAppSummary = () => {
    let text = `⚽ *MATCHDAY RECAP — CO-GAFFER*\n`;
    text += `Vs. ${opponentName} (${ageGroup})\n`;
    text += `Score: Our Team ${ourGoalsCount} - ${opponentGoalsCount} ${opponentName}\n\n`;

    const starters = [...pitchPlayers, ...subBench].filter((p) => p.isStarter);
    if (starters.length > 0) {
      text += `🚨 *Starting Lineup (${starters.length}):*\n`;
      starters.forEach((p) => { text += `• #${p.squad_number} ${p.name}\n`; });
      text += `\n`;
    }

    const ourGoals = goals.filter((g) => !g.isOpponent);
    if (ourGoals.length > 0) {
      text += `🎯 *Goals Scored:* ${ourGoals.length}\n`;
      ourGoals.forEach((g) => { text += `• ${g.scorerName} (${g.minute}')\n`; });
      text += `\n`;
    }

    if (playerOfTheMatch) text += `⭐ *Player of the Match:* ${playerOfTheMatch}\n\n`;

    text += `⏱️ *Playing Time Logged:*\n`;
    [...pitchPlayers, ...subBench].forEach((p) => {
      text += `• #${p.squad_number} ${p.name}: ${Math.floor(p.seconds_played / 60)} mins ${p.isStarter ? '(Started)' : ''}\n`;
    });

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
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
    <div className="bg-black text-white min-h-screen pb-24 p-4 font-sans max-w-md mx-auto select-none">
      <div className="flex justify-between items-center mb-4 px-1">
        <h1 className="text-2xl font-black text-lime-400 flex items-center gap-2"><span>📋</span> CO-GAFFER</h1>
        <span className="text-[10px] bg-gray-900 border border-gray-800 text-lime-400 font-extrabold px-2.5 py-1 rounded-md">
          TRUE ADAPTIVE BATCHING
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
          handleLogGoal={handleLogGoal}
          handleMarkInjured={handleMarkInjured}
          handleRecoverPlayer={handleRecoverPlayer}
          selectedOnPitch={selectedOnPitch}
          setSelectedOnPitch={setSelectedOnPitch}
          targetSubPosition={targetSubPosition}
          setTargetSubPosition={setTargetSubPosition}
          handleSubSwap={handleSubSwap}
          handleChangeOnPitchPosition={handleChangeOnPitchPosition}
          editingPositionPlayerId={editingPositionPlayerId}
          setEditingPositionPlayerId={setEditingPositionPlayerId}
          positionSlots={POSITION_SLOTS}
          lowestSeconds={lowestSeconds}
          playerOfTheMatch={playerOfTheMatch}
          setPlayerOfTheMatch={setPlayerOfTheMatch}
          generateWhatsAppSummary={generateWhatsAppSummary}
          handleSaveAndFinishMatch={handleSaveAndFinishMatch}
          savingMatch={savingMatch}
          formatTime={formatTime}
          formatPlayerMins={formatPlayerMins}
          triggerHaptic={triggerHaptic}
          formationIndex={formationIndex}
          setFormationIndex={setFormationIndex}
          activeFormations={activeFormations}
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
          handleRemoveSubStep={(id: string) => setGeneratedPlan((prev) => prev.filter((s) => s.id !== id))}
          handleMoveSubStep={handleMoveSubStep}
          handleUpdateSubStepPosition={handleUpdateSubStepPosition}
          availablePlayerIds={availablePlayerIds}
          togglePlayerAvailability={togglePlayerAvailability}
          starterMap={starterMap}
          assignStarterToSlot={assignStarterToSlot}
          autoFillStarters={autoFillStarters}
          rotationIntervalMins={rotationIntervalMins}
          setRotationIntervalMins={setRotationIntervalMins}
          subsPerBatch={subsPerBatch}
          setSubsPerBatch={setSubsPerBatch}
          getProjectedMinutes={getProjectedMinutes}
          handleGenerateMatchPlan={handleGenerateMatchPlan}
          handleCommitPlanToMatchday={handleCommitPlanToMatchday}
          currentPitchCapacity={currentPitchCapacity}
          gkStrategy={gkStrategy}
          setGkStrategy={setGkStrategy}
          halfTwoGkId={halfTwoGkId}
          setHalfTwoGkId={setHalfTwoGkId}
          activeFormations={activeFormations}
          formationIndex={formationIndex}
          setFormationIndex={setFormationIndex}
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
      <div className="fixed bottom-0 left-0 right-0 bg-gray-950/95 border-t border-gray-800 p-2 flex justify-around max-w-md mx-auto z-50 backdrop-blur-md">
        <button type="button" onClick={() => setActiveTab('matchday')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'matchday' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>⚽ MATCH</button>
        <button type="button" onClick={() => setActiveTab('training')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'training' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>🏋️ DRILLS</button>
        <button type="button" onClick={() => setActiveTab('planner')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'planner' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📅 PLANNER</button>
        <button type="button" onClick={() => setActiveTab('squad')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'squad' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📋 TEAM</button>
        <button type="button" onClick={() => setActiveTab('stats')} className={`flex-1 py-3 font-black text-xs rounded-xl ${activeTab === 'stats' ? 'bg-lime-500 text-black' : 'text-gray-400'}`}>📊 AUDIT</button>
      </div>
    </div>
  );
}