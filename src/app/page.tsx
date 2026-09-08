'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

type Player = {
  id: string;
  name: string;
  squad_number: number;
  preferred_position: string;
  seconds_played: number;
  current_position: string;
};

export default function MatchdayApp() {
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [benchPlayers, setBenchPlayers] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Timer states
  const [secondsRemaining, setSecondsRemaining] = useState(600); // 10 mins = 600 secs
  const [isClockRunning, setIsClockRunning] = useState(false);
  const [currentQuarter, setCurrentQuarter] = useState(1);

  // 1. Fetch players from Supabase on initial load
  useEffect(() => {
    async function loadSquad() {
      const { data, error } = await supabase.from('players').select('*');
      if (error) {
        console.error('Error fetching players:', error);
      } else if (data) {
        const formatted: Player[] = data.map((p) => ({
          id: p.id,
          name: p.name,
          squad_number: p.squad_number,
          preferred_position: p.preferred_position,
          seconds_played: 0,
          current_position: p.preferred_position || 'BENCH',
        }));

        setPitchPlayers(formatted.slice(0, 7));
        setBenchPlayers(formatted.slice(7));
      }
      setLoading(false);
    }
    loadSquad();
  }, []);

  // 2. Live Match Clock Interval
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isClockRunning && secondsRemaining > 0) {
      interval = setInterval(() => {
        // Count down match clock
        setSecondsRemaining((prev) => prev - 1);

        // Add +1 second of game time to every player currently on the pitch
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

  // Format seconds into MM:SS display
  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Format player minutes (e.g. "3.5 mins")
  const formatPlayerMins = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    return `${mins} mins`;
  };

  // Handle two-tap substitution
  const handleSwap = (benchPlayerId: string) => {
    if (!selectedOnPitch) return;

    const onPitchIndex = pitchPlayers.findIndex((p) => p.id === selectedOnPitch);
    const benchIndex = benchPlayers.findIndex((p) => p.id === benchPlayerId);

    if (onPitchIndex === -1 || benchIndex === -1) return;

    const newPitch = [...pitchPlayers];
    const newBench = [...benchPlayers];

    const outgoing = newPitch[onPitchIndex];
    const incoming = newBench[benchIndex];

    newPitch[onPitchIndex] = { ...incoming, current_position: outgoing.current_position };
    newBench[benchIndex] = { ...outgoing, current_position: 'BENCH' };

    setPitchPlayers(newPitch);
    setBenchPlayers(newBench);
    setSelectedOnPitch(null);
  };

  if (loading) {
    return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Squad Data...</div>;
  }

  return (
    <div className="bg-black text-white min-h-screen p-4 font-sans select-none max-w-md mx-auto">
      {/* Top Match Clock Header */}
      <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl mb-4 border border-gray-800">
        <div>
          <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
            Quarter {currentQuarter} Live
          </span>
          <h1 className="text-2xl font-black text-lime-400 font-mono tracking-tight">
            Q{currentQuarter} — {formatTime(secondsRemaining)}
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

      {/* Pitch Grid */}
      <div className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
          On Pitch (Tap player to swap)
        </h2>
        <div className="grid grid-cols-2 gap-3">
          {pitchPlayers.map((player) => {
            const isSelected = selectedOnPitch === player.id;
            return (
              <button
                key={player.id}
                onClick={() => setSelectedOnPitch(isSelected ? null : player.id)}
                className={`p-3.5 rounded-xl border-2 text-left transition-all ${
                  isSelected
                    ? 'bg-yellow-500 border-yellow-300 text-black scale-102 shadow-lg'
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
                <div className="text-xs font-mono opacity-80">
                  {formatPlayerMins(player.seconds_played)} played
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bench Section */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <h2 className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold">
          Bench {selectedOnPitch ? '— Tap player to sub in' : ''}
        </h2>
        <div className="flex flex-col gap-2">
          {benchPlayers.map((player) => (
            <button
              key={player.id}
              disabled={!selectedOnPitch}
              onClick={() => handleSwap(player.id)}
              className={`p-3.5 rounded-xl flex justify-between items-center text-left border transition-all ${
                selectedOnPitch
                  ? 'bg-amber-500/10 border-amber-500 text-amber-200 active:bg-amber-500 active:text-black'
                  : 'bg-gray-950 border-gray-800 text-gray-500'
              }`}
            >
              <div>
                <span className="font-extrabold text-base">#{player.squad_number} {player.name}</span>
                <span className="ml-3 text-xs font-mono">{formatPlayerMins(player.seconds_played)}</span>
              </div>
              {selectedOnPitch && <span className="font-black text-xs">SWAP IN →</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}