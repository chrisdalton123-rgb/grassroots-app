'use client';

import React from 'react';
import { Player, SubPlanStep } from '@/types/matchday';

type Props = {
  halfMinutes: number;
  handleHalfMinutesChange: (mins: number) => void;
  squad: Player[];
  planOffPlayerId: string;
  setPlanOffPlayerId: (id: string) => void;
  planOnPlayerId: string;
  setPlanOnPlayerId: (id: string) => void;
  planMinute: number;
  setPlanMinute: (min: number) => void;
  planTargetPos: string;
  setPlanTargetPos: (pos: string) => void;
  positionSlots: string[];
  handleAddCustomSubStep: () => void;
  generatedPlan: SubPlanStep[];
  handleRemoveSubStep: (id: string) => void;
  handleUpdateSubStepPosition: (stepId: string, newPosition: string) => void;
  availablePlayerIds: string[];
  togglePlayerAvailability: (id: string) => void;
  startingPlayerIds: string[];
  toggleStarterSelection: (id: string) => void;
  autoSelectStarters: () => void;
  rotationIntervalMins: number;
  setRotationIntervalMins: (mins: number) => void;
  subsPerBatch: number;
  setSubsPerBatch: (batch: number) => void;
  getProjectedMinutes: () => (Player & { projectedMins: number })[];
  handleGenerateMatchPlan: () => void;
  currentPitchCapacity: number;
  isGkLocked: boolean;
  setIsGkLocked: (val: boolean) => void;
};

