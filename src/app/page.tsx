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
};

type SubPlanStep = {
  minute: number;
  offPlayer: string;
  onPlayer: string;
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
  const [pitchCapacity, setPitchCapacity] = useState<number>(5);
  const [halfMinutes, setHalfMinutes] = useState<number>(20);
  const [carouselPitches, setCarouselPitches] = useState<number>(2);
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // Planner States
  const [availablePlayerIds, setAvailablePlayerIds] = useState<string[]>([]);
  const [fixedGkId, setFixedGkId] = useState<string | null>(null);
  const [rotationIntervalMins, setRotationIntervalMins] = useState<number>(7);
  const [subsPerBatch, setSubsPerBatch] = useState<number>(1);
  const [generatedPlan, setGeneratedPlan] = useState<SubPlanStep[]>([]);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');

  // Match Clock States
  const [secondsRemaining, setSecondsRemaining] = useState<number>(20 * 60);
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [currentPeriod, setCurrentPeriod] = useState(1);

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatPlayerMins = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    return `${mins} mins`;
  };

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
      }));

      setSquad(formatted);
      setAvailablePlayerIds(formatted.map((p) => p.id));
      
      const defaultGk = formatted.find((p) => p.preferred_position === 'Goalkeeper');
      if (defaultGk) setFixedGkId(defaultGk.id);

      setPitchPlayers(formatted.slice(0, pitchCapacity));
      setSubBench(formatted.slice(pitchCapacity));
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
      setPitchCapacity(capacity);
      setHalfMinutes(preset.halfMins);
      setSecondsRemaining(preset.halfMins * 60);
      setIsClockRunning(false);

      const activeSquad = squad.filter((p) => availablePlayerIds.includes(p.id));
      setPitchPlayers(activeSquad.slice(0, capacity));
      setSubBench(activeSquad.slice(capacity));
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isClockRunning && secondsRemaining > 0) {
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
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isClockRunning, secondsRemaining]);

  const handleSubSwap = (benchPlayerId: string) => {
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

  const togglePlayerAvailability = (id: string) => {
    setAvailablePlayerIds((prev) =>
      prev.includes(id) ? prev.filter((pId) => pId !== id) : [...prev, id]
    );
  };

  // Calculate projected match minutes per player based on scheduler settings
  const getProjectedMinutes = () => {
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length === 0) return [];

    const totalMatchMins = halfMinutes * 2;
    const minutesMap: Record<string, number> = {};

    active.forEach((p) => {
      minutesMap[p.id] = 0;
    });

    let outfieldPlayers = [...active];
    if (fixedGkId && minutesMap[fixedGkId] !== undefined) {
      minutesMap[fixedGkId] = totalMatchMins;
      outfieldPlayers = active.filter((p) => p.id !== fixedGkId);
    }

    const outfieldCapacity = fixedGkId ? pitchCapacity - 1 : pitchCapacity;
    let currentOutfieldPitch = outfieldPlayers.slice(0, outfieldCapacity);
    let currentBench = outfieldPlayers.slice(outfieldCapacity);

    for (let minute = 1; minute <= totalMatchMins; minute++) {
      currentOutfieldPitch.forEach((p) => {
        minutesMap[p.id] = (minutesMap[p.id] || 0) + 1;
      });

      if (minute % rotationIntervalMins === 0 && minute < totalMatchMins) {
        for (let i = 0; i < subsPerBatch; i++) {
          if (currentBench.length === 0 || currentOutfieldPitch.length === 0) break;
          const incoming = currentBench.shift();
          const outgoing = currentOutfieldPitch.shift();

          if (incoming && outgoing) {
            currentOutfieldPitch.push(incoming);
            currentBench.push(outgoing);
          }
        }
      }
    }

    return active.map((p) => ({
      ...p,
      projectedMins: minutesMap[p.id] || 0,
    }));
  };

  // Rotation Engine with Fixed GK & Batch Sub Support
  const handleGenerateMatchPlan = () => {
    const active = squad.filter((p) => availablePlayerIds.includes(p.id));
    if (active.length <= pitchCapacity) return;

    let gkPlayer: Player | undefined;
    let outfieldPlayers = [...active];

    if (fixedGkId) {
      gkPlayer = active.find((p) => p.id === fixedGkId);
      if (gkPlayer) {
        outfieldPlayers = active.filter((p) => p.id !== fixedGkId);
      }
    }

    const outfieldCapacity = gkPlayer ? pitchCapacity - 1 : pitchCapacity;

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
            minute: interval,
            offPlayer: `#${outgoing.squad_number} ${outgoing.name}`,
            onPlayer: `#${incoming.squad_number} ${incoming.name}`,
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
        <span className="text-[10px] bg-gray-900 border border-gray-800 text-lime-400 font-extrabold px-2 py-0.5 rounded tracking-wider uppercase">
          ASSISTANT COACH
        </span>
      </div>

      {/* TAB 1: MATCHDAY TOUCHLINE */}
      {activeTab === 'matchday' && (
        <div>
          {/* Format Bar */}
          <div className="flex justify-between items-center bg-gray-950 px-3 py-2 rounded-lg mb-3 border border-gray-850">
            <span className="text-xs font-bold text-lime-400">
              {AGE_PRESETS[ageGroup]?.label || `${pitchCapacity}v${pitchCapacity}`}
            </span>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold px-2.5 py-1 rounded border border-gray-700"
            >
              ⚙️ SETTINGS
            </button>
          </div>

          {/* Settings Drawer */}
          {showSettings && (
            <div className="bg-gray-900 border border-lime-500/50 p-4 rounded-xl mb-4 text-xs">
              <h3 className="font-extrabold text-sm text-lime-400 mb-3 uppercase tracking-wider">
                Select Age Bracket / Format
              </h3>
              <div className="grid grid-cols-1 gap-2 mb-4">
                {Object.keys(AGE_PRESETS).map((key) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className={`p-2.5 rounded-lg text-left font-bold border transition-all ${
                      ageGroup === key
                        ? 'bg-lime-500 text-black border-lime-400'
                        : 'bg-black border-gray-800 text-gray-300 hover:border-gray-700'
                    }`}
                  >
                    {AGE_PRESETS[key].label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowSettings(false)}
                className="w-full mt-1 bg-gray-800 text-white font-bold p-2 rounded hover:bg-gray-700"
              >
                CLOSE SETTINGS
              </button>
            </div>
          )}

          {/* Match Header Clock */}
          <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl mb-4 border border-gray-800">
            <div>
              <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
                {ageGroup === 'U7' ? `Mini-Game ${currentPeriod}` : `Half ${currentPeriod}`} — Live
              </span>
              <h1 className="text-2xl font-black text-lime-400 font-mono tracking-tight">
                {formatTime(secondsRemaining)}
              </h1>
            </div>
            <button
              onClick={() => setIsClockRunning(!isClockRunning)}
              className={`px-5 py-3 font-black text-sm rounded-lg active:scale-95 transition-all ${
                isClockRunning ? 'bg-red-500 text-white' : 'bg-lime-500 text-black'
              }`}
            >
              {isClockRunning ? 'PAUSE' : 'START'}
            </button>
          </div>

          {/* Pre-Planned Sub Schedule Widget */}
          {generatedPlan.length > 0 && (
            <div className="bg-gray-900 p-3.5 rounded-xl border border-lime-500/40 mb-4">
              <h3 className="text-xs font-black text-lime-400 mb-2 uppercase tracking-wider">
                ⏱️ Pre-Planned Outfield Sub Schedule
              </h3>
              <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
                {generatedPlan.map((step, idx) => (
                  <div key={idx} className="bg-black border border-gray-800 p-2 rounded shrink-0 min-w-[130px]">
                    <span className="text-[10px] font-mono text-lime-400 block">MIN {step.minute}'</span>
                    <span className="text-red-400 block font-bold text-[11px]">OFF: {step.offPlayer}</span>
                    <span className="text-lime-400 block font-bold text-[11px]">ON: {step.onPlayer}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pitch Display */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold flex justify-between">
              <span>On Pitch ({pitchPlayers.length}/{pitchCapacity})</span>
              <span className="text-amber-400">🔥 High Mins Alert</span>
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {pitchPlayers.map((player) => {
                const isSelected = selectedOnPitch === player.id;
                const isFixedGk = player.id === fixedGkId;
                const isHighTime = !isFixedGk && player.seconds_played > 0 && player.seconds_played === highestPitchSeconds;

                return (
                  <button
                    key={player.id}
                    onClick={() => setSelectedOnPitch(isSelected ? null : player.id)}
                    className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                      isSelected
                        ? 'bg-yellow-500 border-yellow-300 text-black scale-102 shadow-lg'
                        : isFixedGk
                        ? 'bg-gray-900 border-lime-500 text-white'
                        : isHighTime
                        ? 'bg-gray-900 border-amber-500/60 text-white'
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
                      {isHighTime && !isSelected && (
                        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] px-1.5 py-0.5 rounded font-bold">
                          REST NEXT
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bench Section */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold flex justify-between">
              <span>Substitutes Bench ({subBench.length})</span>
              <span className="text-lime-400">⭐ Priority Sub</span>
            </h2>
            <div className="flex flex-col gap-2">
              {subBench.map((player) => {
                const isLowest = player.seconds_played === lowestSeconds;

                return (
                  <button
                    key={player.id}
                    disabled={!selectedOnPitch}
                    onClick={() => handleSubSwap(player.id)}
                    className={`p-3.5 rounded-xl flex justify-between items-center text-left border transition-all ${
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
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MATCHDAY PLANNER */}
      {activeTab === 'planner' && (
        <div>
          <h1 className="text-xl font-black text-lime-400 mb-2">Matchday Scheduler</h1>
          <p className="text-xs text-gray-400 mb-4">
            Select available squad members and lock a fixed Goalkeeper to exclude them from outfield rotations.
          </p>

          {/* Fixed Goalkeeper Selector */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
              🧤 Fixed Full-Match Goalkeeper (Excludes from Sub Rotations)
            </label>
            <select
              value={fixedGkId || ''}
              onChange={(e) => setFixedGkId(e.target.value || null)}
              className="w-full bg-black border border-gray-800 rounded-lg p-3 text-white text-xs font-bold focus:outline-none focus:border-lime-400"
            >
              <option value="">No Fixed GK (Rotate all players)</option>
              {squad
                .filter((p) => availablePlayerIds.includes(p.id))
                .map((player) => (
                  <option key={player.id} value={player.id}>
                    #{player.squad_number} {player.name} ({player.preferred_position})
                  </option>
                ))}
            </select>
          </div>

          {/* Availability Selection */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
            <h2 className="text-xs uppercase tracking-widest text-gray-300 font-bold mb-3 flex justify-between">
              <span>Select Available Players ({availablePlayerIds.length}/{squad.length})</span>
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {squad.map((player) => {
                const isChecked = availablePlayerIds.includes(player.id);
                const isGk = player.id === fixedGkId;

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

          {/* Sub Interval & Batch Size Setting Card */}
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
                  <option value={7}>Every 7 mins</option>
                  <option value={10}>Every 10 mins</option>
                  <option value={12}>Every 12 mins</option>
                  <option value={15}>Every 15 mins</option>
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
                  <option value={4}>4 Players at once</option>
                </select>
              </div>
            </div>
          </div>

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
                      {player.id === fixedGkId ? ' 🧤' : ''}
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