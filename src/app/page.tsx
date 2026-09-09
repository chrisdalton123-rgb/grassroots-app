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

const AGE_PRESETS: Record<string, { pitchCount: number; halfMins: number; label: string }> = {
  'U7': { pitchCount: 3, halfMins: 10, label: 'U7 (3v3 Carousel Festival — Multi-Pitch)' },
  'U8-U9': { pitchCount: 5, halfMins: 20, label: 'U8/U9 (5v5 — 20m Halves)' },
  'U10-U11': { pitchCount: 7, halfMins: 25, label: 'U10/U11 (7v7 — 25m Halves)' },
  'U12-U13': { pitchCount: 9, halfMins: 30, label: 'U12/U13 (9v9 — 30m Halves)' },
  'U14-U15': { pitchCount: 11, halfMins: 35, label: 'U14/U15 (11v11 — 35m Halves)' },
  'TOURNAMENT': { pitchCount: 6, halfMins: 10, label: 'Summer 6s (6v6 — 10m Games)' },
};

export default function MatchdayApp() {
  const [activeTab, setActiveTab] = useState<'matchday' | 'planner' | 'squad'>('matchday');
  const [squad, setSquad] = useState<Player[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Match & Format Settings
  const [ageGroup, setAgeGroup] = useState<string>('U8-U9');
  const [basePitchCapacity, setBasePitchCapacity] = useState<number>(5);
  const [halfMinutes, setHalfMinutes] = useState<number>(20);
  const [carouselPitches, setCarouselPitches] = useState<number>(2);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Powerplay & Injury States
  const [isPowerplayActive, setIsPowerplayActive] = useState<boolean>(false);

  // Match Event & Scoreboard Logging
  const [goals, setGoals] = useState<MatchGoal[]>([]);
  const [playerOfTheMatch, setPlayerOfTheMatch] = useState<string | null>(null);
  const [opponentName, setOpponentName] = useState<string>('Opponent');
  const [showGoalLog, setShowGoalLog] = useState<boolean>(false);
  const [showArchivedSubs, setShowArchivedSubs] = useState<boolean>(false);

  // Planner States
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [fixedGkId, setFixedGkId] = useState<string | null>(null);
  const [gkMode, setGkMode] = useState<'fixed' | 'split'>('fixed');
  const [half2GkId, setHalf2GkId] = useState<string | null>(null);
  const [maxGkOutfieldMins, setMaxGkOutfieldMins] = useState<number>(10);
  const [rotationIntervalMins, setRotationIntervalMins] = useState<number>(7);
  const [subsPerBatch, setSubsPerBatch] = useState<number>(1);
  const [generatedPlan, setGeneratedPlan] = useState<SubPlanStep[]>([]);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');

  // Match Clock & Screen Lock States
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20 * 60);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);
  const [wakeLock, setWakeLock] = useState<any>(null);

  // Effective Pitch Capacity considering Powerplay (+1)
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
    return `${mins} mins`;
  };

  const ourGoalsCount = goals.filter((g) => !g.isOpponent).length;
  const opponentGoalsCount = goals.filter((g) => g.isOpponent).length;
  const goalDifference = opponentGoalsCount - ourGoalsCount;

  const pendingPlanSteps = generatedPlan.filter((step) => step.status === 'pending');
  const completedPlanSteps = generatedPlan.filter((step) => step.status === 'completed');

  const allPlayers = [...pitchPlayers, ...subBench];
  const lowestSeconds = allPlayers.length > 0 ? Math.min(...allPlayers.map((p) => p.seconds_played)) : 0;
  const highestPitchSeconds = pitchPlayers.length > 0 ? Math.max(...pitchPlayers.map((p) => p.seconds_played)) : 0;

  const loadSquad = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .order('squad_number', { ascending: true });

    if (error) {
      console.error('Error fetching squad:', error);
    } else if (data) {
      const formatted: Player[] = data.map((p) => ({
        id: p.id,
        name: p.name,
        squad_number: p.squad_number,
        preferred_position: p.preferred_position,
        seconds_played: 0,
        current_position: p.preferred_position || 'SUB',
        isInjured: false,
      }));

      setSquad(formatted);
      setAvailablePlayerIds(formatted.map((p) => p.id));
      
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

  const applyPreset = (presetKey: string) => {
    setAgeGroup(presetKey);
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

  // Toggle Powerplay (+1 Pitch Slot)
  const togglePowerplay = () => {
    triggerHaptic();
    const newPowerplayState = !isPowerplayActive;
    setIsPowerplayActive(newPowerplayState);

    const newCap = newPowerplayState ? basePitchCapacity + 1 : basePitchCapacity;

    if (newPowerplayState && subBench.length > 0) {
      // Bring top bench sub onto pitch for Powerplay slot
      const subToPromote = subBench[0];
      setPitchPlayers((prev) => [...prev, { ...subToPromote, current_position: 'POWERPLAY' }]);
      setSubBench((prev) => prev.filter((p) => p.id !== subToPromote.id));
    } else if (!newPowerplayState && pitchPlayers.length > basePitchCapacity) {
      // Revert extra player to bench
      const playerToBench = pitchPlayers[pitchPlayers.length - 1];
      setPitchPlayers((prev) => prev.slice(0, basePitchCapacity));
      setSubBench((prev) => [{ ...playerToBench, current_position: 'SUB' }, ...prev]);
    }
  };

  // Mark Player as Injured & Recalculate Sub Rotation
  const handleMarkInjured = (playerId: string) => {
    triggerHaptic();
    const isPlayerOnPitch = pitchPlayers.some((p) => p.id === playerId);

    if (isPlayerOnPitch && subBench.length > 0) {
      // Immediately sub injured player with lowest minutes sub on bench
      const subIn = subBench.reduce((prev, curr) => (prev.seconds_played < curr.seconds_played ? prev : curr));
      const injuredPlayer = pitchPlayers.find((p) => p.id === playerId);

      setPitchPlayers((prev) =>
        prev.map((p) => (p.id === playerId ? { ...subIn, current_position: p.current_position } : p))
      );
      setSubBench((prev) => prev.filter((p) => p.id !== subIn.id));
    } else if (isPlayerOnPitch) {
      // If no bench players available, remove slot
      setPitchPlayers((prev) => prev.filter((p) => p.id !== playerId));
    } else {
      setSubBench((prev) => prev.filter((p) => p.id !== playerId));
    }

    // Mark unavailable and filter future plan steps
    setAvailablePlayerIds((prev) => prev.filter((id) => id !== playerId));
    setGeneratedPlan((prev) =>
      prev.filter((step) => step.offPlayerId !== playerId && step.onPlayerId !== playerId)
    );
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

  const handleRemoveGoal = (goalId: string) => {
    triggerHaptic();
    setGoals((prev) => prev.filter((g) => g.id !== goalId));
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

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (!error) loadSquad();
  };

  if (loading) {
    return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Co-Gaffer...</div>;
  }

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
          {/* Format Bar & Powerplay Banner */}
          <div className="flex justify-between items-center bg-gray-950 px-3 py-2 rounded-lg mb-3 border border-gray-850">
            <span className="text-xs font-bold text-lime-400">
              {AGE_PRESETS[ageGroup]?.label || `${currentPitchCapacity}v${currentPitchCapacity}`}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-2.5 py-1 rounded border border-gray-700"
            >
              ⚙️ SETTINGS
            </button>
          </div>

          {/* FA POWERPLAY ALERT BANNER */}
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

          {/* SCOREBOARD & MATCH CLOCK HEADER */}
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

          {/* PRE-PLANNED SUBS WIDGET */}
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

          {/* Pitch Display */}
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

          {/* Bench Section */}
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
          </div>

          {/* WhatsApp Share Section */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3">
              📲 WhatsApp Post-Match Recap
            </h2>
            <div className="flex flex-col gap-2 mb-3">
              <input
                type="text"
                placeholder="Opponent Name"
                value={opponentName}
                onChange={(e) => setOpponentName(e.target.value)}
                className="bg-black border border-gray-800 rounded p-2 text-xs text-white"
              />
              <select
                value={playerOfTheMatch || ''}
                onChange={(e) => setPlayerOfTheMatch(e.target.value || null)}
                className="bg-black border border-gray-800 rounded p-2 text-xs text-white"
              >
                <option value="">Select Star Player of the Match</option>
                {[...pitchPlayers, ...subBench].map((p) => (
                  <option key={p.id} value={p.name}>#{p.squad_number} {p.name}</option>
                ))}
              </select>
            </div>

            <button
              onClick={generateWhatsAppSummary}
              className="w-full bg-emerald-500 text-black font-black p-3 rounded-xl text-xs active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span>💬</span> SHARE MATCH REPORT TO WHATSAPP
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: SCHEDULER */}
      {activeTab === 'planner' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-2">Matchday Scheduler</h1>

          {/* Projected Minutes Summary Card */}
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

      {/* TAB 3: SQUAD MANAGEMENT */}
      {activeTab === 'squad' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-4">Squad Management</h1>

          <form onSubmit={handleAddPlayer} className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">Add New Player</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                placeholder="Player Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-black border border-gray-800 rounded-lg p-3 text-white focus:outline-none focus:border-lime-400"
              />
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder="Kit #"
                  value={newNumber}
                  onChange={(e) => setNewNumber(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg p-3 text-white w-1/3 focus:outline-none focus:border-lime-400"
                />
                <select
                  value={newPosition}
                  onChange={(e) => setNewPosition(e.target.value)}
                  className="bg-black border border-gray-800 rounded-lg p-3 text-white w-2/3 focus:outline-none focus:border-lime-400"
                >
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Defender">Defender</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Striker">Striker</option>
                </select>
              </div>
              <button
                type="submit"
                className="bg-lime-500 text-black font-black p-3 rounded-lg active:scale-95 transition-all mt-1"
              >
                ADD TO SQUAD
              </button>
            </div>
          </form>

          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">Current Roster ({squad.length})</h2>
            <div className="flex flex-col gap-2">
              {squad.map((player) => (
                <div key={player.id} className="p-3 bg-black rounded-lg border border-gray-800 flex justify-between items-center">
                  <div>
                    <span className="font-extrabold text-base mr-2">#{player.squad_number} {player.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-900 px-2 py-0.5 rounded">{player.preferred_position}</span>
                  </div>
                  <button
                    onClick={() => handleDeletePlayer(player.id)}
                    className="text-red-500 hover:text-red-400 font-bold text-xs p-2"
                  >
                    REMOVE
                  </button>
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
          ⚽ MATCHDAY
        </button>
        <button
          onClick={() => setActiveTab('planner')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'planner' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📅 SCHEDULER
        </button>
        <button
          onClick={() => setActiveTab('squad')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'squad' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📋 SQUAD
        </button>
      </div>
    </div>
  );
}