export default function PlannerTab(props: Props) {
  const activeSquad = props.squad.filter((p) => props.availablePlayerIds.includes(p.id));
  const totalMatchMinutes = props.halfMinutes * 2;
  const recommendedIntervals = Math.floor(totalMatchMinutes / props.rotationIntervalMins);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-black text-lime-400">Pre-Match Strategy Planner</h1>

      {/* MATCH DURATION & AUTOMATED CALCULATION PARAMETERS */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <label className="block text-xs font-bold text-lime-400 mb-2 uppercase tracking-wider">
          ⏱️ Match Halves ({props.halfMinutes}m halves = {totalMatchMinutes}m total)
        </label>
        <div className="flex gap-2 mb-3">
          {[20, 25, 30, 35].map((mins) => (
            <button
              key={mins}
              type="button"
              onClick={() => props.handleHalfMinutesChange(mins)}
              className={`flex-1 py-2.5 rounded-xl text-xs font-bold border transition-all min-h-[44px] ${
                props.halfMinutes === mins
                  ? 'bg-lime-500 text-black border-lime-400'
                  : 'bg-black border-gray-800 text-gray-400'
              }`}
            >
              {mins}m
            </button>
          ))}
        </div>

        <div className="pt-3 border-t border-gray-800 flex justify-between items-center text-xs">
          <div>
            <span className="text-gray-300 font-bold block">Rotation Interval:</span>
            <span className="text-[10px] text-gray-500 font-mono">{recommendedIntervals} rotation windows</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={props.rotationIntervalMins}
              onChange={(e) => props.setRotationIntervalMins(Math.max(1, parseInt(e.target.value, 10) || 5))}
              className="bg-black border border-gray-800 text-lime-400 font-bold p-1.5 w-16 text-center rounded-lg"
            />
            <span className="text-gray-400 font-bold">mins</span>
          </div>
        </div>
      </div>

      {/* GOALKEEPER FULL MATCH LOCK TOGGLE */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md flex justify-between items-center">
        <div>
          <span className="text-xs font-black text-lime-400 block">🧤 LOCK GOALKEEPER FULL MATCH</span>
          <span className="text-[10px] text-gray-400 block mt-0.5">
            {props.isGkLocked ? 'GK excluded from rotation loops' : 'GK rotates like outfield players'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => props.setIsGkLocked(!props.isGkLocked)}
          className={`px-3.5 py-2 font-black text-xs rounded-xl transition-all min-h-[40px] ${
            props.isGkLocked
              ? 'bg-lime-500 text-black border border-lime-400'
              : 'bg-black text-gray-400 border border-gray-800'
          }`}
        >
          {props.isGkLocked ? 'LOCKED (FULL MATCH)' : 'ROTATE GK'}
        </button>
      </div>

      {/* AUTOMATED CALCULATION & EQUAL-TIME ENGINE */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-lime-500/30 shadow-md">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-black flex items-center gap-1.5">
            <span>⚡ Equal-Play Auto Calculator</span>
          </h2>
          <span className="text-[10px] bg-lime-500/20 text-lime-400 px-2 py-0.5 rounded font-mono font-bold">
            FA Rotation
          </span>
        </div>

        <div className="bg-black p-3 rounded-xl border border-gray-800 text-xs flex flex-col gap-1.5 mb-3">
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-gray-400">Total Match Slots:</span>
            <span className="text-white font-bold">{props.currentPitchCapacity * totalMatchMinutes} player-minutes</span>
          </div>
          <div className="flex justify-between font-mono text-[11px]">
            <span className="text-gray-400">Target Time per Player:</span>
            <span className="text-lime-400 font-bold">
              ~{Math.round((props.currentPitchCapacity * totalMatchMinutes) / (activeSquad.length || 1))} mins
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={props.handleGenerateMatchPlan}
          className="w-full bg-lime-500 text-black font-black p-3.5 rounded-xl text-xs active:scale-95 transition-all shadow-md min-h-[48px]"
        >
          ⚡ AUTO-CALCULATE FULL MATCH SUB SCHEDULE
        </button>
      </div>

      {/* SCHEDULED SUBS LIST WITH EDITABLE DESTINATION POSITIONS */}
      {props.generatedPlan.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between items-center">
            <span>📋 Auto-Generated Substitutions ({props.generatedPlan.length})</span>
            <span className="text-[10px] text-gray-400 font-normal">Select target slot to reassign</span>
          </h2>

          <div className="flex flex-col gap-2.5">
            {props.generatedPlan.map((step) => (
              <div key={step.id} className="bg-black p-3 rounded-xl border border-gray-800 flex flex-col gap-2">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-amber-400 font-mono font-bold">Min {step.minute}' — </span>
                    <span className="text-red-400 font-bold">OFF: {step.offPlayerName} </span>
                    <span className="text-lime-400 font-bold">ON: {step.onPlayerName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => props.handleRemoveSubStep(step.id)}
                    className="text-red-500 font-bold text-xs px-2 py-1"
                  >
                    🗑️
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-1 border-t border-gray-900">
                  <span className="text-[10px] text-gray-400 font-bold uppercase">Assign Target Slot:</span>
                  <select
                    value={step.assignedPosition}
                    onChange={(e) => props.handleUpdateSubStepPosition(step.id, e.target.value)}
                    className="bg-gray-900 border border-gray-700 text-lime-400 font-bold text-[11px] p-1.5 rounded-lg flex-1 focus:outline-none"
                  >
                    {props.positionSlots.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos} Channel
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STARTERS & AVAILABILITY */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold">
            👥 Starters ({props.startingPlayerIds.length}/{props.currentPitchCapacity})
          </h2>
          <button
            type="button"
            onClick={props.autoSelectStarters}
            className="text-[10px] bg-lime-500/20 text-lime-400 border border-lime-500/40 px-2.5 py-1 rounded-lg font-bold"
          >
            ⚡ AUTO SELECT STARTERS
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {props.squad.map((player) => {
            const isAvailable = props.availablePlayerIds.includes(player.id);
            const isStarter = props.startingPlayerIds.includes(player.id);

            return (
              <div key={player.id} className="p-2.5 bg-black rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => props.togglePlayerAvailability(player.id)}
                    className={`w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center ${
                      isAvailable ? 'bg-emerald-500 text-black' : 'bg-gray-800 text-gray-500'
                    }`}
                  >
                    {isAvailable ? '✓' : '✕'}
                  </button>
                  <span className={`font-extrabold ${isAvailable ? 'text-white' : 'text-gray-600 line-through'}`}>
                    #{player.squad_number} {player.name}
                  </span>
                </div>

                {isAvailable && (
                  <button
                    type="button"
                    onClick={() => props.toggleStarterSelection(player.id)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${
                      isStarter ? 'bg-lime-500 text-black' : 'bg-gray-900 text-gray-400 border border-gray-800'
                    }`}
                  >
                    {isStarter ? '🚨 STARTER' : 'SUB BENCH'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* MANUAL SINGLE SUB STEP ENTRY */}
      <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
        <h2 className="text-xs font-black text-lime-400 uppercase tracking-wider mb-2">
          ➕ Add Manual Scheduled Sub
        </h2>
        <div className="flex flex-col gap-2.5">
          <div className="flex gap-2">
            <select
              value={props.planOffPlayerId}
              onChange={(e) => props.setPlanOffPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1"
            >
              <option value="">Select OFF Player</option>
              {activeSquad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>

            <select
              value={props.planOnPlayerId}
              onChange={(e) => props.setPlanOnPlayerId(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-lime-400 p-2.5 rounded-xl flex-1"
            >
              <option value="">Select ON Player</option>
              {activeSquad.map((p) => (
                <option key={p.id} value={p.id}>#{p.squad_number} {p.name}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={props.planMinute}
              onChange={(e) => props.setPlanMinute(parseInt(e.target.value, 10) || 1)}
              className="bg-black border border-gray-800 text-xs font-bold text-amber-400 p-2.5 rounded-xl w-20 text-center"
              placeholder="Min"
            />

            <select
              value={props.planTargetPos}
              onChange={(e) => props.setPlanTargetPos(e.target.value)}
              className="bg-black border border-gray-800 text-xs font-bold text-white p-2.5 rounded-xl flex-1"
            >
              {props.positionSlots.map((pos) => (
                <option key={pos} value={pos}>Target Pos: {pos}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={props.handleAddCustomSubStep}
              className="bg-lime-500 text-black font-black px-4 py-2.5 rounded-xl text-xs"
            >
              + ADD
            </button>
          </div>
        </div>
      </div>

      {/* PROJECTED MINUTES BREAKDOWN */}
      {props.availablePlayerIds.length > 0 && (
        <div className="bg-gray-900/90 p-4 rounded-2xl border border-gray-800 shadow-md">
          <h2 className="text-xs uppercase tracking-widest text-lime-400 font-bold mb-3 flex justify-between">
            <span>📊 Projected Playing Time</span>
            <span>{totalMatchMinutes}m Match</span>
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {props.getProjectedMinutes().map((player) => (
              <div key={player.id} className="p-3 bg-black rounded-xl border border-gray-800 flex justify-between items-center text-xs">
                <span className="font-bold text-gray-300 truncate max-w-[100px]">
                  #{player.squad_number} {player.name}
                </span>
                <span className="font-mono font-extrabold text-lime-400 shrink-0">
                  {player.projectedMins}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}