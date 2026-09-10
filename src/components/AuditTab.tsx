'use client';

import React from 'react';
import { Player, SavedMatch } from '@/types/matchday';

type Props = {
  squad: Player[];
  squadMaxSeconds: number;
  matchHistory: SavedMatch[];
};

export default function AuditTab(props: Props) {
  return (
    <div>
      <h1 className="text-xl font-black text-lime-400 mb-4">Season Equal-Time Audit</h1>

      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-6 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between items-center">
          <span>⏱️ Team Playing Time Audit</span>
          <span className="text-[10px] text-gray-400">FA 100% Equal Rotation</span>
        </h2>

        <div className="flex flex-col gap-3">
          {props.squad.map((player) => {
            const mins = Math.floor((player.total_seconds_played || 0) / 60);
            const percentOfMax = Math.round(((player.total_seconds_played || 0) / props.squadMaxSeconds) * 100);

            return (
              <div key={player.id} className="bg-black p-3.5 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center text-xs mb-1.5 font-bold">
                  <span className="text-gray-200 truncate max-w-[150px]">#{player.squad_number} {player.name}</span>
                  <span className="font-mono text-lime-400 shrink-0">{mins} mins ({player.total_matches || 0} matches)</span>
                </div>
                <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
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

      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">
          📜 Saved Match History ({props.matchHistory.length})
        </h2>
        <div className="flex flex-col gap-2.5">
          {props.matchHistory.map((m) => (
            <div key={m.id} className="p-3.5 bg-black rounded-xl border border-gray-800 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between items-center">
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

              {m.starting_lineup && m.starting_lineup.length > 0 && (
                <div className="pt-2 border-t border-gray-900 text-[10px]">
                  <span className="text-gray-400 font-bold block mb-1">🚨 Starters:</span>
                  <span className="text-lime-300 font-mono">{m.starting_lineup.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}