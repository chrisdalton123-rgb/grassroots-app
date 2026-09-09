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

export default function MatchdayApp() {
  const [activeTab, setActiveTab] = useState<'matchday' | 'squad'>('matchday');
  const [squad, setSquad] = useState<Player[]>([]);
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // New Player Form State
  const [newName, setNewName] = useState('');
  const [newNumber, setNewNumber] = useState('');
  const [newPosition, setNewPosition] = useState('Midfielder');

  // Match clock states
  const [secondsRemaining, setSecondsRemaining] = useState(600);
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

  // Find lowest seconds among all players for equality tracking
  const allPlayers = [...pitchPlayers, ...subBench];
  const lowestSeconds = allPlayers.length > 0 
    ? Math.min(...allPlayers.map((p) => p.seconds_played)) 
    : 0;

  // Find highest seconds among pitch players to highlight who needs a sub
  const highestPitchSeconds = pitchPlayers.length > 0 
    ? Math.max(...pitchPlayers.map((p) => p.seconds_played)) 
    : 0;

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
      setPitchPlayers(formatted.slice(0, 7));
      setSubBench(formatted.slice(7));
    }
    setLoading(false);
  };

  useEffect(() => {
    loadSquad();
  }, []);

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

    if (error) {
      console.error('Error adding player:', error);
    } else {
      setNewName('');
      setNewNumber('');
      loadSquad();
    }
  };

  const handleDeletePlayer = async (id: string) => {
    const { error } = await supabase.from('players').delete().eq('id', id);
    if (error) {
      console.error('Error deleting player:', error);
    } else {
      loadSquad();
    }
  };

  if (loading) {
    return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Squad Data...</div>;
  }

  return (
    <div className="bg-black text-white min-h-screen pb-20 p-4 font-sans select-none max-w-md mx-auto">
      {/* TAB 1: MATCHDAY TOUCHLINE */}
      {activeTab === 'matchday' && (
        <div>
          {/* Match Header */}
          <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl mb-4 border border-gray-800">
            <div>
              <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
                Half {currentPeriod} — Live
              </span>
              <h1 className="text-2xl font-black text-lime-400 font-mono tracking-tight">
                H{currentPeriod} — {formatTime(secondsRemaining)}
              </h1>
            </div>
            <button
              onClick={() => setIsClockRunning(!isClockRunning)}
              className={`px-5 py-3 font-black text-sm rounded-lg active:scale-95 transition-all ${
                isClockRunning ? 'bg-red-500 text-white' : 'bg-lime-500 text-black'
              }`}
            >
              {isClockRunning ? 'PAUSE CLOCK' : 'START CLOCK'}
            </button>
          </div>

          {/* Pitch Section */}
          <div className="mb-6">
            <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold flex justify-between">
              <span>On Pitch (Tap to sub)</span>
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

          {/* Bench Section */}
          <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
            <h2 className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold flex justify-between">
              <span>Substitutes Bench</span>
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