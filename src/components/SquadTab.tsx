'use client';

import React from 'react';
import { Player } from '@/types/matchday';

type Props = {
  squad: Player[];
  newName: string;
  setNewName: (val: string) => void;
  newNumber: string;
  setNewNumber: (val: string) => void;
  newPosition: string;
  setNewPosition: (val: string) => void;
  handleAddPlayer: (e: React.FormEvent) => void;
  editingPlayerId: string | null;
  setEditingPlayerId: (id: string | null) => void;
  editName: string;
  setEditName: (val: string) => void;
  editNumber: string;
  setEditNumber: (val: string) => void;
  editPosition: string;
  setEditPosition: (val: string) => void;
  startEditPlayer: (player: Player) => void;
  saveEditPlayer: (id: string) => void;
  handleDeletePlayer: (id: string) => void;
};

export default function SquadTab(props: Props) {
  return (
    <div>
      <h1 className="text-xl font-black text-lime-400 mb-4">Team Roster Manager</h1>

      <form onSubmit={props.handleAddPlayer} className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 mb-6 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold">Add New Player</h2>
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Player Name"
            value={props.newName}
            onChange={(e) => props.setNewName(e.target.value)}
            className="bg-black border border-gray-800 rounded-xl p-3 text-white focus:outline-none focus:border-lime-400 text-xs font-bold min-h-[44px]"
          />
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Kit #"
              value={props.newNumber}
              onChange={(e) => props.setNewNumber(e.target.value)}
              className="bg-black border border-gray-800 rounded-xl p-3 text-white w-1/3 focus:outline-none focus:border-lime-400 text-xs font-bold min-h-[44px]"
            />
            <select
              value={props.newPosition}
              onChange={(e) => props.setNewPosition(e.target.value)}
              className="bg-black border border-gray-800 rounded-xl p-3 text-white w-2/3 focus:outline-none focus:border-lime-400 text-xs font-bold min-h-[44px]"
            >
              <option value="Goalkeeper">Goalkeeper</option>
              <option value="Defender">Defender</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Striker">Striker</option>
            </select>
          </div>
          <button
            type="submit"
            className="bg-lime-500 text-black font-black p-3.5 rounded-xl active:scale-95 transition-all text-xs min-h-[48px]"
          >
            + ADD TO ROSTER
          </button>
        </div>
      </form>

      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-3 font-bold flex justify-between">
          <span>Active Roster ({props.squad.length})</span>
        </h2>

        <div className="flex flex-col gap-3">
          {props.squad.map((player) => {
            const isEditing = props.editingPlayerId === player.id;

            return (
              <div key={player.id} className="p-3.5 bg-black rounded-2xl border border-gray-800">
                {isEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="text"
                      value={props.editName}
                      onChange={(e) => props.setEditName(e.target.value)}
                      className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs font-bold text-white min-h-[44px]"
                    />
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={props.editNumber}
                        onChange={(e) => props.setEditNumber(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs font-bold text-white w-1/3 min-h-[44px]"
                      />
                      <select
                        value={props.editPosition}
                        onChange={(e) => props.setEditPosition(e.target.value)}
                        className="bg-gray-900 border border-gray-700 rounded-xl p-2.5 text-xs font-bold text-white w-2/3 min-h-[44px]"
                      >
                        <option value="Goalkeeper">Goalkeeper</option>
                        <option value="Defender">Defender</option>
                        <option value="Midfielder">Midfielder</option>
                        <option value="Striker">Striker</option>
                      </select>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <button
                        onClick={() => props.saveEditPlayer(player.id)}
                        className="flex-1 bg-lime-500 text-black font-extrabold py-2 rounded-xl text-xs min-h-[40px]"
                      >
                        SAVE
                      </button>
                      <button
                        onClick={() => props.setEditingPlayerId(null)}
                        className="bg-gray-800 text-gray-300 font-bold px-4 py-2 rounded-xl text-xs min-h-[40px]"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center overflow-hidden mr-2">
                        <span className="font-extrabold text-base mr-2 truncate">#{player.squad_number} {player.name}</span>
                        <span className="text-[10px] text-lime-400 bg-lime-500/10 border border-lime-500/30 px-2.5 py-1 rounded-md font-bold shrink-0">
                          {player.preferred_position}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => props.startEditPlayer(player)}
                          className="text-gray-400 hover:text-white font-bold text-xs px-2.5 py-1.5 bg-gray-900 rounded-xl border border-gray-800 min-h-[36px]"
                        >
                          ✏️ EDIT
                        </button>
                        <button
                          onClick={() => props.handleDeletePlayer(player.id)}
                          className="text-red-500 hover:text-red-400 font-bold text-xs px-2.5 py-1.5 bg-red-950/40 rounded-xl border border-red-900/40 min-h-[36px]"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-1 text-[10px] bg-gray-950 p-2.5 rounded-xl text-center font-mono text-gray-400 border border-gray-850">
                      <div>
                        <span className="block text-gray-500 text-[9px] font-bold">MATCHES</span>
                        <span className="font-bold text-white">{player.total_matches || 0}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-[9px] font-bold">MINS</span>
                        <span className="font-bold text-lime-400">{Math.floor((player.total_seconds_played || 0) / 60)}m</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-[9px] font-bold">GOALS</span>
                        <span className="font-bold text-amber-400">{player.total_goals || 0}</span>
                      </div>
                      <div>
                        <span className="block text-gray-500 text-[9px] font-bold">POTM</span>
                        <span className="font-bold text-purple-400">{player.total_potm || 0} ⭐</span>
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
  );
}