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
};

// Current FA Grassroots Regulations & Formats
const AGE_PRESETS: Record<string, { pitchCount: number; halfMins: number; label: string }> = {
  'U7': { pitchCount: 3, halfMins: 10, label: 'U7 (3v3 Carousel Festival — Multi-Pitch)' },
  'U8-U9': { pitchCount: 5, halfMins: 20, label: 'U8/U9 (5v5 — 20m Halves)' },
  'U10-U11': { pitchCount: 7, halfMins: 25, label: 'U10/U11 (7v7 — 25m Halves)' },
  'U12-U13': { pitchCount: 9, halfMins: 30, label: 'U12/U13 (9v9 — 30m Halves)' },
  'U14-U15': { pitchCount: 11, halfMins: 35, label: 'U14/U15 (11v11 — 35m Halves)' },
  'TOURNAMENT': { pitchCount: 6, halfMins: 10, label: 'Summer 6s (6v6 — 10m Games)' },
};

export default function MatchdayApp() {
  const [activeTab, setActiveTab] = useState<'matchday' | 'squad'>('matchday');
  const [squad, setSquad] = useState<Player[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Carousel Specific State
  const [carouselPitches, setCarouselPitches] = useState<number>(2);

  // Match & Format Settings State
  const [ageGroup, setAgeGroup] = useState<string>('U8-U9');
  const [pitchCapacity, setPitchCapacity] = useState<number>(5);
  const [halfMinutes, setHalfMinutes] = useState<number>(20);
  const [showSettings, setShowSettings] = useState<boolean>(false);

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

  // Equal minutes calculation helpers
  const allPlayers = [...pitchPlayers, ...subBench];
  const lowestSeconds = allPlayers.length > 0 ? Math.min(...allPlayers.map((p) => p.seconds_played)) : 0;
  const highestPitchSeconds = pitchPlayers.length > 0 ? Math.max(...pitchPlayers.map((p) => p.seconds_played)) : 0;

  // Fetch squad from Supabase
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
      setPitchPlayers(formatted.slice(0, pitchCapacity));
      setSubBench(formatted.slice(pitchCapacity));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSquad();
  }, []);

  // Change FA Match Format Preset
  const applyPreset = (presetKey: string) => {
    setAgeGroup(presetKey);
    const preset = AGE_PRESETS[presetKey];
    if (preset) {
      const capacity = presetKey === 'U7' ? carouselPitches * 3 : preset.pitchCount;
      setPitchCapacity(capacity);
      setHalfMinutes(preset.halfMins);
      setSecondsRemaining(preset.halfMins * 60);
      setIsClockRunning(false);

      setPitchPlayers(squad.slice(0, capacity));
      setSubBench(squad.slice(capacity));
    }
  };

  // Live Timer Effect
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

  // Handle Touchline Substitutions
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

  // Rotate Carousel Pitch Players
  const handleCarouselRotate = () => {
    if (pitchPlayers.length < 2) return;
    const rotated = [...pitchPlayers];
    const first = rotated.shift();
    if (first) rotated.push(first);
    setPitchPlayers(rotated);
  };

  // Add New Player
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

  // Delete Player
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

              {/* U7 Carousel Count Controls */}
              {ageGroup === 'U7' && (
                <div className="p-3 bg-black rounded-lg border border-lime-500/30 mb-3">
                  <label className="block text-lime-400 font-bold mb-1">
                    Active 3v3 Mini-Pitches (Festival Mode):
                  </label>
                  <div className="flex gap-2 mt-2">
                    {[2, 3, 4].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          setCarouselPitches(count);
                          setPitchCapacity(count * 3);
                          setPitchPlayers(squad.slice(0, count * 3));
                          setSubBench(squad.slice(count * 3));
                        }}
                        className={`flex-1 py-2 rounded font-bold border ${
                          carouselPitches === count
                            ? 'bg-lime-500 text-black border-lime-400'
                            : 'bg-gray-900 border-gray-800 text-gray-400'
                        }`}
                      >
                        {count} Pitches ({count * 3} Players)
                      </button>
                    ))}
                  </div>
                </div>
              )}

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
            <div className="flex gap-2">
              {ageGroup === 'U7' && (
                <button
                  onClick={handleCarouselRotate}
                  className="px-3 py-3 font-bold text-xs bg-amber-500 text-black rounded-lg active:scale-95"
                >
                  🔄 ROTATE
                </button>
              )}
              <button
                onClick={() => setIsClockRunning(!isClockRunning)}
                className={`px-5 py-3 font-black text-sm rounded-lg active:scale-95 transition-all ${
                  isClockRunning ? 'bg-red-500 text-white' : 'bg-lime-500 text-black'
                }`}
              >
                {isClockRunning ? 'PAUSE' : 'START'}
              </button>
            </div>
          </div>

          {/* U7 CAROUSEL MULTI-PITCH DISPLAY */}
          {ageGroup === 'U7' ? (
            <div className="mb-6 space-y-4">
              {Array.from({ length: carouselPitches }).map((_, pitchIdx) => {
                const pitchGroup = pitchPlayers.slice(pitchIdx * 3, pitchIdx * 3 + 3);
                const pitchLetters = ['A', 'B', 'C', 'D'];

                return (
                  <div key={pitchIdx} className="bg-gray-900 p-3.5 rounded-xl border border-gray-800">
                    <h3 className="text-xs uppercase font-extrabold text-lime-400 mb-2 flex justify-between">
                      <span>🏟️ Mini-Pitch {pitchLetters[pitchIdx]} (3v3)</span>
                      <span className="text-gray-400">{pitchGroup.length}/3 Players</span>
                    </h3>
                    <div className="grid grid-cols-3 gap-2">
                      {pitchGroup.map((player) => {
                        const isSelected = selectedOnPitch === player.id;
                        return (
                          <button
                            key={player.id}
                            onClick={() => setSelectedOnPitch(isSelected ? null : player.id)}
                            className={`p-2.5 rounded-lg border-2 text-left transition-all ${
                              isSelected
                                ? 'bg-yellow-500 border-yellow-300 text-black scale-102 shadow-lg'
                                : 'bg-black border-gray-800 text-white'
                            }`}
                          >
                            <div className="font-extrabold text-xs truncate">
                              #{player.squad_number} {player.name}
                            </div>
                            <div className="text-[10px] font-mono text-lime-400 opacity-90 mt-1">
                              {formatPlayerMins(player.seconds_played)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* STANDARD PITCH DISPLAY (U8-U15) */
            <div className="mb-6">
              <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold flex justify-between">
                <span>On Pitch ({pitchPlayers.length}/{pitchCapacity})</span>
                <span className="text-amber-400">🔥 High Mins Alert</span>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {pitchPlayers.map((player) => {
                  const isSelected = selectedOnPitch === player.id;
                  const isHighTime = player.seconds_played > 0 && player.seconds_played === highestPitchSeconds;

                  return (
                    <button
                      key={player.id}
                      onClick={() => setSelectedOnPitch(isSelected ? null : player.id)}
                      className={`p-3.5 rounded-xl border-2 text-left transition-all relative ${
                        isSelected
                          ? 'bg-yellow-500 border-yellow-300 text-black scale-102 shadow-lg'
                          : isHighTime
                          ? 'bg-gray-900 border-amber-500/60 text-white'
                          : 'bg-gray-900 border-gray-800 text-white'
                      }`}
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-extrabold text-base">
                          #{player.squad_number} {player.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded font-black ${isSelected ? 'bg-black text-yellow-500' : 'bg-gray-800 text-lime-400'}`}>
                          {player.current_position}
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
          )}

          {/* Substitutes Bench */}
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

      {/* TAB 2: SQUAD MANAGEMENT */}
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
          onClick={() => setActiveTab('squad')}
          className={`flex-1 py-3 font-black text-xs rounded-lg transition-all ${
            activeTab === 'squad' ? 'bg-lime-500 text-black' : 'text-gray-400'
          }`}
        >
          📋 SQUAD MANAGER
        </button>
      </div>
    </div>
  );
}