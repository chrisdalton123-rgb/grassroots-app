'use client';

import React, { useState } from 'react';
import { Player, SubPlanStep, MatchGoal } from '@/types/matchday';

type Props = {
  ageGroup: string;
  setAgeGroup: (val: string) => void;
  agePresets: Record<string, { pitchCount: number; halfMins: number; label: string }>;
  viewMode: 'pitch' | 'cards';
  setViewMode: (val: 'pitch' | 'cards') => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  basePitchCapacity: number;
  setBasePitchCapacity: (val: number) => void;
  halfMinutes: number;
  handleHalfMinutesChange: (mins: number) => void;
  isPowerplayActive: boolean;
  togglePowerplay: () => void;
  goalDifference: number;
  ourGoalsCount: number;
  opponentGoalsCount: number;
  opponentName: string;
  setOpponentName: (val: string) => void;
  secondsRemaining: number;
  isClockRunning: boolean;
  toggleClock: () => void;
  currentPeriod: number;
  pendingPlanSteps: SubPlanStep[];
  handleApplyScheduledSub: (id: string) => void;
  pitchPlayers: Player[];
  subBench: Player[];
  injuredPlayers: Player[];
  currentPitchCapacity: number;
  handleLogGoal: (name: string, isOpponent?: boolean) => void;
  handleMarkInjured: (id: string) => void;
  handleRecoverPlayer: (id: string) => void;
  selectedOnPitch: string | null;
  setSelectedOnPitch: (id: string | null) => void;
  targetSubPosition: string | null;
  setTargetSubPosition: (pos: string | null) => void;
  handleSubSwap: (benchId: string) => void;
  handleChangeOnPitchPosition: (id: string, role: string) => void;
  editingPositionPlayerId: string | null;
  setEditingPositionPlayerId: (id: string | null) => void;
  positionSlots: string[];
  lowestSeconds: number;
  playerOfTheMatch: string | null;
  setPlayerOfTheMatch: (val: string | null) => void;
  generateWhatsAppSummary: () => void;
  handleSaveAndFinishMatch: () => void;
  savingMatch: boolean;
  formatTime: (secs: number) => string;
  formatPlayerMins: (secs: number) => string;
  triggerHaptic: () => void;
};

