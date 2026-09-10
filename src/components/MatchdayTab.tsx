'use client';

import React from 'react';
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
  formationIndex: number;
  setFormationIndex: (idx: number) => void;
  activeFormations: { label: string; roles: string[] }[];
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

      {/* FA POWERPLAY BANNER */}
      {(props.goalDifference >= 4 || props.isPowerplayActive) && (
        <div className="bg-purple-950/80 border border-purple-500/50 p-3.5 rounded-2xl mb-4 flex justify-between items-center shadow-lg">
          <div>
            <span className="text-xs font-black text-purple-300 block">⚡ FA POWERPLAY RULE</span>
            <span className="text-[11px] text-gray-300">
              {props.isPowerplayActive ? 'Extra player active (+1 pitch seat)' : '4+ goals behind! Add extra player'}
            </span>
          </div>
          <button
            onClick={props.togglePowerplay}
            className={`px-3.5 py-2 font-black text-xs rounded-xl transition-all min-h-[44px] ${
              props.isPowerplayActive ? 'bg-purple-400 text-black' : 'bg-purple-600 text-white'
            }`}
          >
            {props.isPowerplayActive ? 'DISABLE' : 'ENABLE (+1)'}
          </button>
        </div>
      )}

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

      {/* PENDING SCHEDULED SUBS */}
      {props.pendingPlanSteps.length > 0 && (
        <div className="bg-gray-900/90 p-3.5 rounded-2xl border border-lime-500/40 mb-4 shadow-md">
          <h3 className="text-xs font-black text-lime-400 mb-2 uppercase tracking-wider flex justify-between items-center">
            <span>⏱️ Upcoming Pre-Planned Subs ({props.pendingPlanSteps.length})</span>
            <span className="text-[10px] text-gray-400 font-normal">Tap to execute</span>
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
                  className="w-full bg-lime-500 hover:bg-lime-400 text-black font-black py-2 rounded-lg text-[10px] active:scale-95 shadow transition-all min-h-[36px] mt-2"
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
            {props.activeFormations.length > 0 && (
              <select
                value={props.formationIndex}
                onChange={(e) => props.setFormationIndex(parseInt(e.target.value, 10))}
                className="bg-black border border-gray-800 text-lime-400 font-bold text-[10px] rounded-lg px-2.5 py-1.5 focus:outline-none"
              >
                {props.activeFormations.map((f, i) => (
                  <option key={i} value={i}>{f.label}</option>
                ))}
              </select>
            )}
          </div>

          <div className="relative bg-emerald-800 border-2 border-emerald-400/80 rounded-2xl p-3 min-h-[420px] flex flex-col justify-between shadow-inner overflow-hidden">
            <div className="absolute inset-x-0 top-1/2 h-0.5 bg-emerald-400/40 -translate-y-1/2" />
            <div className="absolute top-1/2 left-1/2 w-24 h-24 border-2 border-emerald-400/40 rounded-full -translate-x-1/2 -translate-y-1/2" />
            <div className="absolute top-0 left-1/2 w-36 h-12 border-b-2 border-x-2 border-emerald-400/40 rounded-b-xl -translate-x-1/2" />
            <div className="absolute bottom-0 left-1/2 w-36 h-12 border-t-2 border-x-2 border-emerald-400/40 rounded-t-xl -translate-x-1/2" />

            <div className="relative z-10 flex flex-col justify-between h-full min-h-[400px] py-1 gap-2">
              {/* STRIKERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {strikers.map((player) => {
                  const isSelected = props.selectedOnPitch === player.id;
                  const isEditingPos = props.editingPositionPlayerId === player.id;

                  return (
                    <div key={player.id} className="relative flex flex-col items-center">
                      <button
                        onClick={() => {
                          props.triggerHaptic();
                          props.setSelectedOnPitch(isSelected ? null : player.id);
                        }}
                        className={`p-2 rounded-2xl text-center transition-all border-2 min-h-[50px] max-w-[110px] w-full ${
                          isSelected
                            ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-2xl'
                            : 'bg-black/90 border-lime-400 text-white shadow-lg'
                        }`}
                      >
                        <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                        <div className="flex justify-center items-center gap-1 mt-0.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              props.setEditingPositionPlayerId(isEditingPos ? null : player.id);
                            }}
                            className="text-[8px] bg-lime-500 text-black font-extrabold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            {player.current_position} ✏️
                          </span>
                          <span className="text-[9px] font-mono text-lime-300 font-bold">
                            {props.formatPlayerMins(player.seconds_played)}
                          </span>
                        </div>
                      </button>

                      {isEditingPos && (
                        <div className="absolute top-12 z-50 bg-black border border-lime-400 p-1.5 rounded-xl flex flex-wrap gap-1 shadow-2xl max-w-[180px]">
                          {props.positionSlots.map((pos) => (
                            <button
                              key={pos}
                              onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                              className="px-2 py-1 text-[8px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* MIDFIELDERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {midfielders.map((player) => {
                  const isSelected = props.selectedOnPitch === player.id;
                  const isEditingPos = props.editingPositionPlayerId === player.id;

                  return (
                    <div key={player.id} className="relative flex flex-col items-center">
                      <button
                        onClick={() => {
                          props.triggerHaptic();
                          props.setSelectedOnPitch(isSelected ? null : player.id);
                        }}
                        className={`p-2 rounded-2xl text-center transition-all border-2 min-h-[50px] max-w-[110px] w-full ${
                          isSelected
                            ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-2xl'
                            : 'bg-black/90 border-lime-400 text-white shadow-lg'
                        }`}
                      >
                        <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                        <div className="flex justify-center items-center gap-1 mt-0.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              props.setEditingPositionPlayerId(isEditingPos ? null : player.id);
                            }}
                            className="text-[8px] bg-lime-500 text-black font-extrabold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            {player.current_position} ✏️
                          </span>
                          <span className="text-[9px] font-mono text-lime-300 font-bold">
                            {props.formatPlayerMins(player.seconds_played)}
                          </span>
                        </div>
                      </button>

                      {isEditingPos && (
                        <div className="absolute top-12 z-50 bg-black border border-lime-400 p-1.5 rounded-xl flex flex-wrap gap-1 shadow-2xl max-w-[180px]">
                          {props.positionSlots.map((pos) => (
                            <button
                              key={pos}
                              onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                              className="px-2 py-1 text-[8px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* DEFENDERS */}
              <div className="flex justify-around items-center min-h-[60px]">
                {defenders.map((player) => {
                  const isSelected = props.selectedOnPitch === player.id;
                  const isEditingPos = props.editingPositionPlayerId === player.id;

                  return (
                    <div key={player.id} className="relative flex flex-col items-center">
                      <button
                        onClick={() => {
                          props.triggerHaptic();
                          props.setSelectedOnPitch(isSelected ? null : player.id);
                        }}
                        className={`p-2 rounded-2xl text-center transition-all border-2 min-h-[50px] max-w-[110px] w-full ${
                          isSelected
                            ? 'bg-yellow-400 text-black border-yellow-200 scale-105 shadow-2xl'
                            : 'bg-black/90 border-lime-400 text-white shadow-lg'
                        }`}
                      >
                        <span className="text-[11px] font-black block truncate">#{player.squad_number} {player.name}</span>
                        <div className="flex justify-center items-center gap-1 mt-0.5">
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              props.setEditingPositionPlayerId(isEditingPos ? null : player.id);
                            }}
                            className="text-[8px] bg-lime-500 text-black font-extrabold px-1.5 py-0.5 rounded cursor-pointer"
                          >
                            {player.current_position} ✏️
                          </span>
                          <span className="text-[9px] font-mono text-lime-300 font-bold">
                            {props.formatPlayerMins(player.seconds_played)}
                          </span>
                        </div>
                      </button>

                      {isEditingPos && (
                        <div className="absolute top-12 z-50 bg-black border border-lime-400 p-1.5 rounded-xl flex flex-wrap gap-1 shadow-2xl max-w-[180px]">
                          {props.positionSlots.map((pos) => (
                            <button
                              key={pos}
                              onClick={() => props.handleChangeOnPitchPosition(player.id, pos)}
                              className="px-2 py-1 text-[8px] font-black rounded bg-gray-800 text-white hover:bg-lime-500 hover:text-black"
                            >
                              {pos}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* GOALKEEPERS */}
              <div className="flex justify-center items-center min-h-[60px]">
                {goalkeepers.map((player) => (
                  <div key={player.id} className="relative flex flex-col items-center">
                    <button className="p-2 rounded-2xl text-center bg-black/95 border-2 border-lime-400 text-white min-h-[50px] max-w-[120px] w-full">
                      <span className="text-[11px] font-black block truncate">🧤 #{player.squad_number} {player.name}</span>
                      <span className="text-[8px] bg-lime-500 text-black font-extrabold px-1.5 py-0.5 rounded mt-0.5 inline-block">GK</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* COMPACT CARDS VIEW */
        <div className="mb-6">
          <h2 className="text-xs uppercase tracking-widest text-gray-400 mb-2.5 font-extrabold flex justify-between items-center">
            <span>On Pitch ({props.pitchPlayers.length}/{props.currentPitchCapacity})</span>
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {props.pitchPlayers.map((player) => {
              const isSelected = props.selectedOnPitch === player.id;

              return (
                <div
                  key={player.id}
                  className={`h-[82px] rounded-xl border transition-all overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? 'bg-yellow-400 text-black border-yellow-200 shadow-lg scale-[1.02]'
                      : 'bg-gray-950/80 border-gray-800/80 text-white hover:border-gray-700'
                  }`}
                >
                  <button
                    onClick={() => {
                      props.triggerHaptic();
                      props.setSelectedOnPitch(isSelected ? null : player.id);
                    }}
                    className="p-2.5 text-left w-full flex-1 flex flex-col justify-between overflow-hidden"
                  >
                    <div className="flex justify-between items-center gap-1 w-full overflow-hidden">
                      <span className={`text-[10px] sm:text-[11px] font-black tracking-tight truncate flex-1 min-w-0 ${isSelected ? 'text-black' : 'text-white'}`}>
                        #{player.squad_number} {player.name}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase shrink-0 ${isSelected ? 'bg-black text-yellow-400' : 'bg-gray-800 text-lime-400'}`}>
                        {player.current_position}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] font-mono mt-0.5 opacity-90 w-full">
                      <span className={`font-bold ${isSelected ? 'text-black' : 'text-gray-300'}`}>
                        {props.formatPlayerMins(player.seconds_played)}
                      </span>
                    </div>
                  </button>

                  <div className="flex border-t border-gray-800/60 bg-black/40 h-[28px] shrink-0">
                    <button
                      onClick={() => props.handleLogGoal(player.name, false)}
                      className="flex-1 py-1 text-[10px] font-black text-gray-300 hover:text-white hover:bg-lime-500/20 transition-all border-r border-gray-800/60 flex items-center justify-center gap-1"
                    >
                      ⚽ GOAL
                    </button>
                    <button
                      onClick={() => props.handleMarkInjured(player.id)}
                      className="px-3 py-1 text-[10px] font-black text-red-400 hover:bg-red-500/20 transition-all flex items-center justify-center"
                    >
                      🏥
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB BENCH & SWAP CARDS */}
      <div className="bg-gray-900/90 p-3.5 rounded-2xl border border-gray-800 mb-6 shadow-md">
        <div className="flex justify-between items-center mb-2.5">
          <h2 className="text-xs uppercase tracking-widest text-amber-400 font-black">
            Substitutes Bench ({props.subBench.length})
          </h2>
        </div>

        {props.selectedOnPitch && (
          <div className="bg-amber-500/10 border border-amber-500/40 p-2 rounded-xl mb-3 flex items-center justify-between text-xs">
            <span className="text-amber-200 font-bold">Target Position:</span>
            <div className="flex gap-1 overflow-x-auto">
              {props.positionSlots.map((pos) => (
                <button
                  key={pos}
                  onClick={() => props.setTargetSubPosition(pos)}
                  className={`px-2 py-1 rounded-lg text-[9px] font-black transition-all ${
                    props.targetSubPosition === pos ? 'bg-amber-400 text-black' : 'bg-black text-amber-200 border border-amber-500/30'
                  }`}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {props.subBench.map((player) => {
            const isLowest = player.seconds_played === props.lowestSeconds;

            return (
              <div key={player.id} className="flex gap-2">
                <button
                  disabled={!props.selectedOnPitch}
                  onClick={() => props.handleSubSwap(player.id)}
                  className={`flex-1 px-3 h-[44px] rounded-xl flex justify-between items-center text-left border transition-all overflow-hidden ${
                    props.selectedOnPitch
                      ? 'bg-amber-500/20 border-amber-500 text-amber-200 active:bg-amber-500 active:text-black'
                      : isLowest
                      ? 'bg-gray-950/90 border-lime-500/50 text-gray-200'
                      : 'bg-gray-950/80 border-gray-800/80 text-gray-400'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0 mr-2">
                    <span className="font-black text-xs text-white truncate">#{player.squad_number} {player.name}</span>
                    <span className="text-[11px] font-mono font-bold text-gray-400 shrink-0">{props.formatPlayerMins(player.seconds_played)}</span>
                  </div>

                  {props.selectedOnPitch ? (
                    <span className="font-black text-[10px] text-amber-300 shrink-0">
                      SUB ON ({props.targetSubPosition || 'SAME POS'}) →
                    </span>
                  ) : isLowest ? (
                    <span className="bg-lime-500/20 text-lime-400 border border-lime-500/40 text-[9px] px-2 py-0.5 rounded font-extrabold shrink-0">
                      LOWEST MINS
                    </span>
                  ) : null}
                </button>
                <button
                  onClick={() => props.handleMarkInjured(player.id)}
                  className="bg-red-950/60 border border-red-800/60 text-red-400 font-black px-3 rounded-xl text-xs flex items-center justify-center shrink-0"
                >
                  🏥
                </button>
              </div>
            );
          })}
        </div>

        {/* INJURED PLAYERS DRAWER */}
        {props.injuredPlayers.length > 0 && (
          <div className="mt-3 pt-2.5 border-t border-gray-800/80">
            <h3 className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider flex justify-between items-center">
              <span>🏥 Injured / Resting ({props.injuredPlayers.length})</span>
              <span className="text-[10px] text-gray-400">Tap to recover</span>
            </h3>
            <div className="flex flex-col gap-2">
              {props.injuredPlayers.map((player) => (
                <div key={player.id} className="p-2.5 bg-black rounded-xl border border-red-900/50 flex justify-between items-center text-xs">
                  <div className="overflow-hidden mr-2">
                    <span className="font-bold text-gray-300 truncate block">#{player.squad_number} {player.name}</span>
                    <span className="font-mono text-[10px] text-gray-500">{props.formatPlayerMins(player.seconds_played)}</span>
                  </div>
                  <button
                    onClick={() => props.handleRecoverPlayer(player.id)}
                    className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500 hover:text-black font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-all shrink-0"
                  >
                    ✓ RECOVERED
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SAVE & FINISH MATCH SECTION */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 flex flex-col gap-3 shadow-md">
        <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">
          💾 Finish Match & Sync to Supabase
        </h2>
        <input
          type="text"
          placeholder="Opponent Name"
          value={props.opponentName}
          onChange={(e) => props.setOpponentName(e.target.value)}
          className="bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lime-400 min-h-[44px]"
        />
        <select
          value={props.playerOfTheMatch || ''}
          onChange={(e) => props.setPlayerOfTheMatch(e.target.value || null)}
          className="bg-black border border-gray-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-lime-400 min-h-[44px]"
        >
          <option value="">Select Star Player of the Match</option>
          {[...props.pitchPlayers, ...props.subBench, ...props.injuredPlayers].map((p) => (
            <option key={p.id} value={p.name}>#{p.squad_number} {p.name}</option>
          ))}
        </select>

        <div className="flex gap-2.5">
          <button
            onClick={props.generateWhatsAppSummary}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all min-h-[48px]"
          >
            💬 WHATSAPP RECAP
          </button>
          <button
            onClick={props.handleSaveAndFinishMatch}
            disabled={props.savingMatch}
            className="flex-1 bg-lime-500 hover:bg-lime-400 text-black font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all disabled:opacity-50 min-h-[48px]"
          >
            {props.savingMatch ? 'SAVING...' : '💾 SAVE TO DATABASE'}
          </button>
        </div>
      </div>
    </div>
  );
}