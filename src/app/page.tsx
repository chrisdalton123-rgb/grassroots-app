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
  const [pitchPlayers, setPitchPlayers] = useState<Player[]>([]);
  const [subBench, setSubBench] = useState<Player[]>([]);
  const [selectedOnPitch, setSelectedOnPitch] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Match clock states (UK Grassroots 10-min halves/periods)
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

  useEffect(() => {
    async function loadSquad() {
      const { data, error } = await supabase.from('players').select('*').order('squad_number', { ascending: true });
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

        setPitchPlayers(formatted.slice(0, 7));
        setSubBench(formatted.slice(7));
      }
      setLoading(false);
    }
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

  if (loading) {
    return <div className="bg-black text-white min-h-screen p-8 text-center font-bold">Loading Squad List...</div>;
  }

  return (
    <div className="bg-black text-white min-h-screen p-4 font-sans select-none max-w-md mx-auto">
      {/* Top Matchday Header */}
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

      {/* On Pitch Section */}
      <div className="mb-6">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2 font-bold">
          On Pitch (Tap player to substitute)
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

      {/* Substitutes Bench */}
      <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
        <h2 className="text-xs uppercase tracking-widest text-amber-400 mb-2 font-bold">
          Substitutes Bench {selectedOnPitch ? '— Tap to sub on' : ''}
        </h2>
        <div className="flex flex-col gap-2">
          {subBench.map((player) => (
            <button
              key={player.id}
              disabled={!selectedOnPitch}
              onClick={() => handleSubSwap(player.id)}
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
              {selectedOnPitch && <span className="font-black text-xs">SUB ON →</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}