export default function MatchdayTab(props: Props) {
  const goalkeepers = props.pitchPlayers.filter((p) => p.current_position === 'GK');
  const defenders = props.pitchPlayers.filter((p) => p.current_position.includes('DEF'));
  const midfielders = props.pitchPlayers.filter((p) => p.current_position.includes('MID'));
  const strikers = props.pitchPlayers.filter((p) => p.current_position.includes('STR'));

  return (
    <div>
      {/* FORMAT BAR */}
      <div className="bg-gray-900/90 p-3 rounded-2xl mb-4 border border-gray-800 shadow-md flex flex-col gap-2.5">
        <div className="flex justify-between items-center gap-2">
          <select
            value={props.ageGroup}
            onChange={(e) => props.setAgeGroup(e.target.value)}
            className="bg-black border border-gray-800 text-lime-400 font-black text-xs rounded-xl p-2.5 focus:outline-none flex-1 min-h-[44px]"
          >
            {Object.keys(props.agePresets).map((key) => (
              <option key={key} value={key}>{props.agePresets[key].label}</option>
            ))}
          </select>

          <button
            onClick={() => props.setViewMode(props.viewMode === 'pitch' ? 'cards' : 'pitch')}
            className="text-[11px] bg-lime-500 text-black font-extrabold px-3 py-2.5 rounded-xl shadow active:scale-95 transition-all shrink-0 min-h-[44px] flex items-center"
          >
            {props.viewMode === 'pitch' ? '🎴 CARDS' : '🏟️ BOARD'}
          </button>

          <button
            onClick={() => props.setShowSettings(!props.showSettings)}
            className="text-xs bg-gray-950 border border-gray-800 text-gray-300 font-bold px-3 py-2.5 rounded-xl min-h-[44px] flex items-center"
          >
            ⚙️
          </button>
        </div>

        {props.showSettings && (
          <div className="pt-2.5 border-t border-gray-800 flex justify-between items-center text-xs">
            <div>
              <span className="text-gray-400 block text-[10px] font-bold">PITCH SEATS:</span>
              <input
                type="number"
                value={props.basePitchCapacity}
                onChange={(e) => props.setBasePitchCapacity(parseInt(e.target.value, 10) || 5)}
                className="bg-black border border-gray-800 text-lime-400 font-bold p-1.5 w-14 text-center rounded-lg mt-0.5"
              />
            </div>
            <div>
              <span className="text-gray-400 block text-[10px] font-bold">HALF MINS:</span>
              <input
                type="number"
                value={props.halfMinutes}
                onChange={(e) => props.handleHalfMinutesChange(parseInt(e.target.value, 10) || 20)}
                className="bg-black border border-gray-800 text-lime-400 font-bold p-1.5 w-14 text-center rounded-lg mt-0.5"
              />
            </div>
          </div>
        )}
      </div>

      {/* SCOREBOARD & TIMER */}
      <div className="bg-gray-900/90 p-4 rounded-2xl mb-4 border border-gray-800 shadow-md">
        <div className="flex justify-between items-center mb-3 pb-3 border-b border-gray-800">
          <div className="flex items-center gap-4">
            <div className="text-center">
              <span className="text-[10px] text-gray-400 font-bold block uppercase">OUR TEAM</span>
              <span className="text-3xl font-black text-lime-400 font-mono">{props.ourGoalsCount}</span>
            </div>
            <span className="text-gray-600 font-black text-xl">-</span>
            <div className="text-center">
              <span className="text-[10px] text-gray-400 font-bold block uppercase truncate max-w-[80px]">{props.opponentName}</span>
              <span className="text-3xl font-black text-red-400 font-mono">{props.opponentGoalsCount}</span>
            </div>
          </div>

          <button
            onClick={() => props.handleLogGoal(props.opponentName, true)}
            className="px-3 py-2 bg-red-500/20 text-red-400 border border-red-500/40 rounded-xl font-black text-xs active:scale-95 transition-all min-h-[44px]"
          >
            + OPPONENT GOAL
          </button>
        </div>

        <div className="flex justify-between items-center">
          <div>
            <span className="text-xs text-gray-400 block font-bold uppercase tracking-wider">
              {props.ageGroup === 'U7' ? `Mini-Game ${props.currentPeriod}` : `Half ${props.currentPeriod}`} — Live
            </span>
            <h1 className="text-3xl font-black text-lime-400 font-mono tracking-tight">
              {props.formatTime(props.secondsRemaining)}
            </h1>
          </div>
          <button
            onClick={props.toggleClock}
            className={`px-6 py-3.5 font-black text-sm rounded-xl active:scale-95 transition-all shadow-md min-h-[48px] ${
              props.isClockRunning ? 'bg-red-500 text-white' : 'bg-lime-500 text-black'
            }`}
          >
            {props.isClockRunning ? 'PAUSE' : 'START'}
          </button>
        </div>
      </div>

      {/* PENDING SUBS */}
      {props.pendingPlanSteps.length > 0 && (
        <div className="bg-gray-900/90 p-3.5 rounded-2xl border border-lime-500/40 mb-4 shadow-md">
          <h3 className="text-xs font-black text-lime-400 mb-2 uppercase tracking-wider flex justify-between items-center">
            <span>⏱️ Upcoming Pre-Planned Subs ({props.pendingPlanSteps.length})</span>
          </h3>
          <div className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {props.pendingPlanSteps.map((step) => (
              <div key={step.id} className="bg-black border border-lime-500/30 p-2.5 rounded-xl shrink-0 min-w-[155px] flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-mono text-lime-400 font-bold block mb-1">MIN {step.minute}'</span>
                  <span className="text-red-400 block font-bold text-[11px]">OFF: {step.offPlayerName}</span>
                  <span className="text-lime-400 block font-bold text-[11px]">ON: {step.onPlayerName}</span>
                  <span className="text-[9px] text-amber-300 font-bold block mt-1">POS: {step.assignedPosition}</span>
                </div>
                <button
                  onClick={() => props.handleApplyScheduledSub(step.id)}
                  className="w-full bg-lime-500 text-black font-black py-2 rounded-lg text-[10px] active:scale-95 transition-all min-h-[36px] mt-2"
                >
                  ⚡ EXECUTE SUB
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TACTICAL PITCH BOARD */}
      {props.viewMode === 'pitch' ? (
        <div className="mb-6 bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
          <div className="flex justify-between items-center mb-3">
            <span className="text-xs uppercase tracking-widest text-lime-400 font-extrabold">
              🏟️ Pitch Board ({props.pitchPlayers.length}/{props.currentPitchCapacity})
            </span>
          </div>

          <div className="relative bg-emerald-800 border-2 border-emerald-400/80 rounded-2xl p-3 min-h-[420px] flex flex-col justify-between overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/40 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-emerald-400/40 rounded-full -translate-x-1/2 -translate-y-1/2" />

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[400px] py-1 gap-2">
              {/* STRIKERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {strikers.map((player) => (
                  <div key={player.id} className="relative flex flex-col items-center">
                    <div className="p-2 rounded-2xl text-center bg-black/95 border-2 border-lime-400 text-white min-h-[55px] max-w-[110px] w-full flex flex-col items-center justify-between">
                      <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.triggerHaptic();
                          props.setEditingPositionPlayerId(props.editingPositionPlayerId === player.id ? null : player.id);
                        }}
                        className="text-[9px] bg-lime-500 text-black font-black px-2 py-0.5 rounded mt-1 hover:bg-lime-400"
                      >
                        {player.current_position} ⚙️
                      </button>
                    </div>

                    {props.editingPositionPlayerId === player.id && (
                      <div className="absolute top-14 z-50 bg-gray-950 border-2 border-lime-400 p-2 rounded-xl flex flex-wrap gap-1 shadow-2xl w-[170px]">
                        {props.positionSlots.map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                            className="px-2 py-1 text-[9px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black flex-1 text-center"
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* MIDFIELDERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {midfielders.map((player) => (
                  <div key={player.id} className="relative flex flex-col items-center">
                    <div className="p-2 rounded-2xl text-center bg-black/95 border-2 border-lime-400 text-white min-h-[55px] max-w-[110px] w-full flex flex-col items-center justify-between">
                      <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.triggerHaptic();
                          props.setEditingPositionPlayerId(props.editingPositionPlayerId === player.id ? null : player.id);
                        }}
                        className="text-[9px] bg-lime-500 text-black font-black px-2 py-0.5 rounded mt-1 hover:bg-lime-400"
                      >
                        {player.current_position} ⚙️
                      </button>
                    </div>

                    {props.editingPositionPlayerId === player.id && (
                      <div className="absolute top-14 z-50 bg-gray-950 border-2 border-lime-400 p-2 rounded-xl flex flex-wrap gap-1 shadow-2xl w-[170px]">
                        {props.positionSlots.map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                            className="px-2 py-1 text-[9px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black flex-1 text-center"
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* DEFENDERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {defenders.map((player) => (
                  <div key={player.id} className="relative flex flex-col items-center">
                    <div className="p-2 rounded-2xl text-center bg-black/95 border-2 border-lime-400 text-white min-h-[55px] max-w-[110px] w-full flex flex-col items-center justify-between">
                      <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          props.triggerHaptic();
                          props.setEditingPositionPlayerId(props.editingPositionPlayerId === player.id ? null : player.id);
                        }}
                        className="text-[9px] bg-lime-500 text-black font-black px-2 py-0.5 rounded mt-1 hover:bg-lime-400"
                      >
                        {player.current_position} ⚙️
                      </button>
                    </div>

                    {props.editingPositionPlayerId === player.id && (
                      <div className="absolute top-14 z-50 bg-gray-950 border-2 border-lime-400 p-2 rounded-xl flex flex-wrap gap-1 shadow-2xl w-[170px]">
                        {props.positionSlots.map((pos) => (
                          <button
                            key={pos}
                            type="button"
                            onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                            className="px-2 py-1 text-[9px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black flex-1 text-center"
                          >
                            {pos}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* GOALKEEPERS */}
              <div className="flex justify-center items-center min-h-[60px]">
                {goalkeepers.map((player) => (
                  <div key={player.id} className="relative flex flex-col items-center">
                    <div className="p-2 rounded-2xl text-center bg-black/95 border-2 border-lime-400 text-white min-h-[55px] max-w-[120px] w-full">
                      <span className="text-[11px] font-black block truncate">🧤 #{player.squad_number} {player.name}</span>
                      <span className="text-[9px] bg-lime-500 text-black font-black px-2 py-0.5 rounded mt-1 inline-block">GK</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* CARDS VIEW */
        <div className="mb-6 grid grid-cols-2 gap-2.5">
          {props.pitchPlayers.map((player) => (
            <div key={player.id} className="h-[82px] rounded-xl border border-gray-800 bg-gray-950/80 p-2.5 flex flex-col justify-between">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-black truncate">#{player.squad_number} {player.name}</span>
                <span className="text-[9px] bg-lime-500 text-black px-1.5 py-0.5 rounded font-black">{player.current_position}</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">{props.formatPlayerMins(player.seconds_played)}</span>
            </div>
          ))}
        </div>
      )}

      {/* SAVE & FINISH */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 flex flex-col gap-3 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">💾 Finish Match</h2>
        <input
          type="text"
          placeholder="Opponent Name"
          value={props.opponentName}
          onChange={(e) => props.setOpponentName(e.target.value)}
          className="bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none min-h-[44px]"
        />
        <div className="flex gap-2.5">
          <button
            onClick={props.generateWhatsAppSummary}
            className="flex-1 bg-emerald-600 text-white font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all min-h-[48px]"
          >
            💬 WHATSAPP
          </button>
          <button
            onClick={props.handleSaveAndFinishMatch}
            disabled={props.savingMatch}
            className="flex-1 bg-lime-500 text-black font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all min-h-[48px]"
          >
            {props.savingMatch ? 'SAVING...' : '💾 SAVE'}
          </button>
        </div>
      </div>
    </div>
  );
}