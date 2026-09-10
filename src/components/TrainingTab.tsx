'use client';

import React from 'react';
import { Player, TrainingRecord } from '@/types/matchday';

type Props = {
  sessionDate: string;
  setSessionDate: (date: string) => void;
  attendedCount: number;
  squad: Player[];
  trainingData: Record<string, TrainingRecord>;
  handleTrainingStatusChange: (playerId: string, status: 'attended' | 'absent' | 'excused') => void;
  handleRatingChange: (playerId: string, rating: number) => void;
  handleNotesChange: (playerId: string, notes: string) => void;
  applyTrainingToAvailability: () => void;
};

export default function TrainingTab(props: Props) {
  return (
    <div>
      <h1 className="text-xl font-black text-lime-400 mb-3">Midweek Training Tracker</h1>

      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 flex justify-between items-center shadow-md">
        <div>
          <label className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">
            Session Date
          </label>
          <input
            type="date"
            value={props.sessionDate}
            onChange={(e) => props.setSessionDate(e.target.value)}
            className="bg-black border border-gray-800 text-lime-400 font-black text-xs rounded-lg p-2 focus:outline-none"
          />
        </div>
        <div className="text-right">
          <span className="block text-[10px] text-gray-400 font-bold uppercase tracking-wider">Attendance Rate</span>
          <span className="text-xl font-mono font-black text-lime-400">
            {props.attendedCount}/{props.squad.length} ({Math.round((props.attendedCount / (props.squad.length || 1)) * 100)}%)
          </span>
        </div>
      </div>

      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-4 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between items-center">
          <span>📋 Attendance & Effort Ratings</span>
          <span className="text-[10px] text-gray-400">1-5 Stars Focus/Effort</span>
        </h2>

        <div className="flex flex-col gap-3">
          {props.squad.map((player) => {
            const rec = props.trainingData[player.id] || {
              playerId: player.id,
              status: 'attended',
              effortRating: 5,
              notes: '',
            };

            return (
              <div key={player.id} className="p-3.5 bg-black rounded-2xl border border-gray-800">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-extrabold text-sm text-white truncate max-w-[150px]">
                    #{player.squad_number} {player.name}
                  </span>

                  <div className="flex gap-1">
                    <button
                      onClick={() => props.handleTrainingStatusChange(player.id, 'attended')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all min-h-[36px] ${
                        rec.status === 'attended'
                          ? 'bg-emerald-500 text-black'
                          : 'bg-gray-900 text-gray-400 border border-gray-800'
                      }`}
                    >
                      PRESENT
                    </button>
                    <button
                      onClick={() => props.handleTrainingStatusChange(player.id, 'absent')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all min-h-[36px] ${
                        rec.status === 'absent'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-900 text-gray-400 border border-gray-800'
                      }`}
                    >
                      ABSENT
                    </button>
                    <button
                      onClick={() => props.handleTrainingStatusChange(player.id, 'excused')}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black transition-all min-h-[36px] ${
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
                      <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => props.handleRatingChange(player.id, star)}
                            className={`text-sm ${
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
                      onChange={(e) => props.handleNotesChange(player.id, e.target.value)}
                      className="w-full bg-gray-950 border border-gray-850 rounded-xl p-2.5 text-[11px] text-gray-300 focus:outline-none focus:border-lime-400"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={props.applyTrainingToAvailability}
        className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black p-4 rounded-2xl text-sm active:scale-95 transition-all shadow-lg mb-6 min-h-[48px]"
      >
        ⚡ SYNC ATTENDED PLAYERS TO MATCHDAY PLANNER
      </button>
    </div>
  );
}